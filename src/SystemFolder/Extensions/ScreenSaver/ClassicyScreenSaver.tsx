import "./ClassicyScreenSaver.scss";
// Side-effect import: registers the Screen Saver Control Strip module.
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule";
import type { FC as FunctionalComponent, RefObject } from "react";
import { useEffect, useRef } from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	isScreenSaverEnabled,
	SCREEN_SAVER_ACTIVATE_EVENT,
	SCREEN_SAVER_APP_ID,
	SCREEN_SAVER_APP_NAME,
	type ScreenSaverData,
	screenSaverTimeoutMinutes,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { resolveClassicyScreenSaverFor } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer";
import type { ClassicyScreenSaverDefinition } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import {
	resolveScreenSaverConfig,
	useClassicyScreenSavers,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

/**
 * Wall-clock idle detection, deliberately independent of the Classicy virtual
 * clock: pausing or rewinding the desktop's Date & Time must not stop the
 * screensaver from kicking in.
 *
 * Activity is tracked in refs and never written to the store — the desktop
 * persists (debounced) on every store change, so a per-mousemove dispatch
 * would thrash localStorage. Only the two state *transitions* dispatch:
 * idle → `ClassicyAppScreenSaverActivate`, activity while active →
 * `ClassicyAppScreenSaverDeactivate`.
 */
const useScreenSaverIdleMonitor = (
	data: ScreenSaverData,
	saverOffered: boolean,
) => {
	const dispatch = useAppManagerDispatch();
	const enabled = isScreenSaverEnabled(data);
	const timeoutMs = screenSaverTimeoutMinutes(data) * 60_000;
	const active = data.active === true;

	const lastActivityRef = useRef<number>(Date.now());
	const activeRef = useRef(active);
	activeRef.current = active;

	// Waking listeners run in the capture phase so the waking keystroke or
	// click is swallowed before it can type into an input or press a button
	// underneath the overlay — After Dark's first input only ever woke the Mac.
	useEffect(() => {
		if (!enabled) return;
		const wake = (e: Event) => {
			lastActivityRef.current = Date.now();
			if (activeRef.current) {
				if (e.type === "keydown" || e.type === "mousedown") {
					e.preventDefault();
					e.stopPropagation();
				}
				dispatch({ type: "ClassicyAppScreenSaverDeactivate" });
			}
		};
		const passive: AddEventListenerOptions = { capture: true, passive: true };
		const blocking: AddEventListenerOptions = { capture: true };
		document.addEventListener("mousemove", wake, passive);
		document.addEventListener("wheel", wake, passive);
		document.addEventListener("touchstart", wake, passive);
		document.addEventListener("mousedown", wake, blocking);
		document.addEventListener("keydown", wake, blocking);
		return () => {
			document.removeEventListener("mousemove", wake, passive);
			document.removeEventListener("wheel", wake, passive);
			document.removeEventListener("touchstart", wake, passive);
			document.removeEventListener("mousedown", wake, blocking);
			document.removeEventListener("keydown", wake, blocking);
		};
	}, [enabled, dispatch]);

	// Idle timer: sleep until the earliest moment the timeout could elapse,
	// then re-check against the activity ref — no per-event timer churn.
	useEffect(() => {
		if (!enabled || active || !saverOffered) return;
		let timer: ReturnType<typeof setTimeout>;
		const check = () => {
			const elapsed = Date.now() - lastActivityRef.current;
			if (elapsed >= timeoutMs) {
				dispatch({ type: SCREEN_SAVER_ACTIVATE_EVENT });
				return;
			}
			timer = setTimeout(check, timeoutMs - elapsed);
		};
		timer = setTimeout(check, timeoutMs);
		return () => clearTimeout(timer);
	}, [enabled, active, saverOffered, timeoutMs, dispatch]);
};

/**
 * Class put on `<html>` while a saver is showing. Its stylesheet rule hides the
 * pointer on every element in the document — not only the overlay — and it
 * comes off with the overlay, so waking restores the pointer. Being a
 * stylesheet rule (id-level specificity, no `!important`), it does not outrank
 * an inline `cursor`, so savers set `cursor` from stylesheets.
 */
export const SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS = "classicyScreenSaverActive";

/** The overlay's DOM id; ClassicyScreenSaver.scss keys its overrides on it. */
export const SCREEN_SAVER_OVERLAY_ID = "classicy-screen-saver-overlay";

const useHideCursorWhileActive = () => {
	useEffect(() => {
		const root = document.documentElement;
		root.classList.add(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS);
		return () => {
			root.classList.remove(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS);
		};
	}, []);
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Pauses every CSS animation in the overlay for reduced-motion users. The
 * stylesheet's `animation-play-state: paused` covers animations a base-layer
 * or host saver declares in CSS, and a package that ships savers in its own
 * layer carries its own copy of that rule (a later layer's `animation:`
 * shorthand would otherwise beat the core's). This is the backstop for every
 * CSS animation, and also stops ones a registered saver writes inline, which
 * no stylesheet rule can outrank:
 * - after the saver mounts and whenever the selected saver changes, every
 *   animation in the subtree (including ones still in their delay phase);
 * - from then on, each CSS animation that starts later (an element spawned on
 *   a timer, a style written after render), via a capture-phase
 *   `animationstart` listener on the overlay;
 * - when the preference flips (resuming, when it is turned off, only the
 *   animations this hook paused).
 * An animation that is already paused (by the stylesheet's rule, or by the
 * saver itself) is left alone: pausing it from script would detach it from
 * `animation-play-state`, and resuming it would replay an animation the saver
 * stopped on purpose. The other way round is not tracked: an animation this
 * hook paused and the saver then also paused while reduced motion was on is
 * resumed when it is turned off (a script `pause()` detaches it from
 * `animation-play-state`, so the two pauses look alike). Web Animations API
 * animations (`element.animate()`) fire no `animationstart` and are not
 * caught once the saver has mounted.
 */
const usePauseForReducedMotion = (
	overlayRef: RefObject<HTMLDivElement | null>,
	saverId: string | undefined,
) => {
	useEffect(() => {
		const overlay = overlayRef.current;
		if (
			saverId === undefined ||
			!overlay ||
			typeof window.matchMedia !== "function"
		)
			return;
		const query = window.matchMedia(REDUCED_MOTION_QUERY);
		// The running animations this hook paused, the only ones it resumes.
		// Pruned of animations whose element has left the document on every
		// add, so a saver that spawns and removes elements keeps it bounded.
		const paused = new Set<Animation>();
		const pause = (animation: Animation) => {
			if (animation.playState === "paused") return;
			for (const held of paused)
				if (
					(held.effect as KeyframeEffect | null)?.target?.isConnected === false
				)
					paused.delete(held);
			animation.pause();
			paused.add(animation);
		};
		const apply = (reduce: boolean) => {
			if (!reduce) {
				for (const animation of paused) animation.play();
				paused.clear();
				return;
			}
			if (typeof overlay.getAnimations !== "function") return;
			for (const animation of overlay.getAnimations({ subtree: true }))
				pause(animation);
		};
		if (query.matches) apply(true);
		const onAnimationStart = (event: Event) => {
			if (!query.matches) return;
			for (const animation of (event.target as Element).getAnimations?.() ?? [])
				pause(animation);
		};
		const onChange = (e: MediaQueryListEvent) => apply(e.matches);
		overlay.addEventListener("animationstart", onAnimationStart, true);
		query.addEventListener?.("change", onChange);
		return () => {
			overlay.removeEventListener("animationstart", onAnimationStart, true);
			query.removeEventListener?.("change", onChange);
		};
	}, [overlayRef, saverId]);
};

const ClassicyScreenSaverOverlay: FunctionalComponent<{
	data: ScreenSaverData;
	saver: ClassicyScreenSaverDefinition;
}> = ({ data, saver }) => {
	useHideCursorWhileActive();
	const overlayRef = useRef<HTMLDivElement>(null);
	const Saver = saver?.component;
	const config = resolveScreenSaverConfig(saver, data.saverConfigs?.[saver.id]);
	usePauseForReducedMotion(overlayRef, saver.id);
	return (
		<div
			ref={overlayRef}
			// The id gives the overlay's stylesheet rules (hidden cursor, paused
			// animation for reduced motion) id-level specificity, so they outrank
			// every saver's class-based rules.
			id={SCREEN_SAVER_OVERLAY_ID}
			className={`classicyScreenSaverOverlay${
				saver.transparentBackground
					? " classicyScreenSaverOverlayTransparent"
					: ""
			}`}
			role="presentation"
		>
			{Saver ? <Saver config={config} /> : null}
		</div>
	);
};

export const ClassicyScreenSaver: FunctionalComponent = () => {
	const screenSaverIcon =
		useClassicyAsset("icons", "system.extensions.screensaver") ?? "";
	const data = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]?.data as
				| ScreenSaverData
				| undefined,
	);
	const appData: ScreenSaverData = data ?? {};

	// The saver in effect under the active package: the stored choice when it
	// offers it, else its default. None offered: no idle activation, no overlay.
	const packageId = useActiveClassicyAppearancePackage().id;
	useClassicyScreenSavers();
	const saver = resolveClassicyScreenSaverFor(packageId, appData.selectedSaver);

	useScreenSaverIdleMonitor(appData, saver !== undefined);

	return (
		<>
			<ClassicyApp
				id={SCREEN_SAVER_APP_ID}
				name={SCREEN_SAVER_APP_NAME}
				icon={screenSaverIcon}
				extension
			/>
			{/* Rendered as a sibling, not a ClassicyApp child: extension children
			    only render while the app is "open", and the overlay must not
			    depend on app lifecycle. Position: fixed needs no portal, and
			    mounting inside the desktop tree keeps theme vars in scope. */}
			{appData.active === true && isScreenSaverEnabled(appData) && saver && (
				<ClassicyScreenSaverOverlay data={appData} saver={saver} />
			)}
		</>
	);
};

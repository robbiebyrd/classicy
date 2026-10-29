import "./ClassicyScreenSaver.scss";
// Side-effect import: registers the built-in After Dark savers.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
// Side-effect import: registers the Screen Saver Control Strip module.
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule";
import type { FC as FunctionalComponent, RefObject } from "react";
import { useEffect, useRef } from "react";
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
import {
	getClassicyScreenSaver,
	resolveScreenSaverConfig,
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
const useScreenSaverIdleMonitor = (data: ScreenSaverData) => {
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
		if (!enabled || active) return;
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
	}, [enabled, active, timeoutMs, dispatch]);
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
 * Pauses every animation in the overlay for reduced-motion users. The
 * stylesheet's `animation-play-state: paused` already covers animations a
 * saver declares in CSS; this also stops one a registered saver writes
 * inline, which no stylesheet rule can outrank. Runs after the saver mounts,
 * again whenever the selected saver changes, and when the preference flips
 * (resuming when it is turned off).
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
			typeof overlay.getAnimations !== "function" ||
			typeof window.matchMedia !== "function"
		)
			return;
		const query = window.matchMedia(REDUCED_MOTION_QUERY);
		const apply = (reduce: boolean) => {
			for (const animation of overlay.getAnimations({ subtree: true }))
				if (reduce) animation.pause();
				else animation.play();
		};
		if (query.matches) apply(true);
		const onChange = (e: MediaQueryListEvent) => apply(e.matches);
		query.addEventListener?.("change", onChange);
		return () => query.removeEventListener?.("change", onChange);
	}, [overlayRef, saverId]);
};

const ClassicyScreenSaverOverlay: FunctionalComponent<{
	data: ScreenSaverData;
}> = ({ data }) => {
	useHideCursorWhileActive();
	const overlayRef = useRef<HTMLDivElement>(null);
	const saver = data.selectedSaver
		? getClassicyScreenSaver(data.selectedSaver)
		: undefined;
	const Saver = saver?.component;
	const config = saver
		? resolveScreenSaverConfig(saver, data.saverConfigs?.[saver.id])
		: {};
	usePauseForReducedMotion(overlayRef, saver?.id);
	return (
		<div
			ref={overlayRef}
			// The id gives the overlay's stylesheet rules (hidden cursor, paused
			// animation for reduced motion) id-level specificity, so they outrank
			// every saver's class-based rules.
			id={SCREEN_SAVER_OVERLAY_ID}
			className={`classicyScreenSaverOverlay${
				saver?.transparentBackground
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

	useScreenSaverIdleMonitor(appData);

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
			{appData.active === true && isScreenSaverEnabled(appData) && (
				<ClassicyScreenSaverOverlay data={appData} />
			)}
		</>
	);
};

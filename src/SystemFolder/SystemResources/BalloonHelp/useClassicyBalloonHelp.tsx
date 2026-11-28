import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { registerClassicyHelpAnchor } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";

export type ClassicyBalloonPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

/** Serializable balloon help description. Stored on desktop icon records, so
 *  every field must survive a JSON round-trip through localStorage. */
export interface ClassicyIconBalloonHelp {
	/** Optional bold heading above the content. */
	title?: string;
	/** The help text. */
	content: string;
	/** Preferred placement; flipped when off screen. Defaults to `"top-left"`. */
	position?: ClassicyBalloonPosition;
	/**
	 * Hover delay in ms before the balloon appears. Defaults to the
	 * package's `layout.balloonHelp.delayMs`, else `600`.
	 */
	delay?: number;
}

/** How `useClassicyBalloonHelp` treats the global Balloon Help toggle. */
export interface ClassicyBalloonHelpOptions {
	/**
	 * Show the balloon even while balloon help is turned off
	 * (`disableBalloonHelp`): a tooltip, not a help balloon. Default `false`.
	 */
	force?: boolean;
}

// The window root's state class while it is the active window (the
// vocabulary's `active`, CLASSICY_STATE.active), which `activeWindowOnly`
// reads.
const ACTIVE_STATE = "active";

// When a shown tip last lost its pointer (`Date.now()`), page-wide: a tip
// whose pointer arrives within the package's `layout.balloonHelp.reshowMs`
// of it waits that long instead of its delay, as Windows' ToolTip does when
// the pointer moves from one tool to another (Wine's tooltips.c,
// TTDT_RESHOW).
let lastShownTipLeftAt = Number.NEGATIVE_INFINITY;

// Read --window-control-size from the desktop element at the time of display
// (the default theme's 12 px before the desktop mounts).
const readControlSize = (): number =>
	readClassicyThemeVar("--window-control-size");

/** The subset of DOMRect this module measures against. */
interface AnchorRect {
	top: number;
	left: number;
	right: number;
	bottom: number;
	width: number;
}

interface Size {
	width: number;
	height: number;
}

/** Where an edge of the balloon's box lands, in viewport coordinates. */
interface Span {
	start: number;
	end: number;
}

type BalloonSide = "top" | "bottom";
type BalloonAlign = "left" | "center" | "right";

// These mirror containerPortalStyle below — each returns the span the balloon
// would occupy on that axis for a given side, which is what decides whether the
// side is usable.
const verticalSpan = (
	side: BalloonSide,
	anchor: AnchorRect,
	height: number,
): Span =>
	side === "top"
		? { start: anchor.top - height, end: anchor.top }
		: { start: anchor.bottom, end: anchor.bottom + height };

const horizontalSpan = (
	align: BalloonAlign,
	anchor: AnchorRect,
	width: number,
	controlSize: number,
): Span => {
	if (align === "left") {
		const start = anchor.right - controlSize;
		return { start, end: start + width };
	}
	if (align === "right") {
		const end = anchor.left + controlSize;
		return { start: end - width, end };
	}
	const center = anchor.left + anchor.width / 2;
	return { start: center - width / 2, end: center + width / 2 };
};

const fits = (span: Span, limit: number): boolean =>
	span.start >= 0 && span.end <= limit;

const overflow = (span: Span, limit: number): number =>
	Math.max(0, -span.start) + Math.max(0, span.end - limit);

/** First candidate that fits; failing that, the one that overhangs least. */
const pick = <T,>(
	candidates: T[],
	spanOf: (candidate: T) => Span,
	limit: number,
): T =>
	candidates.find((candidate) => fits(spanOf(candidate), limit)) ??
	candidates.reduce((best, candidate) =>
		overflow(spanOf(candidate), limit) < overflow(spanOf(best), limit)
			? candidate
			: best,
	);

/**
 * Turn the caller's preferred position into one that is actually on screen.
 *
 * `position` is a preference, not an instruction: an anchor near an edge of the
 * viewport has no room on the side the caller asked for. The stock default is
 * `top-left`, and the desktop's disk icon sits at the top right — so the balloon
 * opened up and to the right, entirely outside the viewport, with nothing to
 * hint that it had opened at all. Desktop icons are draggable anywhere, so no
 * per-icon default could have covered this.
 *
 * Each axis is resolved independently, preferring the caller's side, then its
 * opposite, then center. Exported for tests: jsdom reports every rect as zero,
 * so the decision has to be checked as a function of measurements rather than
 * through a rendered balloon.
 */
export const resolveBalloonPosition = (
	preferred: ClassicyBalloonPosition,
	anchor: AnchorRect,
	balloon: Size,
	controlSize: number,
	viewport: Size,
): ClassicyBalloonPosition => {
	const [side, align] = preferred.split("-") as [BalloonSide, BalloonAlign];

	const sides: BalloonSide[] = [side, side === "top" ? "bottom" : "top"];
	const aligns: BalloonAlign[] = [
		align,
		align === "left" ? "right" : "left",
		"center",
	];

	const vertical = pick(
		sides,
		(candidate) => verticalSpan(candidate, anchor, balloon.height),
		viewport.height,
	);
	const horizontal = pick(
		// `center` is already first when it is the preference; don't repeat it.
		align === "center"
			? (["center", "left", "right"] as BalloonAlign[])
			: aligns,
		(candidate) =>
			horizontalSpan(candidate, anchor, balloon.width, controlSize),
		viewport.width,
	);

	return `${vertical}-${horizontal}` as ClassicyBalloonPosition;
};

/** A point in viewport coordinates: the pointer's hot spot. */
export interface ClassicyBalloonPoint {
	x: number;
	y: number;
}

/** A box in viewport coordinates, as `getBoundingClientRect` gives it. */
export interface ClassicyBalloonBox {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/**
 * Where a tip placed at the pointer (`layout.balloonHelp.placement`
 * `"pointer"`) goes: `left`, the container's left edge, and `side`, below the
 * pointer (its top at the pointer, offset by the package's stylesheet) or
 * above the anchor (its bottom at the anchor's top).
 */
export interface ClassicyBalloonPointerPlacement {
	side: "below" | "above";
	left: number;
}

/**
 * Settle a tip first laid out at the pointer, below it (`box`, measured
 * there, the package's offset included), as Windows places a ToolTip
 * (TOOLTIPS_Show): moved left until its right edge meets the bounds' (but
 * never past their left edge), and, where its bottom passes the bounds',
 * moved above the anchor instead. Exported for tests: jsdom measures every
 * box as empty.
 */
export const resolveBalloonPointerPlacement = (
	point: ClassicyBalloonPoint,
	box: ClassicyBalloonBox,
	bounds: ClassicyBalloonBox,
): ClassicyBalloonPointerPlacement => {
	let dx = 0;
	if (box.right > bounds.right) dx = bounds.right - box.right;
	if (box.left + dx < bounds.left) dx = bounds.left - box.left;
	return {
		side: box.bottom > bounds.bottom ? "above" : "below",
		left: point.x + dx,
	};
};

// Viewport size, guarded so the hook stays safe to import and run in an
// SSR/pre-rendered context (where `window` is undefined). Off-browser it reports
// a zero viewport, which the placement resolver reads as "no room" — a harmless
// fallback, since the measuring layout effect and the portal only ever run in
// the browser after mount.
const getViewport = (): { width: number; height: number } =>
	typeof window === "undefined"
		? { width: 0, height: 0 }
		: { width: window.innerWidth, height: window.innerHeight };

// The desktop's box where it overlaps the viewport, the room a tip at the
// pointer keeps to; the viewport alone outside a desktop, or while the
// desktop has no box (jsdom).
const pointerBounds = (): ClassicyBalloonBox => {
	const viewport = getViewport();
	const bounds = {
		left: 0,
		top: 0,
		right: viewport.width,
		bottom: viewport.height,
	};
	const desktop =
		typeof document === "undefined"
			? null
			: document.getElementById("classicyDesktop");
	const rect = desktop?.getBoundingClientRect();
	if (!rect || rect.width === 0 || rect.height === 0) return bounds;
	return {
		left: Math.max(bounds.left, rect.left),
		top: Math.max(bounds.top, rect.top),
		right: Math.min(bounds.right, rect.right),
		bottom: Math.min(bounds.bottom, rect.bottom),
	};
};

// A tip at the pointer: below it, from the pointer's hot spot (the package
// offsets it under the cursor, `classicyBalloonHelpPointerBelow`), or above
// the anchor (`classicyBalloonHelpPointerAbove`).
const pointerPortalStyle = (
	point: ClassicyBalloonPoint,
	rect: DOMRect,
	fix: ClassicyBalloonPointerPlacement | null,
): CSSProperties =>
	fix?.side === "above"
		? { left: `${fix.left}px`, bottom: `${getViewport().height - rect.top}px` }
		: { left: `${fix?.left ?? point.x}px`, top: `${point.y}px` };

// Container is position:fixed in a portal so it is never clipped by a parent.
// The balloon begins at the element's edge minus --window-control-size so the
// tail tip lands slightly inside the wrapped element.
const containerPortalStyle = (
	position: ClassicyBalloonPosition,
	rect: DOMRect,
	controlSize: number,
): CSSProperties => {
	const [vertical, horizontal] = position.split("-") as [
		"top" | "bottom",
		"left" | "center" | "right",
	];
	const viewport = getViewport();

	return {
		...(vertical === "top"
			? { bottom: `${viewport.height - rect.top}px` }
			: { top: `${rect.bottom}px` }),
		...(horizontal === "left" && { left: `${rect.right - controlSize}px` }),
		...(horizontal === "center" && {
			left: `${rect.left + rect.width / 2}px`,
			transform: "translateX(-50%)",
		}),
		...(horizontal === "right" && {
			right: `${viewport.width - rect.left - controlSize}px`,
		}),
	};
};

// Tail placement and flipping are handled by per-position classes in
// ClassicyBalloonHelp.scss; this maps the position prop onto those classes.
const tailPositionClasses = (position: ClassicyBalloonPosition): string => {
	const [vertical, horizontal] = position.split("-") as [
		"top" | "bottom",
		"left" | "center" | "right",
	];
	return [
		vertical === "top"
			? "classicyBalloonHelpTailTop"
			: "classicyBalloonHelpTailBottom",
		horizontal === "left" && "classicyBalloonHelpTailLeft",
		horizontal === "center" && "classicyBalloonHelpTailCenter",
		horizontal === "right" && "classicyBalloonHelpTailRight",
	]
		.filter(Boolean)
		.join(" ");
};

// The tail is a sibling of the bubble so it paints on top of the bubble's
// border. The white rect at the base covers the 2px overlap for a seamless
// junction.
const BalloonTail: FC<{ className: string }> = ({ className }) => (
	<svg
		className={`classicyBalloonHelpTail ${className}`}
		width="20"
		height="14"
		viewBox="0 0 20 14"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M 0,0 L 20,0 L 20,2 Q 9,8 0,14 Q 1,5 4,2 L 4,0 Z"
			fill="white"
			stroke="none"
		/>
		<path
			d="M 4,2 Q 1,5 0,14"
			fill="none"
			stroke="black"
			strokeWidth="1"
			strokeLinecap="round"
		/>
		<path
			d="M 0,14 Q 9,8 20,2"
			fill="none"
			stroke="black"
			strokeWidth="1"
			strokeLinecap="round"
		/>
	</svg>
);

/**
 * Balloon help behavior — hover timer, anchor measurement, and the portal —
 * bound to an element the caller already owns. Callers that can accept an extra
 * wrapper element should use `ClassicyBalloonHelp` instead; this hook exists for
 * callers that cannot, such as absolutely positioned desktop icons.
 *
 * Spread `handlers` (`onMouseEnter`/`onMouseLeave`) onto the element that
 * `anchorRef` points at and render `balloon` anywhere (it portals itself).
 * With no `config`, or while balloon help is globally disabled, `balloon` is
 * always `null`, unless `options.force` is set.
 *
 * Where it goes is the active package's `layout.balloonHelp.placement`:
 * `"anchor"` (the default) places the balloon against the anchor, on the
 * side `position` prefers. `"pointer"` (Windows 98's ToolTip) shows it once
 * the pointer has rested on the anchor for the delay (a move restarts the
 * wait), at the pointer: below it, its container carrying
 * `classicyBalloonHelpPointerBelow` (the package's stylesheet sets the
 * distance under the cursor), moved left to stay on the desktop, or above
 * the anchor (`classicyBalloonHelpPointerAbove`) where it would pass the
 * desktop's bottom, with no tail; a press on the anchor hides it until the
 * pointer leaves. The pointer is followed by listeners the hook adds to the
 * anchor element itself, so `handlers` keeps its keys and never
 * overrides the anchor's own mouse handlers.
 *
 * Every anchor given a `config` is also registered with it
 * (`registerClassicyHelpAnchor`), so under the package's
 * `layout.balloonHelp.contextHelp` `"whatsThis"` (Windows 98) a click on it
 * in the What's This? mode, or F1 with focus inside it, shows the same help
 * as a pop-up (`ClassicyWhatsThis.internal.ts`), whether or not balloons are
 * shown.
 *
 * `options.force` shows the balloon even while balloon help is turned off
 * (`System.Manager.Desktop.disableBalloonHelp`): for a surface whose tip is
 * a tooltip, which Windows shows whatever Balloon Help says (a taskbar
 * button's abbreviated title, WIG Ch.3 "Window Buttons", p.15; a tray
 * icon's name, Ch.10 "Status Notification", p.212; an icon-only bevel
 * button's name under `layout.balloonHelp.unlabeledTips`, Ch.12
 * "Tooltips", p.276). Omitted, the global toggle hides it as before.
 *
 * The package's `layout.balloonHelp` times it as Windows times a ToolTip
 * (WIG Ch.12 "Tooltips", p.276; Wine's tooltips.c), each key absent keeping
 * today's timing: `delayMs` is the wait where `config.delay` names none
 * (else 600); after `reshowMs` a tip whose pointer arrives within that long
 * of leaving another shown tip's element waits only that long, for the whole
 * visit; `autoPopMs` hides a shown tip after that long without a pointer
 * move over its element, until the pointer leaves; `hideOnPress` hides it,
 * or cancels its wait, on a press until the pointer leaves, at the anchor
 * too; and `activeWindowOnly` shows none in an inactive window (a
 * `.classicyWindow` root without the `active` state), hiding a shown one
 * when its window goes inactive, while an anchor outside any window is
 * unaffected.
 *
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const { handlers, balloon } = useClassicyBalloonHelp(ref, { content: "Hi", position: "top-right" });
 * return <div ref={ref} {...handlers}>target{balloon}</div>;
 * ```
 */
export const useClassicyBalloonHelp = (
	anchorRef: RefObject<HTMLElement | null>,
	config?: ClassicyIconBalloonHelp,
	options?: ClassicyBalloonHelpOptions,
): {
	handlers: {
		onMouseEnter: () => void;
		onMouseLeave: () => void;
		/** The balloon's id while it is showing, so the target is described by it. */
		"aria-describedby"?: string;
	};
	balloon: ReactNode;
} => {
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const tipLayout = useClassicyAppearanceLayout().balloonHelp;
	const atPointer = tipLayout?.placement === "pointer";
	// A tooltip shows whatever the global toggle says (`options.force`).
	const hiddenByToggle = disableBalloonHelp && options?.force !== true;
	// An element in an inactive window shows no tip under the package's
	// `activeWindowOnly`; one outside any window is unaffected. Read from the
	// window's root in the document (its `active` state class), when the tip
	// would show and while it shows.
	const activeWindowOnly = tipLayout?.activeWindowOnly === true;
	const inInactiveWindow = (): boolean => {
		if (!activeWindowOnly) return false;
		const win = anchorRef.current?.closest(".classicyWindow");
		return !!win && !win.classList.contains(ACTIVE_STATE);
	};
	const hideOnPress = atPointer || tipLayout?.hideOnPress === true;
	const autoPopMs = tipLayout?.autoPopMs;
	const reshowMs = tipLayout?.reshowMs;
	// The balloon is the tooltip (#310); the target points at it while shown.
	const balloonId = useId();
	const [visible, setVisible] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [controlSize, setControlSize] = useState(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	// Null until the balloon has been measured; the preferred position stands in
	// for that first layout pass.
	const [placed, setPlaced] = useState<ClassicyBalloonPosition | null>(null);

	const delay = config?.delay ?? tipLayout?.delayMs ?? 600;
	const position = config?.position ?? "top-left";

	// Pointer placement: where the tip opens (the pointer's last position when
	// the delay ran out), and where it settled once measured (null until then).
	const [point, setPoint] = useState<ClassicyBalloonPoint | null>(null);
	const [pointerFix, setPointerFix] =
		useState<ClassicyBalloonPointerPlacement | null>(null);
	// The pointer's last position over the anchor, whether it is over the
	// anchor at all, and whether a press there (or the auto-pop) has hidden
	// the tip until it leaves; read by the anchor's own listeners, which
	// outlive a render.
	const lastPointRef = useRef<ClassicyBalloonPoint | null>(null);
	const hoveringRef = useRef(false);
	const pressedRef = useRef(false);
	const visibleRef = useRef(false);
	visibleRef.current = visible;
	// The tip is on the page (shown, not held back by the toggle or an
	// inactive window): its pointer leaving stamps `lastShownTipLeftAt`,
	// under a package with a reshow time.
	const shownRef = useRef(false);
	// This visit's wait: the delay, or the reshow time when the pointer came
	// straight from another shown tip; restarts within the visit keep it.
	const waitRef = useRef(delay);
	// The newest start, so a listener added once restarts the current wait.
	const startRef = useRef<() => void>(() => {});

	const start = () => {
		if (inInactiveWindow()) return;
		if (atPointer && timerRef.current !== null) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			if (inInactiveWindow()) {
				timerRef.current = null;
				return;
			}
			if (anchorRef.current) {
				setRect(anchorRef.current.getBoundingClientRect());
			}
			setControlSize(readControlSize());
			if (atPointer) {
				timerRef.current = null;
				const rect = anchorRef.current?.getBoundingClientRect();
				setPoint(
					lastPointRef.current ??
						(rect
							? { x: rect.left + rect.width / 2, y: rect.bottom }
							: { x: 0, y: 0 }),
				);
				setPointerFix(null);
			}
			setVisible(true);
		}, waitRef.current);
	};
	startRef.current = start;

	const show = (event?: { clientX: number; clientY: number }) => {
		hoveringRef.current = true;
		pressedRef.current = false;
		const sinceLastTip = Date.now() - lastShownTipLeftAt;
		waitRef.current =
			reshowMs !== undefined && sinceLastTip >= 0 && sinceLastTip <= reshowMs
				? reshowMs
				: delay;
		if (atPointer && event && typeof event.clientX === "number")
			lastPointRef.current = { x: event.clientX, y: event.clientY };
		start();
	};

	const clearPop = () => {
		if (popTimerRef.current !== null) clearTimeout(popTimerRef.current);
		popTimerRef.current = null;
	};

	const hide = () => {
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		clearPop();
		if (shownRef.current && reshowMs !== undefined)
			lastShownTipLeftAt = Date.now();
		setVisible(false);
		setRect(null);
		setPlaced(null);
		hoveringRef.current = false;
		pressedRef.current = false;
		if (atPointer) {
			timerRef.current = null;
			setPoint(null);
			setPointerFix(null);
		}
	};

	// Hide the tip, or cancel its wait, until the pointer leaves: a press
	// under `hideOnPress` (or at the pointer), and the auto-pop.
	const holdOffRef = useRef<() => void>(() => {});
	holdOffRef.current = () => {
		pressedRef.current = true;
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		timerRef.current = null;
		clearPop();
		setVisible(false);
		setPoint(null);
		setPointerFix(null);
	};

	// The auto-pop (`autoPopMs`): armed when the tip shows, restarted by each
	// pointer move over the anchor while it shows (the listeners below).
	const armPopRef = useRef<() => void>(() => {});
	armPopRef.current = () => {
		clearPop();
		if (autoPopMs === undefined) return;
		popTimerRef.current = setTimeout(() => {
			popTimerRef.current = null;
			holdOffRef.current();
		}, autoPopMs);
	};
	useEffect(() => {
		if (!visible || autoPopMs === undefined) return;
		armPopRef.current();
		return () => {
			if (popTimerRef.current !== null) clearTimeout(popTimerRef.current);
			popTimerRef.current = null;
		};
	}, [visible, autoPopMs]);

	// Its window going inactive (`activeWindowOnly`) takes a shown tip away;
	// the pointer's next move, or its next arrival, once the window is active
	// again, starts again.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the anchor's window is read when the tip shows
	useEffect(() => {
		const win = anchorRef.current?.closest(".classicyWindow");
		if (!activeWindowOnly || !visible || !win) return;
		const watch = () => {
			if (win.classList.contains(ACTIVE_STATE)) return;
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			timerRef.current = null;
			setVisible(false);
			setPoint(null);
			setPointerFix(null);
		};
		const observer = new MutationObserver(watch);
		observer.observe(win, { attributes: true, attributeFilter: ["class"] });
		watch();
		return () => observer.disconnect();
	}, [activeWindowOnly, visible]);

	// The pointer over the anchor and a press there, through listeners on
	// the anchor element itself (the caller's own handlers stay its own).
	// Pointer placement: a move restarts the wait while no tip shows, as a
	// ToolTip waits for the pointer to rest; a shown tip stays where it
	// opened. A press hides the tip, or cancels the wait, until the pointer
	// leaves (WIG Ch.7 "Tooltip Controls", p.133: removed "when the user
	// clicks the control"), at the pointer or under `hideOnPress`; a move
	// while a tip shows restarts its auto-pop.
	const listening =
		(hideOnPress || autoPopMs !== undefined) && !!config && !hiddenByToggle;
	useEffect(() => {
		const anchor = anchorRef.current;
		if (!listening || !anchor) return;
		const onMove = (e: MouseEvent) => {
			lastPointRef.current = { x: e.clientX, y: e.clientY };
			if (visibleRef.current) {
				if (popTimerRef.current !== null) armPopRef.current();
				return;
			}
			if (!atPointer || !hoveringRef.current || pressedRef.current) return;
			startRef.current();
		};
		const onDown = () => {
			if (hideOnPress) holdOffRef.current();
		};
		anchor.addEventListener("mousemove", onMove);
		anchor.addEventListener("pointerdown", onDown);
		anchor.addEventListener("mousedown", onDown);
		return () => {
			anchor.removeEventListener("mousemove", onMove);
			anchor.removeEventListener("pointerdown", onDown);
			anchor.removeEventListener("mousedown", onDown);
		};
	}, [listening, anchorRef, atPointer, hideOnPress]);

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			if (popTimerRef.current !== null) clearTimeout(popTimerRef.current);
		},
		[],
	);

	// The anchor's help, kept for What's This? and F1 (the package's
	// `layout.balloonHelp.contextHelp`, ClassicyWhatsThis.internal.ts): a
	// click on the anchor in the mode, or F1 with focus inside it, shows
	// this config as a pop-up. A WeakMap entry per anchor, refreshed each
	// render and removed with the anchor or its config, whatever the layout
	// and whether balloons are shown; it changes nothing on the page.
	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		if (!anchor || !config) return;
		return registerClassicyHelpAnchor(anchor, config);
	});

	// The balloon's own size is only knowable once it is in the document, so the
	// side it opens toward is settled here rather than at show time. This runs
	// before paint, so a balloon that has to flip is never seen in the preferred
	// spot first. Resolving from `position` (not from `placed`) keeps it
	// idempotent — a flip cannot feed back into the next decision and oscillate.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (atPointer || !visible || !rect || !container) return;
		const { width, height } = container.getBoundingClientRect();
		if (width === 0 && height === 0) return;
		const next = resolveBalloonPosition(
			position,
			rect,
			{ width, height },
			controlSize,
			getViewport(),
		);
		setPlaced((current) => (current === next ? current : next));
	}, [atPointer, visible, rect, position, controlSize]);

	// A tip at the pointer is measured where it first lands (below the
	// pointer, the package's offset applied) and settled once, before paint;
	// resolving from that first box alone keeps it from oscillating.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!atPointer || !visible || !rect || !point || pointerFix || !container)
			return;
		const box = container.getBoundingClientRect();
		if (box.width === 0 && box.height === 0) return;
		setPointerFix(resolveBalloonPointerPlacement(point, box, pointerBounds()));
	}, [atPointer, visible, rect, point, pointerFix]);

	const pointerSide = pointerFix?.side ?? "below";
	const balloon =
		!config || hiddenByToggle || !visible || !rect || (atPointer && !point)
			? null
			: createPortal(
					<div
						ref={containerRef}
						className={
							atPointer
								? `classicyBalloonHelpContainer ${
										pointerSide === "above"
											? "classicyBalloonHelpPointerAbove"
											: "classicyBalloonHelpPointerBelow"
									}`
								: "classicyBalloonHelpContainer"
						}
						style={
							atPointer && point
								? pointerPortalStyle(point, rect, pointerFix)
								: containerPortalStyle(placed ?? position, rect, controlSize)
						}
					>
						<div className="classicyBalloonHelp" id={balloonId} role="tooltip">
							{config.title && (
								<p className="classicyBalloonHelpTitle">{config.title}</p>
							)}
							<p className="classicyBalloonHelpContent">{config.content}</p>
						</div>
						{!atPointer && (
							<BalloonTail
								className={tailPositionClasses(placed ?? position)}
							/>
						)}
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				);
	shownRef.current = balloon !== null;

	return {
		handlers: {
			onMouseEnter: show,
			onMouseLeave: hide,
			"aria-describedby": balloon ? balloonId : undefined,
		},
		balloon,
	};
};

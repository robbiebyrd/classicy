/**
 * Zoom rectangles: the outlines the Finder draws from an icon out to the
 * window it opens, and from the window back to the icon when it closes
 * (story 0230-n6c, measured in Infinite Mac).
 *
 * The path: the Drag Manager's `ZoomRects` (documented in Apple's patent
 * US5754178, which reproduces the Drag Manager reference) draws "gray
 * dithered rectangles incrementally toward the destination rectangle", at
 * most one step per tick (1/60 s), with `kZoomAccelerate` making each step
 * larger than the last. The Finders measured lay the same path: from the
 * icon's box (step 0) to the window's (step `steps`), the distance covered
 * by step k being `(growth^k - 1) / (growth^steps - 1)`, 11 steps with a
 * growth of 1.4 (each step 1.4 times the last), one step a tick.
 *
 * - System 7.5 draws every step from the icon (11 rectangles), erasing each
 *   one four steps after it is drawn (a trail of 4), then the window.
 * - Mac OS 8.1 draws only the six steps nearest the window (`firstStep` 5),
 *   keeping them all until the end, then the window: about 100 ms. Closing
 *   draws the same steps the other way, from the window's frame toward the
 *   icon, after the window is gone.
 * - Opening zooms to the window's content area (inside its frame, below its
 *   title bar); closing starts from its whole frame, as the 8.1 Finder's
 *   rectangles did.
 * - Launching an application from its icon zooms from the icon to the whole
 *   screen (the desktop), and only when the application was not running; the
 *   application's windows are drawn after it.
 * - The steps are paced by display frames (`requestAnimationFrame`): at most
 *   one a frame and none before its tick is due, as `ZoomRects` drew one a
 *   tick, so a frame the page is late to draw delays the rest without
 *   skipping or bunching any.
 *
 * A package opts in: it sets its themes' `zoomRects.enabled` knob to 1 and
 * draws the rectangles, the `data-classicy-part="zoom-rect"` elements, in its
 * stylesheet; a package that sets neither has no zoom. The path and pace are
 * the structural knobs `steps`, `growthPercent`, `firstStep`, `trail` and
 * `rate` (on the core floor at Mac OS 8.1's values), emitted as
 * `--zoom-rects-*`. Users who prefer reduced motion see none.
 *
 * The rectangles are drawn in a layer the core appends to the desktop (the
 * Classicy screen), outside React, so a zoom never re-renders anything.
 */

import "./ClassicyZoomRects.scss";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	CLASSICY_FILE_PATH_ATTRIBUTE,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { beginClassicyLaunchZoom } from "@/SystemFolder/SystemResources/Window/ClassicyZoomSources.internal";

export {
	CLASSICY_ZOOM_SOURCE_TTL_MS,
	noteClassicyWindowZoomSource,
	takeClassicyWindowZoomSource,
} from "@/SystemFolder/SystemResources/Window/ClassicyZoomSources.internal";

/** A box in viewport (client) pixels, as `getBoundingClientRect` gives it. */
export type ClassicyZoomRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * Where an open started: the box of the icon it was opened from, in viewport
 * pixels, and the desktop that icon is drawn on.
 */
export type ClassicyZoomOrigin = {
	rect: ClassicyZoomRect;
	desktop: HTMLElement | null;
};

/** Which way a zoom runs: out from an icon, or back to it. */
export type ClassicyZoomDirection = "open" | "close";

/**
 * A package's zoom, read from its themes' `zoomRects` knobs
 * (`readClassicyZoomRectsSettings`).
 */
export type ClassicyZoomRectsSettings = {
	/** Steps from the icon (0) to the window (`steps`). */
	steps: number;
	/** Each step's length over the one before it (1: equal steps). */
	growth: number;
	/** The first step drawn: the steps nearer the icon are skipped. */
	firstStep: number;
	/** Rectangles kept on screen; each older one is erased. 0 keeps them all. */
	trail: number;
	/** Steps per second. */
	rate: number;
};

/** The class of the layer that holds a zoom's rectangles. */
export const CLASSICY_ZOOM_RECTS_LAYER_CLASS = "classicyZoomRects";
/** The class of one rectangle. */
export const CLASSICY_ZOOM_RECT_CLASS = "classicyZoomRect";
/** The `data-classicy-part` a package draws. */
export const CLASSICY_ZOOM_RECT_PART = "zoom-rect";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the user asked the system for reduced motion. */
export const classicyPrefersReducedMotion = (): boolean =>
	typeof window !== "undefined" &&
	typeof window.matchMedia === "function" &&
	window.matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * How far along the path from the icon (0) to the window (1) step `k` of
 * `steps` lies, each step `growth` times as long as the one before.
 */
export const classicyZoomFraction = (
	k: number,
	steps: number,
	growth: number,
): number => {
	if (steps <= 0) return 1;
	if (growth === 1) return k / steps;
	return (growth ** k - 1) / (growth ** steps - 1);
};

/** The box a fraction `f` of the way from `from` to `to`, on whole pixels. */
export const classicyZoomRectAt = (
	from: ClassicyZoomRect,
	to: ClassicyZoomRect,
	f: number,
): ClassicyZoomRect => {
	const lerp = (a: number, b: number) => Math.round(a + (b - a) * f);
	const left = lerp(from.left, to.left);
	const top = lerp(from.top, to.top);
	const right = lerp(from.left + from.width, to.left + to.width);
	const bottom = lerp(from.top + from.height, to.top + to.height);
	return {
		left,
		top,
		width: Math.max(0, right - left),
		height: Math.max(0, bottom - top),
	};
};

/**
 * The rectangles a zoom draws, in the order it draws them: opening, steps
 * `firstStep` … `steps - 1` from the icon toward the window (the window
 * itself is the next step); closing, steps `steps` … `firstStep + 1`, from the
 * window's box back toward the icon.
 */
export const computeClassicyZoomRects = (
	icon: ClassicyZoomRect,
	window: ClassicyZoomRect,
	direction: ClassicyZoomDirection,
	settings: ClassicyZoomRectsSettings,
): ClassicyZoomRect[] => {
	const { steps, growth, firstStep } = settings;
	const ks: number[] = [];
	if (direction === "open") for (let k = firstStep; k < steps; k++) ks.push(k);
	else for (let k = steps; k > firstStep; k--) ks.push(k);
	return ks.map((k) =>
		classicyZoomRectAt(icon, window, classicyZoomFraction(k, steps, growth)),
	);
};

const clampInteger = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, Math.round(value)));

/**
 * The zoom the theme on `el` (else the desktop) declares, or `null` when its
 * package has not opted in: `zoomRects.enabled` is a package's own knob, not
 * on the core floor, read with a fallback of 0, so a package that does not
 * set it to 1 (and so draws no rectangles) has no zoom. `growthPercent`
 * (each step's length over the last's, in percent: 140) becomes `growth`
 * (1.4). Values out of range are brought into it: 1–64 steps, a first step
 * before the last, a growth above 0 (else equal steps), a rate of 1–240
 * steps a second.
 */
export const readClassicyZoomRectsSettings = (
	el?: Element | null,
): ClassicyZoomRectsSettings | null => {
	if (readClassicyThemeVar("--zoom-rects-enabled", 0, el) <= 0) return null;
	const read = (name: string) => readClassicyThemeVar(name, undefined, el);
	const steps = clampInteger(read("--zoom-rects-steps"), 1, 64);
	const growth = read("--zoom-rects-growth-percent") / 100;
	return {
		steps,
		growth: growth > 0 ? growth : 1,
		firstStep: clampInteger(read("--zoom-rects-first-step"), 0, steps - 1),
		trail: clampInteger(read("--zoom-rects-trail"), 0, 64),
		rate: Math.min(240, Math.max(1, read("--zoom-rects-rate"))),
	};
};

const toZoomRect = (box: DOMRect): ClassicyZoomRect => ({
	left: box.left,
	top: box.top,
	width: box.width,
	height: box.height,
});

/**
 * The zoom origin of an icon element: the box of its image (the icon, not
 * its label: the Finders' rectangles start at the icon), else of the element,
 * and the desktop it is on. Undefined for no element or one with no box.
 */
export const classicyZoomOriginOf = (
	el: Element | null | undefined,
): ClassicyZoomOrigin | undefined => {
	if (!el) return undefined;
	const box = (el.querySelector("img") ?? el).getBoundingClientRect();
	if (box.width <= 0 || box.height <= 0) return undefined;
	return {
		rect: toZoomRect(box),
		desktop: el.closest<HTMLElement>(".classicyDesktop"),
	};
};

const CONTENT_PARTS = [
	":scope > .classicyWindowHeader",
	":scope > .classicyWindowContents",
	':scope > [data-classicy-part="window-menu-bar"]',
	":scope > .classicyWindowPlacardBar",
].join(", ");

/**
 * The box a window opens into: its content area, the window's own menu bar,
 * header, contents (scroll bars included) and placard, inside its frame and
 * below its title bar, where the 8.1 Finder's rectangles ended (the window's
 * content region, `[45,89,421,249)` for a window whose frame was
 * `[40,68,427,255)`). A window with none of those parts drawn gives the
 * inside of its border below its title bar.
 */
export const classicyWindowContentRect = (el: Element): ClassicyZoomRect => {
	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;
	for (const part of el.querySelectorAll(CONTENT_PARTS)) {
		const box = part.getBoundingClientRect();
		if (box.width <= 0 || box.height <= 0) continue;
		left = Math.min(left, box.left);
		top = Math.min(top, box.top);
		right = Math.max(right, box.left + box.width);
		bottom = Math.max(bottom, box.top + box.height);
	}
	if (right > left && bottom > top) {
		return { left, top, width: right - left, height: bottom - top };
	}
	const box = el.getBoundingClientRect();
	const inLeft = box.left + el.clientLeft;
	const inTop = box.top + el.clientTop;
	const titleBar = el
		.querySelector(":scope > .classicyWindowTitleBar")
		?.getBoundingClientRect();
	const contentTop =
		titleBar &&
		titleBar.bottom > inTop &&
		titleBar.bottom < inTop + el.clientHeight
			? titleBar.bottom
			: inTop;
	return {
		left: inLeft,
		top: contentTop,
		width: el.clientWidth,
		height: Math.max(0, inTop + el.clientHeight - contentTop),
	};
};

const ICON_SELECTOR = [
	`.classicyDesktopIcon[${CLASSICY_DROP_FOLDER_ATTRIBUTE}]`,
	`.classicyIcon[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
	`.classicyFileBrowserViewTableRowContainer[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
].join(", ");

const iconPath = (el: Element): string | null =>
	el.classList.contains("classicyDesktopIcon")
		? el.getAttribute(CLASSICY_DROP_FOLDER_ATTRIBUTE)
		: el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE);

/**
 * The zoom origin of the icon that stands for `path` inside `scope`: a desktop
 * icon (a drive, the Trash, a folder on the desktop), an icon in a file
 * browser's icon view or a row of its list view. An icon in a window counts
 * only where the window shows it (not scrolled out of the window's box).
 */
export const classicyZoomOriginForPath = (
	scope: ParentNode,
	path: string,
): ClassicyZoomOrigin | undefined => {
	for (const el of scope.querySelectorAll(ICON_SELECTOR)) {
		if (iconPath(el) !== path) continue;
		const origin = classicyZoomOriginOf(el);
		if (!origin) continue;
		const win = el.closest(".classicyWindow")?.getBoundingClientRect();
		if (win) {
			const x = origin.rect.left + origin.rect.width / 2;
			const y = origin.rect.top + origin.rect.height / 2;
			if (x < win.left || x > win.right || y < win.top || y > win.bottom) {
				continue;
			}
		}
		return origin;
	}
	return undefined;
};

/**
 * Where a folder's window closes back to: the icon for `path` on `desktop`,
 * else the nearest enclosing folder's or drive's that shows (the 8.1 Finder
 * zoomed a window whose parent window was closed to the disk's icon).
 */
export const findClassicyZoomIcon = (
	desktop: ParentNode,
	path: string,
	separator = ":",
): ClassicyZoomOrigin | undefined => {
	for (let p = path; p !== ""; ) {
		const origin = classicyZoomOriginForPath(desktop, p);
		if (origin) return origin;
		const cut = p.lastIndexOf(separator);
		p = cut > 0 ? p.slice(0, cut) : "";
	}
	return undefined;
};

/** A running zoom. */
export type ClassicyZoomRectsHandle = {
	/**
	 * How long it runs at its pace, from the first rectangle to the last
	 * erase (ms): one step a tick (`1000 / rate` ms) per rectangle. A page
	 * late to draw a frame stretches it.
	 */
	durationMs: number;
	/** Ends it now, erasing its rectangles (no `onEnd`). */
	cancel: () => void;
};

export type ClassicyZoomRectsPlay = {
	/** The desktop the rectangles are drawn on. */
	desktop: HTMLElement;
	/** The icon's box (viewport px). */
	icon: ClassicyZoomRect;
	/** The window's box (viewport px): opening, its content; closing, its frame. */
	window: ClassicyZoomRect;
	direction: ClassicyZoomDirection;
	/** The zoom to draw; read from the desktop's theme when omitted. */
	settings?: ClassicyZoomRectsSettings | null;
	/** Called when the last rectangle is erased. */
	onEnd?: () => void;
};

/** A frame scheduler: the display's, else a timer at the step's pace. */
const requestFrame = (
	callback: (time: number) => void,
	fallbackMs: number,
): (() => void) => {
	if (typeof requestAnimationFrame === "function") {
		const id = requestAnimationFrame(callback);
		return () => cancelAnimationFrame(id);
	}
	const id = setTimeout(() => callback(performance.now()), fallbackMs);
	return () => clearTimeout(id);
};

/**
 * Draws a zoom on `desktop`. The first rectangle is drawn at once (with the
 * window's box known), and the frame that shows it starts the clock; then
 * each display frame draws the next rectangle once its tick is due
 * (`1000 / rate` ms after the one before, within a quarter of a tick, so a
 * frame a little early still takes it), never more than one a frame, each
 * older than `trail` erased as the next is drawn, and all of them erased a
 * tick after the last, when `onEnd` runs. At 60 Hz that is one rectangle a
 * frame; on a faster display some frames draw none; a late frame delays
 * the rest instead of skipping one. Returns null, drawing nothing, when the
 * package has not opted in, the user prefers reduced motion, the page is
 * hidden (no frames come), or the boxes have no size.
 */
export const playClassicyZoomRects = ({
	desktop,
	icon,
	window: windowBox,
	direction,
	settings: given,
	onEnd,
}: ClassicyZoomRectsPlay): ClassicyZoomRectsHandle | null => {
	if (classicyPrefersReducedMotion()) return null;
	const doc = desktop.ownerDocument;
	if (doc.visibilityState === "hidden") return null;
	const settings =
		given === undefined ? readClassicyZoomRectsSettings(desktop) : given;
	if (!settings) return null;
	if (
		icon.width <= 0 ||
		icon.height <= 0 ||
		windowBox.width <= 0 ||
		windowBox.height <= 0
	) {
		return null;
	}
	const rects = computeClassicyZoomRects(icon, windowBox, direction, settings);
	if (rects.length === 0) return null;
	const stepMs = 1000 / settings.rate;
	const slack = stepMs / 4;

	const desktopBox = desktop.getBoundingClientRect();
	const originX = desktopBox.left + desktop.clientLeft - desktop.scrollLeft;
	const originY = desktopBox.top + desktop.clientTop - desktop.scrollTop;
	const layer = doc.createElement("div");
	layer.className = CLASSICY_ZOOM_RECTS_LAYER_CLASS;
	layer.setAttribute("aria-hidden", "true");
	desktop.append(layer);

	const drawn: HTMLElement[] = [];
	const draw = (r: ClassicyZoomRect) => {
		const x = Math.round(r.left - originX);
		const y = Math.round(r.top - originY);
		const el = doc.createElement("div");
		el.className = CLASSICY_ZOOM_RECT_CLASS;
		el.setAttribute("data-classicy-part", CLASSICY_ZOOM_RECT_PART);
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;
		el.style.width = `${r.width}px`;
		el.style.height = `${r.height}px`;
		// The desktop's corner from the rectangle's own, so a package lays
		// its pattern from the desktop, as QuickDraw laid it from the screen.
		el.style.setProperty("--classicy-pattern-origin-x", `${-x}px`);
		el.style.setProperty("--classicy-pattern-origin-y", `${-y}px`);
		layer.append(el);
		drawn.push(el);
		if (settings.trail > 0 && drawn.length > settings.trail) {
			drawn[drawn.length - 1 - settings.trail]?.remove();
		}
	};

	// Step n is due `n` ticks after the frame that shows the first.
	let shownAt: number | undefined;
	let step = 0;
	let cancelFrame: (() => void) | undefined;
	let done = false;
	const finish = () => {
		done = true;
		cancelFrame?.();
		cancelFrame = undefined;
		layer.remove();
	};
	const frame = (time: number) => {
		cancelFrame = undefined;
		if (shownAt === undefined) shownAt = time;
		else if (time >= shownAt + (step + 1) * stepMs - slack) {
			step += 1;
			if (step >= rects.length) {
				finish();
				onEnd?.();
				return;
			}
			draw(rects[step]);
		}
		cancelFrame = requestFrame(frame, stepMs);
	};
	draw(rects[0]);
	cancelFrame = requestFrame(frame, stepMs);

	return {
		durationMs: rects.length * stepMs,
		cancel: () => {
			if (!done) finish();
		},
	};
};

/**
 * The zoom of an application launched from its icon: from the icon out to
 * the whole desktop (the 8.1 Finder zoomed to the screen, and only when the
 * application was not already running: callers check that,
 * `withClassicyLaunchZoom`). The windows of `appIds` that open while it runs
 * are drawn when it ends (8.1 drew the application's window after it).
 * Null when it draws nothing.
 */
export const playClassicyLaunchZoom = (
	origin: ClassicyZoomOrigin | undefined,
	appIds: string[] = [],
): ClassicyZoomRectsHandle | null => {
	const desktop = origin?.desktop;
	if (!origin || !desktop?.isConnected) return null;
	const end = beginClassicyLaunchZoom(appIds);
	const zoom = playClassicyZoomRects({
		desktop,
		icon: origin.rect,
		window: toZoomRect(desktop.getBoundingClientRect()),
		direction: "open",
		onEnd: end,
	});
	if (!zoom) {
		end();
		return null;
	}
	return {
		durationMs: zoom.durationMs,
		cancel: () => {
			zoom.cancel();
			end();
		},
	};
};

/**
 * Finder-style drag-and-drop of file system items between Finder windows, the
 * desktop, and folder or drive icons on either.
 *
 * A drag is tracked at the document level, so it can leave the window it
 * started in: past a few pixels of travel an outline of the item follows the
 * pointer, the drop target under it is highlighted, and release resolves the
 * target and hands it to the source. Targets are marked in the DOM:
 *
 * - `data-classicy-drop-folder="<path>"` — a folder or drive the item can be
 *   moved into (a Finder window's contents, a folder icon or list row, a drive
 *   or folder icon on the desktop);
 * - `data-classicy-drop-desktop` — the desktop itself (its Desktop Folder).
 *
 * Only the topmost element under the pointer counts, walking up to the first
 * marked ancestor. Windows, the menu bar and the Control Strip block a drop, so
 * releasing over, say, a SimpleText window moves nothing.
 *
 * While the pointer rests within a line step of a scroll area's edge, and
 * that area holds drop targets (a Finder window's contents), the area
 * scrolls toward that edge a line at a time until it can go no further, so
 * a folder out of view can be reached (automatic scrolling: WIG Ch.5
 * "Scrolling When Transferring by Dragging", p.72, and Ch.6 "Automatic
 * Scrolling", p.91; HIG7 p.274, as the Mac OS Finder scrolled a window an
 * icon was dragged to the edge of).
 */

import "./ClassicyFileDrag.scss";
import {
	type ClassicyFileDragOutlinePart,
	drawClassicyDragOutline,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	type ClassicyScrollAxisMetrics,
	classicyScrollAxisEnds,
} from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";
import { classicyScrollViewportOf } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/** The attribute a file item (an icon, a list row's name) carries its path in. */
export const CLASSICY_FILE_PATH_ATTRIBUTE = "data-classicy-file-path";
export const CLASSICY_DROP_FOLDER_ATTRIBUTE = "data-classicy-drop-folder";
export const CLASSICY_DROP_DESKTOP_ATTRIBUTE = "data-classicy-drop-desktop";

/** Pixels the pointer must travel before a press becomes a drag. */
export const CLASSICY_FILE_DRAG_THRESHOLD = 4;

const DROP_TARGET_HIGHLIGHT_CLASS = "classicyFileDropTarget";
const DRAGGING_BODY_CLASS = "classicyFileDragging";
const BLOCKING_SELECTOR =
	".classicyWindow, .classicyDesktopMenuBar, .classicyControlStrip, [role='dialog']";

/** Where a dragged item lands: a folder (or drive) by path, or the desktop. */
export type ClassicyFileDropDestination =
	| { kind: "folder"; path: string }
	| { kind: "desktop" };

export type ClassicyFileDropTarget = {
	destination: ClassicyFileDropDestination;
	/** The marked element that resolved the target (highlighted while over it). */
	element: Element;
};

type ElementsFromPoint = (x: number, y: number) => Element[];

const defaultElementsFromPoint: ElementsFromPoint = (x, y) =>
	typeof document !== "undefined" && document.elementsFromPoint
		? document.elementsFromPoint(x, y)
		: [];

/**
 * The drop target under a client point, or null when there is none (or the
 * point is over something that refuses drops). `exclude` skips the dragged
 * element itself — a desktop icon follows the pointer, so it is often the
 * topmost element. `elementsFromPoint` is injectable because jsdom has none.
 */
export function findClassicyFileDropTarget(
	x: number,
	y: number,
	{
		exclude,
		elementsFromPoint = defaultElementsFromPoint,
	}: { exclude?: Element | null; elementsFromPoint?: ElementsFromPoint } = {},
): ClassicyFileDropTarget | null {
	for (const hit of elementsFromPoint(x, y)) {
		if (exclude?.contains(hit)) continue;
		for (let el: Element | null = hit; el; el = el.parentElement) {
			const folder = el.getAttribute(CLASSICY_DROP_FOLDER_ATTRIBUTE);
			if (folder !== null) {
				return { destination: { kind: "folder", path: folder }, element: el };
			}
			if (el.hasAttribute(CLASSICY_DROP_DESKTOP_ATTRIBUTE)) {
				return { destination: { kind: "desktop" }, element: el };
			}
			if (el.matches(BLOCKING_SELECTOR)) return null;
		}
		return null;
	}
	return null;
}

/**
 * Where a scroll area under a file drag's pointer at `x`, `y` scrolls, or
 * null: the topmost element there (`exclude`, the dragged element, aside)
 * inside a `ClassicyScrollArea`'s viewport that holds a drop target (or
 * lies in one), the pointer within the area's line step of the viewport's
 * edge, toward an edge the viewport can still scroll to. `dx` and `dy` are
 * the line step's signed pixels (0 on an axis with nothing to do), both
 * near a corner. `elementsFromPoint` is injectable because jsdom has none.
 */
export function findClassicyFileDragAutoScroll(
	x: number,
	y: number,
	{
		exclude,
		elementsFromPoint = defaultElementsFromPoint,
	}: { exclude?: Element | null; elementsFromPoint?: ElementsFromPoint } = {},
): { viewport: HTMLElement; dx: number; dy: number } | null {
	const hit = elementsFromPoint(x, y).find((el) => !exclude?.contains(el));
	const found = classicyScrollViewportOf(hit ?? null);
	if (!found) return null;
	const { element: viewport, entry } = found;
	// Only an area the dragged item could be dropped in moves.
	if (
		!viewport.closest(`[${CLASSICY_DROP_FOLDER_ATTRIBUTE}]`) &&
		!viewport.querySelector(`[${CLASSICY_DROP_FOLDER_ATTRIBUTE}]`)
	) {
		return null;
	}
	const r = viewport.getBoundingClientRect();
	// Inside the viewport, its right and bottom edges counted out (the
	// pointer at a pixel's column is `clientX`).
	if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return null;
	const step = entry.lineStep();
	// In the band a line step wide inside an edge the viewport can still
	// scroll toward (within a pixel of its end counts as there, as the
	// scroll arrows' `disabled` does).
	const toward = (
		at: number,
		start: number,
		end: number,
		axis: ClassicyScrollAxisMetrics,
	) => {
		const ends = classicyScrollAxisEnds(axis);
		if (at < start + step && !ends.start) return -step;
		if (at >= end - step && !ends.end) return step;
		return 0;
	};
	const dx = toward(x, r.left, r.right, {
		total: viewport.scrollWidth,
		visible: viewport.clientWidth,
		position: viewport.scrollLeft,
	});
	const dy = toward(y, r.top, r.bottom, {
		total: viewport.scrollHeight,
		visible: viewport.clientHeight,
		position: viewport.scrollTop,
	});
	return dx || dy ? { viewport, dx, dy } : null;
}

/** How a file drag ended, as `onEnd` reports it. */
export type ClassicyFileDragEnd = {
	/**
	 * Released over a drop target, which is handed to `onDrop`. The source may
	 * still refuse the move (a locked item, the same folder).
	 */
	dropped: boolean;
	/**
	 * Ended without a release: Escape, the pointer stream lost (the window
	 * blurred, a `pointercancel`, the page hidden), or the function
	 * `startClassicyFileDrag` returns. A release over nothing is neither
	 * dropped nor canceled.
	 */
	canceled: boolean;
	/**
	 * Ended by the pointer stream being lost (always canceled too), not by
	 * Escape, a release or the caller abandoning it.
	 */
	lost: boolean;
};

export type ClassicyFileDragOptions = {
	/** The press that may become a drag. */
	start: { clientX: number; clientY: number };
	/**
	 * Each dragged item's icon image and label, measured when the drag starts:
	 * the outline that follows the pointer traces them (see
	 * `drawClassicyDragOutline`).
	 */
	parts: ClassicyFileDragOutlinePart[];
	/** Element(s) of the item being dragged, skipped when hit-testing. */
	source?: Element | null;
	/**
	 * Release after a real drag, with the target under the pointer (or null),
	 * the pointer, and where the outline's top-left corner was let go — the
	 * point an item dropped in place should move to.
	 */
	onDrop: (
		target: ClassicyFileDropTarget | null,
		point: [number, number],
		outlineTopLeft: [number, number],
	) => void;
	/** Release without the pointer ever traveling far enough to drag. */
	onClick?: () => void;
	/**
	 * The press became a drag: called once, when the pointer first travels
	 * `CLASSICY_FILE_DRAG_THRESHOLD` px, just after the outline appears. A
	 * press that never travels that far (a click) never calls it.
	 */
	onStart?: () => void;
	/**
	 * The drag that `onStart` reported is over: called exactly once per
	 * `onStart`, and never without one, after the outline is removed and before
	 * `onDrop`. See `ClassicyFileDragEnd` for how it ended. If it throws, the
	 * error is logged (`classicyLog`, subsystem "ClassicyFileDrag") and the
	 * drop still happens.
	 */
	onEnd?: (end: ClassicyFileDragEnd) => void;
	/** Injectable for tests. */
	elementsFromPoint?: ElementsFromPoint;
};

/**
 * Track a press as a possible drag. Returns a function that abandons it (a
 * drag in progress then ends as canceled, and nothing is dropped): a source
 * component calls it when it unmounts, so the drag never outlives it. The outline is only created once
 * the pointer has traveled `CLASSICY_FILE_DRAG_THRESHOLD` px, so a plain click
 * stays a click; Escape cancels a drag in progress without dropping. Losing
 * the pointer stream (the window blurs, a `pointercancel`, the page is
 * hidden) cancels it the same way, and abandons a press that has not dragged
 * yet: the release that would end it may never arrive, and one that does
 * comes from wherever the pointer is on return.
 */
export function startClassicyFileDrag(
	options: ClassicyFileDragOptions,
): () => void {
	const { start, source, elementsFromPoint } = options;
	let ghost: HTMLElement | null = null;
	// The outline keeps the items' offset from the pointer at the press.
	let grabOffset: [number, number] = [0, 0];
	let highlighted: Element | null = null;

	const setHighlight = (element: Element | null) => {
		if (highlighted === element) return;
		highlighted?.classList.remove(DROP_TARGET_HIGHLIGHT_CLASS);
		highlighted = element;
		highlighted?.classList.add(DROP_TARGET_HIGHLIGHT_CLASS);
	};

	const placeGhost = (x: number, y: number) => {
		if (ghost) {
			ghost.style.transform = `translate(${x - grabOffset[0]}px, ${y - grabOffset[1]}px)`;
		}
	};

	const createGhost = () => {
		ghost = document.createElement("div");
		ghost.className = "classicyFileDragGhost";
		ghost.setAttribute("aria-hidden", "true");
		const outline = drawClassicyDragOutline(options.parts);
		if (outline) {
			ghost.append(outline.canvas);
			grabOffset = [start.clientX - outline.left, start.clientY - outline.top];
		}
		document.body.append(ghost);
		document.body.classList.add(DRAGGING_BODY_CLASS);
	};

	// Set once the listeners are added, below.
	let stopWatchingPointerStream = () => {};

	// The automatic scrolling's repeat, while one runs (below).
	let autoScroll: ReturnType<typeof setInterval> | null = null;
	const stopAutoScroll = () => {
		if (autoScroll !== null) clearInterval(autoScroll);
		autoScroll = null;
	};

	const cleanup = () => {
		stopAutoScroll();
		stopWatchingPointerStream();
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", onUp, true);
		document.removeEventListener("keydown", onKey, true);
		setHighlight(null);
		ghost?.remove();
		ghost = null;
		document.body.classList.remove(DRAGGING_BODY_CLASS);
	};

	// A caller's onEnd that throws must not lose the drop that follows it
	// (package hooks are isolated the same way, inside `emit`).
	const reportEnd = (end: ClassicyFileDragEnd) => {
		try {
			options.onEnd?.(end);
		} catch (error) {
			classicyLog("error", "ClassicyFileDrag", "onEnd threw; ignored.", error);
		}
	};

	const targetAt = (x: number, y: number) =>
		findClassicyFileDropTarget(x, y, { exclude: source, elementsFromPoint });

	// The pointer as last moved, and the drop target highlighted for it.
	let pointer: [number, number] = [start.clientX, start.clientY];
	const highlightAt = (x: number, y: number) => {
		// The desktop itself isn't highlighted (Mac OS 8 doesn't); folders are.
		const target = targetAt(x, y);
		setHighlight(target?.destination.kind === "folder" ? target.element : null);
	};

	// Automatic scrolling: while the pointer rests near a scroll area's
	// edge, a line per press-repeat interval (a held scroll arrow's rate),
	// the first after one interval, so a pointer crossing the band on its
	// way elsewhere scrolls nothing. The content moved under a still
	// pointer, so the target under it is found again.
	const autoScrollAt = (x: number, y: number) =>
		findClassicyFileDragAutoScroll(x, y, {
			exclude: source,
			elementsFromPoint,
		});
	const followAutoScroll = () => {
		if (!autoScrollAt(pointer[0], pointer[1])) {
			stopAutoScroll();
			return;
		}
		if (autoScroll !== null) return;
		autoScroll = setInterval(() => {
			const scroll = autoScrollAt(pointer[0], pointer[1]);
			if (!scroll) {
				stopAutoScroll();
				return;
			}
			classicyScrollViewportOf(scroll.viewport)?.entry.scrollBy(
				scroll.dx,
				scroll.dy,
			);
			highlightAt(pointer[0], pointer[1]);
		}, CLASSICY_PRESS_REPEAT_INTERVAL_MS);
	};

	function onMove(e: MouseEvent) {
		if (!ghost) {
			const traveled = Math.max(
				Math.abs(e.clientX - start.clientX),
				Math.abs(e.clientY - start.clientY),
			);
			if (traveled < CLASSICY_FILE_DRAG_THRESHOLD) return;
			createGhost();
			options.onStart?.();
		}
		e.preventDefault();
		pointer = [e.clientX, e.clientY];
		placeGhost(e.clientX, e.clientY);
		highlightAt(e.clientX, e.clientY);
		followAutoScroll();
	}

	function onUp(e: MouseEvent) {
		const dragged = ghost !== null;
		cleanup();
		if (!dragged) {
			options.onClick?.();
			return;
		}
		// Hit-tested once the outline and highlight are gone.
		const target = targetAt(e.clientX, e.clientY);
		reportEnd({ dropped: target !== null, canceled: false, lost: false });
		options.onDrop(
			target,
			[e.clientX, e.clientY],
			[e.clientX - grabOffset[0], e.clientY - grabOffset[1]],
		);
	}

	// Escape, a lost pointer stream (`lost`), or the caller abandoning the
	// press: a drag in progress ends canceled. Once: cleanup removes the listeners and the outline, so
	// nothing can end it again.
	const cancel = (lost: boolean) => {
		const dragged = ghost !== null;
		cleanup();
		if (dragged) reportEnd({ dropped: false, canceled: true, lost });
	};

	function onKey(e: KeyboardEvent) {
		if (e.key !== "Escape" || !ghost) return;
		e.preventDefault();
		e.stopPropagation();
		cancel(false);
	}

	document.addEventListener("mousemove", onMove, true);
	document.addEventListener("mouseup", onUp, true);
	document.addEventListener("keydown", onKey, true);
	stopWatchingPointerStream = onClassicyPointerStreamLost(() => cancel(true));
	return () => cancel(false);
}

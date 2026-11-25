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
 * "Scrolling When Transferring by Dragging", pp.64-65, and Ch.6 "Automatic
 * Scrolling", p.91; HIG7 p.274, as the Mac OS Finder scrolled a window an
 * icon was dragged to the edge of).
 *
 * Under a package's `layout.transfer` (Windows 98) a drag also takes
 * Explorer's transfer rules (WIG Ch.5 "Direct Manipulation Method",
 * pp.62-64; "Shortcut Keys for Transfer Operations", pp.67-68): a drag on
 * button 2 ends in its source's transfer menu (`button`, `onMenu`),
 * Control at the release copies and Control with Shift makes shortcuts
 * (`copyModifier`, the drop's `effect`), and the scroll areas scroll by
 * the pointer's velocity (`autoScroll`,
 * `ClassicyFileDragAutoScroll.internal.ts`). Under every package the
 * desktop root carries `data-classicy-drop` while the outline is shown
 * (`"none"` over nothing that takes the drop, `"copy"` or `"link"` where
 * the drop would copy or make shortcuts, `"move"` over a target it would
 * move to), which only a package's stylesheet reads.
 */

import "./ClassicyFileDrag.scss";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	addClassicyDragScrollSample,
	CLASSICY_DRAG_SCROLL_INTERVAL_MS,
	CLASSICY_DRAG_SCROLL_MAX_VELOCITY,
	CLASSICY_DRAG_SCROLL_SAMPLE_INTERVAL_MS,
	type ClassicyDragScrollZone,
	classicyDragScrollVelocity,
	createClassicyDragScrollData,
	findClassicyFileDragVelocityScroll,
	readClassicyDragScrollZone,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAutoScroll.internal";
import {
	type ClassicyFileDragOutlinePart,
	drawClassicyDragOutline,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import {
	type ClassicyFileDragKeys,
	classicyFileDragFeedbackRoot,
	classicyFileDragPressCtrlOnMac,
	classicyFileDragRequestedEffect,
	classicyFileDropDestinationEffects,
	classicyFileDropEffectFor,
	setClassicyFileDropFeedback,
	swallowClassicyFileDragContextMenu,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragTransfer.internal";
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

/**
 * What a drop does with the items: moves them, copies them, or makes
 * shortcuts to them (Windows' `DROPEFFECT_MOVE`, `_COPY`, `_LINK`). A drag
 * moves unless the package's `layout.transfer.copyModifier` reads its keys
 * or its transfer menu (`layout.transfer.secondaryButton`) is chosen from.
 */
export type ClassicyFileDropEffect = "move" | "copy" | "link";

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
	 * Released over a drop target, which is handed to `onDrop` (or, for a
	 * button-2 drag, `onMenu`, whose Cancel may still do nothing). The
	 * source may still refuse the move (a locked item, the same folder).
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
	/**
	 * The press that may become a drag. `ctrlKey` and `shiftKey` are the
	 * keys it began with: the copy modifier is read later, never from the
	 * press, but a press that began with Control on a Mac host (its
	 * secondary click) moves throughout.
	 */
	start: {
		clientX: number;
		clientY: number;
		ctrlKey?: boolean;
		shiftKey?: boolean;
	};
	/**
	 * The button that pressed, when the drag ends only on that button's
	 * release (a button-2 drag, `layout.transfer.secondaryButton`);
	 * omitted, any release ends it, as before. With `2`, the release over
	 * a target calls `onMenu` (when given) in place of `onDrop`, and the
	 * browser's `contextmenu` that follows a release is swallowed.
	 */
	button?: number;
	/**
	 * A button-2 drag let go over a target (`button: 2`): the source shows
	 * its transfer menu at `point`, `effect` being what a plain drop there
	 * would do (its default item), and does the transfer chosen.
	 */
	onMenu?: (
		target: ClassicyFileDropTarget,
		point: [number, number],
		outlineTopLeft: [number, number],
		effect: ClassicyFileDropEffect,
	) => void;
	/**
	 * Whether `target` takes this drag: a target it refuses is neither
	 * highlighted nor dropped on (`onDrop` gets null), as if there were
	 * none. Omitted, every target takes it.
	 */
	canDrop?: (target: ClassicyFileDropTarget) => boolean;
	/**
	 * The effects `target` takes for the dragged items (a move alone into
	 * the Trash; no copy of what cannot be copied): the copy modifier asks
	 * only for one of them, falling back to a move, and a target taking
	 * none refuses the drag. Omitted, every effect but where the Trash
	 * takes a move alone (`classicyFileDropDestinationEffects`).
	 */
	effects?: (
		target: ClassicyFileDropTarget,
	) => readonly ClassicyFileDropEffect[];
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
	 * the pointer, where the outline's top-left corner was let go — the
	 * point an item dropped in place should move to — and what the drop
	 * does there (`"move"` unless the package's copy modifier was held; a
	 * move over no target).
	 */
	onDrop: (
		target: ClassicyFileDropTarget | null,
		point: [number, number],
		outlineTopLeft: [number, number],
		effect: ClassicyFileDropEffect,
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
 *
 * While the outline is shown the desktop root (the `.classicyDesktop`
 * around `source`) carries `data-classicy-drop`, the drop effect under the
 * pointer: `"none"` while nothing there takes the drop (a window, the menu
 * bar, a target `canDrop` refuses), else `"move"`, `"copy"` or `"link"`;
 * the attribute goes when the drag ends, however it ends. The package's
 * `layout.transfer` keys add a button-2 drag's menu (`button`, `onMenu`),
 * the copy modifier (`copyModifier`, read on each move, on Control and
 * Shift presses and at the release) and the velocity rule for automatic
 * scrolling (`autoScroll`).
 */
export function startClassicyFileDrag(
	options: ClassicyFileDragOptions,
): () => void {
	const { start, source, elementsFromPoint } = options;
	// The package's transfer rules, as they stand at the press.
	const layout = getClassicyAppearanceLayout();
	const velocityScroll = layout.transfer?.autoScroll === true;
	// Only a drag on button 2 ends in a menu, and only its button's release
	// ends it.
	const secondary = options.button === 2;
	// The keys the copy modifier reads: the press's until the pointer moves.
	let keys: ClassicyFileDragKeys = {
		ctrlKey: start.ctrlKey === true,
		shiftKey: start.shiftKey === true,
	};
	const pressCtrlOnMac = classicyFileDragPressCtrlOnMac(start.ctrlKey);
	// Where `data-classicy-drop` goes, and the target it was set for.
	const feedbackRoot = classicyFileDragFeedbackRoot(source);
	let feedbackTarget: ClassicyFileDropTarget | null = null;
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

	// The automatic scrolling's repeat, while one runs (below), and the
	// velocity rule's sampling timer (`layout.transfer.autoScroll`).
	let autoScroll: ReturnType<typeof setInterval> | null = null;
	let sampling: ReturnType<typeof setInterval> | null = null;
	const stopAutoScroll = () => {
		if (autoScroll !== null) clearInterval(autoScroll);
		autoScroll = null;
		if (sampling !== null) clearInterval(sampling);
		sampling = null;
	};

	const cleanup = () => {
		stopAutoScroll();
		stopWatchingPointerStream();
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", onUp, true);
		document.removeEventListener("keydown", onKey, true);
		document.removeEventListener("keyup", onKeyUp, true);
		setHighlight(null);
		feedbackTarget = null;
		setClassicyFileDropFeedback(feedbackRoot, null);
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

	// The effects a target takes for this drag; none refuses it.
	const effectsAt = (target: ClassicyFileDropTarget) =>
		options.effects?.(target) ??
		classicyFileDropDestinationEffects(target.destination);
	// The target under a point that takes the drag, or null.
	const targetAt = (x: number, y: number) => {
		const target = findClassicyFileDropTarget(x, y, {
			exclude: source,
			elementsFromPoint,
		});
		if (!target) return null;
		if (options.canDrop && !options.canDrop(target)) return null;
		return effectsAt(target).length > 0 ? target : null;
	};
	// What a drop on `target` does with the keys as they are.
	const effectAt = (target: ClassicyFileDropTarget) =>
		classicyFileDropEffectFor(
			classicyFileDragRequestedEffect(layout, keys, pressCtrlOnMac),
			effectsAt(target),
		);
	// The desktop root's `data-classicy-drop` for the target under the
	// pointer, while the outline is shown.
	const showFeedback = () => {
		if (!ghost) return;
		if (!feedbackTarget) {
			setClassicyFileDropFeedback(feedbackRoot, "none");
			return;
		}
		setClassicyFileDropFeedback(feedbackRoot, effectAt(feedbackTarget));
	};

	// The pointer as last moved, and the drop target highlighted for it.
	let pointer: [number, number] = [start.clientX, start.clientY];
	const highlightAt = (x: number, y: number) => {
		// The desktop itself isn't highlighted (Mac OS 8 doesn't); folders are.
		const target = targetAt(x, y);
		setHighlight(target?.destination.kind === "folder" ? target.element : null);
		feedbackTarget = target;
		showFeedback();
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

	// The velocity rule (`layout.transfer.autoScroll`; WIG Ch.5 "Scrolling
	// When Transferring by Dragging", pp.64-65): the pointer sampled at the
	// drag's start, on each move and on a timer; at each sample the area
	// under it scrolls a line toward the edge it rests by, when it moves
	// slowly enough and long enough after the last scroll
	// (`ClassicyFileDragAutoScroll.internal.ts`, Windows 98 SE's figures).
	const scrollData = createClassicyDragScrollData();
	let scrollZone: ClassicyDragScrollZone | null = null;
	const sampleAutoScroll = () => {
		const now = Date.now();
		const full = addClassicyDragScrollSample(scrollData, {
			x: pointer[0],
			y: pointer[1],
			t: now,
		});
		if (!full) return;
		if (
			classicyDragScrollVelocity(scrollData) > CLASSICY_DRAG_SCROLL_MAX_VELOCITY
		)
			return;
		if (
			scrollData.lastScroll !== null &&
			now - scrollData.lastScroll < CLASSICY_DRAG_SCROLL_INTERVAL_MS
		)
			return;
		scrollZone ??= readClassicyDragScrollZone();
		const scroll = findClassicyFileDragVelocityScroll(pointer[0], pointer[1], {
			exclude: source,
			elementsFromPoint,
			zone: scrollZone,
		});
		if (!scroll) return;
		classicyScrollViewportOf(scroll.viewport)?.entry.scrollBy(
			scroll.dx,
			scroll.dy,
		);
		scrollData.lastScroll = now;
		highlightAt(pointer[0], pointer[1]);
	};

	function onMove(e: MouseEvent) {
		const starting = !ghost;
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
		keys = { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
		placeGhost(e.clientX, e.clientY);
		highlightAt(e.clientX, e.clientY);
		if (!velocityScroll) {
			followAutoScroll();
			return;
		}
		sampleAutoScroll();
		if (starting && sampling === null) {
			sampling = setInterval(
				sampleAutoScroll,
				CLASSICY_DRAG_SCROLL_SAMPLE_INTERVAL_MS,
			);
		}
	}

	function onUp(e: MouseEvent) {
		// A button-2 drag ends at that button's release alone.
		if (options.button !== undefined && e.button !== options.button) return;
		const dragged = ghost !== null;
		if (dragged) keys = { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
		cleanup();
		if (!dragged) {
			options.onClick?.();
			return;
		}
		// Hit-tested once the outline and highlight are gone.
		const target = targetAt(e.clientX, e.clientY);
		const point: [number, number] = [e.clientX, e.clientY];
		const outlineTopLeft: [number, number] = [
			e.clientX - grabOffset[0],
			e.clientY - grabOffset[1],
		];
		const effect = target ? effectAt(target) : "move";
		reportEnd({ dropped: target !== null, canceled: false, lost: false });
		// The browser's own menu after a button-2 release (a Windows host
		// raises it then) must not replace the transfer menu.
		if (secondary) swallowClassicyFileDragContextMenu();
		if (target && secondary && options.onMenu) {
			options.onMenu(target, point, outlineTopLeft, effect);
			return;
		}
		options.onDrop(target, point, outlineTopLeft, effect);
	}

	// Escape, a lost pointer stream (`lost`), or the caller abandoning the
	// press: a drag in progress ends canceled. Once: cleanup removes the listeners and the outline, so
	// nothing can end it again.
	const cancel = (lost: boolean) => {
		const dragged = ghost !== null;
		cleanup();
		if (dragged) reportEnd({ dropped: false, canceled: true, lost });
	};

	// Control or Shift pressed or let go while the outline is shown: what
	// the drop would do changes under a still pointer.
	const followModifier = (e: KeyboardEvent) => {
		if (!ghost || (e.key !== "Control" && e.key !== "Shift")) return;
		keys = { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
		showFeedback();
	};

	function onKey(e: KeyboardEvent) {
		followModifier(e);
		if (e.key !== "Escape" || !ghost) return;
		e.preventDefault();
		e.stopPropagation();
		cancel(false);
	}

	function onKeyUp(e: KeyboardEvent) {
		followModifier(e);
	}

	document.addEventListener("mousemove", onMove, true);
	document.addEventListener("mouseup", onUp, true);
	document.addEventListener("keydown", onKey, true);
	document.addEventListener("keyup", onKeyUp, true);
	stopWatchingPointerStream = onClassicyPointerStreamLost(() => cancel(true));
	return () => cancel(false);
}

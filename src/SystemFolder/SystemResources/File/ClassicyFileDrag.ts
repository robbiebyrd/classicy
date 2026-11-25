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
 * marked ancestor. Windows, the menu bar, the Control Strip and the Windows
 * shell's taskbar block a drop, so releasing over, say, a SimpleText window
 * moves nothing.
 *
 * One more mark takes no drop but answers a drag resting on it:
 * `data-classicy-drop-activate`, which the taskbar's window buttons carry.
 * "When the user drags over a taskbar button, the system activates the
 * associated window, allowing the user to drop within that window" (WIG
 * Ch.3 "Window Buttons", p.16; Ch.10 "Taskbar Window Buttons", p.211): once
 * the drag has rested on the element for `CLASSICY_DROP_ACTIVATE_DELAY_MS`,
 * the element gets a `classicy:dropactivate` event and acts on it.
 */

import "./ClassicyFileDrag.scss";
import {
	type ClassicyFileDragOutlinePart,
	drawClassicyDragOutline,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/** The attribute a file item (an icon, a list row's name) carries its path in. */
export const CLASSICY_FILE_PATH_ATTRIBUTE = "data-classicy-file-path";
export const CLASSICY_DROP_FOLDER_ATTRIBUTE = "data-classicy-drop-folder";
export const CLASSICY_DROP_DESKTOP_ATTRIBUTE = "data-classicy-drop-desktop";
/**
 * The attribute of an element a resting drag activates instead of dropping
 * on (a taskbar window button): it takes no drop, and once a drag has rested
 * on it for `CLASSICY_DROP_ACTIVATE_DELAY_MS` it gets
 * `CLASSICY_DROP_ACTIVATE_EVENT`.
 */
export const CLASSICY_DROP_ACTIVATE_ATTRIBUTE = "data-classicy-drop-activate";
/**
 * The event a `CLASSICY_DROP_ACTIVATE_ATTRIBUTE` element gets when a drag
 * has rested on it: a plain `Event` that does not bubble and carries
 * nothing of the drag (no paths, names or pointer).
 */
export const CLASSICY_DROP_ACTIVATE_EVENT = "classicy:dropactivate";
/**
 * How long a drag rests on a `CLASSICY_DROP_ACTIVATE_ATTRIBUTE` element
 * before it is activated, in ms. The guidelines give no figure; this is the
 * double-click time, the default Windows' own hover timers take (Wine
 * `tooltips.c`, `TTDT_AUTOMATIC` = `GetDoubleClickTime()`, 500).
 */
export const CLASSICY_DROP_ACTIVATE_DELAY_MS = 500;

/** Pixels the pointer must travel before a press becomes a drag. */
export const CLASSICY_FILE_DRAG_THRESHOLD = 4;

const DROP_TARGET_HIGHLIGHT_CLASS = "classicyFileDropTarget";
const DRAGGING_BODY_CLASS = "classicyFileDragging";
// The taskbar takes no drops: only its window buttons answer a drag, by
// activating their windows (`CLASSICY_DROP_ACTIVATE_ATTRIBUTE`), and it sits
// inside the desktop, whose drop target it would otherwise be.
const BLOCKING_SELECTOR =
	".classicyWindow, .classicyDesktopMenuBar, .classicyControlStrip, .classicyTaskbar, [role='dialog']";

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

type ClassicyFileDragHitOptions = {
	exclude?: Element | null;
	elementsFromPoint?: ElementsFromPoint;
};

// What is under a client point: a drop target, an element a resting drag
// activates, or neither.
type ClassicyFileDragHit =
	| { kind: "target"; target: ClassicyFileDropTarget }
	| { kind: "activate"; element: Element }
	| { kind: "none" };

const NO_HIT: ClassicyFileDragHit = { kind: "none" };

// The topmost element under the point (the dragged one skipped), walked up
// to its first marked ancestor. An activate mark is met before the blocking
// check, so a taskbar button answers though the taskbar around it blocks.
function hitClassicyFileDrag(
	x: number,
	y: number,
	{
		exclude,
		elementsFromPoint = defaultElementsFromPoint,
	}: ClassicyFileDragHitOptions,
): ClassicyFileDragHit {
	for (const hit of elementsFromPoint(x, y)) {
		if (exclude?.contains(hit)) continue;
		for (let el: Element | null = hit; el; el = el.parentElement) {
			if (el.hasAttribute(CLASSICY_DROP_ACTIVATE_ATTRIBUTE)) {
				return { kind: "activate", element: el };
			}
			const folder = el.getAttribute(CLASSICY_DROP_FOLDER_ATTRIBUTE);
			if (folder !== null) {
				return {
					kind: "target",
					target: {
						destination: { kind: "folder", path: folder },
						element: el,
					},
				};
			}
			if (el.hasAttribute(CLASSICY_DROP_DESKTOP_ATTRIBUTE)) {
				return {
					kind: "target",
					target: { destination: { kind: "desktop" }, element: el },
				};
			}
			if (el.matches(BLOCKING_SELECTOR)) return NO_HIT;
		}
		return NO_HIT;
	}
	return NO_HIT;
}

/**
 * The drop target under a client point, or null when there is none (or the
 * point is over something that refuses drops, an element a resting drag
 * activates included). `exclude` skips the dragged element itself — a
 * desktop icon follows the pointer, so it is often the topmost element.
 * `elementsFromPoint` is injectable because jsdom has none.
 */
export function findClassicyFileDropTarget(
	x: number,
	y: number,
	options: ClassicyFileDragHitOptions = {},
): ClassicyFileDropTarget | null {
	const hit = hitClassicyFileDrag(x, y, options);
	return hit.kind === "target" ? hit.target : null;
}

/**
 * The element a drag resting at a client point would activate: the topmost
 * element under it, or its nearest ancestor, marked
 * `CLASSICY_DROP_ACTIVATE_ATTRIBUTE`, found before the blocking check (a
 * taskbar window button, inside the taskbar that blocks drops). Null when
 * the first marked element is a drop target or something that blocks
 * drops, or there is none. Options as `findClassicyFileDropTarget`'s.
 */
export function findClassicyFileDropActivator(
	x: number,
	y: number,
	options: ClassicyFileDragHitOptions = {},
): Element | null {
	const hit = hitClassicyFileDrag(x, y, options);
	return hit.kind === "activate" ? hit.element : null;
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
 *
 * While the drag is over an element marked `CLASSICY_DROP_ACTIVATE_ATTRIBUTE`
 * (`findClassicyFileDropActivator`), a timer runs from the move that
 * brought it there: after `CLASSICY_DROP_ACTIVATE_DELAY_MS` the element gets
 * `CLASSICY_DROP_ACTIVATE_EVENT`, once, however long the drag stays or
 * moves about on it. Leaving the element stops the timer, and coming back
 * starts it again; the drag ending, however it ends, stops it. The element
 * is not highlighted, and a release on it drops nothing.
 */
export function startClassicyFileDrag(
	options: ClassicyFileDragOptions,
): () => void {
	const { start, source, elementsFromPoint } = options;
	let ghost: HTMLElement | null = null;
	// The outline keeps the items' offset from the pointer at the press.
	let grabOffset: [number, number] = [0, 0];
	let highlighted: Element | null = null;
	// The element a resting drag would activate, and the timer running while
	// the drag is on it (null once it has fired, or while there is none).
	let activator: Element | null = null;
	let activateTimer: ReturnType<typeof setTimeout> | null = null;

	const setHighlight = (element: Element | null) => {
		if (highlighted === element) return;
		highlighted?.classList.remove(DROP_TARGET_HIGHLIGHT_CLASS);
		highlighted = element;
		highlighted?.classList.add(DROP_TARGET_HIGHLIGHT_CLASS);
	};

	const setActivator = (element: Element | null) => {
		if (activator === element) return;
		if (activateTimer !== null) clearTimeout(activateTimer);
		activateTimer = null;
		activator = element;
		if (!element) return;
		activateTimer = setTimeout(() => {
			activateTimer = null;
			if (element.isConnected) {
				element.dispatchEvent(new Event(CLASSICY_DROP_ACTIVATE_EVENT));
			}
		}, CLASSICY_DROP_ACTIVATE_DELAY_MS);
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

	const cleanup = () => {
		stopWatchingPointerStream();
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", onUp, true);
		document.removeEventListener("keydown", onKey, true);
		setHighlight(null);
		setActivator(null);
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

	const hitAt = (x: number, y: number) =>
		hitClassicyFileDrag(x, y, { exclude: source, elementsFromPoint });

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
		placeGhost(e.clientX, e.clientY);
		// The desktop itself isn't highlighted (Mac OS 8 doesn't); folders are.
		const hit = hitAt(e.clientX, e.clientY);
		setHighlight(
			hit.kind === "target" && hit.target.destination.kind === "folder"
				? hit.target.element
				: null,
		);
		setActivator(hit.kind === "activate" ? hit.element : null);
	}

	function onUp(e: MouseEvent) {
		const dragged = ghost !== null;
		cleanup();
		if (!dragged) {
			options.onClick?.();
			return;
		}
		// Hit-tested once the outline and highlight are gone.
		const hit = hitAt(e.clientX, e.clientY);
		const target = hit.kind === "target" ? hit.target : null;
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

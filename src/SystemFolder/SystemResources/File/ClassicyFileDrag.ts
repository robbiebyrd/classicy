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
 */

import "./ClassicyFileDrag.scss";
import {
	type ClassicyFileDragOutlinePart,
	drawClassicyDragOutline,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";

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
	/** Release without the pointer ever travelling far enough to drag. */
	onClick?: () => void;
	/** Injectable for tests. */
	elementsFromPoint?: ElementsFromPoint;
};

/**
 * Track a press as a possible drag. Returns a function that abandons it. The
 * outline is only created once the pointer has travelled
 * `CLASSICY_FILE_DRAG_THRESHOLD` px, so a plain click stays a click; Escape
 * cancels a drag in progress without dropping.
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

	const cleanup = () => {
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", onUp, true);
		document.removeEventListener("keydown", onKey, true);
		setHighlight(null);
		ghost?.remove();
		ghost = null;
		document.body.classList.remove(DRAGGING_BODY_CLASS);
	};

	const targetAt = (x: number, y: number) =>
		findClassicyFileDropTarget(x, y, { exclude: source, elementsFromPoint });

	function onMove(e: MouseEvent) {
		if (!ghost) {
			const travelled = Math.max(
				Math.abs(e.clientX - start.clientX),
				Math.abs(e.clientY - start.clientY),
			);
			if (travelled < CLASSICY_FILE_DRAG_THRESHOLD) return;
			createGhost();
		}
		e.preventDefault();
		placeGhost(e.clientX, e.clientY);
		// The desktop itself isn't highlighted (Mac OS 8 doesn't); folders are.
		const target = targetAt(e.clientX, e.clientY);
		setHighlight(target?.destination.kind === "folder" ? target.element : null);
	}

	function onUp(e: MouseEvent) {
		const dragged = ghost !== null;
		cleanup();
		if (!dragged) {
			options.onClick?.();
			return;
		}
		options.onDrop(
			targetAt(e.clientX, e.clientY),
			[e.clientX, e.clientY],
			[e.clientX - grabOffset[0], e.clientY - grabOffset[1]],
		);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key !== "Escape" || !ghost) return;
		e.preventDefault();
		e.stopPropagation();
		cleanup();
	}

	document.addEventListener("mousemove", onMove, true);
	document.addEventListener("mouseup", onUp, true);
	document.addEventListener("keydown", onKey, true);
	return cleanup;
}

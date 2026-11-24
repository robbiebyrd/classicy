import { type ReactElement, type RefObject, useEffect } from "react";
import { CLASSICY_FILE_PATH_ATTRIBUTE } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	type ClassicyMarqueeItem,
	useClassicyMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/useClassicyMarqueeSelection.internal";

/**
 * The window contents a file browser scrolls in (a `ClassicyScrollArea`'s
 * viewport), which a selection rectangle held past its edge scrolls, or null
 * when the browser does not scroll in one.
 * @internal
 */
export const classicyFileBrowserScroller = (
	el: Element | null,
): HTMLElement | null =>
	el?.closest<HTMLElement>(
		".classicyScrollAreaViewport:not(.classicyScrollAreaViewportClipped)",
	) ?? null;

/**
 * Whether a press on `target`, inside `area` (the window contents), is on the
 * empty space around `surface` rather than on anything in it: the surface
 * itself, or an element it lies in (the window contents below it, once they
 * scroll past its box).
 * @internal
 */
export const isClassicyFileBrowserBackground = (
	target: Element,
	surface: Element,
	area: Element,
): boolean => area.contains(target) && target.contains(surface);

// Whether a client point lies in an element's box. An element with no box
// (not laid out) is taken to hold it: the press is on the item.
const holds = (el: Element | null, x: number, y: number): boolean => {
	if (!el) return false;
	const r = el.getBoundingClientRect();
	if (r.width <= 0 || r.height <= 0) return true;
	return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
};

/**
 * Whether a press in the list view, at client `x`, `y` on `target`, is on a
 * row's empty space, where the Mac OS 8.1 Finder starts a selection
 * rectangle: the name column beside the item's icon and name (the cell's
 * padding, an empty disclosure gutter, the space after the name). A press on
 * the icon, the name, a disclosure triangle or another column is on the row.
 * @internal
 */
export const isClassicyFileBrowserListBlank = (
	target: Element,
	x: number,
	y: number,
): boolean => {
	if (target.matches(".classicyFileBrowserViewTableDisclosure")) return true;
	if (target.matches("td"))
		return (
			target.querySelector(
				":scope > .classicyFileBrowserViewTableRowContainer",
			) !== null
		);
	if (!target.matches(".classicyFileBrowserViewTableRowContainer"))
		return false;
	return (
		!holds(target.querySelector("img"), x, y) &&
		!holds(
			target.querySelector(".classicyFileBrowserViewTableRowIconLabel"),
			x,
			y,
		)
	);
};

// The click (and double-click) that end a press which started a rectangle on
// a row are not the row's: swallowed before the table sees them, so they
// neither select nor open it. Until the next press.
const swallowRowClicks = () => {
	const swallow = (e: Event) => {
		e.stopPropagation();
		if (e.type === "dblclick") stop();
	};
	const stop = () => {
		document.removeEventListener("click", swallow, true);
		document.removeEventListener("dblclick", swallow, true);
		document.removeEventListener("mousedown", stop, true);
	};
	document.addEventListener("click", swallow, true);
	document.addEventListener("dblclick", swallow, true);
	// Once the press's own mousedown has passed.
	queueMicrotask(() => document.addEventListener("mousedown", stop, true));
};

/**
 * The list view's selection rectangle (the Mac OS 8.1 Finder has one there
 * too): a press on a row's empty space or below the rows starts it, and it
 * selects the rows whose icon or name it touches, through the table's
 * selection. `root` is the browser's own element, which the rectangle is
 * drawn in; render the returned element inside it.
 * @internal
 */
export function useClassicyFileBrowserListMarquee({
	rootRef,
	enabled,
	getSelection,
	select,
}: {
	rootRef: RefObject<HTMLElement | null>;
	enabled: boolean;
	getSelection: () => string[];
	select: (paths: string[]) => void;
}): ReactElement {
	const { start, marquee } = useClassicyMarqueeSelection({
		surfaceRef: rootRef,
		getItems: () =>
			Array.from(
				rootRef.current?.querySelectorAll<HTMLElement>(
					`.classicyFileBrowserViewTableRowContainer[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
				) ?? [],
				(el): ClassicyMarqueeItem => ({
					id: el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) ?? "",
					image: el.querySelector<HTMLImageElement>(
						"img.classicyFileBrowserViewTableRowIcon",
					),
					label: el.querySelector(".classicyFileBrowserViewTableRowIconLabel"),
				}),
			),
		getSelection,
		onSelect: select,
		getScroller: () => classicyFileBrowserScroller(rootRef.current),
	});
	useEffect(() => {
		const root = rootRef.current;
		if (!enabled || !root) return;
		const area = classicyFileBrowserScroller(root) ?? root;
		const onDown = (e: MouseEvent) => {
			if (e.button !== 0) return;
			const target = e.target;
			if (!(target instanceof Element)) return;
			const onRow =
				root.contains(target) &&
				isClassicyFileBrowserListBlank(target, e.clientX, e.clientY);
			if (!onRow && !isClassicyFileBrowserBackground(target, root, area))
				return;
			start(e);
			if (onRow) swallowRowClicks();
		};
		area.addEventListener("mousedown", onDown);
		return () => area.removeEventListener("mousedown", onDown);
	}, [enabled, rootRef, start]);
	return marquee;
}

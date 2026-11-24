import {
	createContext,
	type ReactElement,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import {
	isClassicyContextualPress,
	isClassicyControlPress,
	openClassicyControlPressContextMenu,
	swallowClassicyPressClick,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualPress.internal";
import { CLASSICY_FILE_PATH_ATTRIBUTE } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	type ClassicyMarqueeBounds,
	type ClassicyMarqueeItem,
	useClassicyMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/useClassicyMarqueeSelection.internal";

/**
 * True inside a `ClassicyFileBrowser` showing its list: the browser starts a
 * selection rectangle from a press beside a row's icon and name, so the row
 * does not drag from there. A `ClassicyFileBrowserViewTable` used alone has
 * no rectangle, and its rows still drag from anywhere in the name cell.
 * @internal
 */
export const ClassicyFileBrowserListMarqueeContext = createContext(false);

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

/**
 * Where a list's rows show in its scroller: the scroller's box, less the
 * column titles where they lie inside it (Platinum's, `inList`, sticky at its
 * top), so the rectangle is cut under them and scrolls up past them. Null
 * when the list scrolls in nothing.
 * @internal
 */
export const classicyFileBrowserListBounds = (
	root: Element | null,
): ClassicyMarqueeBounds | null => {
	const scroller = classicyFileBrowserScroller(root);
	if (!scroller) return null;
	const r = scroller.getBoundingClientRect();
	const head = root
		?.querySelector(".classicyTableHeader:not(.classicyTableHeaderHidden)")
		?.getBoundingClientRect();
	const top =
		head && head.height > 0 && head.bottom > r.top && head.top < r.bottom
			? Math.max(r.top, head.bottom)
			: r.top;
	return { left: r.left, top, right: r.right, bottom: r.bottom };
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
	const selectionRef = useRef({ getSelection, select });
	selectionRef.current = { getSelection, select };
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
		getVisibleBounds: () => classicyFileBrowserListBounds(rootRef.current),
	});
	useEffect(() => {
		const root = rootRef.current;
		if (!enabled || !root) return;
		const area = classicyFileBrowserScroller(root) ?? root;
		const onDown = (e: MouseEvent) => {
			if (e.defaultPrevented) return;
			// The contextual-menu click: a Control-press or a right-press.
			const contextual = isClassicyContextualPress(e);
			if (e.button !== 0 && !contextual) return;
			const target = e.target;
			if (!(target instanceof Element)) return;
			const current = selectionRef.current;
			const onRow =
				root.contains(target) &&
				isClassicyFileBrowserListBlank(target, e.clientX, e.clientY);
			if (!onRow && !isClassicyFileBrowserBackground(target, root, area)) {
				// On a row's icon, name or other column, the contextual-menu
				// click selects the row as 8.1 selects an item: alone, unless
				// it is selected already (then the selection is kept). The row
				// starts no drag (the row itself leaves it) and the menu opens.
				if (!contextual || !root.contains(target)) return;
				const row = target
					.closest("tr[data-row-id]")
					?.getAttribute("data-row-id");
				if (!row) return;
				if (!current.getSelection().includes(row)) current.select([row]);
				if (isClassicyControlPress(e)) openClassicyControlPressContextMenu(e);
				return;
			}
			// The keyboard to the list (a press on a row focuses it already;
			// one below the rows does not), for its arrows and Select All.
			root
				.querySelector<HTMLElement>(".classicyTableContainer")
				?.focus({ preventScroll: true });
			// The contextual-menu click: it deselects and opens the menu,
			// never a rectangle.
			if (contextual) {
				if (current.getSelection().length > 0) current.select([]);
				if (isClassicyControlPress(e)) openClassicyControlPressContextMenu(e);
				return;
			}
			// The click and double-click ending a rectangle on a row are
			// not the row's: they neither select nor open it.
			if (onRow) swallowClassicyPressClick();
			start(e);
		};
		area.addEventListener("mousedown", onDown);
		return () => area.removeEventListener("mousedown", onDown);
	}, [enabled, rootRef, start]);
	return marquee;
}

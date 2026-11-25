import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { classicyScrollViewportOf } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/**
 * The keyboard's selection rules for lists (`ClassicyListBox`,
 * `ClassicyTable`, `ClassicyTree`), as the active package's layout declares
 * them (`layout.selection.pageKeys`, `layout.selection.keyboard`,
 * `layout.tree.keys`): the readers, the page arithmetic of Windows' lists
 * (WIG Ch.5 "Basic Navigation Keys", Table 5.1, pp.35-36; App. B Table
 * B.1, p.357) and the geometry it reads. Pure, but for the reads of the
 * rows' and the scroller's boxes, so the lists share one implementation and
 * the rule is tested without a desktop. Every reader gives today's rule when
 * its key is absent.
 */

/**
 * Whether Page Up and Page Down move a list's keyboard row a screen
 * (`layout.selection.pageKeys` `"move"`, Windows' lists) rather than leave
 * the list to scroll (absent or `"scroll"`, today's rule, Mac OS 8's).
 */
export const classicyPageKeysMove = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean => layout.selection?.pageKeys === "move";

/**
 * Whether a multiple selection list takes Windows' selection keys
 * (`layout.selection.keyboard` `"windows"`: Space selects, Control with a
 * navigation key moves the keyboard row alone, Shift+F8 toggles Add mode)
 * rather than the selection following the keyboard (absent or `"follow"`,
 * today's rule).
 */
export const classicyWindowsSelectionKeys = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean => layout.selection?.keyboard === "windows";

/**
 * Whether a tree takes Windows' tree-view keys (`layout.tree.keys`
 * `"windows"`): the bare arrows along a branch, and the Control chords
 * scrolling (`TREEVIEW_ScrollKeyDown`). A table's tree rows read it too.
 */
export const classicyWindowsTreeKeys = (
	layout: Pick<ClassicyAppearanceLayout, "tree">,
): boolean => layout.tree?.keys === "windows";

/** The navigation keys Control (⌘, Option) moves a list's keyboard row by. */
const NAVIGATION_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"Home",
	"End",
	"PageUp",
	"PageDown",
]);

/** Whether `key` is a vertical list's navigation key (arrows, Home, End, the page keys). */
export const isClassicyListNavigationKey = (key: string): boolean =>
	NAVIGATION_KEYS.has(key);

/**
 * Whether a key's modifiers ask a multiple selection list to move its
 * keyboard row without selecting under Windows' selection keys: Control
 * (WIG Ch.5 "Disjoint Selection", pp.43-44; comctl32 moves the focus item
 * alone), or ⌘ or Option, since macOS takes Control with the arrows for
 * Spaces. Shift wins over them: Shift with a navigation key always
 * extends from the anchor (`LISTVIEW_KeySelection`).
 */
export const classicyMovesCursorOnly = (e: {
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
}): boolean => !e.shiftKey && (e.ctrlKey || e.metaKey || e.altKey);

/** Whether a keydown is Shift+F8, Windows' Add mode key (WIG Ch.5 p.44). */
export const isClassicyAddModeKey = (e: {
	key: string;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
}): boolean =>
	e.key === "F8" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;

/**
 * The scroller a list's rows scroll in: the nearest registered scroll
 * area's viewport (`ClassicyScrollArea`'s) at or above `element`, else the
 * nearest ancestor whose own overflow scrolls vertically, else `null`.
 */
export const classicyListScroller = (
	element: Element | null | undefined,
): HTMLElement | null => {
	if (!element) return null;
	const registered = classicyScrollViewportOf(element);
	if (registered) return registered.element;
	for (let el = element.parentElement; el; el = el.parentElement) {
		const overflow = getComputedStyle(el).overflowY;
		if (overflow === "auto" || overflow === "scroll") return el;
	}
	return null;
};

/** The part of a scroller its rows are seen through, in client coordinates. */
export type ClassicyListViewBox = {
	top: number;
	bottom: number;
	left: number;
	right: number;
};

/**
 * `scroller`'s client box (inside its borders, its own scroll bars
 * excluded), its top moved down to `coveredTop` when something pinned over
 * it (a table's sticky column titles) reaches lower.
 */
export const classicyListViewBox = (
	scroller: Element,
	coveredTop?: number,
): ClassicyListViewBox => {
	const box = scroller.getBoundingClientRect();
	const top = box.top + scroller.clientTop;
	const left = box.left + scroller.clientLeft;
	const bottom = top + (scroller.clientHeight || box.height);
	const right = left + (scroller.clientWidth || box.width);
	return {
		top:
			coveredTop !== undefined && coveredTop > top && coveredTop < bottom
				? coveredTop
				: top,
		bottom,
		left,
		right,
	};
};

/**
 * The indices of the first and last of `rows` (in their order) wholly shown
 * in `view` from top to bottom (and overlapping it sideways, so a row wider
 * than the view counts and a column flowed out of it does not), or `null`
 * when none is (no row laid out, or each taller than the view).
 */
export const classicyShownRowRange = (
	rows: readonly (Element | null | undefined)[],
	view: ClassicyListViewBox,
): { first: number; last: number } | null => {
	let first = -1;
	let last = -1;
	rows.forEach((row, i) => {
		if (!row) return;
		const r = row.getBoundingClientRect();
		if (r.height <= 0) return;
		const shown =
			r.top >= view.top - 0.5 &&
			r.bottom <= view.bottom + 0.5 &&
			r.right > view.left &&
			r.left < view.right;
		if (!shown) return;
		if (first < 0) first = i;
		last = i;
	});
	return first < 0 ? null : { first, last };
};

/**
 * How many rows a page of `view` holds: its height in whole rows of `row`'s
 * height (comctl32's `LISTVIEW_GetCountPerColumn`, user32's list box page
 * size), at least 1, and 1 when either has no height.
 */
export const classicyListPageRows = (
	row: Element | null | undefined,
	view: ClassicyListViewBox | null,
): number => {
	if (!row || !view) return 1;
	const height =
		row.getBoundingClientRect().height ||
		(row instanceof HTMLElement ? row.offsetHeight : 0);
	const span = view.bottom - view.top;
	if (!(height > 0) || !(span > 0)) return 1;
	// A hair of slack, so a page of exactly n rows laid out on fractional
	// pixels still counts n.
	return Math.max(1, Math.floor(span / height + 1e-3));
};

/**
 * The page of the list a row is in: its scroller's view and how many rows
 * it holds, measured from `row` (any of the list's rows), or `null` when
 * the row is in no scroller.
 */
export const classicyListPageOf = (
	row: Element | null | undefined,
	coveredTop?: number,
): { view: ClassicyListViewBox; pageRows: number } | null => {
	const scroller = classicyListScroller(row);
	if (!row || !scroller) return null;
	const view = classicyListViewBox(scroller, coveredTop);
	return { view, pageRows: classicyListPageRows(row, view) };
};

/**
 * The row Page Up or Page Down moves a list's keyboard row to, as
 * comctl32's list view does in report view (`LISTVIEW_KeyDown`, VK_PRIOR
 * and VK_NEXT; WIG Table 5.1, "Down one screen (next screen, same
 * position)"): Page Down goes to the last row wholly shown (`shown.last`),
 * or, from it, a page further, one row fewer than the page holds, so the
 * row it left stays in sight at the top; Page Up goes to the first row
 * wholly shown, or, from it, a page back. With nothing shown (no layout),
 * each steps that page less one from the keyboard row, as user32's list box
 * always does. Clamped to the list; `-1` for an empty one. `current` is
 * `-1` while no row has the keyboard.
 */
export const classicyListPageIndex = ({
	key,
	current,
	count,
	shown,
	pageRows,
}: {
	key: "PageUp" | "PageDown";
	current: number;
	count: number;
	shown: { first: number; last: number } | null;
	pageRows: number;
}): number => {
	if (count <= 0) return -1;
	const step = Math.max(1, Math.floor(pageRows) - 1);
	const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
	if (key === "PageDown") {
		if (!shown) return clamp(Math.max(current, 0) + step);
		return clamp(current === shown.last ? current + step : shown.last);
	}
	if (!shown) return clamp(current < 0 ? 0 : current - step);
	return clamp(current === shown.first ? current - step : shown.first);
};

/**
 * Brings `row` into its scroller's view by the least scrolling
 * (`block: "nearest"`), so a page key leaves the row where the page puts
 * it; a no-op where the browser (or a test's DOM) has no `scrollIntoView`.
 */
export const classicyRevealListRow = (row: Element | null | undefined) => {
	if (!row || typeof row.scrollIntoView !== "function") return;
	row.scrollIntoView({ block: "nearest", inline: "nearest" });
};

/**
 * What comctl32's tree view does with a Control chord (`TREEVIEW_KeyDown`
 * hands every Control key to `TREEVIEW_ScrollKeyDown`; WIG App. B Table
 * B.1, p.357, "CTRL+arrow" a larger unit): the scroll, in px, Control
 * (or ⌘) with `key` asks of a scroller showing rows `rowHeight` tall, its
 * keyboard row and selection staying put. Up and Down scroll a row
 * (SB_LINEUP, SB_LINEDOWN), Left and Right a row's height sideways
 * (TREEVIEW_HScroll's line), Page Up and Page Down the page's whole rows,
 * Home and End to the scroller's top and bottom. `null` for any other key.
 */
export const classicyTreeScrollChord = (
	key: string,
	{
		rowHeight,
		scrollTop,
		scrollHeight,
		clientHeight,
	}: {
		rowHeight: number;
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	},
): [number, number] | null => {
	const line = Math.max(1, rowHeight);
	const page = Math.max(1, Math.floor(clientHeight / line + 1e-3)) * line;
	switch (key) {
		case "ArrowUp":
			return [0, -line];
		case "ArrowDown":
			return [0, line];
		case "ArrowLeft":
			return [-line, 0];
		case "ArrowRight":
			return [line, 0];
		case "PageUp":
			return [0, -page];
		case "PageDown":
			return [0, page];
		case "Home":
			return [0, -scrollTop];
		case "End":
			return [0, Math.max(0, scrollHeight - clientHeight - scrollTop)];
		default:
			return null;
	}
};

/**
 * Scrolls the scroller `element`'s rows scroll in by `dx` and `dy` px: a
 * registered scroll area's viewport through its own `scrollBy` (its bars
 * redrawn), any other scroller directly. Returns whether one was found.
 */
export const classicyScrollListBy = (
	element: Element | null | undefined,
	dx: number,
	dy: number,
): boolean => {
	if (!element) return false;
	const registered = classicyScrollViewportOf(element);
	if (registered) {
		registered.entry.scrollBy(dx, dy);
		return true;
	}
	const scroller = classicyListScroller(element);
	if (!scroller) return false;
	if (dx) scroller.scrollLeft += dx;
	if (dy) scroller.scrollTop += dy;
	return true;
};

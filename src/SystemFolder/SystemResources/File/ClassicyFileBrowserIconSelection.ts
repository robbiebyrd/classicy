// The icon view's selection rules, kept apart from the view so they can be
// tested without a layout engine. Mac OS 8's Finder (HIG7 "Selecting",
// pp.288-291) and Windows Explorer's list view (WIG Ch.5 "Selection",
// pp.38-45) share most of them; where they differ, the package's
// `layout.fileBrowser.keys` chooses ("mac", the default, or "windows").

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ArrowDirection,
	nearestIconInDirection,
	typeaheadMatch,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import { classicyRangeSetTo } from "@/SystemFolder/SystemResources/Utils/ClassicyListPressSelection.internal";

/** Which platform's selection rules the icon view follows. */
export type ClassicyFileBrowserKeys = "mac" | "windows";

/** One icon of the view: its path, its name, and its place (left, top). */
export type ClassicyFileBrowserIconPlace = {
	path: string;
	name: string;
	location: [number, number];
};

/** The view's selection: the selected paths, and the anchor of a range. */
export type ClassicyFileBrowserIconSelection = {
	selected: string[];
	anchor?: string;
};

/**
 * One icon of the view and the box it covers on screen (client px; right
 * and bottom past its last pixel, as a `DOMRect`'s are).
 */
export type ClassicyFileBrowserIconBox = {
	path: string;
	left: number;
	top: number;
	right: number;
	bottom: number;
};

type Modifiers = { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean };

const toggled = (selected: string[], path: string): string[] =>
	selected.includes(path)
		? selected.filter((p) => p !== path)
		: [...selected, path];

/** The items from `a` to `b` in `order`, both included, either way round. */
export const classicyIconRange = (
	order: string[],
	a: string,
	b: string,
): string[] => {
	const i = order.indexOf(a);
	const j = order.indexOf(b);
	if (i < 0 || j < 0) return [b];
	return order.slice(Math.min(i, j), Math.max(i, j) + 1);
};

/**
 * The icons whose top-left corner lies in the rectangle spanned by the
 * boxes of `a` and `b` (their union; right and bottom edges out), in
 * `boxes`' order: comctl32's icon-view group selection
 * (`LISTVIEW_SetGroupSelection` outside the list and report views, which
 * tests each item's position against the union of the two items' bounds).
 * `[b]` when either is not in `boxes`.
 */
export const classicyIconRectRange = (
	boxes: readonly ClassicyFileBrowserIconBox[],
	a: string,
	b: string,
): string[] => {
	const from = boxes.find((box) => box.path === a);
	const to = boxes.find((box) => box.path === b);
	if (!from || !to) return [b];
	const left = Math.min(from.left, to.left);
	const top = Math.min(from.top, to.top);
	const right = Math.max(from.right, to.right);
	const bottom = Math.max(from.bottom, to.bottom);
	return boxes
		.filter(
			(box) =>
				box.left >= left &&
				box.left < right &&
				box.top >= top &&
				box.top < bottom,
		)
		.map((box) => box.path);
};

/**
 * The selection after a click on `path`. A plain click selects the icon
 * alone. Under "mac", Shift, ⌘ or Control adds it or takes it out (the
 * Finder's icons are discrete objects, a discontinuous selection, HIG7
 * p.290). Under "windows", Control (or ⌘) adds it or takes it out and
 * moves the anchor; Shift selects the anchor's range alone, the anchor
 * staying; and Control with Shift keeps the other selections and sets the
 * anchor's range to the anchor's state (WIG Ch.5 "Selection Adjustment",
 * pp.38-39). The range is the icons in the rectangle spanned by the
 * anchor's box and the item's (`classicyIconRectRange`) when `boxes` is
 * given, as Explorer's icon view takes it, else the items from the anchor
 * to it in `order`.
 */
export const classicyIconClickSelection = (
	keys: ClassicyFileBrowserKeys,
	order: string[],
	current: ClassicyFileBrowserIconSelection,
	path: string,
	{ shiftKey, metaKey, ctrlKey }: Modifiers,
	boxes?: readonly ClassicyFileBrowserIconBox[],
): ClassicyFileBrowserIconSelection => {
	if (keys === "mac") {
		if (shiftKey || metaKey || ctrlKey) {
			return { selected: toggled(current.selected, path), anchor: path };
		}
		return { selected: [path], anchor: path };
	}
	const toggle = metaKey || ctrlKey;
	if (shiftKey && current.anchor && order.includes(current.anchor)) {
		const anchor = current.anchor;
		const range = boxes
			? classicyIconRectRange(boxes, anchor, path)
			: classicyIconRange(order, anchor, path);
		return {
			selected: toggle
				? classicyRangeSetTo(
						current.selected,
						range,
						current.selected.includes(anchor),
					)
				: range,
			anchor,
		};
	}
	if (toggle) {
		return { selected: toggled(current.selected, path), anchor: path };
	}
	return { selected: [path], anchor: path };
};

/**
 * The icon an arrow key goes to from `from`: the nearest one its way (a
 * 45° sector, as the desktop's arrows go), or null.
 */
export const classicyIconInDirection = (
	icons: ClassicyFileBrowserIconPlace[],
	from: string,
	direction: ArrowDirection,
): string | null =>
	nearestIconInDirection(
		icons.map((icon) => ({
			appId: icon.path,
			appName: icon.name,
			location: icon.location,
		})),
		from,
		direction,
	);

/**
 * The icon a page key goes to from `from` (Windows only): the farthest
 * icon at most `page` px above (`up`) or below it, the nearest across among
 * those; the first or last icon when none is that close; null when it is
 * already the first or last that way.
 */
export const classicyIconPage = (
	icons: ClassicyFileBrowserIconPlace[],
	from: string,
	up: boolean,
	page: number,
): string | null => {
	const current = icons.find((icon) => icon.path === from);
	if (!current) return null;
	const [cx, cy] = current.location;
	const ahead = icons.filter((icon) =>
		up ? icon.location[1] < cy : icon.location[1] > cy,
	);
	if (ahead.length === 0) return null;
	const reach = ahead.filter(
		(icon) => Math.abs(icon.location[1] - cy) <= Math.max(page, 0),
	);
	const pool = reach.length > 0 ? reach : ahead;
	const rowOf = (icon: ClassicyFileBrowserIconPlace) =>
		Math.abs(icon.location[1] - cy);
	// The farthest row within the page (else the nearest row beyond it).
	const row =
		reach.length > 0
			? Math.max(...pool.map(rowOf))
			: Math.min(...pool.map(rowOf));
	const inRow = pool.filter((icon) => rowOf(icon) === row);
	inRow.sort(
		(a, b) => Math.abs(a.location[0] - cx) - Math.abs(b.location[0] - cx),
	);
	return inRow[0]?.path ?? null;
};

/**
 * The icon typing `buffer` (the keys typed within the type-ahead timeout)
 * selects, from `current` (the focused icon), or null.
 *
 * - "mac" (the Finder's type-selection): the first icon, alphabetically,
 *   whose name starts with the buffer, as the desktop's type-ahead finds it.
 * - "windows" (Explorer's list view, WIG Ch.7 "List Boxes"): one letter,
 *   typed again and again, steps through the icons starting with it, in the
 *   view's order, from the one after `current`, wrapping; a longer buffer
 *   finds the first icon from `current` on, in the view's order, whose name
 *   starts with it.
 */
export const classicyIconTypeahead = (
	keys: ClassicyFileBrowserKeys,
	icons: ClassicyFileBrowserIconPlace[],
	buffer: string,
	current: string | undefined,
): string | null => {
	if (!buffer) return null;
	if (keys === "mac") {
		return typeaheadMatch(
			icons.map((icon) => ({ appId: icon.path, appName: icon.name })),
			buffer,
		);
	}
	const lower = buffer.toLowerCase();
	const starts = (icon: ClassicyFileBrowserIconPlace, prefix: string) =>
		icon.name.toLowerCase().startsWith(prefix);
	const at = Math.max(
		0,
		icons.findIndex((icon) => icon.path === current),
	);
	const repeated = [...lower].every((ch) => ch === lower[0]);
	// From the item after the current one for a repeated letter; from the
	// current one for a longer prefix, which may still match it.
	const from = repeated && current !== undefined ? at + 1 : at;
	const prefix = repeated ? lower[0] : lower;
	for (let n = 0; n < icons.length; n++) {
		const icon = icons[(from + n) % icons.length];
		if (starts(icon, prefix)) return icon.path;
	}
	return null;
};

/** How long typed keys add to one type-ahead buffer. */
export const CLASSICY_FILE_BROWSER_TYPEAHEAD_MS = 1000;

/**
 * How long after a click on a selected icon's name the name opens for
 * renaming, unless a second click (a double-click) comes first: the
 * double-click time, 500 ms in Windows 98 (GetDoubleClickTime) and about
 * Mac OS 8's (32 ticks).
 */
export const CLASSICY_FILE_BROWSER_RENAME_DELAY_MS = 500;

/**
 * The selection a selection rectangle drawn from a press on the view's
 * empty space makes, `boxed` being the items it touches now and `base` the
 * selection the press found. With no modifier: `boxed` alone. Under "mac"
 * (L2-E's rule, the Finder's), Shift, ⌘ or Control adds `boxed` to `base`.
 * Under "windows" (WIG Ch.5 "Region Selection", p.42, applying "Selection
 * Adjustment"'s modifiers): Shift adds `boxed` to `base`, and Control (or
 * ⌘), with or without Shift, toggles each of `boxed` in `base` (the
 * symmetric difference, as comctl32's marquee inverts the items it
 * covers while Control is down, `LISTVIEW_MarqueeHighlight`).
 */
export const classicyIconMarqueeSelection = (
	keys: ClassicyFileBrowserKeys,
	base: readonly string[],
	boxed: readonly string[],
	{ shiftKey, metaKey, ctrlKey }: Modifiers,
): string[] => {
	const toggle = metaKey || ctrlKey;
	if (!shiftKey && !toggle) return [...boxed];
	if (keys === "windows" && toggle) {
		const covered = new Set(boxed);
		const held = new Set(base);
		return [
			...base.filter((p) => !covered.has(p)),
			...boxed.filter((p) => !held.has(p)),
		];
	}
	return [...new Set([...base, ...boxed])];
};

/**
 * Whether a drag of a selected icon in the icon view carries the view's
 * whole selection (`layout.fileBrowser.iconSelection` `"view"`, Windows
 * Explorer) rather than the icon pressed alone (absent or `"perIcon"`,
 * today's rule).
 */
export const classicyIconViewDragsSelection = (
	layout: Pick<ClassicyAppearanceLayout, "fileBrowser">,
): boolean => layout.fileBrowser?.iconSelection === "view";

/**
 * Whether the file browser's list view takes a selection rectangle and
 * either view's rectangle scrolls the window
 * (`layout.fileBrowser.regionSelect`, Windows Explorer) rather than the
 * icon view's alone, never scrolling (absent or `false`, today's rule).
 */
export const classicyFileBrowserRegionSelect = (
	layout: Pick<ClassicyAppearanceLayout, "fileBrowser">,
): boolean => layout.fileBrowser?.regionSelect === true;

/** Whether the client rectangles `a` and `b` overlap. */
export const classicyRectsIntersect = (
	a: { left: number; top: number; right: number; bottom: number },
	b: { left: number; top: number; right: number; bottom: number },
): boolean =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

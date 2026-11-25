// The icon view's selection rules, kept apart from the view so they can be
// tested without a layout engine. Mac OS 8's Finder (HIG7 "Selecting",
// pp.288-291) and Windows Explorer's list view (WIG Ch.5 "Selection",
// pp.38-45) share most of them; where they differ, the package's
// `layout.fileBrowser.keys` chooses ("mac", the default, or "windows").

import {
	type ArrowDirection,
	nearestIconInDirection,
	typeaheadMatch,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";

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
 * The selection after a click on `path`. A plain click selects the icon
 * alone. Under "mac", Shift, ⌘ or Control adds it or takes it out (the
 * Finder's icons are discrete objects, a discontinuous selection, HIG7
 * p.290). Under "windows", Control (or ⌘) adds it or takes it out, Shift
 * selects from the anchor to it in the view's order, and Control with Shift
 * adds that range (WIG Ch.5 "Mouse Selection").
 */
export const classicyIconClickSelection = (
	keys: ClassicyFileBrowserKeys,
	order: string[],
	current: ClassicyFileBrowserIconSelection,
	path: string,
	{ shiftKey, metaKey, ctrlKey }: Modifiers,
): ClassicyFileBrowserIconSelection => {
	if (keys === "mac") {
		if (shiftKey || metaKey || ctrlKey) {
			return { selected: toggled(current.selected, path), anchor: path };
		}
		return { selected: [path], anchor: path };
	}
	const toggle = metaKey || ctrlKey;
	if (shiftKey && current.anchor && order.includes(current.anchor)) {
		const range = classicyIconRange(order, current.anchor, path);
		return {
			selected: toggle ? [...new Set([...current.selected, ...range])] : range,
			anchor: current.anchor,
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

/** Whether the client rectangles `a` and `b` overlap. */
export const classicyRectsIntersect = (
	a: { left: number; top: number; right: number; bottom: number },
	b: { left: number; top: number; right: number; bottom: number },
): boolean =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

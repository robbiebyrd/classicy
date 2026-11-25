import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyIconsRoveFocus,
	classicyMovesCursorOnly,
	classicyWindowsSelectionKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { classicyRangeSetTo } from "@/SystemFolder/SystemResources/Utils/ClassicyListPressSelection.internal";

export type ArrowDirection =
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight";

export interface KeyNavIcon {
	appId: string;
	appName: string;
	label?: string;
	location?: [number, number];
}

/**
 * Returns the appId of the nearest icon in the given direction from `currentId`,
 * or null if nothing qualifies.
 *
 * Direction is determined by a 45° sector: an icon is "to the right" of the
 * current one when its horizontal offset dominates (|dx| ≥ |dy|), and "above"
 * when its vertical offset dominates (|dy| > |dx|).
 *
 * location tuple is [x, y] where x = left, y = top.
 */
export function nearestIconInDirection(
	icons: KeyNavIcon[],
	currentId: string,
	direction: ArrowDirection,
): string | null {
	const current = icons.find((i) => i.appId === currentId);
	if (!current?.location) return null;
	const [cx, cy] = current.location;

	let best: string | null = null;
	let bestDist = Infinity;

	for (const icon of icons) {
		if (icon.appId === currentId || !icon.location) continue;
		const dx = icon.location[0] - cx;
		const dy = icon.location[1] - cy;

		const inSector =
			direction === "ArrowRight"
				? dx > 0 && Math.abs(dx) >= Math.abs(dy)
				: direction === "ArrowLeft"
					? dx < 0 && Math.abs(dx) >= Math.abs(dy)
					: direction === "ArrowDown"
						? dy > 0 && Math.abs(dy) > Math.abs(dx)
						: dy < 0 && Math.abs(dy) > Math.abs(dx); // ArrowUp

		if (!inSector) continue;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < bestDist) {
			bestDist = dist;
			best = icon.appId;
		}
	}
	return best;
}

/**
 * Returns the appId of the first icon (sorted alphabetically by display name)
 * whose display name starts with `prefix` (case-insensitive), or null if none match.
 */
export function typeaheadMatch(
	icons: KeyNavIcon[],
	prefix: string,
): string | null {
	if (!prefix) return null;
	const lower = prefix.toLowerCase();
	const matches = icons
		.filter((i) => (i.label ?? i.appName).toLowerCase().startsWith(lower))
		.sort((a, b) => (a.label ?? a.appName).localeCompare(b.label ?? b.appName));
	return matches[0]?.appId ?? null;
}

/**
 * The desktop's focus icon (WIG Ch.5 "Keyboard Selection", p.43; comctl32's
 * LVIS_FOCUSED): `focusIconId` while it names one of `icons` (the icon last
 * pressed or moved to, `System.Manager.Desktop.focusIcon`), else the first
 * of `icons`, else null when the desktop has none. Under
 * `layout.selection.iconNavigation` `"roving"` it is the desktop's one Tab
 * stop (`ClassicyDesktopIcon`).
 *
 * `icons` are in the desktop's order (`System.Manager.Desktop.icons`, the
 * icons it draws): the order every Clean Up and sort lays them out in, down
 * each column then across from the package's grid origin, an icon dropped
 * on the desktop coming last. That is comctl32's item index, which the
 * desktop's first Tab stop, Home and End follow (`VK_HOME` item 0,
 * `VK_END` the last, Wine's `LISTVIEW_KeyDown`): Windows 98 as shipped,
 * over the 1995 text's "topmost" and "bottommost position" (Table 5.1,
 * pp.35-36), which on an arranged desktop is the same first icon.
 */
export function classicyDesktopFocusIconId(
	icons: readonly KeyNavIcon[],
	focusIconId: string | null | undefined,
): string | null {
	if (focusIconId && icons.some((i) => i.appId === focusIconId))
		return focusIconId;
	return icons[0]?.appId ?? null;
}

/**
 * The desktop icons in the rectangle spanned by `anchorId`'s box and
 * `iconId`'s (each `cell` px square from its location, as a desktop icon is
 * drawn): every icon whose location (its top-left corner) lies in the union
 * of the two boxes, its right and bottom edges excluded, in `icons`' order.
 * This is comctl32's icon-view range (`LISTVIEW_SetGroupSelection` outside
 * the list and report views), which Shift extends a desktop selection by
 * (WIG Ch.5 "Selection Adjustment", pp.38-39; App. A Table A.2,
 * pp.351-353). `[iconId]` when either icon has no location.
 */
export function classicyDesktopIconRectRange(
	icons: readonly KeyNavIcon[],
	anchorId: string,
	iconId: string,
	cell: number,
): string[] {
	const from = icons.find((i) => i.appId === anchorId)?.location;
	const to = icons.find((i) => i.appId === iconId)?.location;
	if (!from || !to) return [iconId];
	const left = Math.min(from[0], to[0]);
	const top = Math.min(from[1], to[1]);
	const right = Math.max(from[0], to[0]) + cell;
	const bottom = Math.max(from[1], to[1]) + cell;
	return icons
		.filter(
			(i) =>
				i.location !== undefined &&
				i.location[0] >= left &&
				i.location[0] < right &&
				i.location[1] >= top &&
				i.location[1] < bottom,
		)
		.map((i) => i.appId);
}

/** How `ClassicyDesktopIconSelect` adjusts the desktop's selection. */
export type ClassicyDesktopIconSelectMode = "toggle" | "range" | "addRange";

/**
 * The desktop's selection after `ClassicyDesktopIconSelect { iconId, mode }`
 * (WIG Ch.5 "Selection Adjustment", pp.38-39, summary table, p.42; App. A
 * Tables A.2, pp.351-353, and A.3, pp.354-356). `"toggle"` (Control or ⌘):
 * the icon goes in or out and becomes the anchor. `"range"` (Shift): the
 * icons in the rectangle the anchor's icon and this one span
 * (`classicyDesktopIconRectRange`) replace the selection, the anchor
 * staying. `"addRange"` (Control or ⌘ with Shift): that rectangle takes
 * the anchor's state, the other selections staying, as does the anchor.
 * With no anchor among `icons`, the icon becomes it: `"range"` selects it
 * alone and `"addRange"` adds it (comctl32's selection mark of -1).
 */
export function classicyDesktopIconSelection(
	icons: readonly KeyNavIcon[],
	selected: readonly string[],
	anchor: string | null | undefined,
	iconId: string,
	mode: ClassicyDesktopIconSelectMode,
	cell: number,
): { selected: string[]; anchor: string } {
	if (mode === "toggle") {
		return {
			selected: selected.includes(iconId)
				? selected.filter((id) => id !== iconId)
				: [...selected, iconId],
			anchor: iconId,
		};
	}
	if (!anchor || !icons.some((i) => i.appId === anchor)) {
		return {
			selected:
				mode === "range"
					? [iconId]
					: classicyRangeSetTo(selected, [iconId], true),
			anchor: iconId,
		};
	}
	const range = classicyDesktopIconRectRange(icons, anchor, iconId, cell);
	return {
		selected:
			mode === "range"
				? range
				: classicyRangeSetTo(selected, range, selected.includes(anchor)),
		anchor,
	};
}

/**
 * What Space does to the desktop's selection under Windows' selection keys
 * (`layout.selection.keyboard` `"windows"`; WIG Ch.5 "Keyboard Selection",
 * p.43; App. B Table B.2, p.358; comctl32's `LISTVIEW_KeySelection`):
 * `"select"` the focus icon alone, `"toggle"` it with Control or ⌘,
 * `"range"` from the anchor to it with Shift (Shift winning, as there).
 * `null` for any other key, or with Option, which Space leaves alone.
 */
export function classicyDesktopSpaceSelection(e: {
	key: string;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
}): "select" | "toggle" | "range" | null {
	if (e.key !== " " || e.altKey) return null;
	if (e.shiftKey) return "range";
	return e.ctrlKey || e.metaKey ? "toggle" : "select";
}

/**
 * What a key on the desktop does to its icons, for the desktop's keydown
 * handler (`ClassicyDesktop`) to dispatch: `"select"` the icon alone (as
 * `ClassicyDesktopIconFocus`), `"range"` or `"toggle"` through
 * `ClassicyDesktopIconSelect` with that mode, `"focus"` the focus icon
 * alone (`ClassicyDesktopIconMoveFocus`, and the icon focused), or
 * `"none"`, leaving the key to the handler's own branches.
 */
export type ClassicyDesktopKeyCommand =
	| { type: "none" }
	| { type: "select" | "range" | "toggle" | "focus"; iconId: string };

/** The keys `classicyDesktopKeyCommand` moves the desktop's focus icon by. */
const DESKTOP_NAVIGATION_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
	"PageUp",
	"PageDown",
]);

const NONE: ClassicyDesktopKeyCommand = { type: "none" };

/**
 * What `e` does on the desktop under the active package's layout. Pure: the
 * desktop's keydown handler dispatches the answer (`ClassicyDesktop`).
 * `icons` are the icons the desktop draws, in its order; `selectedIds` its
 * selection (`Desktop.selectedIcons`); `focusIconId` its focus icon
 * (`Desktop.focusIcon`). Every key gives `"none"` without the keys below,
 * and so does a key a desktop icon has already handled (`defaultPrevented`:
 * its own Space), so today's rules stand.
 *
 * Under `layout.selection.iconNavigation` `"roving"` (Windows; WIG Ch.5
 * Table 5.1, pp.35-36, "Keyboard Selection", "Contiguous Selection", p.43;
 * App. B Table B.1, p.357; comctl32's `LISTVIEW_KeyDown`, the audit's 5.17
 * and B.2): an arrow goes from the focus icon to the nearest icon its way
 * (`nearestIconInDirection`; with none that way the focus stays, `"focus"`
 * on the focus icon itself, the selection as it is), and with no focus
 * icon from the first selected icon, or, with nothing selected, to the
 * first icon; Home and Page Up go to the first icon in the desktop's order
 * (`classicyDesktopFocusIconId`), End and Page Down to the last (comctl32
 * steps a page of the screen's slots, which on the desktop, one screen,
 * reaches the first or last icon). The icon reached is selected alone
 * (`"select"`), or, with Shift, the anchor's rectangle to it (`"range"`,
 * 5.10's).
 *
 * Under `layout.selection.keyboard` `"windows"` (WIG Ch.5 "Keyboard
 * Selection", p.43, "Disjoint Selection", pp.43-44; the audit's 5.16 and
 * 5.18's desktop part): Control, ⌘ or Option with a navigation key moves
 * the focus icon alone (`"focus"`; macOS takes Control and the arrows for
 * Spaces); Space selects the focus icon alone, Control or ⌘ with it
 * toggles it, Shift with it extends to it (`classicyDesktopSpaceSelection`).
 * The desktop has no Add mode: comctl32's list view, which Explorer's
 * desktop is, takes no Shift+F8 (Control with the arrows and Space builds
 * a disjoint selection there).
 */
export function classicyDesktopKeyCommand(
	e: {
		key: string;
		shiftKey: boolean;
		ctrlKey: boolean;
		metaKey: boolean;
		altKey: boolean;
		defaultPrevented?: boolean;
	},
	{
		icons,
		selectedIds,
		focusIconId,
		layout,
	}: {
		icons: readonly KeyNavIcon[];
		selectedIds: readonly string[];
		focusIconId?: string | null;
		layout: Pick<ClassicyAppearanceLayout, "selection">;
	},
): ClassicyDesktopKeyCommand {
	if (e.defaultPrevented || icons.length === 0) return NONE;
	const shown = (id: string | null | undefined): id is string =>
		!!id && icons.some((i) => i.appId === id);
	const windowsKeys = classicyWindowsSelectionKeys(layout);

	if (e.key === " ") {
		if (!windowsKeys) return NONE;
		const how = classicyDesktopSpaceSelection(e);
		const iconId = classicyDesktopFocusIconId(icons, focusIconId);
		return how && iconId ? { type: how, iconId } : NONE;
	}

	if (!DESKTOP_NAVIGATION_KEYS.has(e.key) || !classicyIconsRoveFocus(layout))
		return NONE;
	const first = icons[0].appId;
	const last = icons[icons.length - 1].appId;
	let target: string;
	if (e.key === "Home" || e.key === "PageUp") target = first;
	else if (e.key === "End" || e.key === "PageDown") target = last;
	else {
		const from = shown(focusIconId)
			? focusIconId
			: selectedIds.find((id) => shown(id));
		if (!from) target = first;
		else {
			const next = nearestIconInDirection(
				icons as KeyNavIcon[],
				from,
				e.key as ArrowDirection,
			);
			// Nothing that way: the focus stays, the selection as it is
			// (comctl32's `LISTVIEW_GetNextItem` gives -1).
			if (!next) return { type: "focus", iconId: from };
			target = next;
		}
	}
	if (e.shiftKey) return { type: "range", iconId: target };
	if (windowsKeys && classicyMovesCursorOnly(e))
		return { type: "focus", iconId: target };
	return { type: "select", iconId: target };
}

/**
 * The desktop root's list box attributes (`ClassicyDesktop`): under
 * `layout.selection.keyboard` `"windows"`, whose desktop icons are options
 * (`role="option"`, `aria-selected`; WIG Ch.5 "Keyboard Selection", p.43:
 * Space selects, it does not activate), `role="listbox"` with
 * `aria-multiselectable`; else none, the desktop keeping its own role.
 */
export function classicyDesktopListboxAttributes(
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): { role?: "listbox"; "aria-multiselectable"?: true } {
	return classicyWindowsSelectionKeys(layout)
		? { role: "listbox", "aria-multiselectable": true }
		: {};
}

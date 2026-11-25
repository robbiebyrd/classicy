import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyDesktopIconSelectMode } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import {
	classicyContextMenuOpensOnRelease,
	classicySecondaryButtonSelects,
	classicyWindowsSelectionModifiers,
	isClassicyGestureButton,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

/** What a press on the desktop's empty area does (`classicyDesktopSelectPress`). */
export type ClassicyDesktopSelectPress = {
	/**
	 * `"select"`: the press starts the selection rectangle. `"menu"`: it
	 * shows the desktop's menu (at the press, unless `deferMenu`).
	 * `"ignore"`: it does nothing.
	 */
	action: "select" | "menu" | "ignore";
	/** With `"select"`: clear the icon selection before the rectangle. */
	clearIcons: boolean;
	/**
	 * Leave the desktop's menu to the `contextmenu` event, which the
	 * contextual menu provider opens at the button's release
	 * (`layout.contextMenu.openOn` `"release"`), rather than opening it at
	 * the press.
	 */
	deferMenu: boolean;
	/**
	 * With `"select"`: how the rectangle meets the selection the press
	 * found (`classicyDesktopBoxSelection`). `"none"`: it replaces it.
	 * `"union"` (Shift): it adds what it covers. `"toggle"` (Control or ⌘):
	 * it toggles what it covers (WIG Ch.5 "Region Selection", p.42; App. A
	 * Table A.2, p.351, Table A.3, pp.354-355). Either keeps the selection
	 * the press found (`clearIcons` false): the desktop dispatches
	 * `ClassicyDesktopFocus` with `keepIconSelection: true`.
	 */
	keep: "none" | "union" | "toggle";
};

/** The press's button and modifiers, as a mouse event carries them. */
export type ClassicyDesktopSelectPressEvent = {
	button: number;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
};

/**
 * What a press on the desktop's empty area (`#classicyDesktop` itself) does,
 * by the press's button and the active package's layout. Pure: the desktop
 * (`ClassicyDesktop`'s `startSelectBox`) acts on the answer.
 *
 * Absent keys (Mac OS 8, today's rule): buttons 1 and the middle button
 * start the rectangle, clearing the icons first; any other opens the menu
 * at the press, keeping the icon selection.
 *
 * - `layout.selection.secondaryButton` `"select"` (Windows; WIG Ch.5
 *   "Selection with the Mouse", pp.37-38; App. A Table A.1, p.349): button
 *   2 clears the icons and starts the rectangle as button 1 does, the menu
 *   left to the `contextmenu` event.
 * - `layout.contextMenu.openOn` `"release"` (WIG Ch.5 p.38): a press that
 *   would show the menu (button 2, or a `"menu"` press) defers it to the
 *   `contextmenu` event (`deferMenu`), opened at the release.
 * - `layout.mouse` `"windows"` (WIG Ch.4 "Mouse Actions", pp.24-25): a
 *   button other than 1 and 2 does nothing (`"ignore"`).
 * - `layout.selection.modifiers` `"windows"` (WIG Ch.5 "Region Selection",
 *   p.42; App. A Table A.2, p.351: "SHIFT+Press" on white space extends;
 *   Table A.3, pp.354-355: "CTRL+Press" initiates a disjoint region): a
 *   rectangle started with Shift keeps the selection and adds to it
 *   (`keep: "union"`), with Control or ⌘ (Shift or not) keeps it and
 *   toggles what it covers (`keep: "toggle"`), either button; neither
 *   clears the icons. Without the key every rectangle replaces the
 *   selection (`keep: "none"`), as Mac OS 8's did.
 */
export function classicyDesktopSelectPress(
	e: ClassicyDesktopSelectPressEvent,
	layout: Pick<ClassicyAppearanceLayout, "mouse" | "selection" | "contextMenu">,
): ClassicyDesktopSelectPress {
	const deferring = classicyContextMenuOpensOnRelease(layout);
	if (e.button !== 2 && !isClassicyGestureButton(e, layout)) {
		return {
			action: "ignore",
			clearIcons: false,
			deferMenu: false,
			keep: "none",
		};
	}
	const keep = classicyDesktopBoxKeep(e, layout);
	if (e.button === 2 && classicySecondaryButtonSelects(layout)) {
		return {
			action: "select",
			clearIcons: keep === "none",
			deferMenu: deferring,
			keep,
		};
	}
	if (e.button <= 1) {
		return {
			action: "select",
			clearIcons: keep === "none",
			deferMenu: false,
			keep,
		};
	}
	return {
		action: "menu",
		clearIcons: false,
		deferMenu: deferring,
		keep: "none",
	};
}

/** How a rectangle's press modifiers keep the selection (`keep`). */
const classicyDesktopBoxKeep = (
	e: ClassicyDesktopSelectPressEvent,
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): ClassicyDesktopSelectPress["keep"] => {
	if (!classicyWindowsSelectionModifiers(layout)) return "none";
	if (e.ctrlKey || e.metaKey) return "toggle";
	return e.shiftKey ? "union" : "none";
};

/**
 * The selection a desktop rectangle gives: what it covers (`boxed`, the
 * icons it touches now) against the selection the press found (`base`),
 * by the press's `keep` (`classicyDesktopSelectPress`). Pure; the desktop
 * (`ClassicyDesktop`'s `resizeSelectBox`) dispatches the answer as
 * `ClassicyDesktopIconSelectBox` on every frame, so the selection shows
 * live (WIG Ch.5 "Region Selection", p.42).
 *
 * - `"none"`: `boxed` alone.
 * - `"union"` (Shift; App. A Table A.2, p.351): `base` and `boxed`, `base`'s
 *   icons first.
 * - `"toggle"` (Control or ⌘; App. A Table A.3, pp.354-355 and its note 4,
 *   p.356: "The range of objects included are all toggled to the same
 *   selection state, which is based on the first object included by the
 *   bounding region"): given `firstCoveredSelected`, whether the first icon
 *   the rectangle covered in this gesture was in `base`, every covered icon
 *   takes that icon's toggled state, so the rectangle removes what it
 *   covers when that icon was selected and adds it when it was not;
 *   without it, each covered icon toggles on its own (`base` △ `boxed`, as
 *   comctl32's marquee inverts the items under it, `LISTVIEW_MarqueeHighlight`,
 *   and as the folder views' rectangle does). An icon the rectangle leaves
 *   goes back to its state in `base`.
 */
export function classicyDesktopBoxSelection(
	base: readonly string[],
	boxed: readonly string[],
	keep: ClassicyDesktopSelectPress["keep"],
	firstCoveredSelected?: boolean,
): string[] {
	if (keep === "none") return [...boxed];
	const held = new Set(base);
	const covered = new Set(boxed);
	const added = boxed.filter((id) => !held.has(id));
	if (keep === "union") return [...base, ...added];
	if (firstCoveredSelected === true)
		return base.filter((id) => !covered.has(id));
	if (firstCoveredSelected === false) return [...base, ...added];
	return [...base.filter((id) => !covered.has(id)), ...added];
}

/**
 * How a button-1 press on a desktop icon adjusts the desktop's selection
 * (`ClassicyDesktopIconSelect`'s `mode`), under `layout.selection.modifiers`
 * `"windows"` (WIG Ch.5 "Selection Adjustment", pp.38-39, summary table,
 * p.42; App. A Tables A.2, pp.351-353, and A.3, pp.354-356): `"toggle"` with
 * Control or ⌘, `"range"` with Shift, `"addRange"` with both. `null` with
 * no modifier, for another button, or without the key, where a modified
 * click selects the icon alone as a plain one does (Mac OS 8's desktop).
 */
export function classicyDesktopIconSelectMode(
	e: ClassicyDesktopSelectPressEvent,
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): ClassicyDesktopIconSelectMode | null {
	if (e.button !== 0 || !classicyWindowsSelectionModifiers(layout)) return null;
	const toggle = e.ctrlKey || e.metaKey;
	if (toggle && e.shiftKey) return "addRange";
	if (toggle) return "toggle";
	return e.shiftKey ? "range" : null;
}

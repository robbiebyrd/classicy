import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyContextMenuOpensOnRelease,
	classicySecondaryButtonSelects,
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
	 * found. `"none"`: it replaces it. `"union"` and `"toggle"` stand for a
	 * Shift and a Ctrl rectangle (WIG Ch.5 "Region Selection", p.42), which
	 * this rule does not tell apart: it always answers `"none"`.
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
	if (e.button === 2 && classicySecondaryButtonSelects(layout)) {
		return {
			action: "select",
			clearIcons: true,
			deferMenu: deferring,
			keep: "none",
		};
	}
	if (e.button <= 1) {
		return {
			action: "select",
			clearIcons: true,
			deferMenu: false,
			keep: "none",
		};
	}
	return {
		action: "menu",
		clearIcons: false,
		deferMenu: deferring,
		keep: "none",
	};
}

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";

/**
 * The mouse's press discipline, as the active package's layout declares it
 * (`layout.mouse`, `layout.selection`, `layout.contextMenu.openOn`; WIG
 * Ch.4 "Mouse Actions", pp.24-25; Ch.5 "Selection with the Mouse",
 * pp.37-38, "Selection Adjustment", pp.38-39). Pure: each reader takes the layout
 * (a component's `useClassicyAppearanceLayout()`, or store-free code's
 * `getClassicyAppearanceLayout()`), so the rule is tested without a desktop.
 * Every reader gives today's rule when its key is absent.
 */

/**
 * How far, in px, the pointer travels from a press before a non-file icon
 * moves under `layout.mouse` `"windows"`: Windows' drag rectangle
 * (SM_CXDRAG and SM_CYDRAG, 4), measured as the distance from the press
 * (`Math.hypot`), as a window's title-bar drag waits for its own.
 */
export const CLASSICY_MOUSE_DRAG_THRESHOLD = 4;

/**
 * Whether a press of `e.button` may start a direct manipulation (a drag of
 * a split view's divider, a table's column edge, a non-file icon; the
 * window's move and resize, wired by the shell). Absent `layout.mouse`
 * (Mac OS 8, and today's rule): every button, `true`. `"windows"`: button 1
 * alone (`e.button === 0`): "there is no basic action defined for a third
 * (generally the middle) mouse button" (WIG Ch.4 "Mouse Actions",
 * pp.24-25), and a button-2 drag is not button 1's.
 */
export const isClassicyGestureButton = (
	e: { button: number },
	layout: Pick<ClassicyAppearanceLayout, "mouse">,
): boolean => layout.mouse !== "windows" || e.button === 0;

/**
 * How far, in px, a non-file icon's pointer travels from the press before
 * the icon moves: 0 (it moves on the first move, today's rule) unless
 * `layout.mouse` is `"windows"`, `CLASSICY_MOUSE_DRAG_THRESHOLD`.
 */
export const classicyIconDragThreshold = (
	layout: Pick<ClassicyAppearanceLayout, "mouse">,
): number => (layout.mouse === "windows" ? CLASSICY_MOUSE_DRAG_THRESHOLD : 0);

/**
 * Whether `point` is at least `threshold` px from `start` (the press), the
 * distance as the crow flies (`Math.hypot`). A threshold of 0 or less is
 * always passed.
 */
export const classicyTraveledPast = (
	start: readonly [number, number],
	point: readonly [number, number],
	threshold: number,
): boolean =>
	threshold <= 0 ||
	Math.hypot(point[0] - start[0], point[1] - start[1]) >= threshold;

/**
 * Whether a tab is chosen at its button-1 press (`layout.mouse`
 * `"windows"`, comctl32's tab control selecting on WM_LBUTTONDOWN) rather
 * than when the button comes up over it (absent, today's rule).
 */
export const classicyTabSelectsOnPress = (
	layout: Pick<ClassicyAppearanceLayout, "mouse">,
): boolean => layout.mouse === "windows";

/**
 * Whether button 2 selects what it presses on, keeping a selection it
 * presses inside (`layout.selection.secondaryButton` `"select"`), rather
 * than showing the menu alone (absent or `"menu"`, today's rule).
 */
export const classicySecondaryButtonSelects = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean => layout.selection?.secondaryButton === "select";

/**
 * Whether a contextual menu asked for while button 2 is down waits for its
 * release (`layout.contextMenu.openOn` `"release"`) rather than opening at
 * once (absent or `"event"`, today's rule).
 */
export const classicyContextMenuOpensOnRelease = (
	layout: Pick<ClassicyAppearanceLayout, "contextMenu">,
): boolean => layout.contextMenu?.openOn === "release";

/**
 * Whether button 1 selects a list box's, a table's or a tree's row at the
 * press (`layout.selection.selectOn` `"press"`, as user32's list box and
 * comctl32's list and tree views do) rather than when the button comes up
 * over it (absent or `"click"`, today's rule, Mac OS 8's List Manager).
 */
export const classicySelectsOnPress = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean => layout.selection?.selectOn === "press";

/**
 * Whether a press dragged across a list's rows selects them
 * (`layout.selection.dragRange`), which only a selection made at the press
 * (`selectOn` `"press"`) can do: `false`, today's rule, otherwise.
 */
export const classicyDragSelectsRange = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean =>
	classicySelectsOnPress(layout) && layout.selection?.dragRange === true;

/**
 * Whether a list's modified clicks follow Windows (`layout.selection.modifiers`
 * `"windows"`: Control or ⌘ with Shift adds the anchor's range in the
 * anchor's state, the second click of a double-click changes nothing, and
 * a double-click opens the whole selection) rather than the Mac's (absent
 * or `"mac"`, today's rule: Shift wins, and a double-click opens its row).
 */
export const classicyWindowsSelectionModifiers = (
	layout: Pick<ClassicyAppearanceLayout, "selection">,
): boolean => layout.selection?.modifiers === "windows";

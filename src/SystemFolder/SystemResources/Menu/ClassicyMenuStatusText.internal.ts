import { createContext, useSyncExternalStore } from "react";

/**
 * The menus' status text: a highlighted menu item's help shown in its
 * window's status bar, not in a balloon beside it, under the package's
 * `layout.menu.itemHelp` `"statusBar"` (Windows; WIG Ch.12 "Status Bar
 * Messages", pp.276-277, Figure 12.7: "When the user moves the pointer over
 * a toolbar button or presses the mouse button on a menu or button, display
 * a short message describing use of the associated command").
 *
 * Store-free and page-wide, as the window's menu loop is: while any menu
 * tree that gives status text is shown (`markClassicyMenuStatusShown`, from
 * `ClassicyMenu`'s root), the text is the highlighted item's
 * (`publishClassicyMenuStatusText`, from the item under the pointer or the
 * keyboard's focus), `""` while none is highlighted or the item has no help;
 * with no such menu shown it is `null`. A `ClassicyPlacard` given
 * `menuStatus` in the active window shows it in place of its children
 * meanwhile (MenuHelp's simple mode: the status bar shows the menu's text
 * until the menu loop ends).
 */

/**
 * Whether the menus rendered inside give status text (default `true`).
 * `ClassicyBevelButtonPopup` provides `false` outside any window: the
 * taskbar's Start menu and tray, and the Control Strip's pop-ups, belong to
 * no window's status bar.
 */
export const ClassicyMenuStatusContext = createContext(true);

let shownMenus = 0;
let text = "";
let owner: object | null = null;
let snapshot: string | null = null;
const listeners = new Set<() => void>();

const update = () => {
	const next = shownMenus > 0 ? text : null;
	if (next === snapshot) return;
	snapshot = next;
	for (const listener of listeners) listener();
};

/**
 * Marks a menu tree that gives status text as shown; returns its removal,
 * which counts once. When the last one goes, the text is `null` again and
 * the highlighted item forgotten.
 */
export const markClassicyMenuStatusShown = (): (() => void) => {
	shownMenus += 1;
	update();
	let removed = false;
	return () => {
		if (removed) return;
		removed = true;
		shownMenus -= 1;
		if (shownMenus === 0) {
			text = "";
			owner = null;
		}
		update();
	};
};

/**
 * The item `who` is highlighted, its help `value` (`""` for none). A bar's
 * title published before its menu shows is the text once it does.
 */
export const publishClassicyMenuStatusText = (who: object, value: string) => {
	owner = who;
	text = value;
	update();
};

/** The item `who` is no longer highlighted: no text, if it was the last. */
export const withdrawClassicyMenuStatusText = (who: object) => {
	if (owner !== who) return;
	owner = null;
	text = "";
	update();
};

/** The status text now: `null` while no menu giving it is shown. */
export const getClassicyMenuStatusText = (): string | null => snapshot;

/** Listens for the status text changing; returns the unsubscription. */
export const subscribeClassicyMenuStatusText = (
	listener: () => void,
): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const ignore = () => () => {};
const none = (): null => null;

/**
 * The menus' status text, re-rendering when it changes: `null` while no
 * menu giving it is shown, else the highlighted item's help (`""` for
 * none). With `listen` false it reads `null` and subscribes to nothing.
 */
export const useClassicyMenuStatusText = (listen = true): string | null =>
	useSyncExternalStore(
		listen ? subscribeClassicyMenuStatusText : ignore,
		listen ? getClassicyMenuStatusText : none,
		listen ? getClassicyMenuStatusText : none,
	);

/** Forgets every shown menu and the text (tests). */
export const resetClassicyMenuStatusTextForTests = () => {
	shownMenus = 0;
	text = "";
	owner = null;
	update();
};

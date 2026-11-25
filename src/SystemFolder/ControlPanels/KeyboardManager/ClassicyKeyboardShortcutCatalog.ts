/**
 * The bundled apps' menu items that carry a keyboard shortcut the user may
 * change (WIG Ch.4 "Shortcut Keys" (p.27): "let the user change shortcut
 * assignments where possible"), as the Keyboard control panel lists them
 * under `layout.keyboard.editableShortcuts`. Each `id` is the stable id the
 * item's builder passes to `useClassicyMenuItemShortcut` (an item's own id
 * where it is stable, `"finder_file_open"` and the like where the menu
 * item's id carries a window or folder), and `shortcut` the chord the app
 * declares, which Reset restores.
 *
 * Left out on purpose: the Edit menus' Undo, Cut, Copy, Paste, Clear and
 * Select All (`nativeShortcut`: the browser performs them, so a different
 * chord would show a key that does nothing), chords with no modifier
 * (Finder's Delete ⌦, which the file views take themselves), the screen
 * bar's Show Balloons ⌥H (a system item of the shell's menu bar) and a
 * host's own items, which keep their chords.
 */
export type ClassicyBundledMenuShortcut = Readonly<{
	/** The stable shortcut id, the key of `Desktop.shortcutOverrides`. */
	id: string;
	/** The app whose menu carries the item. */
	appId: string;
	/** The app's own name, shown when no package renames it. */
	appName: string;
	/** The item's title, as its menu shows it. */
	title: string;
	/** The app's own chord, in a menu item's form. */
	shortcut: string;
}>;

// The control panels' and the Calculator's File menu: Close Window and
// Quit, under the items' own ids.
const closeAndQuit = (
	appId: string,
	appName: string,
): ClassicyBundledMenuShortcut[] => [
	{
		id: `${appId}_close_window`,
		appId,
		appName,
		title: "Close Window",
		shortcut: "⌥W",
	},
	{ id: `${appId}_quit`, appId, appName, title: "Quit", shortcut: "⌥Q" },
];

/** Every editable bundled shortcut, grouped by app in the panel's order. */
export const CLASSICY_BUNDLED_MENU_SHORTCUTS: readonly ClassicyBundledMenuShortcut[] =
	Object.freeze(
		[
			{
				id: "finder_file_open",
				appId: "Finder.app",
				appName: "Finder",
				title: "Open",
				shortcut: "⌘O",
			},
			{
				id: "finder_file_move_to_trash",
				appId: "Finder.app",
				appName: "Finder",
				title: "Move To Trash",
				shortcut: "⌃⌫",
			},
			{
				id: "finder_edit_select_all",
				appId: "Finder.app",
				appName: "Finder",
				title: "Select All",
				shortcut: "⌘A",
			},
			{
				id: "SimpleText.app_file_open",
				appId: "SimpleText.app",
				appName: "SimpleText",
				title: "Open…",
				shortcut: "⌃O",
			},
			{
				id: "SimpleText.app_file_save",
				appId: "SimpleText.app",
				appName: "SimpleText",
				title: "Save",
				shortcut: "⌃S",
			},
			{
				id: "view_hypercard_tools",
				appId: "HyperCard.app",
				appName: "HyperCard",
				title: "Tools",
				shortcut: "⌃T",
			},
			{
				id: "view_hypercard_inspector",
				appId: "HyperCard.app",
				appName: "HyperCard",
				title: "Info",
				shortcut: "⌃I",
			},
			...closeAndQuit("Calculator.app", "Calculator"),
			...closeAndQuit("AppearanceManager.app", "Appearance Manager"),
			...closeAndQuit("DateAndTimeManager.app", "Date and Time Manager"),
			...closeAndQuit("SoundManager.app", "Sound Manager"),
			...closeAndQuit("ControlStripManager.app", "Control Strip"),
			...closeAndQuit("DriveSetup.app", "Drive Setup"),
			...closeAndQuit("ScreenSaverManager.app", "Screen Saver"),
			...closeAndQuit("KeyboardManager.app", "Keyboard"),
		].map((entry) => Object.freeze(entry)),
	);

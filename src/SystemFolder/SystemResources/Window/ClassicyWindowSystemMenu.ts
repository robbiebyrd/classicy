import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The window pop-up menu (the system menu) under a layout that declares
 * `window.systemMenu: true` (the Windows shell, plan 0020-w98 §5; WIG Ch.7
 * "The Window Pop-up Menu", p.102): the commands it holds, each the window
 * registry's command of the same name.
 */
export type ClassicyWindowSystemMenuCommand =
	| "restore"
	| "move"
	| "size"
	| "minimize"
	| "maximize"
	| "close";

/**
 * What `classicyWindowSystemMenuItems` builds the menu from: the window and
 * what it can do now.
 */
export type ClassicyWindowSystemMenuState = {
	/** The owning app's id. */
	appId: string;
	/** The window's id, unique within its app. */
	windowId: string;
	/**
	 * Which kind of window: `"document"`, a primary window; `"modal"`, a
	 * secondary window (a dialog or a message box); `"utility"`, a palette.
	 */
	kind: "document" | "modal" | "utility";
	/**
	 * Collapsed: minimized under `window.collapse: "minimize"`, shaded under
	 * every other layout (the store's `collapsed`, an ignored one excepted).
	 */
	minimized: boolean;
	/** Zoomed: maximized under `window.zoom: "maximize"` (the store's `zoomed`). */
	maximized: boolean;
	/**
	 * Not drawn: minimized under `window.collapse: "minimize"`, or a palette
	 * hidden with its minimized app. A shaded window is on the screen.
	 */
	offScreen: boolean;
	/** It moves by its caption (`false` for a fixed modal). */
	movable: boolean;
	/** It has a sizing border and a grow box (`resizable`). */
	resizable: boolean;
	/** It draws a Minimize (collapse) box. */
	minimizable: boolean;
	/** It draws a Maximize (zoom) box. */
	maximizable: boolean;
	/** Its Close would close it (the close box's path). */
	closable: boolean;
};

/** What each item runs: the window's own command of that name. */
export type ClassicyWindowSystemMenuHandlers = Readonly<
	Record<ClassicyWindowSystemMenuCommand, () => void>
>;

/** Each item's title, Windows 95/98's (WIG Ch.7, p.102). */
export const CLASSICY_WINDOW_SYSTEM_MENU_TITLES: Readonly<
	Record<ClassicyWindowSystemMenuCommand, string>
> = Object.freeze({
	restore: "Restore",
	move: "Move",
	size: "Size",
	minimize: "Minimize",
	maximize: "Maximize",
	close: "Close",
});

/**
 * Close's keyboard equivalent, ALT+F4 (WIG App. B, Table B.2, p.358: "Close
 * the active window"), in the menu-item form (`⌥` is the Alt and Option key):
 * the menu draws it in the active package's glyph spelling, and
 * `useClassicyWindowShellKeys` binds it.
 */
export const CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT = "⌥F4";

// The commands, in Windows' order, of each kind of window's menu (WIG Ch.7
// "The Window Pop-up Menu", p.102; Ch.8 "Appearance and Behavior", p.145, and
// "Palette Windows", p.164, Figure 8.16), with the place of the separator
// before Close: Windows' own menu (Wine's `copy_sys_popup` loads its
// SYSMENU resource) puts it there.
const COMMANDS: Readonly<
	Record<
		ClassicyWindowSystemMenuState["kind"],
		readonly ClassicyWindowSystemMenuCommand[]
	>
> = Object.freeze({
	document: Object.freeze([
		"restore",
		"move",
		"size",
		"minimize",
		"maximize",
		"close",
	] as const),
	modal: Object.freeze(["move", "close"] as const),
	utility: Object.freeze(["move", "size", "close"] as const),
});

// Whether a command is available now: Windows' own graying of the system
// menu (Wine's `MENU_InitSysMenuPopup` / `init_sys_menu_popup`), read over
// Classicy's window. Restore needs a window minimized or maximized; Move one
// that moves, not maximized and on the screen (Windows grays Move only while
// maximized, since Windows 3.1 moved a minimized window's icon; a minimized
// window here is off the screen, with nothing to move, while a shaded one
// still moves by its title bar); Size a resizable window neither minimized
// nor maximized; Minimize a Minimize box and a window not minimized;
// Maximize a Maximize box and a window not maximized; Close a window its
// Close would close.
const enabled = (
	command: ClassicyWindowSystemMenuCommand,
	state: ClassicyWindowSystemMenuState,
): boolean => {
	switch (command) {
		case "restore":
			return state.minimized || state.maximized;
		case "move":
			return state.movable && !state.maximized && !state.offScreen;
		case "size":
			return state.resizable && !state.minimized && !state.maximized;
		case "minimize":
			return state.minimizable && !state.minimized;
		case "maximize":
			return state.maximizable && !state.maximized;
		case "close":
			return state.closable;
	}
};

/**
 * What every item id of a window's system menu starts with:
 * `${appId}_${windowId}_system_`.
 */
export const classicyWindowSystemMenuItemIdPrefix = (
	appId: string,
	windowId: string,
): string => `${appId}_${windowId}_system_`;

/**
 * The id of a window's system-menu item: `${appId}_${windowId}_system_<command>`
 * (`classicyWindowSystemMenuItemIdPrefix` then the command).
 */
export const classicyWindowSystemMenuItemId = (
	appId: string,
	windowId: string,
	command: ClassicyWindowSystemMenuCommand,
): string =>
	`${classicyWindowSystemMenuItemIdPrefix(appId, windowId)}${command}`;

/**
 * A window's pop-up (system) menu (plan 0020-w98 §5; WIG Ch.7 "The Window
 * Pop-up Menu", p.102): for a primary window Restore, Move, Size, Minimize,
 * Maximize, a separator and Close; for a secondary window (a modal) Move, a
 * separator and Close (Ch.8, p.145); for a palette Move, Size, a separator and
 * Close (Ch.8, p.164, Figure 8.16). Each item is enabled as Windows enables
 * it (Wine's `MENU_InitSysMenuPopup`) and runs its handler. Close is the
 * menu's default item (`isDefault`, which Windows draws bold: Wine sets it
 * with `SetMenuDefaultItem(…, SC_CLOSE)`) and shows ALT+F4
 * (`CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT`). Item ids are
 * `classicyWindowSystemMenuItemId`'s. Pure.
 *
 * ```ts
 * classicyWindowSystemMenuItems(
 *   { appId: "Notes.app", windowId: "main", kind: "document", minimized: false,
 *     maximized: false, offScreen: false, movable: true, resizable: true,
 *     minimizable: true, maximizable: true, closable: true },
 *   { restore, move, size, minimize, maximize, close },
 * ) // Restore (dimmed), Move, Size, Minimize, Maximize, —, Close ⌥F4
 * ```
 */
export function classicyWindowSystemMenuItems(
	state: ClassicyWindowSystemMenuState,
	handlers: ClassicyWindowSystemMenuHandlers,
): ClassicyMenuItem[] {
	const items: ClassicyMenuItem[] = [];
	for (const command of COMMANDS[state.kind]) {
		if (command === "close") items.push({ id: "spacer" });
		items.push({
			id: classicyWindowSystemMenuItemId(state.appId, state.windowId, command),
			title: CLASSICY_WINDOW_SYSTEM_MENU_TITLES[command],
			disabled: !enabled(command, state),
			onClickFunc: handlers[command],
			...(command === "close"
				? {
						isDefault: true,
						keyboardShortcut: CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT,
					}
				: {}),
		});
	}
	return items;
}

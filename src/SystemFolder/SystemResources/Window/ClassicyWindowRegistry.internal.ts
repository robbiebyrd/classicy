import { useSyncExternalStore } from "react";

/**
 * The live window registry (plan 0020-w98 §5, "Shared plumbing"): every
 * mounted `ClassicyWindow`, with what the store record does not hold (its
 * title, icon and capabilities) and a way to run its own commands.
 *
 * Runtime state, deliberately kept out of the store, as `ClassicyMountedApps`
 * is: the persisted window record (`apps[appId].windows[id]`) holds neither a
 * title nor an icon, and adding them would change what every package
 * persists. Registering changes no DOM and no store, under every package; a
 * surface that lists windows or acts on one (the Windows shell's taskbar, its
 * window pop-up menu and ALT+F4) reads this instead.
 *
 * Modals register too: the window pop-up menu and ALT+F4 reach them.
 */

/**
 * A command a registered window carries out through its own path, so its
 * sounds, analytics, the `onBeforeClose` veto and the zoom geometry stay where
 * they live (`ClassicyWindow.tsx`):
 *
 * - `activate`: focus the window (its click's path).
 * - `minimize`: collapse it (the collapse box's path).
 * - `restore`: expand a collapsed window, else un-zoom a zoomed one, then
 *   activate it.
 * - `maximize`: zoom it (the zoom box's path), then activate it.
 * - `close`: the close box's path, `onBeforeClose` included.
 * - `systemMenu`, at a desktop point if given: the window pop-up menu
 *   (`window.systemMenu: true` layouts only), opened at that point, else
 *   dropped from the caption's bottom-left with its first item selected, as
 *   ALT+SPACE opens it. The window is activated first unless it is off the
 *   screen (minimized, or a palette hidden with its app), whose menu opens
 *   only at a given point, without restoring it.
 * - `move`, `size`: the keyboard Move and Size modes (WIG Ch.6, p.83): until
 *   ENTER, a button-1 release or a lost pointer stream ends one where it is,
 *   or ESC puts the window back, the arrow keys move the window, or the
 *   edges being sized, 8 px a press and the mouse moves them by its travel.
 *   A mode holds the keyboard and the mouse buttons while it lasts, and any
 *   other command ends it where it is first.
 */
export type ClassicyWindowCommand =
	| { type: "activate" }
	| { type: "minimize" }
	| { type: "restore" }
	| { type: "maximize" }
	| { type: "close" }
	| { type: "systemMenu"; at?: [number, number] }
	| { type: "move" }
	| { type: "size" };

/** What a mounted window publishes about itself. */
export type ClassicyWindowEntry = {
	/** The owning app's id. */
	readonly appId: string;
	/** The window's id, unique within its app. */
	readonly windowId: string;
	/** The `title` prop, `""` for an untitled window. */
	readonly title: string;
	/** The icon the window draws beside its title (the resolved `icon`). */
	readonly icon: string;
	/** A modal dialog (`modal`). */
	readonly modal: boolean;
	/** The `windowType` prop: a document window or a utility palette. */
	readonly windowType: "document" | "utility";
	/** Whether it draws a close box (`closable`). */
	readonly closable: boolean;
	/** Whether it draws a zoom box (`zoomable`). */
	readonly zoomable: boolean;
	/** Whether it draws a collapse box (`collapsable`). */
	readonly collapsable: boolean;
	/** Whether it draws a grow box (`resizable`). */
	readonly resizable: boolean;
	/**
	 * Whether it moves by its title bar: `false` for a fixed modal (an alert,
	 * or a modal with `movable={false}`), `true` for every other window.
	 */
	readonly movable: boolean;
	/**
	 * Run a command through the window's own path. `false` when the window
	 * cannot carry it out: it is closed, it lacks the box the command needs,
	 * there is nothing to do (minimizing a collapsed window, restoring one
	 * that is neither collapsed nor zoomed), it cannot move or size now
	 * (maximized, minimized, fixed, or a keyboard mode or a drag already in
	 * progress), or it has no pop-up menu to show (`systemMenu` under a
	 * layout without `window.systemMenu`, or with no point for a window off
	 * the screen).
	 */
	run(command: ClassicyWindowCommand): boolean;
};

/**
 * The handle `registerClassicyWindow` returns: the token of one
 * registration, which `updateClassicyWindow` and `unregisterClassicyWindow`
 * take.
 */
export type ClassicyWindowRegistration = { readonly token: symbol };

type Registered = { readonly token: symbol; entry: ClassicyWindowEntry };

const keyOf = (appId: string, windowId: string) => `${appId}\u0000${windowId}`;

// Each window's registrations, oldest first; the newest one still registered
// is the window's entry. Two mounted instances of one window (a replacement
// mounting before the one it replaces unmounts) each hold their own, so the
// one that stays keeps the window listed when the other goes. The Map's order
// is the order the windows first registered in.
const registrations = new Map<string, Registered[]>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicyWindowEntry[] = Object.freeze([]);

// Replace the snapshot and notify, only when the entries it lists changed: an
// update of a registration that is not its window's newest changes nothing.
const publish = () => {
	const next = Array.from(
		registrations.values(),
		(list) => list[list.length - 1].entry,
	);
	if (
		next.length === snapshot.length &&
		next.every((entry, i) => entry === snapshot[i])
	)
		return;
	snapshot = Object.freeze(next);
	for (const listener of listeners) listener();
};

const frozenCopy = (entry: ClassicyWindowEntry): ClassicyWindowEntry =>
	Object.freeze({ ...entry });

const find = (
	registration: ClassicyWindowRegistration,
): { key: string; list: Registered[]; index: number } | undefined => {
	for (const [key, list] of registrations) {
		const index = list.findIndex((r) => r.token === registration.token);
		if (index >= 0) return { key, list, index };
	}
	return undefined;
};

/**
 * Register a window: its entry becomes the one listed for its app and window
 * id (the newest registration wins). The entry is copied and frozen, so a
 * later change to the caller's object changes nothing. Returns the
 * registration's handle.
 */
export function registerClassicyWindow(
	entry: ClassicyWindowEntry,
): ClassicyWindowRegistration {
	const token = Symbol(`${entry.appId}/${entry.windowId}`);
	const key = keyOf(entry.appId, entry.windowId);
	const list = registrations.get(key) ?? [];
	list.push({ token, entry: frozenCopy(entry) });
	registrations.set(key, list);
	publish();
	return { token };
}

/**
 * Replace a registration's entry in place: the window keeps its position in
 * the list. `false`, changing nothing, when the registration is no longer
 * registered or `entry` names another window (register that one instead).
 */
export function updateClassicyWindow(
	registration: ClassicyWindowRegistration,
	entry: ClassicyWindowEntry,
): boolean {
	const found = find(registration);
	if (!found || found.key !== keyOf(entry.appId, entry.windowId)) return false;
	found.list[found.index].entry = frozenCopy(entry);
	publish();
	return true;
}

/**
 * Remove a registration. A stale one (already removed: a StrictMode phantom
 * cleanup after the remount registered again) removes nothing, and removing
 * a window's older registration leaves its newest one listed. Returns
 * whether a registration was removed.
 */
export function unregisterClassicyWindow(
	registration: ClassicyWindowRegistration,
): boolean {
	const found = find(registration);
	if (!found) return false;
	found.list.splice(found.index, 1);
	if (found.list.length === 0) registrations.delete(found.key);
	publish();
	return true;
}

/**
 * Every registered window, in the order the windows first registered. The
 * array and its entries are frozen and keep their identity until a register,
 * update or unregister changes what it lists.
 */
export const getClassicyWindowEntries = (): readonly ClassicyWindowEntry[] =>
	snapshot;

/** A window's listed entry, or `undefined` while none is registered. */
export const getClassicyWindowEntry = (
	appId: string,
	windowId: string,
): ClassicyWindowEntry | undefined =>
	registrations.get(keyOf(appId, windowId))?.at(-1)?.entry;

/** Called after each register, update or unregister that changes the list. */
export function subscribeClassicyWindowEntries(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Every registered window; re-renders when one registers, updates or goes. */
export const useClassicyWindowEntries = (): readonly ClassicyWindowEntry[] =>
	useSyncExternalStore(
		subscribeClassicyWindowEntries,
		getClassicyWindowEntries,
		getClassicyWindowEntries,
	);

/**
 * Run `command` on a registered window. `false` when no window with that app
 * and window id is mounted, or when the window cannot carry the command out.
 */
export const runClassicyWindowCommand = (
	appId: string,
	windowId: string,
	command: ClassicyWindowCommand,
): boolean => getClassicyWindowEntry(appId, windowId)?.run(command) ?? false;

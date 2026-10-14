import type {
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/**
 * Accessors for an app's window collection
 * (`System.Manager.Applications.apps[appId].windows`).
 *
 * Read and write windows through these helpers rather than touching the
 * collection directly: they are the single place that knows its shape, and
 * they work equally on plain state and on an immer draft (the write helpers
 * mutate in place, so call them inside a reducer).
 *
 * Read helpers accept `undefined`/`null` (an app that is not registered) and
 * an app whose `windows` is missing, so a selector can pass
 * `state.System.Manager.Applications.apps[appId]` straight through.
 */

/** Anything carrying an app's window collection — usually the app itself. */
export type ClassicyAppWindowsOwner =
	| { windows?: ClassicyStoreSystemApp["windows"] }
	| null
	| undefined;

/** The window with `windowId`, or `undefined` when the app has none by that id. */
export function getAppWindow(
	app: ClassicyAppWindowsOwner,
	windowId: string | undefined,
): ClassicyStoreSystemAppWindow | undefined {
	if (windowId === undefined) return undefined;
	return app?.windows?.find((w) => w.id === windowId);
}

/**
 * Every window of the app as a fresh array (safe to sort or filter), in
 * registration order. On an immer draft the elements are drafts, so mutating
 * them is a normal draft write. Prefer deciding on window data (`zOrder`,
 * `default`, `closed`) over position in this list.
 */
export function listAppWindows(
	app: ClassicyAppWindowsOwner,
): ClassicyStoreSystemAppWindow[] {
	return app?.windows ? app.windows.slice() : [];
}

/** True when the app has a window registered under `windowId`. */
export function hasAppWindow(
	app: ClassicyAppWindowsOwner,
	windowId: string | undefined,
): boolean {
	return getAppWindow(app, windowId) !== undefined;
}

/** How many windows (open or closed) the app has registered. */
export function countAppWindows(app: ClassicyAppWindowsOwner): number {
	return app?.windows?.length ?? 0;
}

/**
 * Insert `window`, or replace the window already registered under its id.
 * Mutates `app` (call it on a draft inside a reducer).
 */
export function setAppWindow(
	app: ClassicyStoreSystemApp,
	window: ClassicyStoreSystemAppWindow,
): void {
	if (!app.windows) app.windows = [];
	const index = app.windows.findIndex((w) => w.id === window.id);
	if (index < 0) {
		app.windows.push(window);
	} else {
		app.windows[index] = window;
	}
}

/**
 * Remove the window registered under `windowId`. Returns whether a window was
 * removed. Mutates `app`.
 */
export function removeAppWindow(
	app: ClassicyStoreSystemApp | undefined,
	windowId: string,
): boolean {
	if (!app?.windows || !hasAppWindow(app, windowId)) return false;
	app.windows = app.windows.filter((w) => w.id !== windowId);
	return true;
}

/**
 * Update the window registered under `windowId`, either by shallow-merging a
 * patch or by running a mutator on it. Returns the updated window, or
 * `undefined` (and does nothing) when the app or window does not exist.
 * Mutates `app`.
 */
export function updateAppWindow(
	app: ClassicyStoreSystemApp | undefined,
	windowId: string,
	update:
		| Partial<ClassicyStoreSystemAppWindow>
		| ((window: ClassicyStoreSystemAppWindow) => void),
): ClassicyStoreSystemAppWindow | undefined {
	const window = getAppWindow(app, windowId);
	if (!window) return undefined;
	if (typeof update === "function") {
		update(window);
	} else {
		Object.assign(window, update);
	}
	return window;
}

/**
 * The most recently focused of `windows`: the highest `zOrder` (a missing
 * zOrder counts as 0). On a tie the earlier entry in `windows` wins.
 * `undefined` for an empty list.
 */
export function mostRecentAppWindow(
	windows: readonly ClassicyStoreSystemAppWindow[],
): ClassicyStoreSystemAppWindow | undefined {
	let best: ClassicyStoreSystemAppWindow | undefined;
	for (const w of windows) {
		if (!best || (w.zOrder ?? 0) > (best.zOrder ?? 0)) best = w;
	}
	return best;
}

import type {
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppWindow,
	ClassicyStoreSystemAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Accessors for an app's window collection
 * (`System.Manager.Applications.apps[appId].windows`), a record keyed by
 * window id.
 *
 * Read and write windows through these helpers rather than touching the
 * record directly: they are the single place that knows its shape, and they
 * work equally on plain state and on an immer draft (the write helpers mutate
 * in place, so call them inside a reducer).
 *
 * Read helpers accept `undefined`/`null` (an app that is not registered) and
 * an app whose `windows` is missing, so a selector can pass
 * `state.System.Manager.Applications.apps[appId]` straight through.
 */

/** Anything carrying an app's window collection — usually the app itself. */
export type ClassicyAppWindowsOwner =
	| { windows?: ClassicyStoreSystemAppWindows }
	| null
	| undefined;

// Assigning this key on a plain object rewrites its prototype instead of
// adding an entry, so it can never be a window id.
const RESERVED_WINDOW_ID = "__proto__";

const hasOwn = (record: object, key: string): boolean =>
	Object.hasOwn(record, key);

/** The window with `windowId`, or `undefined` when the app has none by that id. */
export function getAppWindow(
	app: ClassicyAppWindowsOwner,
	windowId: string | undefined,
): ClassicyStoreSystemAppWindow | undefined {
	const windows = app?.windows;
	if (windowId === undefined || !windows || !hasOwn(windows, windowId)) {
		return undefined;
	}
	return windows[windowId];
}

/**
 * Every window of the app as a fresh array (safe to sort or filter), in
 * insertion order. On an immer draft the elements are drafts, so mutating
 * them is a normal draft write. Decide on window data (`zOrder`, `default`,
 * `closed`) rather than position in this list: JavaScript lists integer-like
 * keys ("2", "10") before all others, whatever order they were added in.
 */
export function listAppWindows(
	app: ClassicyAppWindowsOwner,
): ClassicyStoreSystemAppWindow[] {
	return app?.windows ? Object.values(app.windows) : [];
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
	return app?.windows ? Object.keys(app.windows).length : 0;
}

/**
 * Insert `window` under its id, or replace the window already registered
 * there. Mutates `app` (call it on a draft inside a reducer).
 */
export function setAppWindow(
	app: ClassicyStoreSystemApp,
	window: ClassicyStoreSystemAppWindow,
): void {
	if (window.id === RESERVED_WINDOW_ID) {
		classicyLog("warn", "ClassicyAppWindows", "Ignoring reserved window id", {
			appId: app.id,
			windowId: window.id,
		});
		return;
	}
	if (!app.windows) app.windows = {};
	app.windows[window.id] = window;
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
	delete app.windows[windowId];
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

function isWindowLike(value: unknown): value is ClassicyStoreSystemAppWindow {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { id?: unknown }).id === "string" &&
		(value as { id: string }).id !== "" &&
		(value as { id: string }).id !== RESERVED_WINDOW_ID
	);
}

/**
 * Coerce any value found at `apps[id].windows` into the window record.
 *
 * - An array (the 0.x shape) becomes a record keyed by each entry's `id`, in
 *   array order. Entries without a non-empty string `id` are dropped; on a
 *   duplicate id the later entry's value wins.
 * - A record is returned as-is (same reference) when every entry is a window
 *   stored under its own id; otherwise a copy without the invalid entries.
 * - Anything else (`undefined`, `null`, a string, a number…) becomes `{}`.
 *
 * Idempotent: normalising its own output returns that output unchanged.
 */
export function normalizeClassicyAppWindows(
	value: unknown,
): ClassicyStoreSystemAppWindows {
	if (Array.isArray(value)) {
		const record: ClassicyStoreSystemAppWindows = {};
		for (const entry of value) {
			if (isWindowLike(entry)) record[entry.id] = entry;
		}
		return record;
	}
	if (typeof value !== "object" || value === null) return {};
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) return {};
	const entries = Object.entries(value);
	const valid = entries.filter(
		([key, entry]) => isWindowLike(entry) && entry.id === key,
	);
	if (valid.length === entries.length) {
		return value as ClassicyStoreSystemAppWindows;
	}
	return Object.fromEntries(valid) as ClassicyStoreSystemAppWindows;
}

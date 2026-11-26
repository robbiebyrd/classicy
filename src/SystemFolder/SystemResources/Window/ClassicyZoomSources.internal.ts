/**
 * The zoom rectangles' session bookkeeping (ClassicyZoomRects.ts), outside the
 * store: the source an icon leaves for the window it opens, the windows a
 * Close All closes without a zoom, and the applications whose launch zoom is
 * running. Module state, one per page; nothing here is persisted.
 */

import type { ClassicyZoomOrigin } from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

/** How long an open's source, or a close's skip, waits for its window (ms). */
export const CLASSICY_ZOOM_SOURCE_TTL_MS = 1000;

const windowKey = (appId: string, windowId: string) =>
	`${appId}\u0000${windowId}`;

const pendingSources = new Map<
	string,
	{ origin: ClassicyZoomOrigin; at: number }
>();

/**
 * Records where the window `windowId` of `appId` is being opened from, so it
 * zooms out of that icon when it opens. Call it just before the dispatch that
 * opens the window. The window takes it when it opens, within
 * `CLASSICY_ZOOM_SOURCE_TTL_MS`; a window already open ignores it. No origin
 * records nothing.
 */
export const noteClassicyWindowZoomSource = (
	appId: string,
	windowId: string,
	origin: ClassicyZoomOrigin | undefined,
): void => {
	if (!origin) return;
	pendingSources.set(windowKey(appId, windowId), { origin, at: Date.now() });
};

/**
 * The origin recorded for a window by `noteClassicyWindowZoomSource`, once:
 * it is forgotten as it is read. Undefined when none was recorded, or it is
 * older than `CLASSICY_ZOOM_SOURCE_TTL_MS`.
 */
export const takeClassicyWindowZoomSource = (
	appId: string,
	windowId: string,
): ClassicyZoomOrigin | undefined => {
	const key = windowKey(appId, windowId);
	const entry = pendingSources.get(key);
	pendingSources.delete(key);
	if (!entry || Date.now() - entry.at > CLASSICY_ZOOM_SOURCE_TTL_MS) {
		return undefined;
	}
	return entry.origin;
};

const closeSkips = new Map<string, number>();

/**
 * Closes the window `windowId` of `appId` without its zoom back to its icon:
 * Close All zooms the window it was chosen from alone (Mac OS 8.1's
 * Option-click close box erased every window at once and zoomed only the
 * clicked one). Call it just before the close; it lapses after
 * `CLASSICY_ZOOM_SOURCE_TTL_MS`.
 */
export const skipClassicyWindowCloseZoom = (
	appId: string,
	windowId: string,
): void => {
	closeSkips.set(windowKey(appId, windowId), Date.now());
};

/** True, once, when the window's next close zoom is to be skipped. */
export const takeClassicyWindowCloseZoomSkip = (
	appId: string,
	windowId: string,
): boolean => {
	const key = windowKey(appId, windowId);
	const at = closeSkips.get(key);
	closeSkips.delete(key);
	return at !== undefined && Date.now() - at <= CLASSICY_ZOOM_SOURCE_TTL_MS;
};

const launchWaiters = new Map<string, Set<() => void>>();

/**
 * Marks `appIds` as launching: each one's windows that open while the launch
 * zoom runs wait for it (Mac OS 8.1 drew a launched application's window
 * after its zoom). Returns the function that ends the launch, telling each
 * waiting window.
 */
export const beginClassicyLaunchZoom = (appIds: string[]): (() => void) => {
	for (const id of appIds)
		if (!launchWaiters.has(id)) launchWaiters.set(id, new Set());
	let ended = false;
	return () => {
		if (ended) return;
		ended = true;
		for (const id of appIds) {
			const waiters = launchWaiters.get(id);
			launchWaiters.delete(id);
			for (const wake of waiters ?? []) wake();
		}
	};
};

/**
 * When `appId`'s launch zoom is running, calls `onEnd` when it ends and
 * returns the function that stops waiting; null when none runs.
 */
export const waitForClassicyLaunchZoom = (
	appId: string,
	onEnd: () => void,
): (() => void) | null => {
	const waiters = launchWaiters.get(appId);
	if (!waiters) return null;
	waiters.add(onEnd);
	return () => {
		waiters.delete(onEnd);
	};
};

/** Forgets every source, skip and launch (tests). */
export const resetClassicyZoomSourcesForTests = (): void => {
	pendingSources.clear();
	closeSkips.clear();
	launchWaiters.clear();
};

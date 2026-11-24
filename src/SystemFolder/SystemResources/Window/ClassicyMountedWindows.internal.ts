/**
 * Which `ClassicyWindow`s are mounted right now, by app and window id:
 * runtime state, like `ClassicyMountedApps.ts`, kept out of the store, which
 * holds a record for every window an app ever registered. `openApp` reopens
 * only a window that is mounted: one that is not (its app quit, or the
 * document it showed closed) reopens itself if and when it mounts
 * (`ClassicyWindowOpen`), so no record is ever marked open with nothing on
 * screen. Counted per window, so a StrictMode remount releases cleanly.
 */
const mountCounts = new Map<string, number>();

const keyOf = (appId: string, windowId: string) => `${appId}\u0000${windowId}`;

/** Mark a window mounted; returns the release, for an effect's cleanup. */
export function markClassicyWindowMounted(
	appId: string,
	windowId: string,
): () => void {
	const key = keyOf(appId, windowId);
	mountCounts.set(key, (mountCounts.get(key) ?? 0) + 1);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		const remaining = (mountCounts.get(key) ?? 1) - 1;
		if (remaining > 0) mountCounts.set(key, remaining);
		else mountCounts.delete(key);
	};
}

/** True while at least one `ClassicyWindow` with this app and id is mounted. */
export const isClassicyWindowMounted = (
	appId: string,
	windowId: string,
): boolean => mountCounts.has(keyOf(appId, windowId));

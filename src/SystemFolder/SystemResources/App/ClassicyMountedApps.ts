import { useSyncExternalStore } from "react";

/**
 * Which `ClassicyApp`s are mounted right now.
 *
 * This is runtime state, deliberately kept out of the store: app records
 * persist to localStorage, so `apps[id]` existing (or even reading `open`)
 * says nothing about whether the app's component is mounted in this session.
 * Surfaces that should follow an app's presence — Control Strip modules
 * registered with an `appId` — read this instead.
 *
 * Counted per id, so two mounts of the same app (Storybook, tests) unmount
 * cleanly.
 */
const mountCounts = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();

const publish = () => {
	snapshot = new Set(mountCounts.keys());
	for (const listener of listeners) listener();
};

/**
 * Mark an app mounted. Returns the matching unmount; `ClassicyApp` calls this
 * from an effect and returns the result as its cleanup.
 */
export function markClassicyAppMounted(appId: string): () => void {
	mountCounts.set(appId, (mountCounts.get(appId) ?? 0) + 1);
	if (mountCounts.get(appId) === 1) publish();
	let released = false;
	return () => {
		if (released) return;
		released = true;
		const remaining = (mountCounts.get(appId) ?? 1) - 1;
		if (remaining > 0) {
			mountCounts.set(appId, remaining);
			return;
		}
		mountCounts.delete(appId);
		publish();
	};
}

/** True while at least one `ClassicyApp` with this id is mounted. */
export const isClassicyAppMounted = (appId: string): boolean =>
	mountCounts.has(appId);

export function subscribeClassicyMountedApps(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The ids of every mounted app; re-renders when one mounts or unmounts. */
export const useClassicyMountedApps = (): ReadonlySet<string> =>
	useSyncExternalStore(
		subscribeClassicyMountedApps,
		() => snapshot,
		() => snapshot,
	);

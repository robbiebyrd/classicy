import { useSyncExternalStore } from "react";

/**
 * The apps a host marks for the Windows shell's Quick Launch toolbar
 * (`ClassicyApp`'s `showInQuickLaunch`, plan 0020-w98 E1), while they are
 * mounted. Runtime state, kept out of the store as `ClassicyMountedApps` is:
 * the mark is a prop, so it changes nothing an app persists under any
 * package, and only the taskbar (which only a layout with `taskbar` mounts)
 * reads it. Internal: not exported from the package.
 */

/** An app on Quick Launch: its internal identity, which opening it uses. */
export type ClassicyQuickLaunchApp = {
	readonly id: string;
	readonly name: string;
	readonly icon: string;
};

type Registered = { readonly token: symbol; app: ClassicyQuickLaunchApp };

// Each app's registrations, oldest first; the newest is the app listed. The
// Map's order is the order the apps were first marked in, which is the
// toolbar's order, as Windows appends a shortcut dropped on Quick Launch.
const registrations = new Map<string, Registered[]>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicyQuickLaunchApp[] = Object.freeze([]);

const publish = () => {
	snapshot = Object.freeze(
		Array.from(registrations.values(), (list) => list[list.length - 1].app),
	);
	for (const listener of listeners) listener();
};

/**
 * Put `app` on Quick Launch. Returns the matching removal, which removes this
 * registration only (a second mount of the same app keeps it listed);
 * `ClassicyApp` calls it from an effect and returns the result as its
 * cleanup.
 */
export function addClassicyQuickLaunchApp(
	app: ClassicyQuickLaunchApp,
): () => void {
	const token = Symbol(app.id);
	const list = registrations.get(app.id) ?? [];
	list.push({ token, app: Object.freeze({ ...app }) });
	registrations.set(app.id, list);
	publish();
	return () => {
		const current = registrations.get(app.id);
		if (!current) return;
		const index = current.findIndex((r) => r.token === token);
		if (index < 0) return;
		current.splice(index, 1);
		if (current.length === 0) registrations.delete(app.id);
		publish();
	};
}

/** The apps on Quick Launch, in the order they were first marked. */
export const getClassicyQuickLaunchApps =
	(): readonly ClassicyQuickLaunchApp[] => snapshot;

export function subscribeClassicyQuickLaunchApps(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The apps on Quick Launch; re-renders when one is added or removed. */
export const useClassicyQuickLaunchApps =
	(): readonly ClassicyQuickLaunchApp[] =>
		useSyncExternalStore(
			subscribeClassicyQuickLaunchApps,
			getClassicyQuickLaunchApps,
			getClassicyQuickLaunchApps,
		);

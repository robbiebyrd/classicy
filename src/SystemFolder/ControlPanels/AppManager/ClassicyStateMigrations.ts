import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { normalizeClassicyAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

/**
 * Bring a desktop state of any earlier shape up to the current one.
 *
 * Runs on state loaded from localStorage and on every `mergeClassicyState`
 * result, so persisted 0.x state and hand-built consumer state are both
 * normalised. Migrations detect the old shape rather than reading a version
 * number, which makes the pass idempotent: running it on current state
 * changes nothing and returns the same object.
 *
 * Copy-on-write: `state` is never mutated (it may be frozen store state);
 * only the objects on a changed path are copied.
 *
 * Migrations:
 * - 1.0: `apps[id].windows` moved from an array to a record keyed by window
 *   id (`normalizeClassicyAppWindows`).
 */
export function migrateClassicyState(state: ClassicyStore): ClassicyStore {
	const apps = state?.System?.Manager?.Applications?.apps;
	if (!apps || typeof apps !== "object") return state;

	let nextApps: Record<string, ClassicyStoreSystemApp> | undefined;
	for (const [appId, app] of Object.entries(apps)) {
		if (!app || typeof app !== "object") continue;
		const windows = normalizeClassicyAppWindows(app.windows);
		if (windows === app.windows) continue;
		nextApps ??= { ...apps };
		nextApps[appId] = { ...app, windows };
	}
	if (!nextApps) return state;

	const { System } = state;
	return {
		...state,
		System: {
			...System,
			Manager: {
				...System.Manager,
				Applications: { ...System.Manager.Applications, apps: nextApps },
			},
		},
	};
}

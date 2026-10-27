import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { withDefaultThemeMetrics } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
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
 * - 2.1: theme metric groups (`measurements.control/button/groupBox/layout`,
 *   `window.titleBarHeight/utilityTitleBarHeight`) filled from
 *   `CLASSICY_DEFAULT_THEME_METRICS` on the active, built-in and custom
 *   themes (`withDefaultThemeMetrics`). Built-ins matter: `availableThemes`
 *   is persisted and replaces the defaults wholesale, so without this the
 *   first theme switch after an upgrade would clone a metric-less theme.
 */
export function migrateClassicyState(state: ClassicyStore): ClassicyStore {
	return migrateThemeMetrics(migrateAppWindows(state));
}

function migrateAppWindows(state: ClassicyStore): ClassicyStore {
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

/** Copy-on-write fill of a theme list; the same array back when untouched. */
function migrateThemeList(
	themes: ClassicyTheme[] | undefined,
): ClassicyTheme[] | undefined {
	if (!Array.isArray(themes)) return themes;
	let next: ClassicyTheme[] | undefined;
	themes.forEach((theme, i) => {
		if (!theme || typeof theme !== "object") return;
		const filled = withDefaultThemeMetrics(theme);
		if (filled === theme) return;
		next ??= [...themes];
		next[i] = filled;
	});
	return next ?? themes;
}

function migrateThemeMetrics(state: ClassicyStore): ClassicyStore {
	const appearance = state?.System?.Manager?.Appearance;
	if (!appearance || typeof appearance !== "object") return state;

	const activeTheme =
		appearance.activeTheme && typeof appearance.activeTheme === "object"
			? withDefaultThemeMetrics(appearance.activeTheme)
			: appearance.activeTheme;
	const availableThemes = migrateThemeList(appearance.availableThemes);
	const customThemes = migrateThemeList(appearance.customThemes);
	if (
		activeTheme === appearance.activeTheme &&
		availableThemes === appearance.availableThemes &&
		customThemes === appearance.customThemes
	) {
		return state;
	}

	const { System } = state;
	return {
		...state,
		System: {
			...System,
			Manager: {
				...System.Manager,
				Appearance: {
					...appearance,
					activeTheme,
					availableThemes,
					customThemes,
				},
			},
		},
	};
}

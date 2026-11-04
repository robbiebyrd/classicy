import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import type {
	ClassicyStoreSystemAppearanceManager,
	ClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	cloneClassicyTheme,
	listClassicyPackageBuiltInThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	classicyThemeMeasurementDefaults,
	withDefaultThemeMetrics,
	withoutDefaultThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { resolveWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Built-in themes come from the code on every load, never from saved state.
 *
 * A package's built-ins (its defaults and presets, and the host-loaded
 * `availableThemes`) are code: persisted state keeps only the custom themes
 * and the user's choice, so a preset fixed, added or removed by a later
 * release reaches existing users. `sanitizeStateForPersistence` drops
 * `availableThemes` and stores an unchanged built-in active theme as a
 * reference, its `{ id, package }`; the load path resolves a reference against
 * the code (`resolveClassicyThemeReference`), or, when its package is not
 * registered yet (H-R17), the first registration of that package does.
 */

/** A built-in active theme as persisted: which theme, not its data. */
export type ClassicyThemeReference = { id: string; package: string };

/** The package a theme belongs to; a theme naming none is the default's. */
const themePackageId = (theme: Pick<ClassicyTheme, "package">): string =>
	theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;

/**
 * The package whose built-ins can be read now: a registered one, or, for the
 * default id, Platinum's structure (`CLASSICY_FALLBACK_APPEARANCE_PACKAGE`)
 * while it is not registered yet, as `ClassicyDesktopChangeAppearancePackage`
 * resolves it. Any other unregistered id: `undefined` (H-R17: the load path
 * runs before a host registers its package).
 */
export const knownClassicyThemePackage = (
	packageId: string,
): ClassicyAppearancePackage | undefined =>
	getClassicyAppearancePackage(packageId) ??
	(packageId === CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID
		? CLASSICY_FALLBACK_APPEARANCE_PACKAGE
		: undefined);

/**
 * One of a package's own themes (its defaults or a preset) as the theme a
 * switch or ChangeTheme activates: a copy, completed as built-in and loaded
 * themes are. The registry keeps a package as passed, so a JS-authored one
 * may lack metric groups or name a bundled wallpaper by filename; `package`
 * is the package's own id (its registration guarantees its themes name no
 * other).
 */
export const activatableClassicyPackageTheme = (
	pkg: ClassicyAppearancePackage,
	packageTheme: ClassicyTheme,
): ClassicyTheme => {
	const theme = withDefaultThemeMetrics(
		cloneClassicyTheme(packageTheme),
		classicyThemeMeasurementDefaults(pkg.id),
	);
	return {
		...theme,
		package: pkg.id,
		desktop: {
			...theme.desktop,
			backgroundImage: resolveWallpaper(theme.desktop.backgroundImage),
		},
	};
};

/**
 * True when `theme` is a persisted reference: an object holding nothing but
 * a string `id` and, optionally, a `package` (shape-detecting; a whole theme
 * always carries its data).
 */
export const isClassicyThemeReference = (theme: unknown): boolean =>
	!!theme &&
	typeof theme === "object" &&
	typeof (theme as { id?: unknown }).id === "string" &&
	Object.keys(theme).every((key) => key === "id" || key === "package");

/** JSON with every object's keys sorted: an order-blind comparison key. */
const canonicalJson = (value: unknown): string =>
	JSON.stringify(value, (_key, v: unknown) =>
		v && typeof v === "object" && !Array.isArray(v)
			? Object.fromEntries(
					Object.keys(v)
						.sort()
						.map((k) => [k, (v as Record<string, unknown>)[k]]),
				)
			: v,
	);

/**
 * The reference `activeTheme` is persisted as, or `undefined` to persist it
 * whole. A reference when the active theme is one of its own package's
 * built-ins (its defaults or presets; that package registered, or Platinum)
 * **unchanged**: equal to what activating that built-in gives now, package
 * knob values equal to the package's defaults aside (H-R17). Anything else is
 * kept whole: a custom theme, a host-loaded theme (`availableThemes`, which
 * is not a built-in of the code), a theme of a package not registered yet, and
 * a built-in id holding data the current preset lacks — state saved before
 * custom themes existed edited the active theme in place, so such a theme may
 * be the user's own.
 */
export const classicyBuiltInThemeReference = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "customThemes"
	>,
): ClassicyThemeReference | undefined => {
	const active = appearance.activeTheme;
	if (!active || typeof active !== "object") return undefined;
	if (appearance.customThemes?.some((t) => t.id === active.id))
		return undefined;
	const pkg = knownClassicyThemePackage(themePackageId(active));
	if (!pkg) return undefined;
	const builtIn = listClassicyPackageBuiltInThemes(pkg).find(
		(t) => t.id === active.id,
	);
	if (!builtIn) return undefined;
	const defaults = classicyThemeMeasurementDefaults(pkg.id);
	const persisted = (theme: ClassicyTheme) =>
		canonicalJson(withoutDefaultThemeMeasurements(theme, defaults));
	return persisted(activatableClassicyPackageTheme(pkg, builtIn)) ===
		persisted(active)
		? { id: active.id, package: pkg.id }
		: undefined;
};

/**
 * The theme a persisted `reference` names, as the code has it now: that
 * built-in of `pkg` (the reference's package, registered by now) activated
 * as ChangeTheme activates it, or, when the package no longer has it, the
 * package's defaults, as a package switch falls back, with a warning.
 */
export const resolveClassicyThemeReference = (
	pkg: ClassicyAppearancePackage,
	reference: ClassicyThemeReference,
): ClassicyTheme => {
	const builtIn = listClassicyPackageBuiltInThemes(pkg).find(
		(t) => t.id === reference.id,
	);
	if (builtIn) return activatableClassicyPackageTheme(pkg, builtIn);
	classicyLog(
		"warn",
		"ClassicyAppearance",
		`Theme "${reference.id}" is no longer a built-in theme of "${pkg.id}"; using "${pkg.defaults.id}".`,
	);
	return activatableClassicyPackageTheme(pkg, pkg.defaults);
};

import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { portableClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
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
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Built-in themes come from the code on every load, never from saved state.
 *
 * A package's built-ins (its defaults and presets, and the host-loaded
 * `availableThemes`) are code: persisted state keeps only the custom themes
 * and the user's choice, so a preset fixed, added or removed by a later
 * release reaches existing users. `sanitizeStateForPersistence` drops
 * `availableThemes` and stores a built-in active theme as a reference, its
 * `{ id, package }`; the load path replaces an active theme naming a built-in
 * by the current preset (`refreshedClassicyActiveTheme`), or, when its
 * package is not registered yet (H-R17), that package's registration does.
 */

/** A built-in active theme as persisted: which theme, not its data. */
export type ClassicyThemeReference = { id: string; package: string };

/** The package a theme belongs to; a theme naming none is the default's. */
const themePackageId = (theme: Pick<ClassicyTheme, "package">): string =>
	theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;

/**
 * The package whose built-ins can be read now: a registered one, else
 * `undefined` (H-R17: the load path runs before a host registers its
 * package). The default id gets no special case: the store loads before
 * Platinum registers, and the fallback package holds only the core theme
 * (`CLASSICY_FALLBACK_APPEARANCE_PACKAGE`), so a saved Platinum preset stays
 * pending until Platinum's registration resolves it.
 */
export const knownClassicyThemePackage = (
	packageId: string,
): ClassicyAppearancePackage | undefined =>
	getClassicyAppearancePackage(packageId);

/**
 * One of a package's own themes (its defaults or a preset) as the theme a
 * switch or ChangeTheme activates: a copy, completed as built-in and loaded
 * themes are. The registry keeps a package as passed, so a JS-authored one
 * may lack metric groups, or hold a registered wallpaper's URL where themes
 * keep its filename; `package` is the package's own id (its registration
 * guarantees its themes name no other).
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
			backgroundImage: portableClassicyWallpaper(theme.desktop.backgroundImage),
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

/**
 * The built-in of its own package that `appearance.activeTheme` names, with
 * that package, when the theme is not a custom theme, the package can be read
 * now and has a built-in (defaults or preset) with its id.
 */
const activeBuiltIn = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "customThemes"
	>,
):
	| { pkg: ClassicyAppearancePackage; builtIn: ClassicyTheme | undefined }
	| undefined => {
	const active = appearance.activeTheme;
	if (!active || typeof active !== "object") return undefined;
	if (appearance.customThemes?.some((t) => t.id === active.id))
		return undefined;
	const pkg = knownClassicyThemePackage(themePackageId(active));
	if (!pkg) return undefined;
	return {
		pkg,
		builtIn: listClassicyPackageBuiltInThemes(pkg).find(
			(t) => t.id === active.id,
		),
	};
};

/**
 * The reference `activeTheme` is persisted as, or `undefined` to persist it
 * whole: a reference when it is not a custom theme and its id names one of
 * its own package's built-ins (its defaults or presets; that package
 * registered). Its data is never consulted, since the load path
 * replaces such a theme by the preset anyway. Kept whole: a custom theme, a
 * host-loaded theme (`availableThemes`, not a built-in of the code), and a
 * theme of a package not registered yet.
 */
export const classicyBuiltInThemeReference = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "customThemes"
	>,
): ClassicyThemeReference | undefined => {
	const found = activeBuiltIn(appearance);
	return found?.builtIn
		? { id: found.builtIn.id, package: found.pkg.id }
		: undefined;
};

/**
 * The active theme as the code has it now, or `undefined` when it stays as
 * it is. A theme whose id names a built-in of its own package is replaced by
 * that built-in, activated as ChangeTheme activates it
 * (`activatableClassicyPackageTheme`), whatever data it held: a built-in is
 * never edited (edits fork a Custom theme), so data that differs is a stale
 * preset or an in-place edit made before custom themes existed, and both give
 * way. A custom theme, or a theme whose package cannot be read yet, stays.
 * An id its package lacks: a `reference` (known to have been a built-in)
 * falls back, as a package switch does, to the package's defaults with a
 * warning; a whole theme stays (a host-loaded theme its host loads again).
 */
export const refreshedClassicyActiveTheme = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "customThemes"
	>,
	{ reference }: { reference: boolean },
): ClassicyTheme | undefined => {
	const found = activeBuiltIn(appearance);
	if (!found) return undefined;
	const { pkg, builtIn } = found;
	let next: ClassicyTheme;
	if (builtIn) {
		next = activatableClassicyPackageTheme(pkg, builtIn);
	} else if (reference) {
		classicyLog(
			"warn",
			"ClassicyAppearance",
			`Theme "${appearance.activeTheme.id}" is no longer a built-in theme of "${pkg.id}"; using "${pkg.defaults.id}".`,
		);
		next = activatableClassicyPackageTheme(pkg, pkg.defaults);
	} else {
		return undefined;
	}
	return JSON.stringify(next) === JSON.stringify(appearance.activeTheme)
		? undefined
		: next;
};

/** `value` as JSON with every object's keys sorted, so equal data compares
 * equal whatever order its keys were written in. */
const canonicalJson = (value: unknown): string =>
	JSON.stringify(value, (_key, inner: unknown) =>
		inner && typeof inner === "object" && !Array.isArray(inner)
			? Object.fromEntries(
					Object.entries(inner).sort(([a], [b]) =>
						a < b ? -1 : a > b ? 1 : 0,
					),
				)
			: inner,
	);

const CORE_DEFAULT_THEME_JSON = canonicalJson(CLASSICY_CORE_DEFAULT_THEME);

/**
 * True when `theme` is the core's stand-in, `CLASSICY_CORE_DEFAULT_THEME`,
 * unedited: the theme a first session starts with (the default state's), or
 * the same data saved whole before any package registered. A theme that
 * differs in any value is someone's theme, never a stand-in.
 */
export const isClassicyCoreStandInTheme = (theme: unknown): boolean =>
	theme === CLASSICY_CORE_DEFAULT_THEME ||
	(!!theme &&
		typeof theme === "object" &&
		(theme as { id?: unknown }).id === CLASSICY_CORE_DEFAULT_THEME.id &&
		canonicalJson(theme) === CORE_DEFAULT_THEME_JSON);

/**
 * The defaults of the package the desktop draws (`packageId` resolved as the
 * desktop resolves it: registered id, registered default, first registered),
 * activated as a package switch activates them
 * (`activatableClassicyPackageTheme`), when that package is not the active
 * theme's own; else `undefined` (no package is registered, or it already is
 * the theme's). The caller decides that the active theme only stands in
 * (story 0144-6sc): a first session whose only package is not the default
 * one would otherwise draw that package with the core stand-in, a theme of
 * the default package, whose knob values it lacks. `packageId` is not
 * written: the desktop draws the package by resolution.
 */
export const drawnClassicyPackageDefaults = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "packageId"
	>,
): ClassicyTheme | undefined => {
	const drawn = getRegisteredClassicyAppearancePackageOrDefault(
		appearance.packageId,
	);
	if (!drawn || drawn.id === themePackageId(appearance.activeTheme)) {
		return undefined;
	}
	return activatableClassicyPackageTheme(drawn, drawn.defaults);
};

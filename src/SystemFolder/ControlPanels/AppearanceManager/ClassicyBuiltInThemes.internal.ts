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

/**
 * The id of `packageId`'s defaults theme: the registered package's; for the
 * default package while it is not registered, the core stand-in's
 * (`CLASSICY_CORE_DEFAULT_THEME`, the default state's theme, which a saved
 * `{ id: "default", package: "platinum" }` reference also loads as); else
 * `undefined`.
 */
const packageDefaultsThemeId = (packageId: string): string | undefined =>
	knownClassicyThemePackage(packageId)?.defaults.id ??
	(packageId === CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID
		? CLASSICY_CORE_DEFAULT_THEME.id
		: undefined);

/**
 * The defaults of the package the desktop draws (`packageId` resolved as the
 * desktop resolves it: registered id, registered default, first registered),
 * activated as a package switch activates them
 * (`activatableClassicyPackageTheme`), in place of an active theme that is
 * its own package's defaults theme when that package is not the drawn one;
 * else `undefined` (story 0144-6sc). Such a theme is nobody's choice of look:
 * the default state seeds the core stand-in under `"platinum"`, and every
 * Platinum session saves its defaults as their reference, so a host whose
 * package is another would draw it with the stand-in, whose knob values it
 * lacks. Matched by id, not by data, so a merged or refreshed copy (a
 * provider's `defaultState` seed, a re-registration) still matches. Never a
 * custom theme, any other theme of a package (a preset), or, while its
 * package is not registered, a host-loaded theme (`availableThemes`). The
 * cost: another package's defaults chosen explicitly last until the next
 * load or package change. `packageId` is not written: the desktop draws the
 * package by resolution.
 */
export const drawnClassicyPackageDefaults = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "packageId" | "customThemes" | "availableThemes"
	>,
): ClassicyTheme | undefined => {
	const active = appearance.activeTheme;
	if (!active || typeof active !== "object") return undefined;
	const drawn = getRegisteredClassicyAppearancePackageOrDefault(
		appearance.packageId,
	);
	const own = themePackageId(active);
	if (!drawn || drawn.id === own) return undefined;
	if (active.id !== packageDefaultsThemeId(own)) return undefined;
	if (appearance.customThemes?.some((t) => t.id === active.id)) {
		return undefined;
	}
	const hostLoaded =
		!knownClassicyThemePackage(own) &&
		appearance.availableThemes?.some(
			(t) => t.id === active.id && themePackageId(t) === own,
		);
	if (hostLoaded) return undefined;
	return activatableClassicyPackageTheme(drawn, drawn.defaults);
};

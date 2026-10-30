import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import type {
	ClassicyStoreSystemAppearanceManager,
	ClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * Custom (user-editable) themes.
 *
 * Built-in themes (`Appearance.availableThemes`) are never mutated. User
 * themes live in `Appearance.customThemes`, a separate list, because persisted
 * arrays REPLACE their defaults on load (`deepMergeReplacingArrays`): storing a
 * custom theme inside `availableThemes` would freeze the built-in list at
 * whatever shipped when the user first edited a color.
 *
 * The first edit made while a built-in theme is active forks it into its
 * package's "Custom" slot (`classicyCustomThemeSlotId`), overwriting any
 * previous Custom of that package; each package keeps its own. Edits made
 * while any custom theme is active modify that theme in place, so imported
 * themes in `customThemes` are editable with no extra wiring.
 */
export const CLASSICY_CUSTOM_THEME_ID = "custom";
export const CLASSICY_CUSTOM_THEME_NAME = "Custom";

/** The package a theme belongs to; a theme naming none is the default's. */
const themePackageId = (theme: ClassicyTheme): string =>
	theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;

/**
 * The id of a package's Custom fork slot: `"custom"` for the default package
 * (so state saved before packages existed keeps its Custom theme), else
 * `custom-<packageId>`. Every slot is named "Custom".
 */
export const classicyCustomThemeSlotId = (packageId: string): string =>
	packageId === CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID
		? CLASSICY_CUSTOM_THEME_ID
		: `${CLASSICY_CUSTOM_THEME_ID}-${packageId}`;

/** Deep copy of a theme. Themes are plain JSON data, and a JSON round trip
 * also reads through Immer drafts (structuredClone throws on a Proxy). */
export const cloneClassicyTheme = (theme: ClassicyTheme): ClassicyTheme =>
	JSON.parse(JSON.stringify(theme)) as ClassicyTheme;

/** Built-in themes first, then custom themes — the order the theme list shows. */
export const listClassicyThemes = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"availableThemes" | "customThemes"
	>,
): ClassicyTheme[] => [
	...(appearance.availableThemes ?? []),
	...(appearance.customThemes ?? []),
];

/**
 * A package's own built-in themes: its `defaults` first, unless a preset has
 * their id, then its presets (J-R22: `presets` is optional, and the defaults
 * are always selectable).
 */
export const listClassicyPackageBuiltInThemes = (
	pkg: Pick<ClassicyAppearancePackage, "presets"> &
		Partial<Pick<ClassicyAppearancePackage, "defaults">>,
): ClassicyTheme[] => {
	const presets = pkg.presets ?? [];
	const { defaults } = pkg;
	return defaults && !presets.some((t) => t.id === defaults.id)
		? [defaults, ...presets]
		: [...presets];
};

/**
 * The theme list for one Appearance Package, as the Appearance Manager shows
 * it: the package's built-ins (`listClassicyPackageBuiltInThemes`: its
 * defaults, unless a preset has their id, and its presets) and the host-loaded
 * built-ins (`availableThemes`, `ClassicyDesktopLoadThemes`) of that package,
 * once per id in that order (a loaded theme replaces the built-in it shares
 * an id with, since `ClassicyDesktopChangeTheme` finds it first), then the
 * custom themes of that package.
 */
export const listClassicyPackageThemes = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"availableThemes" | "customThemes"
	>,
	pkg: Pick<ClassicyAppearancePackage, "id" | "presets"> &
		Partial<Pick<ClassicyAppearancePackage, "defaults">>,
): ClassicyTheme[] => {
	const ofPackage = (t: ClassicyTheme) => themePackageId(t) === pkg.id;
	const builtIns = new Map<string, ClassicyTheme>();
	for (const theme of listClassicyPackageBuiltInThemes(pkg))
		builtIns.set(theme.id, theme);
	for (const loaded of (appearance.availableThemes ?? []).filter(ofPackage))
		builtIns.set(loaded.id, loaded);
	return [
		...builtIns.values(),
		...(appearance.customThemes ?? []).filter(ofPackage),
	];
};

/**
 * Looks a theme id up, in `ClassicyDesktopChangeTheme`'s order (J-R19). With
 * `pkg`, the active package: its host-loaded `availableThemes`, then its
 * built-ins (`listClassicyPackageBuiltInThemes`), then the custom themes, and
 * last the other packages' `availableThemes`. So an id shared with another
 * package's built-in (`default`, say) finds the active package's own theme.
 * Without `pkg`: `availableThemes`, then the custom themes.
 */
export const findClassicyTheme = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"availableThemes" | "customThemes"
	>,
	themeId: string,
	pkg?: Pick<ClassicyAppearancePackage, "id" | "presets"> &
		Partial<Pick<ClassicyAppearancePackage, "defaults">>,
): ClassicyTheme | undefined => {
	const byId = (t: ClassicyTheme) => t.id === themeId;
	const loaded = appearance.availableThemes ?? [];
	const customs = appearance.customThemes ?? [];
	if (!pkg) return loaded.find(byId) ?? customs.find(byId);
	return (
		loaded.find((t) => byId(t) && themePackageId(t) === pkg.id) ??
		listClassicyPackageBuiltInThemes(pkg).find(byId) ??
		customs.find(byId) ??
		loaded.find(byId)
	);
};

/** True when the active theme is one of the user's custom themes (so edits
 * modify it in place rather than forking). */
export const isCustomThemeActive = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"activeTheme" | "customThemes"
	>,
): boolean =>
	appearance.customThemes?.some((t) => t.id === appearance.activeTheme?.id) ??
	false;

/**
 * Applies `edit` to the active theme with fork-on-first-edit semantics, and
 * keeps the matching `customThemes` entry in sync. Mutates `appearance`
 * (an Immer draft in the live store).
 *
 * An edit that changes nothing (same value, unknown sub-key) is a no-op and
 * does NOT fork, so re-selecting the current font never spawns a Custom theme.
 * Returns whether the theme changed.
 */
export const editActiveClassicyTheme = (
	appearance: ClassicyStoreSystemAppearanceManager,
	edit: (theme: ClassicyTheme) => void,
): boolean => {
	const before = JSON.stringify(appearance.activeTheme);
	const next = JSON.parse(before) as ClassicyTheme;
	edit(next);
	if (JSON.stringify(next) === before) return false;

	if (!appearance.customThemes) appearance.customThemes = [];
	const customs = appearance.customThemes;
	let slot = customs.findIndex((t) => t.id === appearance.activeTheme.id);
	if (slot < 0) {
		// Fork: the active theme is a built-in. Reuse its package's one
		// Custom slot.
		const packageId = themePackageId(next);
		next.id = classicyCustomThemeSlotId(packageId);
		next.name = CLASSICY_CUSTOM_THEME_NAME;
		slot = customs.findIndex((t) => t.id === next.id);
		if (slot >= 0 && themePackageId(customs[slot]) !== packageId) {
			// Another package's theme holds the id: an import made before this
			// package was registered (import slugs and `custom-<packageId>`
			// share a namespace). Move it aside under the next free numbered
			// id, keeping its name and data; it is never the active theme
			// here, since a built-in is. The id avoids what an import's does:
			// every theme, the moved theme's own package's built-ins (which
			// ChangeTheme would find first) and every registered package's
			// Custom slot. Both lookups are store-free (J-R16).
			const ownBuiltIns = listClassicyPackageBuiltInThemes(
				getRegisteredClassicyAppearancePackageOrDefault(
					themePackageId(customs[slot]),
				) ?? {},
			);
			const ids = new Set([
				...customs.map((t) => t.id),
				...(appearance.availableThemes ?? []).map((t) => t.id),
				...ownBuiltIns.map((t) => t.id),
				...listClassicyAppearancePackages().map((pkg) =>
					classicyCustomThemeSlotId(pkg.id),
				),
			]);
			let moved = `${next.id}-2`;
			for (let n = 3; ids.has(moved); n++) moved = `${next.id}-${n}`;
			customs[slot].id = moved;
			slot = -1;
		}
		if (slot < 0) slot = customs.length;
	}
	customs[slot] = next;
	appearance.activeTheme = cloneClassicyTheme(next);
	return true;
};

/** Prefix of every imported theme's id. */
export const CLASSICY_IMPORTED_THEME_ID_PREFIX = "custom-";

/**
 * Lower-case, hyphen-separated slug of a theme name ("Azul 2" → "azul-2").
 * Runs in linear time: the split/filter/join pass trims stray hyphens without
 * an anchored regex, which would backtrack on long hyphen runs in an
 * untrusted name.
 */
export const slugifyClassicyThemeName = (name: string): string =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.split("-")
		.filter(Boolean)
		.join("-")
		.slice(0, 48)
		.replace(/-$/, "");

/**
 * Gives an imported theme an identity that cannot collide with any existing
 * theme. Returns a copy; `theme` is not mutated.
 *
 * - **Name**: kept, unless a theme (built-in or custom) already has it,
 *   ignoring case — then " 2", " 3", … is appended (a trailing number already
 *   on the name is counted up from instead of stacking: "Azul 2" → "Azul 3").
 * - **Id**: `custom-<slug of the final name>` (`custom-theme` for a name with
 *   no letters or digits), with "-2", "-3", … appended on collision. The id in
 *   the file is ignored — it is untrusted, and honoring it could overwrite an
 *   existing custom theme or shadow a built-in. Never a package's Custom fork
 *   slot (`"custom"`, the theme's own package's, or any id in `reservedIds`):
 *   the next edit made on a built-in of that package overwrites the slot.
 */
export const assignImportedClassicyThemeIdentity = (
	theme: ClassicyTheme,
	existing: ClassicyTheme[],
	reservedIds: Iterable<string> = [],
): ClassicyTheme => {
	const names = new Set(existing.map((t) => t.name.toLowerCase()));
	let name = theme.name;
	if (names.has(name.toLowerCase())) {
		const numbered = /^(.*\S) (\d+)$/.exec(name);
		const base = numbered ? numbered[1] : name;
		let n = numbered ? Number(numbered[2]) + 1 : 2;
		// Names are capped at 64 characters; leave room for the suffix.
		const stem = base.slice(0, 58).trimEnd();
		while (names.has(`${stem} ${n}`.toLowerCase())) n++;
		name = `${stem} ${n}`;
	}

	const ids = new Set([...existing.map((t) => t.id), ...reservedIds]);
	ids.add(CLASSICY_CUSTOM_THEME_ID);
	ids.add(classicyCustomThemeSlotId(themePackageId(theme)));
	const baseId = `${CLASSICY_IMPORTED_THEME_ID_PREFIX}${slugifyClassicyThemeName(name) || "theme"}`;
	let id = baseId;
	for (let n = 2; ids.has(id); n++) id = `${baseId}-${n}`;

	return { ...cloneClassicyTheme(theme), id, name };
};

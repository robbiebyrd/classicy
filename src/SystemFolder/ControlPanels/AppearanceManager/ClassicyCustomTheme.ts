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
 * whatever shipped when the user first edited a colour.
 *
 * The first edit made while a built-in theme is active forks it into the single
 * "Custom" slot (`CLASSICY_CUSTOM_THEME_ID`), overwriting any previous Custom.
 * Edits made while any custom theme is active modify that theme in place, so a
 * future importer can add further entries to `customThemes` and they are
 * editable with no extra wiring.
 */
export const CLASSICY_CUSTOM_THEME_ID = "custom";
export const CLASSICY_CUSTOM_THEME_NAME = "Custom";

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

/** Looks a theme id up among the built-ins, then the custom themes. */
export const findClassicyTheme = (
	appearance: Pick<
		ClassicyStoreSystemAppearanceManager,
		"availableThemes" | "customThemes"
	>,
	themeId: string,
): ClassicyTheme | undefined =>
	appearance.availableThemes?.find((t) => t.id === themeId) ??
	appearance.customThemes?.find((t) => t.id === themeId);

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
		// Fork: the active theme is a built-in. Reuse the one Custom slot.
		next.id = CLASSICY_CUSTOM_THEME_ID;
		next.name = CLASSICY_CUSTOM_THEME_NAME;
		slot = customs.findIndex((t) => t.id === CLASSICY_CUSTOM_THEME_ID);
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
 *   the file is ignored — it is untrusted, and honouring it could overwrite an
 *   existing custom theme or shadow a built-in. Never `"custom"`: that is the
 *   fork slot, which the next edit made on a built-in overwrites.
 */
export const assignImportedClassicyThemeIdentity = (
	theme: ClassicyTheme,
	existing: ClassicyTheme[],
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

	const ids = new Set(existing.map((t) => t.id));
	ids.add(CLASSICY_CUSTOM_THEME_ID);
	const baseId = `${CLASSICY_IMPORTED_THEME_ID_PREFIX}${slugifyClassicyThemeName(name) || "theme"}`;
	let id = baseId;
	for (let n = 2; ids.has(id); n++) id = `${baseId}-${n}`;

	return { ...cloneClassicyTheme(theme), id, name };
};

import type { ClassicyAppearanceFontFamilies } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyThemeTypography } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	isClassicyForbiddenKey,
	isClassicyPlainObject,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceKeyGuards.internal";
import { intToPx } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import {
	CLASSICY_THEME_FONT_SIZE_MAX,
	CLASSICY_THEME_FONT_SIZE_MIN,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontSizes";
import {
	CLASSICY_MEASUREMENT_NAME,
	CLASSICY_PACKAGE_FONT_VAR_PREFIX,
	classicyKebabName,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Package font families: the fonts an Appearance Package draws beside the
 * core typography (`ui`, `header`, `body`, `mono`, `digital`), as theme data
 * under `typography.families.<name>`: a font stack, and optionally a size in
 * px and a weight. Windows 98 holds a color scheme's caption, small caption,
 * menu, message box and icon fonts there (SHELL2.INF's NONCLIENTMETRICS and
 * icon font), since each scheme names its own. Each entry becomes
 * `--package-font-<name>` (the stack), `--package-font-<name>-size` (when it
 * has a size) and `--package-font-<name>-weight` (when it has a weight),
 * kebab-cased, a namespace no core variable and no measurement can take
 * (`isReservedClassicyThemeVar`). A theme without the field, every Platinum
 * and System 7 theme, emits none of them; a stylesheet reads each with a core
 * typography variable as its fallback.
 */

export { CLASSICY_PACKAGE_FONT_VAR_PREFIX };

/** A package font (`typography.families.<name>`). */
export type ClassicyThemeFontFamily = {
	/** The CSS font stack: family names, quotes and commas. */
	font: string;
	/** The size in px, within the typography sizes' bounds (8–72). */
	size?: number;
	/** The CSS weight, 100 to 900 in steps of 100 (400 regular, 700 bold). */
	weight?: number;
};

/** Package fonts by name (`ClassicyThemeTypography.families`). */
export type ClassicyThemeFontFamilies = Record<string, ClassicyThemeFontFamily>;

/** The characters a font stack may hold, as the theme schema's `fontStack`:
 * family names, quotes and commas, nothing that could end a declaration. */
export const CLASSICY_FONT_STACK = /^[\p{L}\p{N} "',._-]+$/u;

/** True for a value the typography schema's `fontStack` accepts. */
export const isClassicyFontStack = (value: unknown): value is string =>
	typeof value === "string" &&
	value.trim().length > 0 &&
	value.length <= 256 &&
	CLASSICY_FONT_STACK.test(value);

/** True for a package font size: a number within the typography bounds. */
export const isClassicyFontFamilySize = (value: unknown): value is number =>
	typeof value === "number" &&
	Number.isFinite(value) &&
	value >= CLASSICY_THEME_FONT_SIZE_MIN &&
	value <= CLASSICY_THEME_FONT_SIZE_MAX;

/** True for a CSS font weight from 100 to 900 in steps of 100. */
export const isClassicyFontWeight = (value: unknown): value is number =>
	typeof value === "number" &&
	Number.isInteger(value) &&
	value >= 100 &&
	value <= 900 &&
	value % 100 === 0;

/** A family name that becomes part of a variable: a lowercase-first
 * camelCase name (`smallCaption`), never a prototype key. */
export const isClassicyFontFamilyName = (value: unknown): value is string =>
	typeof value === "string" &&
	CLASSICY_MEASUREMENT_NAME.test(value) &&
	!isClassicyForbiddenKey(value);

/**
 * The variable a package font makes: `--package-font-<name>`, kebab-cased
 * (`smallCaption` → `--package-font-small-caption`); its size and weight
 * take `-size` and `-weight` after it.
 */
export const classicyFontFamilyVarName = (name: string): string =>
	`${CLASSICY_PACKAGE_FONT_VAR_PREFIX}${classicyKebabName(name)}`;

// Collisions already reported, so a re-render never repeats a warning.
const reportedCollisions = new Set<string>();

/**
 * The CSS custom properties for a theme's `typography.families`: every entry
 * under a `CLASSICY_MEASUREMENT_NAME` whose `font` is a font stack, as
 * `--package-font-<name>`, with `-size` (px) and `-weight` beside it when
 * those are valid. Anything else emits nothing (families reach here from
 * theme files and persisted state, and a value becomes part of a CSS
 * declaration). When two names make one variable (`smallCaption`'s size and
 * a family `smallCaptionSize`), the first in key order wins, logged once.
 */
export function classicyFontFamilyVars(
	families: unknown,
): Record<string, string> {
	const vars: Record<string, string> = {};
	if (!isClassicyPlainObject(families)) return vars;
	const sources = new Map<string, string>();
	const put = (name: string, value: string, source: string) => {
		const winner = sources.get(name);
		if (winner !== undefined) {
			const collision = `${winner}|${source}`;
			if (!reportedCollisions.has(collision)) {
				reportedCollisions.add(collision);
				classicyLog(
					"warn",
					"ClassicyAppearance",
					`Package fonts ${source} and ${winner} both make ${name}; ${winner} is used.`,
				);
			}
			return;
		}
		sources.set(name, source);
		vars[name] = value;
	};
	for (const [family, entry] of Object.entries(families)) {
		if (!isClassicyFontFamilyName(family) || !isClassicyPlainObject(entry))
			continue;
		if (!isClassicyFontStack(entry.font)) continue;
		const name = classicyFontFamilyVarName(family);
		put(name, entry.font, family);
		if (isClassicyFontFamilySize(entry.size))
			put(`${name}-size`, intToPx(entry.size), `${family}.size`);
		if (isClassicyFontWeight(entry.weight))
			put(`${name}-weight`, String(entry.weight), `${family}.weight`);
	}
	return vars;
}

/**
 * The package fonts the Appearance Manager's Fonts tab lists for a theme:
 * its `typography.families` entries, in the package's declared order
 * (`fontFamilies`, the labels) and then the theme's own; each labeled from
 * the package's metadata, else by its name.
 */
export const listClassicyThemeFontFamilies = (
	typography: Pick<ClassicyThemeTypography, "families">,
	declared?: Readonly<ClassicyAppearanceFontFamilies>,
): { name: string; label: string; family: ClassicyThemeFontFamily }[] => {
	const families = typography.families;
	if (!isClassicyPlainObject(families)) return [];
	const names = [
		...Object.keys(declared ?? {}).filter((name) =>
			Object.hasOwn(families, name),
		),
		...Object.keys(families).filter(
			(name) => !declared || !Object.hasOwn(declared, name),
		),
	];
	return names.flatMap((name) => {
		const family = families[name];
		if (!isClassicyFontFamilyName(name) || !isClassicyPlainObject(family))
			return [];
		if (!isClassicyFontStack(family.font)) return [];
		const label =
			declared && Object.hasOwn(declared, name) ? declared[name].label : name;
		return [{ name, label, family: family as ClassicyThemeFontFamily }];
	});
};

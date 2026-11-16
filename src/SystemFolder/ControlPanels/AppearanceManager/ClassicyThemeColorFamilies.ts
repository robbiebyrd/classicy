import type { ClassicyAppearanceColorFamilies } from "@/Appearance/ClassicyAppearancePackage";
import type {
	ClassicyTheme,
	ClassicyThemeColorFamilies,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	isClassicyForbiddenKey,
	isClassicyPlainObject,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceKeyGuards.internal";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { isValidThemeColor } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import { getClassicyPackageColorFamilies } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementSource.internal";
import {
	CLASSICY_MEASUREMENT_NAME,
	CLASSICY_PACKAGE_COLOR_VAR_PREFIX,
	classicyMeasurementVarName,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Package color families: the colors an Appearance Package needs beyond the
 * 28 core colors (`CLASSICY_THEME_COLOR_TARGETS`), declared the way it
 * declares measurement families. The values are theme data, under
 * `color.families.<family>.<key>` (24-bit RGB integers, like every theme
 * color); the package's `colorFamilies` metadata labels the ones the
 * Appearance Manager's Colors tab edits. Each leaf becomes
 * `--package-color-<family>-<key>` (kebab-case), a namespace no core
 * variable and no measurement can take (`isReservedClassicyThemeVar`).
 *
 * The core five-step palettes are untouched: a package reads its family
 * variables from its own stylesheet, and no base stylesheet reads one.
 */

export { CLASSICY_PACKAGE_COLOR_VAR_PREFIX };

/** A family or key name that becomes part of a variable: a lowercase-first
 * camelCase name (`grayRamp`, `step2`), never a prototype key. */
const isColorFamilyName = (value: unknown): value is string =>
	typeof value === "string" &&
	CLASSICY_MEASUREMENT_NAME.test(value) &&
	!isClassicyForbiddenKey(value);

/**
 * The variable a package color makes: `--package-color-<family>-<key>`,
 * kebab-cased (`grayRamp`, `step2` → `--package-color-gray-ramp-step2`).
 */
export const classicyColorFamilyVarName = (
	family: string,
	key: string,
): string =>
	`${CLASSICY_PACKAGE_COLOR_VAR_PREFIX}${classicyMeasurementVarName(family, key).slice(2)}`;

// Collisions already reported, so a re-render never repeats a warning.
const reportedCollisions = new Set<string>();

/**
 * The CSS custom properties for a theme's `color.families`: every leaf that
 * is a 24-bit color, under a family and key that are
 * `CLASSICY_MEASUREMENT_NAME`s (families reach here from theme files and
 * persisted state, and a name becomes part of a CSS declaration), as
 * `--package-color-<family>-<key>` in `#rrggbb`. Anything else emits
 * nothing. When kebab-casing maps two leaves to one variable
 * (`grayRamp.stepA`, `gray.rampStepA`), the first wins, logged once: the
 * families `declared` names come first (the theme's package's own,
 * `classicyThemeColorFamilyDefaults`), so a family a theme file adds can
 * never shadow one the package declares; then the rest in key order.
 */
export function classicyColorFamilyVars(
	families: unknown,
	declared?: Readonly<ClassicyThemeColorFamilies>,
): Record<string, string> {
	const vars: Record<string, string> = {};
	if (!isClassicyPlainObject(families)) return vars;
	const sources = new Map<string, string>();
	const first = Object.keys(declared ?? {}).filter((family) =>
		Object.hasOwn(families, family),
	);
	const order = [
		...first,
		...Object.keys(families).filter((family) => !first.includes(family)),
	];
	for (const family of order) {
		const keys = families[family];
		if (!isColorFamilyName(family) || !isClassicyPlainObject(keys)) continue;
		for (const [key, value] of Object.entries(keys)) {
			if (!isColorFamilyName(key) || !isValidThemeColor(value)) continue;
			const name = classicyColorFamilyVarName(family, key);
			const source = `${family}.${key}`;
			const winner = sources.get(name);
			if (winner !== undefined) {
				const collision = `${winner}|${source}`;
				if (!reportedCollisions.has(collision)) {
					reportedCollisions.add(collision);
					classicyLog(
						"warn",
						"ClassicyAppearance",
						`Package colors ${source} and ${winner} both make ${name}; ${winner} is used.`,
					);
				}
				continue;
			}
			sources.set(name, source);
			vars[name] = intToHex(value);
		}
	}
	return vars;
}

/**
 * The color families a theme of `packageId` is completed with: the
 * registered package's own `defaults.color.families` (the default package's
 * for a missing id), or `undefined` while that package is not registered.
 * Never another package's: a package's colors are its own look, so a theme
 * of an unregistered package is left as it is.
 */
export function classicyThemeColorFamilyDefaults(
	packageId: string | undefined,
): Readonly<ClassicyThemeColorFamilies> | undefined {
	const own = getClassicyPackageColorFamilies(packageId);
	return isClassicyPlainObject(own)
		? (own as ClassicyThemeColorFamilies)
		: undefined;
}

/** A theme as the color family helpers read it: only `color` matters. */
type ThemeWithColor = { color: ClassicyTheme["color"] };

/**
 * Completes a theme's `color.families` from `defaults`
 * (`classicyThemeColorFamilyDefaults(theme.package)`), key by key, as
 * `withDefaultThemeMetrics` completes measurements: present colors win, a
 * missing or invalid leaf takes the default, and families and keys the
 * defaults do not name are kept. Copy-on-write: the same theme back when
 * nothing is missing or there are no defaults. Never mutates its input.
 */
export function withDefaultThemeColorFamilies<T extends ThemeWithColor>(
	theme: T,
	defaults: Readonly<ClassicyThemeColorFamilies> | undefined,
): T {
	if (!defaults) return theme;
	const current = isClassicyPlainObject(theme.color.families)
		? theme.color.families
		: undefined;
	let next: ClassicyThemeColorFamilies | undefined;
	for (const [family, keys] of Object.entries(defaults)) {
		if (!isClassicyPlainObject(keys)) continue;
		const present =
			current && Object.hasOwn(current, family) ? current[family] : undefined;
		const own = isClassicyPlainObject(present) ? present : undefined;
		const complete =
			own !== undefined &&
			Object.keys(keys).every(
				(key) => Object.hasOwn(own, key) && isValidThemeColor(own[key]),
			);
		if (complete) continue;
		next ??= { ...current };
		const merged: Record<string, number> = {};
		for (const key of Object.keys(keys)) {
			const have = own && Object.hasOwn(own, key) ? own[key] : undefined;
			merged[key] = isValidThemeColor(have) ? have : keys[key];
		}
		for (const [key, value] of Object.entries(own ?? {})) {
			if (!Object.hasOwn(merged, key)) merged[key] = value;
		}
		next[family] = merged;
	}
	return next ? { ...theme, color: { ...theme.color, families: next } } : theme;
}

/**
 * The inverse of `withDefaultThemeColorFamilies`: `theme` without every leaf
 * equal to its `defaults` value, without a family this empties, and without
 * `families` when it ends up empty. Changed values, and families and keys
 * the defaults do not name, are kept. Copy-on-write. Persistence stores
 * themes this way (as it does measurements), so a later fix to a package's
 * color reaches every theme that never changed it.
 */
export function withoutDefaultThemeColorFamilies<T extends ThemeWithColor>(
	theme: T,
	defaults: Readonly<ClassicyThemeColorFamilies> | undefined,
): T {
	const current = theme.color.families;
	if (!defaults || !isClassicyPlainObject(current)) return theme;
	let next: Record<string, unknown> | undefined;
	for (const [family, value] of Object.entries(current)) {
		const familyDefaults = Object.hasOwn(defaults, family)
			? defaults[family]
			: undefined;
		if (!familyDefaults || !isClassicyPlainObject(value)) continue;
		const kept = Object.fromEntries(
			Object.entries(value).filter(
				([key, v]) =>
					!(Object.hasOwn(familyDefaults, key) && familyDefaults[key] === v),
			),
		);
		const keptCount = Object.keys(kept).length;
		if (keptCount === Object.keys(value).length) continue;
		next ??= { ...current };
		if (keptCount === 0) delete next[family];
		else next[family] = kept;
	}
	if (!next) return theme;
	const { families: _dropped, ...color } = theme.color;
	return {
		...theme,
		color:
			Object.keys(next).length === 0
				? color
				: { ...color, families: next as ClassicyThemeColorFamilies },
	};
}

// ─── Editing: the family form of ClassicyDesktopChangeColor ─────────────────

/** Addresses one package color, `color.families.<family>.<key>`. */
export type ClassicyThemeColorFamilyTarget = { family: string; key: string };

/** Family-form payload of `ClassicyDesktopChangeColor` (minus `type`). */
export type ClassicyThemeColorFamilyChange = ClassicyThemeColorFamilyTarget & {
	/** 24-bit RGB integer, 0x000000–0xFFFFFF. */
	color: number;
};

/**
 * Validates an untyped `{ family, key }` as a package color target: both
 * are `CLASSICY_MEASUREMENT_NAME`s and neither is `__proto__`, `constructor`
 * or `prototype`. Whether the active package declares it is checked against
 * its `colorFamilies` (`isDeclaredThemeColorFamily`).
 */
export const isThemeColorFamilyTarget = (
	value: Readonly<Record<string, unknown>>,
): value is ClassicyThemeColorFamilyTarget =>
	isColorFamilyName(value.family) && isColorFamilyName(value.key);

/** True when the package metadata `declared` names the target (own
 * properties only). */
export const isDeclaredThemeColorFamily = (
	declared: ClassicyAppearanceColorFamilies | undefined,
	target: ClassicyThemeColorFamilyTarget,
): boolean => {
	if (!declared || !Object.hasOwn(declared, target.family)) return false;
	const colors = declared[target.family]?.colors;
	return !!colors && Object.hasOwn(colors, target.key);
};

/** The family object a theme carries, read through own properties;
 * `undefined` when absent or not a plain object. */
const ownFamily = (
	theme: ThemeWithColor,
	family: string,
): Record<string, unknown> | undefined => {
	const families = theme.color.families;
	if (!isClassicyPlainObject(families) || !Object.hasOwn(families, family)) {
		return undefined;
	}
	const value: unknown = families[family];
	return isClassicyPlainObject(value) ? value : undefined;
};

/** Reads `color.families.<family>.<key>` through own properties; `NaN` when
 * the theme does not carry it as a color. */
export const getThemeColorFamily = (
	theme: ThemeWithColor,
	target: ClassicyThemeColorFamilyTarget,
): number => {
	const family = ownFamily(theme, target.family);
	const value =
		family && Object.hasOwn(family, target.key)
			? family[target.key]
			: undefined;
	return isValidThemeColor(value) ? value : Number.NaN;
};

/**
 * Writes a package color, creating `families` and the family when the theme
 * predates them. Refused (returns false, writes nothing) for an invalid
 * target or color, or a `families` or family the theme carries as something
 * other than a plain object (tampered or legacy state). Whether the package
 * declares the target is the caller's check (`isDeclaredThemeColorFamily`).
 */
export const setThemeColorFamily = (
	theme: ThemeWithColor,
	target: ClassicyThemeColorFamilyTarget,
	color: number,
): boolean => {
	if (!isThemeColorFamilyTarget(target) || !isValidThemeColor(color)) {
		return false;
	}
	const c = theme.color;
	if (c.families === undefined) c.families = {};
	if (!isClassicyPlainObject(c.families)) return false;
	if (!Object.hasOwn(c.families, target.family)) c.families[target.family] = {};
	const family = ownFamily(theme, target.family);
	if (!family) return false;
	family[target.key] = color;
	return true;
};

import platinumJson from "@/Appearance/Platinum/platinum.json";
import type {
	ClassicyTheme,
	ClassicyThemeCoreMeasurements,
	ClassicyThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { intToPx } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import {
	CLASSICY_THEME_DERIVATIONS,
	CLASSICY_THEME_DERIVED_VARS,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { getClassicyPackageMeasurements } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementSource.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { DeepPartial } from "@/SystemFolder/SystemResources/Utils/deepMerge";

/**
 * The Platinum layout metrics (Mac OS 8 HIG, Ch. 3 "Layout Guidelines"),
 * grouped per control family. These are the theme *inputs*; `getThemeVars`
 * derives frames, bevels, the edit-field height and the rest from them.
 *
 * Every built-in theme carries this block in `platinum.json`; a theme loaded
 * from an older build or an older theme file is completed with these values
 * by `withDefaultThemeMetrics`. Platinum's further families (`controlStrip`,
 * `pager`, …) live only in `platinum.json`'s `defaults.measurements` and are
 * filled the same way (`classicyThemeMeasurementDefaults`).
 */
export const CLASSICY_DEFAULT_THEME_METRICS: Readonly<ClassicyThemeCoreMeasurements> =
	{
		window: {
			borderSize: 1,
			controlSize: 12,
			paddingSize: 6,
			scrollbarSize: 17,
			titleBarHeight: 19,
			utilityTitleBarHeight: 10,
		},
		control: { height: 20, labelGap: 5, staticTextHeight: 16 },
		button: { minWidth: 58, textPadding: 8, gap: 12 },
		groupBox: {
			marginSide: 10,
			marginTop: 12,
			marginBottom: 10,
			titlePad: 3,
			gap: 12,
		},
		layout: { itemGap: 4, groupGap: 16, dialogEdge: 12 },
	};

/** A theme whose `measurements` may be missing groups or keys (persisted by
 * an older build, or read from an older theme file). */
export type ClassicyThemeWithPartialMetrics = Omit<
	ClassicyTheme,
	"measurements"
> & {
	measurements?: DeepPartial<ClassicyThemeCoreMeasurements> & {
		[family: string]: unknown;
	};
};

// The core families, walked first so a core input wins every collision.
type MetricGroupId = keyof ClassicyThemeCoreMeasurements;

const METRIC_GROUPS = Object.keys(
	CLASSICY_DEFAULT_THEME_METRICS,
) as MetricGroupId[];

/** A theme whose `measurements` are complete: what `withDefaultThemeMetrics`
 * returns. Every family reads as `Record<string, number>`, so a family the
 * input carried partly (`controlStrip: { cellHeight }`) types as filled. */
export type ClassicyThemeWithMetrics<
	T extends ClassicyThemeWithPartialMetrics,
> = Omit<T, "measurements"> & { measurements: ClassicyThemeMeasurements };

/**
 * What `withDefaultThemeMetrics` fills from: family → key → whole pixels.
 * `CLASSICY_DEFAULT_THEME_METRICS` (the core five) or
 * `classicyThemeMeasurementDefaults(packageId)` (the core five and every
 * package family).
 */
export type ClassicyThemeMeasurementDefaults = Readonly<
	Record<string, Readonly<Record<string, number>>>
>;

const isMetricNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Fills one family from its defaults, key by key. Returns the input family
 * itself when it already carries every default key as a finite number, so
 * callers can detect "nothing to do" by reference. Otherwise a new object:
 * the present finite values and the missing defaults in the defaults' key
 * order, then the family's own keys the defaults do not name (a package's
 * extra knob, say). A family that is not a plain object is replaced.
 */
const fillFamily = (
	defaults: Readonly<Record<string, number>>,
	value: unknown,
): unknown => {
	const present = isPlainObject(value) ? value : undefined;
	let complete = present !== undefined;
	const filled: Record<string, unknown> = {};
	for (const key of Object.keys(defaults)) {
		const v = present && Object.hasOwn(present, key) ? present[key] : undefined;
		if (isMetricNumber(v)) {
			filled[key] = v;
		} else {
			filled[key] = defaults[key];
			complete = false;
		}
	}
	if (complete) return present;
	for (const [key, v] of Object.entries(present ?? {})) {
		if (!Object.hasOwn(filled, key)) filled[key] = v;
	}
	return filled;
};

/**
 * Completes a theme's `measurements` from `defaults`
 * (`CLASSICY_DEFAULT_THEME_METRICS`, the core five, unless given): every
 * family and every key `defaults` names, key by key.
 *
 * Copy-on-write: returns **the same object** when every family and key is
 * already present (so idempotent passes over live store state change
 * nothing), otherwise a shallow copy of the theme with a new `measurements`
 * object in which present values win and only the missing ones are filled.
 * Families and keys `defaults` does not name are carried over as they are.
 * The input is never mutated.
 *
 * Pass `classicyThemeMeasurementDefaults(theme.package)` to fill a package's
 * families too (H-R2): `getThemeVars`, the state migration and
 * `ClassicyDesktopLoadThemes` do.
 */
export function withDefaultThemeMetrics<
	T extends ClassicyThemeWithPartialMetrics,
>(
	theme: T,
	defaults: ClassicyThemeMeasurementDefaults = CLASSICY_DEFAULT_THEME_METRICS,
): ClassicyThemeWithMetrics<T> {
	const current = theme.measurements as Record<string, unknown> | undefined;
	let changed = current === undefined;
	const next: Record<string, unknown> = { ...current };
	for (const family of Object.keys(defaults)) {
		const filled = fillFamily(defaults[family], current?.[family]);
		if (filled !== current?.[family]) changed = true;
		next[family] = filled;
	}
	if (!changed) {
		return theme as ClassicyThemeWithMetrics<T>;
	}
	return {
		...theme,
		measurements: next as ClassicyThemeMeasurements,
	};
}

/**
 * `withDefaultThemeMetrics` over a list, copy-on-write: the same array back
 * when no entry needed completing, otherwise a copy with only the completed
 * entries replaced. Non-object entries are left as they are. `defaultsFor`
 * picks each theme's defaults (the core five unless given); pass
 * `(t) => classicyThemeMeasurementDefaults(t.package)` to fill every theme
 * from its own package.
 */
export function withDefaultThemeMetricsList<
	T extends ClassicyThemeWithPartialMetrics,
>(
	themes: readonly T[],
	defaultsFor: (theme: T) => ClassicyThemeMeasurementDefaults = () =>
		CLASSICY_DEFAULT_THEME_METRICS,
): T[] {
	let next: T[] | undefined;
	themes.forEach((theme, i) => {
		if (!theme || typeof theme !== "object") return;
		const filled = withDefaultThemeMetrics(theme, defaultsFor(theme));
		if (filled === theme) return;
		next ??= [...themes];
		next[i] = filled as unknown as T;
	});
	return next ?? (themes as T[]);
}

/**
 * `base` with `over`'s finite numeric leaves merged in key by key (`over`
 * wins); `over`'s new families and keys are appended. Neither is mutated;
 * the result and each of its families are frozen.
 */
const mergeMeasurementDefaults = (
	base: ClassicyThemeMeasurementDefaults,
	over: unknown,
): ClassicyThemeMeasurementDefaults => {
	const merged: Record<string, Record<string, number>> = {};
	for (const [family, keys] of Object.entries(base)) {
		merged[family] = { ...keys };
	}
	if (isPlainObject(over)) {
		for (const [family, keys] of Object.entries(over)) {
			if (!isPlainObject(keys)) continue;
			for (const [key, value] of Object.entries(keys)) {
				if (!isMetricNumber(value)) continue;
				merged[family] ??= {};
				merged[family][key] = value;
			}
		}
	}
	for (const keys of Object.values(merged)) Object.freeze(keys);
	return Object.freeze(merged);
};

// The floor every theme is filled to: the core five, then Platinum's
// families (platinum.json, read as data, so it is there however early this
// module evaluates). Base SCSS reads Platinum's knob variables for every
// package (H-R13), so every package's defaults start from these.
const PLATINUM_MEASUREMENT_DEFAULTS = mergeMeasurementDefaults(
	CLASSICY_DEFAULT_THEME_METRICS,
	platinumJson.defaults.measurements,
);

// One merge per package `defaults.measurements` object: getThemeVars asks on
// every render. A re-registered package brings a new object, so a new entry.
const packageDefaultsCache = new WeakMap<
	object,
	ClassicyThemeMeasurementDefaults
>();

/**
 * The measurements a theme of `packageId` is completed with: Platinum's
 * `defaults.measurements` (the core five and every Platinum family), with the
 * registered package's own `defaults.measurements` merged in key by key, the
 * package's values winning (`getRegisteredClassicyAppearancePackageOrDefault`:
 * an unknown or missing id falls back to the registered default package, and
 * with none registered the result is Platinum's).
 *
 * Key by key, not family by family: a package that declares part of a
 * family (`controlStrip { cellHeight, tabWidth }`) keeps the Platinum keys it
 * leaves out, since base stylesheets read them. Frozen, and the same object
 * for the same package registration.
 */
export function classicyThemeMeasurementDefaults(
	packageId: string | undefined,
): ClassicyThemeMeasurements {
	const own = getClassicyPackageMeasurements(packageId);
	if (!isPlainObject(own)) {
		return PLATINUM_MEASUREMENT_DEFAULTS as ClassicyThemeMeasurements;
	}
	let merged = packageDefaultsCache.get(own);
	if (merged === undefined) {
		merged = mergeMeasurementDefaults(PLATINUM_MEASUREMENT_DEFAULTS, own);
		packageDefaultsCache.set(own, merged);
	}
	return merged as ClassicyThemeMeasurements;
}

/**
 * The only measurement family or key name that becomes a CSS variable: a
 * lowercase-first camelCase name (`controlStrip`, `cellHeight`). The theme
 * schema refuses any other package family or key name; the walker skips them
 * too, for state that never passed the schema.
 */
export const CLASSICY_MEASUREMENT_NAME = /^[a-z][A-Za-z0-9]*$/;

/** `groupBox` → `group-box`, `titleBarHeight` → `title-bar-height`. */
const kebab = (name: string): string =>
	name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);

// Collisions already reported, so a re-render never repeats a warning.
const reportedCollisions = new Set<string>();

/**
 * The variables `getThemeVars` sets from the theme's palette, typography and
 * desktop: everything it emits that is neither a measurement input nor
 * derived from one. They are set after the inputs, so they are reserved with
 * the derived names (`isReservedClassicyThemeVar`): a package measurement
 * that would make one (`desktop.iconSize` → `--desktop-icon-size`) could
 * never take effect. A test fails when `getThemeVars` emits a variable that
 * is in none of the reserved lists.
 */
export const CLASSICY_THEME_NON_MEASUREMENT_VARS: readonly string[] = [
	"--color-black",
	"--color-white",
	"--color-alert",
	"--color-error",
	"--color-system-01",
	"--color-system-02",
	"--color-system-03",
	"--color-system-04",
	"--color-system-05",
	"--color-system-06",
	"--color-system-07",
	"--color-theme-01",
	"--color-theme-02",
	"--color-theme-03",
	"--color-theme-04",
	"--color-theme-05",
	"--color-theme-06",
	"--color-theme-07",
	"--color-window-border",
	"--color-window-border-outset",
	"--color-window-border-inset",
	"--color-window-frame",
	"--color-window-title",
	"--color-window-document",
	"--color-outline",
	"--color-select",
	"--color-highlight",
	"--header-font",
	"--header-font-size",
	"--body-font",
	"--body-font-size",
	"--ui-font",
	"--ui-font-size",
	"--mono-font",
	"--mono-font-size",
	"--digital-font",
	"--digital-font-size",
	"--desktop-icon-size",
	"--desktop-icon-font-size",
	"--desktop-background-image",
	"--desktop-background-color",
	"--desktop-background-repeat",
	"--desktop-background-position",
	"--desktop-background-size",
];

// Every variable `getThemeVars` sets after the inputs (the palette, font and
// desktop variables, the earlier derived variables and the named
// derivations): reserved, so a package measurement never makes one only to be
// silently replaced.
const RESERVED_THEME_VARS: ReadonlySet<string> = new Set([
	...CLASSICY_THEME_NON_MEASUREMENT_VARS,
	...CLASSICY_THEME_DERIVED_VARS,
	...CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar),
]);

/**
 * True for a `--classicy-` name. The prefix is Classicy's own: the desktop
 * root sets `--classicy-layout-*` after the theme's variables, and
 * `--classicy-art-*`/`--classicy-cursor-*` are read with fallbacks that a
 * stray value would void. So no package measurement may make one (a family
 * `classicy` or `classicyLayout`, say): `isReservedClassicyThemeVar` counts
 * them reserved.
 */
const isClassicyPrefixedThemeVar = (name: string): boolean =>
	name.startsWith("--classicy-");

/**
 * True for a name in the palette's `--color-` space (H-R16): a family
 * `color` or one whose kebab-case name starts with `color-` (`colorPicker`
 * → `--color-picker-*`). Reserved whole, not name by name, so a measurement
 * can never pass for a palette color, whatever getThemeVars sets today.
 */
const isPaletteThemeVar = (name: string): boolean =>
	name.startsWith("--color-");

/**
 * True when `getThemeVars` sets `name` itself, after the measurement inputs:
 * a palette, font or desktop variable (`CLASSICY_THEME_NON_MEASUREMENT_VARS`),
 * an earlier derived variable (`CLASSICY_THEME_DERIVED_VARS`) or a named
 * derivation (`CLASSICY_THEME_DERIVATIONS`); or when `name` takes the
 * `--classicy-` prefix, which Classicy keeps for its own root variables
 * (`--classicy-layout-*`, `--classicy-art-*`, …); or when `name` takes the
 * palette's `--color-` prefix (H-R16). A package measurement whose
 * variable (`classicyMeasurementVarName`) is reserved is skipped by
 * `classicyMeasurementVars`, and is not an editable knob
 * (`isThemeMetricFamilyTarget`).
 */
export const isReservedClassicyThemeVar = (name: string): boolean =>
	RESERVED_THEME_VARS.has(name) ||
	isClassicyPrefixedThemeVar(name) ||
	isPaletteThemeVar(name);

/**
 * The CSS variable a measurement makes: `--<family>-<key>`, kebab-cased
 * (`controlStrip`, `cellHeight` → `--control-strip-cell-height`).
 */
export const classicyMeasurementVarName = (
	family: string,
	key: string,
): string => `--${kebab(family)}-${kebab(key)}`;

const reportOnce = (collision: string, message: string): void => {
	if (reportedCollisions.has(collision)) return;
	reportedCollisions.add(collision);
	classicyLog("warn", "ClassicyAppearance", message);
};

/**
 * The CSS custom properties for a theme's measurement *inputs*: every numeric
 * leaf `measurements.<family>.<key>` as `--<family>-<key>` (kebab-case) in
 * whole pixels — the core families and any family an Appearance Package adds
 * (`controlStrip.cellHeight` → `--control-strip-cell-height`).
 *
 * - Leaves that are not finite numbers (`"22"`, `NaN`) emit nothing, and
 *   neither does a family or key that is not a
 *   `CLASSICY_MEASUREMENT_NAME`: package families reach here from
 *   theme files and persisted state, and a name becomes part of a CSS
 *   declaration.
 * - Kebab-casing can map two leaves to one variable (`windowTitle.barHeight`
 *   and `window.titleBarHeight`). The first wins: the core families are
 *   walked first, so a core input always wins, then package families in key
 *   order. Each collision is logged once.
 * - A leaf whose variable `getThemeVars` sets itself
 *   (`isReservedClassicyThemeVar`: a derived one, e.g. `help.buttonWidth` →
 *   `--help-button-width`; a named derivation, e.g. `menu.minWidth` →
 *   `--menu-min-width`; or a palette, font or desktop variable, e.g.
 *   `desktop.iconSize` → `--desktop-icon-size`) is skipped, logged once: those
 *   names are reserved.
 *
 * The variables derived from the inputs (frames, bevels, `--button-height`,
 * …) stay in `getThemeVars`, and the named proportions in
 * `ClassicyThemeDerivations.ts`.
 */
export function classicyMeasurementVars(
	measurements: ClassicyThemeMeasurements,
): Record<string, string> {
	const vars: Record<string, string> = {};
	const sources = new Map<string, string>();
	const families = [
		...METRIC_GROUPS,
		...Object.keys(measurements).filter(
			(family) => !(METRIC_GROUPS as string[]).includes(family),
		),
	];
	for (const family of families) {
		const keys: unknown = measurements[family];
		if (
			!CLASSICY_MEASUREMENT_NAME.test(family) ||
			!keys ||
			typeof keys !== "object"
		) {
			continue;
		}
		for (const [key, n] of Object.entries(keys)) {
			if (!isMetricNumber(n) || !CLASSICY_MEASUREMENT_NAME.test(key)) {
				continue;
			}
			const name = classicyMeasurementVarName(family, key);
			const source = `${family}.${key}`;
			if (isReservedClassicyThemeVar(name)) {
				reportOnce(
					`${name}|${source}`,
					isClassicyPrefixedThemeVar(name)
						? `Measurement ${source} makes ${name}; the --classicy- prefix is reserved for Classicy's own variables.`
						: isPaletteThemeVar(name) && !RESERVED_THEME_VARS.has(name)
							? `Measurement ${source} makes ${name}; the --color- prefix is reserved for the palette.`
							: `Measurement ${source} makes ${name}, a reserved theme variable; getThemeVars sets its own value.`,
				);
				continue;
			}
			const winner = sources.get(name);
			if (winner !== undefined) {
				reportOnce(
					`${winner}|${source}`,
					`Measurement ${source} and ${winner} both make ${name}; ${winner} is used.`,
				);
				continue;
			}
			sources.set(name, source);
			vars[name] = intToPx(n);
		}
	}
	return vars;
}

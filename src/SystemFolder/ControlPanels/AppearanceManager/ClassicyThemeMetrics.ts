import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { CLASSICY_CORE_MEASUREMENT_DEFAULTS } from "@/Appearance/ClassicyCoreTheme";
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
import {
	getClassicyDrawnPackageId,
	getClassicyForeignPackageMeasurements,
	getClassicyPackageMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementSource.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { DeepPartial } from "@/SystemFolder/SystemResources/Utils/deepMerge";

/**
 * The Platinum layout metrics (Mac OS 8 HIG, Ch. 3 "Layout Guidelines"),
 * grouped per control family. These are the theme *inputs*; `getThemeVars`
 * derives frames, bevels, the edit-field height and the rest from them.
 *
 * Every built-in theme carries this block in `platinum.json`; a theme loaded
 * from an older build or an older theme file is completed with these values
 * by `withDefaultThemeMetrics`. The structural knob families (`controlStrip`,
 * `pager`, …) live in the core floor (`CLASSICY_CORE_MEASUREMENT_DEFAULTS`)
 * and a package's own `defaults.measurements`, and are filled the same way
 * (`classicyThemeMeasurementDefaults`).
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
 * families too (H-R2): `getThemeVars`, theme export, `ClassicyDesktopLoadThemes`
 * and package activation do. The state migration does not (H-R17): it runs
 * before a host can register its package, so it fills the core five only.
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

/** Family → keys of a theme's explicit-edit record. */
export type ClassicyThemeMeasurementPins = ReadonlyMap<
	string,
	ReadonlySet<string>
>;

const NO_PINS: ClassicyThemeMeasurementPins = new Map();

/**
 * The explicit-edit record of `theme` (`measurementPins`, story 0235-xgi):
 * family → the keys whose value is the theme's own although it equals its
 * package's default. Read through own properties; a family that is not an
 * array of strings, and a name `classicyMeasurementVars` would not emit, is
 * ignored.
 */
export const classicyThemeMeasurementPins = (theme: {
	measurementPins?: unknown;
}): ClassicyThemeMeasurementPins => {
	const record = theme.measurementPins;
	if (!isPlainObject(record)) return NO_PINS;
	let pins: Map<string, Set<string>> | undefined;
	for (const [family, keys] of Object.entries(record)) {
		if (!CLASSICY_MEASUREMENT_NAME.test(family) || !Array.isArray(keys))
			continue;
		for (const key of keys) {
			if (typeof key !== "string" || !CLASSICY_MEASUREMENT_NAME.test(key))
				continue;
			pins ??= new Map();
			const set = pins.get(family) ?? new Set<string>();
			set.add(key);
			pins.set(family, set);
		}
	}
	return pins ?? NO_PINS;
};

/**
 * The inverse of `withDefaultThemeMetrics` for the families beyond the core
 * five (H-R17): `theme` without every package-family leaf equal to its
 * `defaults` value, and without a family that this empties. The core five,
 * keys `defaults` does not name, changed values and the leaves the theme's
 * explicit-edit record names (`measurementPins`) are kept. Copy-on-write:
 * the same theme back when there is nothing to drop.
 *
 * `sanitizeStateForPersistence` stores themes this way, so persisted state
 * keeps only what a user changed, and a later change to a package's knob
 * defaults reaches existing users; `getThemeVars` fills the rest when it
 * reads the theme.
 */
export function withoutDefaultThemeMeasurements<
	T extends ClassicyThemeWithPartialMetrics,
>(theme: T, defaults: ClassicyThemeMeasurementDefaults): T {
	const current = theme.measurements as Record<string, unknown> | undefined;
	if (!isPlainObject(current)) return theme;
	const next = withoutDefaultLeaves(
		current,
		defaults,
		true,
		classicyThemeMeasurementPins(theme),
	);
	return next ? ({ ...theme, measurements: next } as T) : theme;
}

/**
 * `measurements` without every leaf equal to its `defaults` value, but those
 * `pins` names, and without a family that this empties; the core five too
 * unless `keepCore`. `undefined` when there is nothing to drop.
 */
const withoutDefaultLeaves = (
	current: Record<string, unknown>,
	defaults: ClassicyThemeMeasurementDefaults,
	keepCore: boolean,
	pins: ClassicyThemeMeasurementPins = NO_PINS,
): Record<string, unknown> | undefined => {
	let next: Record<string, unknown> | undefined;
	for (const [family, value] of Object.entries(current)) {
		const familyDefaults = Object.hasOwn(defaults, family)
			? defaults[family]
			: undefined;
		if (
			(keepCore && (METRIC_GROUPS as string[]).includes(family)) ||
			!familyDefaults ||
			!isPlainObject(value)
		) {
			continue;
		}
		const pinned = pins.get(family);
		const kept = Object.fromEntries(
			Object.entries(value).filter(
				([key, v]) =>
					pinned?.has(key) ||
					!(Object.hasOwn(familyDefaults, key) && familyDefaults[key] === v),
			),
		);
		const keptCount = Object.keys(kept).length;
		if (keptCount === Object.keys(value).length) continue;
		next ??= { ...current };
		if (keptCount === 0) delete next[family];
		else next[family] = kept;
	}
	return next;
};

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

// One merge per package `defaults.measurements` object: getThemeVars asks on
// every render. A re-registered package brings a new object, so a new entry.
const packageDefaultsCache = new WeakMap<
	object,
	ClassicyThemeMeasurementDefaults
>();

/**
 * The measurements a theme of `packageId` is completed with: the core floor
 * (`CLASSICY_CORE_MEASUREMENT_DEFAULTS`: the core five and every structural
 * knob), with the registered package's own `defaults.measurements` merged in
 * key by key, the package's values winning (an unknown or missing id falls
 * back to the registered default package, never to another registered one,
 * unlike `getRegisteredClassicyAppearancePackageOrDefault`; with neither the
 * result is the core floor alone).
 *
 * Key by key, not family by family: a package that declares part of a
 * family (`controlStrip { cellHeight, tabWidth }`) keeps the floor's keys it
 * leaves out, since base stylesheets, or Platinum's sheet drawing a theme
 * of another package, read them. A package's optional knobs (Platinum's
 * `fileBrowserList`) come from its own values alone. Frozen, and the same
 * object for the same package registration.
 */
export function classicyThemeMeasurementDefaults(
	packageId: string | undefined,
): ClassicyThemeMeasurements {
	const own = getClassicyPackageMeasurements(packageId);
	if (!isPlainObject(own)) {
		return CLASSICY_CORE_MEASUREMENT_DEFAULTS as ClassicyThemeMeasurements;
	}
	let merged = packageDefaultsCache.get(own);
	if (merged === undefined) {
		merged = mergeMeasurementDefaults(CLASSICY_CORE_MEASUREMENT_DEFAULTS, own);
		packageDefaultsCache.set(own, merged);
	}
	return merged as ClassicyThemeMeasurements;
}

// One merge per foreign reference theme's measurements object.
const foreignDefaultsCache = new WeakMap<
	object,
	ClassicyThemeMeasurementDefaults
>();

/**
 * The measurements a theme of another package is completed with while
 * `packageId` draws it (story 0235-xgi): the package's defaults over the
 * core floor (`classicyThemeMeasurementDefaults`), with the measurements of
 * the built-in theme its `foreignThemeDefaults` names merged in key by key,
 * that theme's values winning. Without `foreignThemeDefaults`, the
 * package's defaults; System 7 names its color preset. Frozen, and the same
 * object for the same registration.
 */
export function classicyForeignThemeMeasurementDefaults(
	packageId: string,
): ClassicyThemeMeasurements {
	const base = classicyThemeMeasurementDefaults(packageId);
	const reference = getClassicyForeignPackageMeasurements(packageId);
	if (
		!isPlainObject(reference) ||
		reference === getClassicyPackageMeasurements(packageId)
	)
		return base;
	let merged = foreignDefaultsCache.get(reference);
	if (merged === undefined) {
		merged = mergeMeasurementDefaults(base, reference);
		foreignDefaultsCache.set(reference, merged);
	}
	return merged as ClassicyThemeMeasurements;
}

/**
 * The measurements `theme` draws with while `drawnPackageId` is the drawing
 * package (the store's `Appearance.packageId`, resolved as the desktop
 * resolves it: that package when registered, else the registered default,
 * else the first registered). Story 0235-xgi.
 *
 * Under its own package (or with no `drawnPackageId`), the theme completed
 * from `classicyThemeMeasurementDefaults(theme.package)`, as before. Under
 * another package, key by key: the core floor, then the drawing package's
 * defaults, then the measurements of the built-in it names for a foreign
 * theme (`foreignThemeDefaults`, `classicyForeignThemeMeasurementDefaults`;
 * System 7's color preset), then the theme's own values: every value that
 * differs from its own package's default (the core five included), and
 * every value its explicit-edit record names (`measurementPins`). So the
 * drawing package's knobs are all present, whatever the theme's package
 * declared (a Platinum theme under System 7 keeps System 7's color title
 * bars, menus and Standard File layout, and the reverse), and an edit the
 * theme carries still wins. A value equal to its package's default and not
 * in the record follows the drawing package's, as persistence has it
 * (`withoutDefaultThemeMeasurements`, H-R17); `ClassicyDesktopChangeMetric`
 * records a value the user sets to that default while another package
 * draws (`updateClassicyMeasurementPin`), so the Metrics and Options tabs
 * can set any value. That holds for an opt-in too: a theme carrying its
 * package's `zoomRects.enabled: 1` draws no zoom under a package that has
 * not opted in, while a theme that turned it off keeps it off everywhere.
 * A theme of a package that is not registered keeps all its values, its
 * core five included, since nothing tells its edits from its package's
 * defaults (as persistence keeps all of them).
 *
 * Only what is drawn: nothing here is written to the theme, so persistence
 * still stores the theme's own values alone. Colors are not completed here
 * (`classicyThemeColorFamilyDefaults(theme.package)`): a package's color
 * families are the theme's palette, and every stylesheet read of one carries
 * a `--color-*` fallback for another package's theme.
 */
export function classicyDrawnThemeMeasurements(
	theme: ClassicyThemeWithPartialMetrics,
	drawnPackageId?: string,
): ClassicyThemeMeasurements {
	const ownId = theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;
	const ownDefaults = classicyThemeMeasurementDefaults(ownId);
	const drawnId =
		drawnPackageId === undefined
			? undefined
			: getClassicyDrawnPackageId(drawnPackageId);
	if (drawnId === undefined || drawnId === ownId) {
		return withDefaultThemeMetrics(theme, ownDefaults).measurements;
	}
	const current = isPlainObject(theme.measurements)
		? (theme.measurements as Record<string, unknown>)
		: {};
	const own =
		getClassicyDrawnPackageId(ownId) === ownId
			? (withoutDefaultLeaves(
					current,
					ownDefaults,
					false,
					classicyThemeMeasurementPins(theme),
				) ?? current)
			: current;
	const drawnDefaults = classicyForeignThemeMeasurementDefaults(drawnId);
	const drawn: Record<string, unknown> = {};
	for (const family of Object.keys(drawnDefaults)) {
		drawn[family] = fillFamily(drawnDefaults[family], own[family]);
	}
	for (const [family, value] of Object.entries(own)) {
		if (!Object.hasOwn(drawn, family)) drawn[family] = value;
	}
	return drawn as ClassicyThemeMeasurements;
}

/**
 * `theme` with the measurements it draws with under `drawnPackageId`
 * (`classicyDrawnThemeMeasurements`). The same theme back when they are its
 * own (its own package draws it, and it carries every default key).
 */
export function withDrawnThemeMetrics<
	T extends ClassicyThemeWithPartialMetrics,
>(theme: T, drawnPackageId?: string): ClassicyThemeWithMetrics<T> {
	const measurements = classicyDrawnThemeMeasurements(theme, drawnPackageId);
	return measurements === theme.measurements
		? (theme as ClassicyThemeWithMetrics<T>)
		: { ...theme, measurements };
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
	// Emitted only when a theme sets `typography.uiSmall`, read as a font
	// family: a measurement `uiFont.small` must never make it a length.
	"--ui-font-small",
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
 * The prefix of a package color's variable
 * (`--package-color-<family>-<key>`, `classicyColorFamilyVarName`): the
 * namespace Appearance Packages own for the colors they declare beside the
 * core palette, which keeps `--color-` (H-R16). Reserved whole, like
 * `--color-`, so no measurement (a family `packageColor`, say) can make one.
 */
export const CLASSICY_PACKAGE_COLOR_VAR_PREFIX = "--package-color-";

/** True for a name in the package colors' `--package-color-` space. */
export const isClassicyPackageColorVar = (name: string): boolean =>
	name.startsWith(CLASSICY_PACKAGE_COLOR_VAR_PREFIX);

/**
 * True when `getThemeVars` sets `name` itself, after the measurement inputs:
 * a palette, font or desktop variable (`CLASSICY_THEME_NON_MEASUREMENT_VARS`),
 * an earlier derived variable (`CLASSICY_THEME_DERIVED_VARS`) or a named
 * derivation (`CLASSICY_THEME_DERIVATIONS`); or when `name` takes the
 * `--classicy-` prefix, which Classicy keeps for its own root variables
 * (`--classicy-layout-*`, `--classicy-art-*`, …); or when `name` takes the
 * palette's `--color-` prefix (H-R16), or the package colors'
 * `--package-color-` prefix. A package measurement whose
 * variable (`classicyMeasurementVarName`) is reserved is skipped by
 * `classicyMeasurementVars`, and is not an editable knob
 * (`isThemeMetricFamilyTarget`).
 */
export const isReservedClassicyThemeVar = (name: string): boolean =>
	RESERVED_THEME_VARS.has(name) ||
	isClassicyPrefixedThemeVar(name) ||
	isPaletteThemeVar(name) ||
	isClassicyPackageColorVar(name);

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
							: isClassicyPackageColorVar(name)
								? `Measurement ${source} makes ${name}; the --package-color- prefix is reserved for package colors.`
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

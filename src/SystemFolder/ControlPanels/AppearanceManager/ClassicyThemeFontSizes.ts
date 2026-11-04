import type {
	ClassicyTheme,
	ClassicyThemeTypography,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * The one definition of a valid theme font size, in px. It bounds every font
 * size a theme carries (the five typography sizes, `desktop.iconFontSize` and
 * every measurement whose key names a font size,
 * `isClassicyFontSizeMeasurementKey`) wherever one arrives:
 * `ClassicyThemeSchema` (theme files, imports and
 * `ClassicyDesktopChangeAppearanceOption`), the `ClassicyDesktopChangeFontSize`
 * predicate (`hasFontSize`), the Appearance Manager's Fonts tab, the
 * `ClassicyDesktopChangeMetric` knob bounds and the Options tab
 * (`getThemeMetricFamilyBounds`), and the load-time heal in
 * `migrateClassicyState` (`withClassicyThemeFontSizesClamped`).
 *
 * The range is the one the Fonts tab has always offered, and every Platinum
 * preset sits well inside it (12–22 px). Outside it, the sizes derived from a
 * font size (`--ui-font-size-small`, `--menu-bar-height`, …) stop making
 * sense, and a size of zero or less makes them invalid lengths. Fractional
 * sizes are valid CSS, so they are allowed.
 */
export const CLASSICY_THEME_FONT_SIZE_MIN = 8;
export const CLASSICY_THEME_FONT_SIZE_MAX = 72;

/** The typography keys holding a font size, as `ClassicyDesktopChangeFontSize`
 * names them in `fontType`. */
export const CLASSICY_THEME_FONT_SIZE_KEYS = [
	"uiSize",
	"bodySize",
	"headerSize",
	"monoSize",
	"digitalSize",
] as const satisfies readonly (keyof ClassicyThemeTypography)[];

export type ClassicyThemeFontSizeKey =
	(typeof CLASSICY_THEME_FONT_SIZE_KEYS)[number];

/** True when `key` is one of `CLASSICY_THEME_FONT_SIZE_KEYS`. */
export const isClassicyThemeFontSizeKey = (
	key: unknown,
): key is ClassicyThemeFontSizeKey =>
	(CLASSICY_THEME_FONT_SIZE_KEYS as readonly unknown[]).includes(key);

/** True for a number within the font-size bounds, inclusive (so never NaN or
 * an infinity: both fail the comparisons). */
export const isValidClassicyThemeFontSize = (value: unknown): value is number =>
	typeof value === "number" &&
	value >= CLASSICY_THEME_FONT_SIZE_MIN &&
	value <= CLASSICY_THEME_FONT_SIZE_MAX;

/** `value` clamped to the font-size bounds; `undefined` when it is not a
 * finite number, since no size follows from it. */
export const clampClassicyThemeFontSize = (
	value: number,
): number | undefined =>
	Number.isFinite(value)
		? Math.min(
				CLASSICY_THEME_FONT_SIZE_MAX,
				Math.max(CLASSICY_THEME_FONT_SIZE_MIN, value),
			)
		: undefined;

/**
 * True for a measurement key that names a font size: `fontSize`, or a name
 * ending in `FontSize` (`headerFontSize`, `bodyFontSize`). Decided by key name
 * alone, in any family of any package, so a package's knob font sizes
 * (`pager.fontSize`, `hyperCard.fontSize`, `appleGuide.bodyFontSize`) are held
 * to the same bounds as the typography sizes even before (or without) the
 * package registering.
 */
export const isClassicyFontSizeMeasurementKey = (key: unknown): key is string =>
	typeof key === "string" && (key === "fontSize" || key.endsWith("FontSize"));

/** A size clamped into the bounds; the same value back when it already is,
 * or when it is not a finite number (nothing to clamp it to, and a NaN must
 * come back as itself, compared with `Object.is`, so the heal stays
 * idempotent). */
const clampedOrSame = (value: unknown): unknown =>
	typeof value === "number" && Number.isFinite(value)
		? clampClassicyThemeFontSize(value)
		: value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * `theme` with every font size it carries clamped into the bounds: the five
 * typography sizes, `desktop.iconFontSize`, and each measurement whose key is
 * a font-size key (`isClassicyFontSizeMeasurementKey`), in whatever families
 * the theme holds. Copy-on-write and idempotent: only the objects on a
 * changed path are copied, and a theme with nothing to clamp comes back as
 * the same object. A value that is not a finite number (or a branch that is
 * not an object) is left alone, since no size follows from it. Used by
 * `migrateClassicyState`, so a persisted out-of-range size cannot break the
 * derived sizes or make the theme fail its own export.
 */
export const withClassicyThemeFontSizesClamped = (
	theme: ClassicyTheme,
): ClassicyTheme => {
	if (!isRecord(theme)) return theme;
	let next: ClassicyTheme | undefined;

	const typography: unknown = theme.typography;
	if (isRecord(typography)) {
		let nextTypography: Record<string, unknown> | undefined;
		for (const key of CLASSICY_THEME_FONT_SIZE_KEYS) {
			const value = typography[key];
			const clamped = clampedOrSame(value);
			if (Object.is(clamped, value)) continue;
			nextTypography ??= { ...typography };
			nextTypography[key] = clamped;
		}
		if (nextTypography) {
			next = {
				...theme,
				typography: nextTypography as ClassicyThemeTypography,
			};
		}
	}

	const desktop: unknown = theme.desktop;
	if (isRecord(desktop)) {
		const value = desktop.iconFontSize;
		const clamped = clampedOrSame(value);
		if (!Object.is(clamped, value)) {
			next = {
				...(next ?? theme),
				desktop: {
					...desktop,
					iconFontSize: clamped,
				} as ClassicyTheme["desktop"],
			};
		}
	}

	const measurements: unknown = theme.measurements;
	if (isRecord(measurements)) {
		let nextMeasurements: Record<string, unknown> | undefined;
		for (const [family, keys] of Object.entries(measurements)) {
			if (!isRecord(keys)) continue;
			let nextKeys: Record<string, unknown> | undefined;
			for (const [key, value] of Object.entries(keys)) {
				if (!isClassicyFontSizeMeasurementKey(key)) continue;
				const clamped = clampedOrSame(value);
				if (Object.is(clamped, value)) continue;
				nextKeys ??= { ...keys };
				nextKeys[key] = clamped;
			}
			if (!nextKeys) continue;
			nextMeasurements ??= { ...measurements };
			nextMeasurements[family] = nextKeys;
		}
		if (nextMeasurements) {
			next = {
				...(next ?? theme),
				measurements: nextMeasurements as ClassicyTheme["measurements"],
			};
		}
	}

	return next ?? theme;
};

/** `withClassicyThemeFontSizesClamped` over a list; the same array back when
 * no theme changed. */
export const withClassicyThemeFontSizesClampedList = (
	themes: ClassicyTheme[],
): ClassicyTheme[] => {
	let next: ClassicyTheme[] | undefined;
	themes.forEach((theme, i) => {
		const clamped = withClassicyThemeFontSizesClamped(theme);
		if (clamped === theme) return;
		next ??= [...themes];
		next[i] = clamped;
	});
	return next ?? themes;
};

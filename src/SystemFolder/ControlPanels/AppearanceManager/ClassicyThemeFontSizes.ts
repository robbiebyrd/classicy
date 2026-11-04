import type { ClassicyThemeTypography } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * The one definition of a valid theme font size, in px. It bounds every font
 * size a theme carries (the five typography sizes, `desktop.iconFontSize` and
 * every measurement whose key names a font size,
 * `isClassicyFontSizeMeasurementKey`) wherever one arrives:
 * `ClassicyThemeSchema` (theme files, imports and
 * `ClassicyDesktopChangeAppearanceOption`), the `ClassicyDesktopChangeFontSize`
 * predicate (`hasFontSize`), the Appearance Manager's Fonts tab, the
 * `ClassicyDesktopChangeMetric` knob bounds and the Options tab
 * (`getThemeMetricFamilyBounds`).
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

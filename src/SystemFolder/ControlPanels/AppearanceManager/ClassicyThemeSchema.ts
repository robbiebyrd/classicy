import { z } from "zod";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import "@/Appearance/Platinum/assets/sounds/platinum";
import {
	CLASSICY_MEASUREMENT_NAME,
	CLASSICY_DEFAULT_THEME_METRICS as METRICS,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { classicyWallpaperFilename } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import { getClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

/**
 * Runtime schema for `ClassicyTheme`, used wherever a theme arrives from
 * outside the build: an imported theme file, or a `ClassicyDesktopImportTheme`
 * payload.
 *
 * Unknown keys are tolerated and STRIPPED (zod's default object behaviour),
 * so a file written by a newer build that adds an optional field still loads
 * here, but nothing undeclared ever reaches the store. Types are strict. The
 * one open map is `measurements`: a family the schema does not name is an
 * Appearance Package's (`controlStrip`, …) and is kept, but only as a record
 * of measurements.
 *
 * Every string a theme carries ends up in a CSS custom property on the
 * desktop root (`getThemeVars`), so strings are restricted to the characters
 * their CSS role needs — and `desktop.backgroundImage`, interpolated unquoted
 * into `url(…)`, must be a bundled wallpaper or a plain http(s) URL.
 */

/** A 24-bit RGB colour, as themes store them (`0xRRGGBB`). */
const color = z
	.number()
	.int("must be a whole number")
	.min(0, "must be a colour from 0x000000 to 0xFFFFFF")
	.max(0xffffff, "must be a colour from 0x000000 to 0xFFFFFF");

const palette = z.tuple([color, color, color, color, color, color, color]);

const size = (max: number) =>
	z.number().positive().max(max, `must be at most ${max}`);

const measurement = z.number().nonnegative().max(512, "must be at most 512");

const NAME_ERROR = "must be a camelCase name starting with a lowercase letter";

/** A package measurement family: camelCase keys, each a measurement. */
const packageMeasurements = z.record(
	z.string().regex(CLASSICY_MEASUREMENT_NAME, NAME_ERROR),
	measurement,
);

const CORE_MEASUREMENT_FAMILIES: readonly string[] = Object.keys(METRICS);

/** A CSS font stack: family names, quotes, commas — no syntax that could
 * close the declaration or pull in a resource. */
const fontStack = z
	.string()
	.trim()
	.min(1)
	.max(256)
	.regex(
		/^[\p{L}\p{N} "',._-]+$/u,
		"may only contain font names, quotes and commas",
	);

/** A short CSS keyword value (`repeat-x`, `top left`, `cover`, `50%`). */
const cssKeyword = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9%. -]+$/, "must be a CSS keyword value");

const UNSAFE_URL_CHARS = /[\s"'`()\\;<>{}]/;

/**
 * True for a `desktop.backgroundImage` value that is safe to interpolate into
 * `url(…)`: empty (colour-only), a bundled wallpaper (its filename or the URL
 * the bundler resolved it to), or an absolute http(s) URL with no characters
 * that could break out of `url()` — whitespace, quotes, parentheses,
 * backslashes, semicolons, angle brackets or braces. `javascript:`, `data:`
 * (other than a bundled wallpaper's own) and relative paths are rejected.
 */
export const isSafeClassicyThemeBackgroundImage = (value: string): boolean => {
	if (value === "") return true;
	if (classicyWallpaperFilename(value)) return true;
	if (value.length > 2048 || !/^https?:\/\//i.test(value)) return false;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them is the point.
	if (UNSAFE_URL_CHARS.test(value) || /[\u0000-\u001f\u007f]/.test(value)) {
		return false;
	}
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

const backgroundImage = z.string().refine(isSafeClassicyThemeBackgroundImage, {
	error: "must be a bundled wallpaper name or an http(s) URL",
});

// Evaluated per parse, so a pack registered after module load validates.
const soundPack = z
	.string()
	.max(64)
	.refine((id) => getClassicySoundPack(id) !== undefined, {
		error: "must be a registered sound pack",
	});

export const ClassicyThemeSchema = z.object({
	id: z.string().max(128),
	name: z.string().trim().min(1, "must not be empty").max(64),
	// The Appearance Package the theme belongs to; files saved before
	// packages existed load as the default package (Platinum).
	package: z.string().max(64).default(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID),
	color: z.object({
		outline: color,
		select: color,
		highlight: color,
		black: color,
		white: color,
		alert: color,
		error: color,
		system: palette,
		theme: palette,
		window: z.object({
			border: color,
			borderOutset: color,
			borderInset: color,
			frame: color,
			title: color,
			document: color,
		}),
	}),
	typography: z.object({
		ui: fontStack,
		uiSize: size(512),
		header: fontStack,
		headerSize: size(512),
		body: fontStack,
		bodySize: size(512),
		mono: fontStack,
		monoSize: size(512),
		digital: fontStack,
		digitalSize: size(512),
	}),
	measurements: z
		.object({
			window: z.object({
				borderSize: measurement,
				controlSize: measurement,
				paddingSize: measurement,
				scrollbarSize: measurement,
				titleBarHeight: measurement.default(METRICS.window.titleBarHeight),
				utilityTitleBarHeight: measurement.default(
					METRICS.window.utilityTitleBarHeight,
				),
			}),
			// The groups below were added after version-1 theme files already
			// existed, so each key — and each whole group — defaults to its Platinum
			// value. Zod 4's `.default()` does not re-parse its value, so the group
			// default must be the full object, never `{}`.
			control: z
				.object({
					height: measurement.default(METRICS.control.height),
					labelGap: measurement.default(METRICS.control.labelGap),
					staticTextHeight: measurement.default(
						METRICS.control.staticTextHeight,
					),
				})
				.default(METRICS.control),
			button: z
				.object({
					minWidth: measurement.default(METRICS.button.minWidth),
					textPadding: measurement.default(METRICS.button.textPadding),
					gap: measurement.default(METRICS.button.gap),
				})
				.default(METRICS.button),
			groupBox: z
				.object({
					marginSide: measurement.default(METRICS.groupBox.marginSide),
					marginTop: measurement.default(METRICS.groupBox.marginTop),
					marginBottom: measurement.default(METRICS.groupBox.marginBottom),
					titlePad: measurement.default(METRICS.groupBox.titlePad),
					gap: measurement.default(METRICS.groupBox.gap),
				})
				.default(METRICS.groupBox),
			layout: z
				.object({
					itemGap: measurement.default(METRICS.layout.itemGap),
					groupGap: measurement.default(METRICS.layout.groupGap),
					dialogEdge: measurement.default(METRICS.layout.dialogEdge),
				})
				.default(METRICS.layout),
		})
		// Any other family belongs to an Appearance Package (`controlStrip`,
		// `menuFrame`, …): kept, and every key in it must be a measurement.
		// Family and key names must be ones classicyMeasurementVars emits.
		.catchall(packageMeasurements)
		.check((ctx) => {
			for (const family of Object.keys(ctx.value)) {
				if (
					!CORE_MEASUREMENT_FAMILIES.includes(family) &&
					!CLASSICY_MEASUREMENT_NAME.test(family)
				) {
					ctx.issues.push({
						code: "custom",
						input: family,
						path: [family],
						message: NAME_ERROR,
					});
				}
			}
		}),
	desktop: z.object({
		iconSize: size(512),
		iconFontSize: size(512),
		backgroundImage,
		backgroundColor: color,
		backgroundSize: z.union([z.number().nonnegative().max(10000), cssKeyword]),
		backgroundRepeat: cssKeyword,
		backgroundPosition: z.union([
			z.number().min(-10000).max(10000),
			cssKeyword,
		]),
	}),
	sound: z.object({
		pack: soundPack,
		disabled: z.array(z.string().max(128)).max(256),
	}),
}) satisfies z.ZodType<ClassicyTheme>;

// Compile-time guard, in the other direction from `satisfies` above: every
// ClassicyTheme must be expressible by the schema, so adding a field to the
// type without the schema (or vice versa) fails the type check.
type AssertTrue<T extends true> = T;
export type ClassicyThemeSchemaMatchesType = AssertTrue<
	ClassicyTheme extends z.output<typeof ClassicyThemeSchema> ? true : false
>;

/** `format` tag of a theme file. */
export const CLASSICY_THEME_FILE_FORMAT = "classicy-theme";
/** Current (and only) theme file version. */
export const CLASSICY_THEME_FILE_VERSION = 1;

/**
 * A saved theme file: `{ format: "classicy-theme", version: 1, theme }`.
 * The envelope lets the format change later without guessing at old files.
 */
export const ClassicyThemeFileSchema = z.object({
	format: z.literal(CLASSICY_THEME_FILE_FORMAT),
	version: z.literal(CLASSICY_THEME_FILE_VERSION),
	theme: ClassicyThemeSchema,
});

export type ClassicyThemeFile = z.output<typeof ClassicyThemeFileSchema>;

import { z } from "zod";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicySounds } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds";
import { classicyWallpaperFilename } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

/**
 * Runtime schema for `ClassicyTheme`, used wherever a theme arrives from
 * outside the build: an imported theme file, or a `ClassicyDesktopImportTheme`
 * payload.
 *
 * Unknown keys are tolerated and STRIPPED (zod's default object behaviour),
 * so a file written by a newer build that adds an optional field still loads
 * here, but nothing undeclared ever reaches the store. Types are strict.
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

const soundName = z
	.string()
	.refine((name) => Object.hasOwn(ClassicySounds, name), {
		error: `must be a known sound theme (${Object.keys(ClassicySounds).join(", ")})`,
	});

export const ClassicyThemeSchema = z.object({
	id: z.string().max(128),
	name: z.string().trim().min(1, "must not be empty").max(64),
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
	measurements: z.object({
		window: z.object({
			borderSize: measurement,
			controlSize: measurement,
			paddingSize: measurement,
			scrollbarSize: measurement,
		}),
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
		name: soundName,
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

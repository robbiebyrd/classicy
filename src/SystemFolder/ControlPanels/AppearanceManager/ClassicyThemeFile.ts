import type { z } from "zod";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { slugifyClassicyThemeName } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	CLASSICY_THEME_FILE_FORMAT,
	CLASSICY_THEME_FILE_VERSION,
	type ClassicyThemeFile,
	ClassicyThemeSchema,
	isSafeClassicyThemeBackgroundImage,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import {
	classicyWallpaperFilename,
	resolveWallpaper,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

/**
 * Saving a theme to a `.classicy-theme.json` file and loading one back.
 *
 * File format (see `ClassicyThemeFileSchema`):
 *
 *     { "format": "classicy-theme", "version": 1, "theme": { …ClassicyTheme } }
 *
 * Loading also accepts a bare theme object (no envelope) — the shape of an
 * entry in `themes.json` or of `JSON.stringify(activeTheme)` — so themes
 * written by hand or copied out of the store load without wrapping.
 *
 * Wallpapers are written as their bundled filename (`"azul_dark.png"`): the
 * URL a build resolves a wallpaper to (a dev-server path, an inlined `data:`
 * URI) only works in that build. Loading resolves the filename back.
 */

export type ClassicyThemeParseResult =
	| { ok: true; theme: ClassicyTheme }
	| { ok: false; error: string };

/** Theme files are a few KB; anything far larger is not one. */
const MAX_THEME_FILE_LENGTH = 256 * 1024;
const MAX_REPORTED_ISSUES = 3;

/**
 * The portable form of a `backgroundImage`: a bundled wallpaper's filename,
 * an http(s) URL kept as-is, or "" (no image) for anything else — a custom
 * `data:`/`blob:` URL, or a relative path that only means something on the
 * host it was set on.
 */
export const portableClassicyThemeBackground = (value: string): string => {
	const filename = classicyWallpaperFilename(value);
	if (filename) return filename;
	return isSafeClassicyThemeBackgroundImage(value) ? value : "";
};

/** The loadable form of a validated `backgroundImage`: bundled wallpapers
 * resolve to this build's URL; http(s) URLs pass through. */
const loadableClassicyThemeBackground = (value: string): string => {
	const filename = classicyWallpaperFilename(value);
	return filename ? resolveWallpaper(filename) : value;
};

/** Serializes `theme` as a theme file (tab-indented JSON, trailing newline). */
export const exportClassicyTheme = (theme: ClassicyTheme): string => {
	const portable: ClassicyTheme = {
		...theme,
		desktop: {
			...theme.desktop,
			backgroundImage: portableClassicyThemeBackground(
				theme.desktop.backgroundImage,
			),
		},
	};
	// Strip anything the schema does not declare; a theme that somehow fails
	// it is written as-is and caught by downloadClassicyTheme's round trip.
	const parsed = ClassicyThemeSchema.safeParse(portable);
	const file: ClassicyThemeFile = {
		format: CLASSICY_THEME_FILE_FORMAT,
		version: CLASSICY_THEME_FILE_VERSION,
		theme: parsed.success ? parsed.data : portable,
	};
	return `${JSON.stringify(file, null, "\t")}\n`;
};

/** `"<theme-name>.classicy-theme.json"`, e.g. `french-blue.classicy-theme.json`. */
export const classicyThemeFileName = (theme: Pick<ClassicyTheme, "name">) =>
	`${slugifyClassicyThemeName(theme.name) || "theme"}.classicy-theme.json`;

const describeIssues = (issues: z.core.$ZodIssue[]): string => {
	const listed = issues
		.slice(0, MAX_REPORTED_ISSUES)
		.map((issue) => {
			const path = issue.path.map(String).join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("; ");
	const more = issues.length - MAX_REPORTED_ISSUES;
	return more > 0
		? `${listed} (and ${more} more problem${more === 1 ? "" : "s"})`
		: listed;
};

/**
 * Validates an untrusted theme object and makes it loadable: unknown keys
 * stripped, the wallpaper resolved for this build. Used for both file imports
 * and `ClassicyDesktopImportTheme` payloads. Identity (id/name) is left alone —
 * see `assignImportedClassicyThemeIdentity`.
 */
export const readClassicyTheme = (value: unknown): ClassicyThemeParseResult => {
	const parsed = ClassicyThemeSchema.safeParse(value);
	if (!parsed.success) {
		return {
			ok: false,
			error: `This theme has invalid settings: ${describeIssues(parsed.error.issues)}.`,
		};
	}
	const theme = parsed.data;
	theme.desktop.backgroundImage = loadableClassicyThemeBackground(
		theme.desktop.backgroundImage,
	);
	return { ok: true, theme };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Parses the text of a theme file. Returns the validated, loadable theme or a
 * human-readable reason it cannot be loaded.
 */
export const parseClassicyThemeFile = (
	text: string,
): ClassicyThemeParseResult => {
	if (text.length > MAX_THEME_FILE_LENGTH) {
		return { ok: false, error: "This file is too large to be a theme." };
	}
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { ok: false, error: "This file is not valid JSON." };
	}
	if (!isRecord(data)) {
		return { ok: false, error: "This file does not contain a theme." };
	}
	if (!("format" in data)) {
		// A bare theme object, without the file envelope.
		return readClassicyTheme(data);
	}
	if (data.format !== CLASSICY_THEME_FILE_FORMAT) {
		return { ok: false, error: "This file is not a Classicy theme file." };
	}
	if (typeof data.version !== "number") {
		return { ok: false, error: "This theme file has no format version." };
	}
	if (data.version > CLASSICY_THEME_FILE_VERSION) {
		return {
			ok: false,
			error: `This theme file was saved by a newer version of Classicy (format version ${data.version}).`,
		};
	}
	if (data.version !== CLASSICY_THEME_FILE_VERSION) {
		return {
			ok: false,
			error: `This theme file has an unsupported format version (${data.version}).`,
		};
	}
	if (!isRecord(data.theme)) {
		return { ok: false, error: "This theme file does not contain a theme." };
	}
	return readClassicyTheme(data.theme);
};

/**
 * Downloads `theme` as `<theme-name>.classicy-theme.json`. The file is checked
 * by loading it back first — exactly what a later import will see — so a
 * theme that could not be re-imported is never written.
 */
export const downloadClassicyTheme = (
	theme: ClassicyTheme,
): { ok: true } | { ok: false; error: string } => {
	const json = exportClassicyTheme(theme);
	const check = parseClassicyThemeFile(json);
	if (!check.ok) return check;

	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = classicyThemeFileName(theme);
	anchor.click();
	URL.revokeObjectURL(url);
	return { ok: true };
};

import type { z } from "zod";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
// The store-free registry, never ClassicyAppearancePackage.ts: the desktop
// reducer imports this module, and a path from it to the store would evaluate
// the store before its default state.
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	classicyWallpaperFilename,
	classicyWallpaperReferenceFor,
	portableClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { slugifyClassicyThemeName } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	classicyThemeColorFamilyDefaults,
	withDefaultThemeColorFamilies,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorFamilies";
import {
	type ClassicyThemeWithPartialMetrics,
	classicyThemeMeasurementDefaults,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	CLASSICY_THEME_FILE_FORMAT,
	CLASSICY_THEME_FILE_VERSION,
	type ClassicyThemeFile,
	ClassicyThemeSchema,
	isSafeClassicyThemeBackgroundImage,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";

/**
 * Saving a theme to a `.classicy-theme.json` file and loading one back.
 *
 * File format (see `ClassicyThemeFileSchema`):
 *
 *     { "format": "classicy-theme", "version": 1, "theme": { …ClassicyTheme } }
 *
 * A theme names its sound pack as `sound: { pack, disabled }`; the pack must be
 * registered (`registerClassicySoundPack`) when the file is loaded. Likewise
 * its Appearance Package (`package`, "platinum" when absent) must be
 * registered (`registerClassicyAppearancePackage`), Platinum included.
 *
 * Loading also accepts a bare theme object (no envelope) — the shape of a
 * preset in `platinum.json` or of `JSON.stringify(activeTheme)` — so themes
 * written by hand or copied out of the store load without wrapping.
 *
 * Wallpapers are written as their registered filename (`"azul_dark.png"`):
 * the URL a build resolves a wallpaper to (a dev-server path, an inlined
 * `data:` URI) only works in that build. Another package's wallpaper is
 * written `"<package>|<file>"` (`classicyWallpaperReferenceFor`), so the
 * file names the same wallpaper on any host. Loading keeps that reference,
 * pinning a bare filename the theme's package does not register to the
 * package that does, as every theme does; `getThemeVars` resolves it through
 * the asset registry.
 */

export type ClassicyThemeParseResult =
	| { ok: true; theme: ClassicyTheme }
	| { ok: false; error: string };

/** The longest theme file text `parseClassicyThemeFile` reads, in UTF-16
 * code units: theme files are a few KB; anything far larger is not one. */
export const CLASSICY_THEME_FILE_MAX_LENGTH = 256 * 1024;
const MAX_REPORTED_ISSUES = 3;

/**
 * The portable form of a `backgroundImage`: a registered wallpaper's filename
 * (for a theme of `packageId`, its reference: the filename for the package's
 * own, `"<package>|<file>"` for another's), an http(s) URL kept as-is, or ""
 * (no image) for anything else — a custom `data:`/`blob:` URL, or a relative
 * path that only means something on the host it was set on.
 */
export const portableClassicyThemeBackground = (
	value: string,
	packageId?: string,
): string => {
	const reference =
		packageId === undefined
			? classicyWallpaperFilename(value)
			: classicyWallpaperReferenceFor(value, packageId);
	if (reference) return reference;
	return isSafeClassicyThemeBackgroundImage(value) ? value : "";
};

/**
 * True when themes of `packageId` can be shown: the package is registered.
 * The default package gets no special case: the core's fallback package
 * holds only the core theme, never a package's look.
 */
const isClassicyAppearancePackageInstalled = (packageId: string): boolean =>
	getClassicyAppearancePackage(packageId) !== undefined;

/** The stored form of a validated, imported `backgroundImage`: a registered
 * wallpaper (its filename, `<package>|<file>` or this build's URL for it) as
 * the reference that pins it for a theme of `packageId`; http(s) URLs as
 * they are. */
const importableClassicyThemeBackground = (
	value: string,
	packageId: string,
): string => classicyWallpaperReferenceFor(value, packageId) ?? value;

/**
 * A host-loaded theme's color families completed from its package's
 * (`withDefaultThemeColorFamilies`), before validation: only when its
 * `color` is an object, so a malformed theme reaches the schema as it came.
 */
const completeLoadedColorFamilies = <T>(value: T, packageId: string): T => {
	const color = (value as { color?: unknown }).color;
	return isRecord(color)
		? (withDefaultThemeColorFamilies(
				value as unknown as Pick<ClassicyTheme, "color">,
				classicyThemeColorFamilyDefaults(packageId),
			) as unknown as T)
		: value;
};

/**
 * The theme file of `stored`: the envelope around the theme, completed first
 * (H-R17: a stored theme carries only the package-family values,
 * measurements and package colors, it changed, and the file carries them
 * all), its wallpaper written portably.
 */
const classicyThemeFileOf = (stored: ClassicyTheme): ClassicyThemeFile => {
	const theme = withDefaultThemeColorFamilies(
		withDefaultThemeMetrics(
			stored,
			classicyThemeMeasurementDefaults(stored.package),
		),
		classicyThemeColorFamilyDefaults(stored.package),
	);
	const portable: ClassicyTheme = {
		...theme,
		desktop: {
			...theme.desktop,
			backgroundImage: portableClassicyThemeBackground(
				theme.desktop.backgroundImage,
				theme.package,
			),
		},
	};
	// Strip anything the schema does not declare; a theme that somehow fails
	// it is written as-is and caught by the writers' round trips
	// (downloadClassicyTheme, createClassicyThemeLink).
	const parsed = ClassicyThemeSchema.safeParse(portable);
	return {
		format: CLASSICY_THEME_FILE_FORMAT,
		version: CLASSICY_THEME_FILE_VERSION,
		theme: parsed.success ? parsed.data : portable,
	};
};

/**
 * Serializes `theme` as a theme file (tab-indented JSON, trailing newline).
 * The theme is completed first (H-R17): a stored theme carries only the
 * package-family values (measurements and package colors) it changed, and
 * the file carries them all.
 */
export const exportClassicyTheme = (stored: ClassicyTheme): string =>
	`${JSON.stringify(classicyThemeFileOf(stored), null, "\t")}\n`;

/**
 * The same theme file as `exportClassicyTheme`, as compact JSON (no
 * indentation, no trailing newline): what a theme link carries
 * (`createClassicyThemeLink`).
 */
export const compactClassicyThemeFile = (stored: ClassicyTheme): string =>
	JSON.stringify(classicyThemeFileOf(stored));

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
 * stripped, a registered wallpaper held by its filename, or pinned as
 * `<package>|<file>` when it is another package's
 * (`importableClassicyThemeBackground`). Used for both file imports
 * and `ClassicyDesktopImportTheme` payloads. A theme for an Appearance Package
 * that is not installed is refused. Identity (id/name) is left alone — see
 * `assignImportedClassicyThemeIdentity`.
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
	if (!isClassicyAppearancePackageInstalled(theme.package)) {
		return {
			ok: false,
			error: `This theme needs the "${theme.package}" appearance package, which is not installed.`,
		};
	}
	theme.desktop.backgroundImage = importableClassicyThemeBackground(
		theme.desktop.backgroundImage,
		theme.package,
	);
	return { ok: true, theme };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** An entry `readClassicyLoadedThemes` refused: its position, its id (when
 * it has a string one) and the first problem found. */
export type ClassicyDroppedTheme = {
	index: number;
	id: string | undefined;
	issue: string;
};

/**
 * Validates the themes a host hands to `ClassicyDesktopLoadThemes`, each
 * against `ClassicyThemeSchema` exactly as an import is (unknown keys
 * stripped, `package` defaulted, a registered wallpaper held by its filename,
 * or as `<package>|<file>` where its filename would name another's, though
 * never pinned as an import's is). A theme written before the metric groups
 * existed is completed from its
 * package's defaults first, as before. Unlike an import, a theme for an
 * Appearance Package that is not registered (yet) is kept: a host may load
 * its themes before it registers the package. Invalid entries are left out
 * and reported, so one bad theme never costs the host the rest. The input is
 * never mutated.
 */
export const readClassicyLoadedThemes = (
	values: readonly unknown[],
): { themes: ClassicyTheme[]; dropped: ClassicyDroppedTheme[] } => {
	const themes: ClassicyTheme[] = [];
	const dropped: ClassicyDroppedTheme[] = [];
	values.forEach((value, index) => {
		if (!isRecord(value)) {
			dropped.push({ index, id: undefined, issue: "not a theme object" });
			return;
		}
		const id = typeof value.id === "string" ? value.id : undefined;
		const packageId =
			typeof value.package === "string"
				? value.package
				: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;
		const parsed = ClassicyThemeSchema.safeParse(
			// Unvalidated until the parse: the completion only reads
			// `measurements`, and copies anything it does not recognize.
			completeLoadedColorFamilies(
				withDefaultThemeMetrics(
					value as unknown as ClassicyThemeWithPartialMetrics,
					classicyThemeMeasurementDefaults(packageId),
				),
				packageId,
			),
		);
		if (!parsed.success) {
			dropped.push({
				index,
				id,
				issue: describeIssues(parsed.error.issues.slice(0, 1)),
			});
			return;
		}
		const theme = parsed.data;
		// Stored as every theme is (`portableClassicyWallpaper`), never pinned
		// as an import is: the theme's package may not have registered its
		// wallpapers yet, and a bare filename resolves in it once it does.
		theme.desktop.backgroundImage = portableClassicyWallpaper(
			theme.desktop.backgroundImage,
			theme.package,
		);
		themes.push(theme);
	});
	return { themes, dropped };
};

/** Where a theme file's text came from, which names it in the errors. */
export type ClassicyThemeFileSource = "file" | "link";

const THEME_FILE_ERRORS: Record<
	ClassicyThemeFileSource,
	{
		tooLarge: string;
		notJson: string;
		noObject: string;
		notThemeFile: string;
		subject: string;
		saved: string;
	}
> = {
	file: {
		tooLarge: "This file is too large to be a theme.",
		notJson: "This file is not valid JSON.",
		noObject: "This file does not contain a theme.",
		notThemeFile: "This file is not a Classicy theme file.",
		subject: "This theme file",
		saved: "saved",
	},
	link: {
		tooLarge: "This theme link holds more than a theme.",
		notJson: "This link is damaged: it does not hold a theme.",
		noObject: "This link is damaged: it does not hold a theme.",
		notThemeFile: "This link is damaged: it does not hold a theme.",
		subject: "This theme link",
		saved: "made",
	},
};

/**
 * Parses the text of a theme file. Returns the validated, loadable theme or a
 * human-readable reason it cannot be loaded. `source` names where the text
 * came from in those reasons: a file (the default) or a theme link's
 * decoded payload (`readClassicyThemeLink`).
 */
export const parseClassicyThemeFile = (
	text: string,
	source: ClassicyThemeFileSource = "file",
): ClassicyThemeParseResult => {
	// Anything but "link" reads as a file, for a caller outside TypeScript.
	const errors = THEME_FILE_ERRORS[source === "link" ? "link" : "file"];
	if (text.length > CLASSICY_THEME_FILE_MAX_LENGTH) {
		return { ok: false, error: errors.tooLarge };
	}
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { ok: false, error: errors.notJson };
	}
	if (!isRecord(data)) {
		return { ok: false, error: errors.noObject };
	}
	if (!("format" in data)) {
		// A bare theme object, without the file envelope.
		return readClassicyTheme(data);
	}
	if (data.format !== CLASSICY_THEME_FILE_FORMAT) {
		return { ok: false, error: errors.notThemeFile };
	}
	if (typeof data.version !== "number") {
		return { ok: false, error: `${errors.subject} has no format version.` };
	}
	if (data.version > CLASSICY_THEME_FILE_VERSION) {
		return {
			ok: false,
			error: `${errors.subject} was ${errors.saved} by a newer version of Classicy (format version ${data.version}).`,
		};
	}
	if (data.version !== CLASSICY_THEME_FILE_VERSION) {
		return {
			ok: false,
			error: `${errors.subject} has an unsupported format version (${data.version}).`,
		};
	}
	if (!isRecord(data.theme)) {
		return { ok: false, error: `${errors.subject} does not contain a theme.` };
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

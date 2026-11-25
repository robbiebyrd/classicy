import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// The file system's naming rules, by the active package's layout
// (`layout.files.names`). Store-free, like useClassicyAppearanceLayout.ts,
// so reducers, the file-move wrappers and components alike may call them.

/**
 * The characters a Windows file name may not hold (WIG Ch.10 "File Naming
 * Conventions", p.210, lists `\ / : * ? < > |`; Windows 98 as shipped
 * refused the quotation mark too, shell32.dll: "A filename cannot contain
 * any of the following characters: \ / : * ? " < > |").
 */
export const CLASSICY_WINDOWS_FORBIDDEN_FILE_NAME_CHARACTERS: readonly string[] =
	Object.freeze(["\\", "/", ":", "*", "?", '"', "<", ">", "|"]);

/** The one character a Mac OS name may not hold: HFS's path separator. */
const MAC_FORBIDDEN_FILE_NAME_CHARACTERS: readonly string[] = Object.freeze([
	":",
]);

/**
 * Windows 98's refusal of such a name (shell32.dll's string, its line
 * break and the nine characters as the message box shows them).
 */
export const CLASSICY_WINDOWS_FILE_NAME_REFUSAL =
	'A filename cannot contain any of the following characters:\n\\ / : * ? " < > |';

/** The caption of Windows 98's message box refusing a name (shell32.dll's "Rename"). */
export const CLASSICY_WINDOWS_RENAME_TITLE = "Rename";

/** Whether `layout` writes Windows' names (`files.names` `"windows"`). */
export const classicyWindowsFileNames = (
	layout: Pick<ClassicyAppearanceLayout, "files">,
): boolean => layout.files?.names === "windows";

/**
 * The characters a name may not hold under `packageId`'s package (the
 * active one when omitted): Windows' nine under `files.names` `"windows"`,
 * else `:` alone, as before.
 */
export const classicyForbiddenFileNameCharacters = (
	packageId?: string,
): readonly string[] =>
	classicyWindowsFileNames(getClassicyAppearanceLayout(packageId))
		? CLASSICY_WINDOWS_FORBIDDEN_FILE_NAME_CHARACTERS
		: MAC_FORBIDDEN_FILE_NAME_CHARACTERS;

/**
 * Whether `name` holds none of the characters `packageId`'s package (the
 * active one when omitted) refuses: under `layout.files.names` `"windows"`
 * none of `\ / : * ? " < > |` (WIG Ch.10 p.210; Windows 98 as shipped, the
 * quotation mark included), else no `:`, as Mac OS 8 refused. Emptiness
 * and the `_` metadata prefix are the callers' own checks.
 */
export const isClassicyValidFileName = (
	name: string,
	packageId?: string,
): boolean =>
	!classicyForbiddenFileNameCharacters(packageId).some((c) => name.includes(c));

/**
 * What a refused name's message reads under `packageId`'s package (the
 * active one when omitted): Windows 98's under `files.names` `"windows"`,
 * else undefined (the caller's own Mac text).
 */
export const classicyFileNameRefusal = (
	packageId?: string,
): string | undefined =>
	classicyWindowsFileNames(getClassicyAppearanceLayout(packageId))
		? CLASSICY_WINDOWS_FILE_NAME_REFUSAL
		: undefined;

/** Options for `classicyFirstFreeName`. */
export type ClassicyFirstFreeNameOptions = {
	/** An extension, with or without its dot: `"txt"` names "New Text Document.txt". */
	extension?: string;
};

const nameCandidate = (base: string, n: number, extension?: string) => {
	const suffix = extension ? `.${extension.replace(/^\./, "")}` : "";
	return n === 1 ? `${base}${suffix}` : `${base} (${n})${suffix}`;
};

/**
 * The first of `base`, `base (2)`, `base (3)`… (each with `extension`, when
 * given, after the number) that no name in `taken` is, compared without
 * case as the file system compares them: Windows 98's numbering, "New
 * Folder (2)" (WIG Ch.10 p.210 writes "Document 2"; the OS as shipped put
 * the number in parentheses).
 */
export const classicyFirstFreeNameAmong = (
	taken: Iterable<string>,
	base: string,
	{ extension }: ClassicyFirstFreeNameOptions = {},
): string => {
	const folded = new Set<string>();
	for (const name of taken) folded.add(name.toLowerCase());
	for (let n = 1; ; n++) {
		const candidate = nameCandidate(base, n, extension);
		if (!folded.has(candidate.toLowerCase())) return candidate;
	}
};

/**
 * The first free name in `folder` of `fs` for `base` (see
 * `classicyFirstFreeNameAmong`): "New Folder", then "New Folder (2)"…,
 * looked up through `fs.resolve`, which finds a name in any case and an
 * invisible entry too.
 */
export const classicyFirstFreeName = (
	fs: ClassicyFileSystem,
	folder: string,
	base: string,
	{ extension }: ClassicyFirstFreeNameOptions = {},
): string => {
	for (let n = 1; ; n++) {
		const candidate = nameCandidate(base, n, extension);
		if (!fs.resolve(`${folder}${fs.separator}${candidate}`)) return candidate;
	}
};

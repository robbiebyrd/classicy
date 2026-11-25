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

/** The Finder's id: a type only it opens is no registered type. */
const FINDER_APP_ID = "Finder.app";

/** The types no extension is ever hidden from: folders and drives. */
const NEVER_HIDDEN_TYPES: ReadonlySet<string> = new Set(["directory", "drive"]);

/**
 * What counts as an extension to hide: a final `.` and one to five ASCII
 * letters or digits, at least one a letter, after a name of its own
 * ("Read Me.txt", "BuckBunny.mov"), so "Version 1.2" and ".profile" keep
 * their whole text.
 */
const HIDEABLE_EXTENSION =
	/(?<=.)\.(?=[A-Za-z0-9]{0,4}[A-Za-z])[A-Za-z0-9]{1,5}$/;

/**
 * Whether `layout` hides registered types' extensions
 * (`files.extensions` `"hideRegistered"`) and the user has not turned it
 * off (Finder Preferences' "Hide file extensions for known file types",
 * `hideFileExtensions`, on unless false).
 */
export const classicyFileExtensionsHidden = (
	layout: Pick<ClassicyAppearanceLayout, "files">,
	hideFileExtensions: boolean = true,
): boolean =>
	layout.files?.extensions === "hideRegistered" && hideFileExtensions;

/**
 * Whether files of `type` are a registered type: one an application other
 * than the Finder opens (`fileTypeHandlers`, the kernel's handler map, as
 * `ClassicyAppRegisterFileTypes` and `ClassicyAppSetDefaultFileTypeHandler`
 * write it; WIG Ch.10 "Registering File Extensions", p.192).
 */
export const classicyFileTypeIsRegistered = (
	type: string | undefined,
	fileTypeHandlers: Readonly<Partial<Record<string, string>>> | undefined,
): boolean => {
	if (type === undefined || !fileTypeHandlers) return false;
	if (!Object.hasOwn(fileTypeHandlers, type)) return false;
	const handler = fileTypeHandlers[type];
	return typeof handler === "string" && handler !== FINDER_APP_ID;
};

/** Options for `classicyDisplayFileName` and `classicyHiddenFileExtension`. */
export type ClassicyDisplayFileNameOptions = {
	/**
	 * The kernel's handler map (`System.Manager.Applications.fileTypeHandlers`).
	 * Omitted, no type counts as registered, so every name shows whole.
	 */
	fileTypeHandlers?: Readonly<Partial<Record<string, string>>>;
	/**
	 * The user's Finder Preferences choice, "Hide file extensions for known
	 * file types" (Finder's `hideFileExtensions`). Defaults to true.
	 */
	hideFileExtensions?: boolean;
};

/**
 * The final extension of `name` with its dot (".txt"), or `""`, when `entry`
 * is a file (never a folder or a drive) of a registered type
 * (`classicyFileTypeIsRegistered`): the extension Windows hides. Pure; the
 * layout and the user's choice are `classicyHiddenFileExtension`'s.
 */
export const classicyRegisteredFileExtension = (
	name: string,
	entry: { _type?: string } | undefined,
	fileTypeHandlers: Readonly<Partial<Record<string, string>>> | undefined,
): string => {
	const type = entry?._type;
	if (type === undefined || NEVER_HIDDEN_TYPES.has(type)) return "";
	if (!classicyFileTypeIsRegistered(type, fileTypeHandlers)) return "";
	return HIDEABLE_EXTENSION.exec(name)?.[0] ?? "";
};

/**
 * The extension `name` is shown without under `packageId`'s package (the
 * active one when omitted), with its dot (".txt"), or `""`: under
 * `layout.files.extensions` `"hideRegistered"` (WIG Ch.10 "System Naming
 * Conventions", p.210), the final extension of a file, never a folder or a
 * drive, whose type an application other than the Finder opens. A rename
 * edits the name without it and puts it back. Store-free.
 */
export const classicyHiddenFileExtension = (
	name: string,
	entry: { _type?: string } | undefined,
	packageId?: string,
	{
		fileTypeHandlers,
		hideFileExtensions = true,
	}: ClassicyDisplayFileNameOptions = {},
): string => {
	if (
		!classicyFileExtensionsHidden(
			getClassicyAppearanceLayout(packageId),
			hideFileExtensions,
		)
	)
		return "";
	return classicyRegisteredFileExtension(name, entry, fileTypeHandlers);
};

/**
 * `name` as `packageId`'s package (the active one when omitted) shows it:
 * without its extension where `classicyHiddenFileExtension` hides one, else
 * as stored. Store-free (the handler map and the user's choice come in
 * `options`); components use `useClassicyDisplayFileName`.
 */
export const classicyDisplayFileName = (
	name: string,
	entry: { _type?: string } | undefined,
	packageId?: string,
	options: ClassicyDisplayFileNameOptions = {},
): string =>
	name.slice(
		0,
		name.length -
			classicyHiddenFileExtension(name, entry, packageId, options).length,
	);

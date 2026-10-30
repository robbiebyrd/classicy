import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Which static entries of a derived folder (Applications, Extensions,
 * Control Strip Modules) give way to an app or module of the same name, and
 * which keep their name (story 0096). Only placeholders give way; any other
 * entry, a user's file above all, is reserved, and the app is listed beside
 * it as "<own name> (<id>)" (K-R4).
 */

/** The Applications entries Platinum's default tree seeded as invisible
 *  stand-ins for its apps, before placeholders were marked. */
const LEGACY_APPLICATIONS_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
	"SimpleText",
	"Calculator",
]);

/** Every key and value those stand-ins had, and nothing else. */
const LEGACY_PLACEHOLDER_SHAPE: Readonly<Record<string, unknown>> = {
	_type: ClassicyFileSystemEntryFileType.File,
	_mimeType: "text/plain",
	_data: "File Contents",
	_invisible: true,
};

/**
 * Whether `entry`, at `name` in Applications, is a SimpleText or Calculator
 * stand-in that a build before `_placeholder` stored. It must match exactly:
 * the name, and exactly the four keys and values the default tree gave it.
 * No user file can: `writeFile` always adds `_createdOn` and writes a
 * `text_file`, `mkDir` makes folders, and moves into the read-only
 * Applications folder are refused. So only a host writing that exact entry
 * on purpose (a default tree, a `load`, a seed migration) could make one.
 */
const isLegacyApplicationsPlaceholder = (
	name: string,
	entry: ClassicyFileSystemEntry,
): boolean => {
	if (!LEGACY_APPLICATIONS_PLACEHOLDER_NAMES.has(name)) return false;
	const keys = Object.keys(entry);
	const shapeKeys = Object.keys(LEGACY_PLACEHOLDER_SHAPE);
	return (
		keys.length === shapeKeys.length &&
		shapeKeys.every(
			(key) =>
				Object.hasOwn(entry, key) &&
				entry[key] === LEGACY_PLACEHOLDER_SHAPE[key],
		)
	);
};

/**
 * The names of `folder`'s static entries that an app or module may not
 * take: every child (metadata keys aside) except a placeholder, which is an
 * entry marked `_placeholder: true` or, with `legacyApplicationsPlaceholders`
 * (the Applications folder), an unmarked SimpleText or Calculator stand-in
 * an older build stored.
 */
export const classicyDerivedFolderReservedNames = (
	folder: ClassicyFileSystemEntry | undefined,
	{ legacyApplicationsPlaceholders = false } = {},
): string[] =>
	folder
		? Object.keys(folder).filter((name) => {
				if (name.startsWith("_")) return false;
				const entry = folder[name];
				if (typeof entry !== "object" || entry === null) return true;
				if (entry._placeholder === true) return false;
				return !(
					legacyApplicationsPlaceholders &&
					isLegacyApplicationsPlaceholder(name, entry)
				);
			})
		: [];

/**
 * `name` itself when `isTaken` refuses it, else `name` numbered the way the
 * Trash renumbers a clash ("<name> 2", "<name> 3", …): the suffix form
 * "<own name> (<id>)" never replaces a static entry that happens to hold it.
 */
export const classicyFreeDerivedEntryName = (
	name: string,
	isTaken: (candidate: string) => boolean,
): string => {
	if (!isTaken(name)) return name;
	let n = 2;
	while (isTaken(`${name} ${n}`)) n++;
	return `${name} ${n}`;
};

import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Which static entries of a derived folder (Applications, Extensions,
 * Control Strip Modules) give way to an app or module of the same name, and
 * which keep their name (story 0096). Only an untouched placeholder gives
 * way; any other entry, a user's file above all, is reserved, and the app is
 * listed beside it as "<own name> (<id>)" (K-R4).
 */

/**
 * The stand-in Platinum seeds in Applications for SimpleText and Calculator,
 * every key and value of it. DefaultFSContent holds copies, never this object,
 * and a live tree is seeded from a deep copy of the defaults (story 0098), so
 * an edit to a live stand-in can never change what "as seeded" means.
 */
export const CLASSICY_SEEDED_PLACEHOLDER: Readonly<ClassicyFileSystemEntry> =
	Object.freeze({
		_type: ClassicyFileSystemEntryFileType.File,
		_mimeType: "text/plain",
		_data: "File Contents",
		_invisible: true,
		_placeholder: true,
	});

/** The same stand-in as builds before `_placeholder` stored it. */
const LEGACY_PLACEHOLDER_SHAPE: Readonly<Record<string, unknown>> =
	Object.freeze(
		Object.fromEntries(
			Object.entries(CLASSICY_SEEDED_PLACEHOLDER).filter(
				([key]) => key !== "_placeholder",
			),
		),
	);

/** The Applications entries those builds seeded it under. */
const LEGACY_APPLICATIONS_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
	"SimpleText",
	"Calculator",
]);

/** Whether `entry` has exactly `shape`'s own keys, each with the same value. */
const hasExactShape = (
	entry: ClassicyFileSystemEntry,
	shape: Readonly<Record<string, unknown>>,
): boolean => {
	const shapeKeys = Object.keys(shape);
	return (
		Object.keys(entry).length === shapeKeys.length &&
		shapeKeys.every(
			(key) => Object.hasOwn(entry, key) && entry[key] === shape[key],
		)
	);
};

/**
 * Whether `entry`, at `name`, is a placeholder that still gives way:
 *
 * - A marked entry (`_placeholder: true`) only while it is exactly as seeded
 *   (K-R11): no `_modifiedOn`, and `_data` and every other key equal to
 *   `CLASSICY_SEEDED_PLACEHOLDER`'s. Once a user edits it (SimpleText saves
 *   through `setMetadata({ _data, _modifiedOn })`, which keeps the marker),
 *   it is the user's file and wins like any other.
 * - With `legacyApplicationsPlaceholders` (the Applications folder), an
 *   unmarked SimpleText or Calculator stand-in that a build before
 *   `_placeholder` stored: that name, and exactly the seeded keys and values
 *   less the marker.
 *
 * No file a user makes has either shape. `writeFile` always adds
 * `_createdOn` and writes a `text_file`; the save dialog passes `_type` and
 * `_icon`; a SimpleText save adds `_modifiedOn`; the Trash adds its
 * `_trashed*` keys (and Restore removes them); no library path sets
 * `_invisible` on a file. A move keeps an entry's own keys, so it never turns
 * a user's file into either shape, whether or not Applications is read-only
 * at the time. Only a host writing that exact entry on purpose (a default
 * tree, a `load`, a seed migration) could.
 */
const isPlaceholder = (
	name: string,
	entry: ClassicyFileSystemEntry,
	legacyApplicationsPlaceholders: boolean,
): boolean => {
	if (entry._placeholder === true) {
		return hasExactShape(entry, CLASSICY_SEEDED_PLACEHOLDER);
	}
	return (
		legacyApplicationsPlaceholders &&
		LEGACY_APPLICATIONS_PLACEHOLDER_NAMES.has(name) &&
		hasExactShape(entry, LEGACY_PLACEHOLDER_SHAPE)
	);
};

/**
 * The names of `folder`'s static entries that an app or module may not
 * take: every child (metadata keys aside) except a placeholder that still
 * gives way (see `isPlaceholder`). A child that is not an entry object is
 * reserved too.
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
				return !isPlaceholder(name, entry, legacyApplicationsPlaceholders);
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

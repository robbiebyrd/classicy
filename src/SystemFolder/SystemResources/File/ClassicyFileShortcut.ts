import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// File shortcuts: Windows' shortcut to a file, a folder or a drive (WIG
// Ch.10 "Registering Commands", pp.200-201, and "System Naming
// Conventions", p.210; Windows 98 SE's Create Shortcut, its names and its
// message boxes as shell32.dll holds them). An entry of `_type`
// `file_shortcut` names its target in `_targetPath`; Finder opens the
// target in its place. Explorer's Create Shortcut, which makes them, is
// offered under `layout.finder.commands` "windows"; opening one works under
// every package, since a shortcut made under Windows 98 stays in the tree.

/** The caption of Windows 98's shortcut message boxes (shell32.dll's "Shortcut"). */
export const CLASSICY_SHORTCUT_TITLE = "Shortcut";

/** The caption of Windows 98's box for a shortcut whose target is gone (shell32.dll). */
export const CLASSICY_SHORTCUT_PROBLEM_TITLE = "Problem with Shortcut";

/**
 * Windows 98's question when Create Shortcut's item lies where no shortcut
 * may be made, a drive at the root of the tree or an item of a derived or
 * read-only folder (shell32.dll's string, its line break kept): Yes makes
 * it on the desktop.
 */
export const CLASSICY_SHORTCUT_DESKTOP_OFFER =
	"Windows cannot create a shortcut here.\nDo you want the shortcut to be placed on the desktop instead?";

/**
 * Windows 98 SE's text for a shortcut whose target cannot be found
 * (shell32.dll: "The file or folder '%1' that this shortcut refers to
 * cannot be found."), naming the target's path.
 */
export const classicyShortcutMissingMessage = (targetPath: string): string =>
	`The file or folder '${targetPath}' that this shortcut refers to cannot be found.`;

/**
 * The core's own text for a shortcut whose original is gone, as a URL
 * shortcut with no URL already says it: what packages without Explorer's
 * commands show.
 */
export const CLASSICY_SHORTCUT_MISSING_ORIGINAL =
	"The original item for this shortcut could not be found.";

/**
 * The message box for a shortcut whose target cannot be found, under
 * `packageId`'s package (the active one when omitted): Windows 98 SE's
 * "Problem with Shortcut" under `layout.finder.commands` "windows", else
 * the core's own text.
 */
export const classicyShortcutProblem = (
	targetPath: string,
	packageId?: string,
): { title?: string; message: string } =>
	getClassicyAppearanceLayout(packageId).finder?.commands === "windows"
		? {
				title: CLASSICY_SHORTCUT_PROBLEM_TITLE,
				message: classicyShortcutMissingMessage(targetPath),
			}
		: { message: CLASSICY_SHORTCUT_MISSING_ORIGINAL };

/**
 * The `n`th name for a shortcut to `name`: "Shortcut to <name>", then
 * "Shortcut (2) to <name>", "Shortcut (3) to <name>"… (shell32.dll's
 * "Shortcut () to %s.lnk", the number in the parentheses; WIG Ch.10 p.210
 * writes "Shortcut to"; the hidden ".lnk" has no Classicy counterpart).
 */
export const classicyShortcutName = (name: string, n = 1): string =>
	n <= 1 ? `Shortcut to ${name}` : `Shortcut (${n}) to ${name}`;

/**
 * The first of `classicyShortcutName(name, 1)`, `(…, 2)`… free in `folder`
 * of `fs`, looked up through `fs.resolve`, which finds a name in any case
 * and an invisible entry too.
 */
export const classicyFirstFreeShortcutName = (
	fs: ClassicyFileSystem,
	folder: string,
	name: string,
): string => {
	for (let n = 1; ; n++) {
		const candidate = classicyShortcutName(name, n);
		if (!fs.resolve(`${folder}${fs.separator}${candidate}`)) return candidate;
	}
};

/** Whether `entry` is a file shortcut (`_type` `file_shortcut`). */
export const isClassicyFileShortcut = (
	entry: Pick<ClassicyFileSystemEntryMetadata, "_type"> | undefined | null,
): boolean => entry?._type === ClassicyFileSystemEntryFileType.FileShortcut;

const baseName = (fs: ClassicyFileSystem, path: string): string =>
	path.split(fs.separator).pop() ?? path;

/** Options for `createClassicyFileShortcut`. */
export type ClassicyFileShortcutOptions = {
	/** Where to write it (default: `classicyFileShortcutPath` in the folder). */
	path?: string;
	/**
	 * The icon of the application `appId` as its code gives it (its record's
	 * `icon`), for a target a derived folder lists (the Applications and
	 * Extensions folders draw an app by the active package's display icon,
	 * which a stored shortcut must not keep).
	 */
	appIcon?: (appId: string) => string | undefined;
};

/**
 * The icon a new shortcut to `target` stores: for an entry a derived folder
 * lists for an application (`_derived`, `_creator`), the application's own
 * icon as its code gives it (`appIcon`), not the display icon the active
 * package draws it by; else the entry's own `_icon`, else the core's icon
 * for its type, which every icon surface draws as the active package's.
 */
const shortcutIconFor = (
	target: ClassicyFileSystemEntry,
	appIcon: ClassicyFileShortcutOptions["appIcon"],
): string => {
	const ownIcon =
		target._derived === true && typeof target._creator === "string"
			? appIcon?.(target._creator)
			: undefined;
	if (ownIcon) return ownIcon;
	return typeof target._icon === "string" && target._icon !== ""
		? target._icon
		: iconImageByType(target._type, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID);
};

/**
 * The metadata of a new shortcut to the entry `target` at `targetPath`:
 * its icon (`shortcutIconFor`) and its path. A shortcut to a shortcut is a
 * copy of that shortcut, pointing where it points, as Windows 98 makes no
 * shortcut to a shortcut (shell32.dll: "You cannot create a shortcut to
 * another shortcut. Either copy the shortcut…"). A shortcut to an
 * application's entry (`app_shortcut`, as the derived Applications folder
 * lists them) also names the application (`_creator`), so it still opens
 * it once the folder names the entry otherwise (its display name follows
 * the active package).
 */
const shortcutMetadataFor = (
	targetPath: string,
	target: ClassicyFileSystemEntry,
	appIcon: ClassicyFileShortcutOptions["appIcon"],
): Partial<ClassicyFileSystemEntryMetadata> => {
	if (isClassicyFileShortcut(target)) {
		return {
			_type: ClassicyFileSystemEntryFileType.FileShortcut,
			_targetPath: target._targetPath,
			...(typeof target._icon === "string" ? { _icon: target._icon } : {}),
			...(typeof target._creator === "string"
				? { _creator: target._creator }
				: {}),
		};
	}
	const icon = shortcutIconFor(target, appIcon);
	return {
		_type: ClassicyFileSystemEntryFileType.FileShortcut,
		_targetPath: targetPath,
		...(icon ? { _icon: icon } : {}),
		...(target._type === ClassicyFileSystemEntryFileType.AppShortcut &&
		typeof target._creator === "string"
			? { _creator: target._creator }
			: {}),
	};
};

/**
 * The path Create Shortcut gives a new shortcut to `targetPath` in
 * `folder`: "Shortcut to <name>", numbered on a clash
 * (`classicyFirstFreeShortcutName`).
 */
export const classicyFileShortcutPath = (
	fs: ClassicyFileSystem,
	targetPath: string,
	folder: string,
): string =>
	`${folder}${fs.separator}${classicyFirstFreeShortcutName(
		fs,
		folder,
		baseName(fs, targetPath),
	)}`;

/**
 * Writes a shortcut to the entry at `targetPath` in `folder` (journaled
 * and persisted, as any write; at `options.path`, else
 * `classicyFileShortcutPath`), and returns its path, or undefined when the
 * target is gone or the write was refused.
 */
export const createClassicyFileShortcut = (
	fs: ClassicyFileSystem,
	targetPath: string,
	folder: string,
	options: ClassicyFileShortcutOptions = {},
): string | undefined => {
	const target = fs.resolve(targetPath);
	if (!target) return undefined;
	const path = options.path ?? classicyFileShortcutPath(fs, targetPath, folder);
	if (
		!fs.writeFile(
			path,
			"",
			shortcutMetadataFor(targetPath, target, options.appIcon),
		)
	)
		return undefined;
	return fs.resolve(path) ? path : undefined;
};

/** A file shortcut's target, as `resolveClassicyFileShortcut` finds it. */
export type ClassicyFileShortcutTarget =
	| { found: true; path: string; entry: ClassicyFileSystemEntry }
	| { found: false; path: string };

/** How many shortcuts in a row `resolveClassicyFileShortcut` follows. */
const MAX_SHORTCUT_HOPS = 16;

/**
 * The entry the file shortcut `shortcut` opens: its `_targetPath` in `fs`,
 * following a target that is itself a file shortcut (a tree made elsewhere
 * may hold one; Create Shortcut copies a shortcut instead); `found: false`
 * with the path that is missing when the target is gone, or when the
 * shortcuts run in a circle or past sixteen.
 */
export const resolveClassicyFileShortcut = (
	fs: ClassicyFileSystem,
	shortcut: Pick<ClassicyFileSystemEntryMetadata, "_targetPath">,
): ClassicyFileShortcutTarget => {
	let path =
		typeof shortcut._targetPath === "string" ? shortcut._targetPath : "";
	const seen = new Set<string>();
	for (let hop = 0; hop < MAX_SHORTCUT_HOPS; hop++) {
		if (path === "" || seen.has(path)) return { found: false, path };
		seen.add(path);
		const entry = fs.resolve(path);
		if (!entry) return { found: false, path };
		if (!isClassicyFileShortcut(entry)) return { found: true, path, entry };
		path = typeof entry._targetPath === "string" ? entry._targetPath : "";
	}
	return { found: false, path };
};

import { useMemo } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	type ClassicyCreatableFileType,
	listClassicyCreatableFileTypes,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import type { ClassicyFileBrowserArrangeKey } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { classicyFirstFreeName } from "@/SystemFolder/SystemResources/File/ClassicyFileNames";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// Explorer's commands in Finder's menus and the desktop's, under
// `layout.finder.commands` "windows" (WIG Ch.1 "Understanding Users", p.8;
// Ch.5 "Creation Operations", p.69; Ch.10 "Supporting Creation",
// pp.199-200; Windows 98 SE's menus, read from shell32.dll): the pieces
// Finder's folder windows and `useClassicyDesktopCommands` share.

/** Whether the active package's Finder offers Explorer's commands. */
export const useClassicyWindowsFinderCommands = (): boolean =>
	useClassicyAppearanceLayout().finder?.commands === "windows";

/** What File ▸ New makes: a folder, or a registered document type. */
export type ClassicyNewItemKind =
	| { kind: "folder" }
	| { kind: "file"; type: ClassicyCreatableFileType };

/** Windows 98's base names: shell32.dll's "New Folder"; "New <Type Name>". */
const newItemBase = (what: ClassicyNewItemKind): string =>
	what.kind === "folder" ? "New Folder" : `New ${what.type.typeName}`;

/**
 * Whether New may make an item in `folder`: a folder or drive of the tree
 * that is not read-only, system or derived (the Applications, Extensions
 * and Control Strip Modules folders, the Trash).
 */
export const classicyCanMakeItemIn = (
	fs: ClassicyFileSystem,
	folder: string,
): boolean => {
	const entry = fs.resolve(folder);
	return (
		!!entry &&
		(entry._type === ClassicyFileSystemEntryFileType.Directory ||
			entry._type === ClassicyFileSystemEntryFileType.Drive) &&
		entry._readOnly !== true &&
		entry._system !== true &&
		entry._derived !== true &&
		entry._trashed !== true &&
		folder !== "Trash"
	);
};

/**
 * The path New gives a new item in `folder`: Windows 98's first free name,
 * "New Folder", "New Folder (2)"…, or "New Text Document.txt", "New Text
 * Document (2).txt"… (`classicyFirstFreeName`).
 */
export const classicyNewItemPath = (
	fs: ClassicyFileSystem,
	folder: string,
	what: ClassicyNewItemKind,
): string =>
	`${folder}${fs.separator}${classicyFirstFreeName(
		fs,
		folder,
		newItemBase(what),
		{
			extension: what.kind === "file" ? what.type.extension : undefined,
		},
	)}`;

/**
 * Makes the item New made at `path` (`classicyNewItemPath`): `fs.mkDir` for
 * a folder; for a document `fs.writeFile` with the type's `data` and
 * `fileType`. Returns whether the item is there now.
 */
export const makeClassicyNewItem = (
	fs: ClassicyFileSystem,
	path: string,
	what: ClassicyNewItemKind,
): boolean => {
	if (what.kind === "folder") fs.mkDir(path);
	else
		fs.writeFile(path, what.type.data ?? "", {
			_type: what.type.fileType as ClassicyFileSystemEntryMetadata["_type"],
		});
	return !!fs.resolve(path);
};

/**
 * The document types File ▸ New lists: the `creates` entries of the apps
 * mounted now (an app not mounted cannot open what it would make), sorted
 * by type name, as Explorer lists its ShellNew entries.
 */
export const useClassicyCreatableFileTypes =
	(): ClassicyCreatableFileType[] => {
		const mounted = useClassicyMountedApps();
		return useMemo(() => listClassicyCreatableFileTypes(mounted), [mounted]);
	};

/**
 * Each type's access key in the New submenu: the first letter of its name
 * not taken by Folder's F or an earlier type, in the case it is written
 * (shell32.dll's "&Folder"; the types', which Windows 98 read from the
 * registry, by their first free letter).
 */
export const classicyNewTypeAccessKeys = (
	typeNames: readonly string[],
): (string | undefined)[] => {
	const taken = new Set(["f"]);
	return typeNames.map((name) => {
		for (const ch of name) {
			const folded = ch.toLowerCase();
			if (!/[a-z0-9]/.test(folded) || taken.has(folded)) continue;
			taken.add(folded);
			return ch;
		}
		return undefined;
	});
};

type AccessKey = (key: string) => string | undefined;

/** Adds `accessKey` only when the package gives one (no new field else). */
const withKey = (ak: AccessKey, key: string) =>
	ak(key) !== undefined ? { accessKey: ak(key) } : {};

/**
 * File ▸ New ▸ (shell32.dll's "&New", access key w): Folder (F), a
 * separator, then each document type (`types`, sorted) by its first free
 * letter; `onNew` makes the chosen one. Disabled when `disabled` (a folder
 * New cannot make anything in).
 */
export const classicyNewMenuItem = (
	id: string,
	ak: AccessKey,
	types: readonly ClassicyCreatableFileType[],
	onNew: (what: ClassicyNewItemKind) => void,
	disabled = false,
): ClassicyMenuItem => {
	const keys = classicyNewTypeAccessKeys(types.map((t) => t.typeName));
	return {
		id: `${id}_new`,
		title: "New",
		...withKey(ak, "w"),
		disabled,
		menuChildren: [
			{
				id: `${id}_new_folder`,
				title: "Folder",
				...withKey(ak, "F"),
				onClickFunc: () => onNew({ kind: "folder" }),
			},
			...(types.length > 0
				? [
						{ id: "spacer" },
						...types.map((type, index) => {
							const key = keys[index];
							return {
								id: `${id}_new_${type.appId}_${type.fileType}`,
								title: type.typeName,
								...(key !== undefined ? withKey(ak, key) : {}),
								onClickFunc: () => onNew({ kind: "file", type }),
							};
						}),
					]
				: []),
		],
	};
};

/** Arrange Icons ▸'s orders, in Windows 98 SE's order, with their keys. */
const ARRANGE_ORDERS: readonly {
	key: ClassicyFileBrowserArrangeKey;
	title: string;
	accessKey: string;
}[] = [
	{ key: "name", title: "by Name", accessKey: "N" },
	{ key: "kind", title: "by Type", accessKey: "T" },
	{ key: "size", title: "by Size", accessKey: "z" },
	{ key: "modified", title: "by Date", accessKey: "D" },
];

/**
 * View ▸ Arrange Icons ▸ (shell32.dll's "Arrange &Icons", access key I):
 * by Name (N), by Type (T), by Size (z), by Date (D), those of `offered`
 * only, in that order. Windows 98 SE's Auto Arrange is the Finder's View
 * Options "Keep arranged" and is not listed.
 */
export const classicyArrangeIconsMenuItem = (
	id: string,
	ak: AccessKey,
	offered: readonly ClassicyFileBrowserArrangeKey[],
	onArrange: (key: ClassicyFileBrowserArrangeKey) => void,
	disabled = false,
): ClassicyMenuItem => ({
	id: `${id}_arrange`,
	title: "Arrange Icons",
	...withKey(ak, "I"),
	disabled,
	menuChildren: ARRANGE_ORDERS.filter((order) =>
		offered.includes(order.key),
	).map((order) => ({
		id: `${id}_arrange_${order.key}`,
		title: order.title,
		...withKey(ak, order.accessKey),
		onClickFunc: () => onArrange(order.key),
	})),
});

/** Line Up Icons (shell32.dll's "Line &Up Icons", access key U). */
export const classicyLineUpIconsMenuItem = (
	id: string,
	ak: AccessKey,
	onLineUp: () => void,
	disabled = false,
): ClassicyMenuItem => ({
	id: `${id}_line_up`,
	title: "Line Up Icons",
	...withKey(ak, "U"),
	disabled,
	onClickFunc: onLineUp,
});

/**
 * Delete (shell32.dll's "&Delete", access key D), drawn with the Delete key
 * ("Del" under `menu.shortcutSpelling` "names"; a native key, which the
 * browsers' and the desktop's own Delete and ⌃⌫ handlers run).
 */
export const classicyDeleteMenuItem = (
	id: string,
	ak: AccessKey,
	onDelete: () => void,
	disabled = false,
): ClassicyMenuItem => ({
	id: `${id}_delete`,
	title: "Delete",
	...withKey(ak, "D"),
	keyboardShortcut: "⌦",
	nativeShortcut: true,
	disabled,
	onClickFunc: onDelete,
});

/** Rename (shell32.dll's "Rena&me", access key m). */
export const classicyRenameMenuItem = (
	id: string,
	ak: AccessKey,
	onRename: () => void,
	disabled = false,
): ClassicyMenuItem => ({
	id: `${id}_rename`,
	title: "Rename",
	...withKey(ak, "m"),
	disabled,
	onClickFunc: onRename,
});

/**
 * Whether `path` may be renamed: an entry of the tree that is no drive,
 * system, read-only or derived entry, in a folder that is not read-only
 * (the icon view's slow-click rename's rule).
 */
export const classicyCanRename = (
	fs: ClassicyFileSystem,
	path: string,
): boolean => {
	const entry = fs.resolve(path);
	const parent = fs.resolve(
		path.split(fs.separator).slice(0, -1).join(fs.separator),
	);
	return (
		!!entry &&
		entry._type !== ClassicyFileSystemEntryFileType.Drive &&
		entry._system !== true &&
		entry._readOnly !== true &&
		entry._derived !== true &&
		entry._nameLocked !== true &&
		parent?._readOnly !== true
	);
};

/**
 * Windows 98 SE's Delete confirmation (shell32.dll's strings), for the items
 * at `paths`: "Confirm File Delete" for one file, "Confirm Folder Delete"
 * for one folder (its contents going with it), "Confirm Multiple File
 * Delete" for more. `trashName` is the container's name as the package
 * draws it (the Trash, until a package names it otherwise).
 */
export const classicyDeleteConfirmation = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
	trashName = "Trash",
): { title: string; message: string } => {
	if (paths.length === 1) {
		const name = paths[0].split(fs.separator).pop() ?? paths[0];
		const entry = fs.resolve(paths[0]);
		if (entry?._type === ClassicyFileSystemEntryFileType.Directory) {
			return {
				title: "Confirm Folder Delete",
				message: `Are you sure you want to remove the folder '${name}' and move all its contents to the ${trashName}?`,
			};
		}
		return {
			title: "Confirm File Delete",
			message: `Are you sure you want to send '${name}' to the ${trashName}?`,
		};
	}
	return {
		title: "Confirm Multiple File Delete",
		message: `Are you sure you want to send these ${paths.length} items to the ${trashName}?`,
	};
};

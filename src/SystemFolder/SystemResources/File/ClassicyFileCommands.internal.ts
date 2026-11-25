import { useMemo } from "react";
import {
	getClassicyAppearanceLayout,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyAppVerbEntry,
	type ClassicyCreatableFileType,
	listClassicyAppVerbs,
	listClassicyCreatableFileTypes,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { classicyDesktopFreeIconLocation } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import type { ClassicyFileBrowserCommands } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import type { ClassicyFileBrowserArrangeKey } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import {
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
	setClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import type { ClassicyFileDropDestination } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	type ClassicyFileMoveOptions,
	classicyDesktopDropLocation,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	copyClassicyFileSystemItems,
	ensureClassicyDesktopFolder,
	moveClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { classicyFirstFreeName } from "@/SystemFolder/SystemResources/File/ClassicyFileNames";
import {
	classicyFileShortcutPath,
	createClassicyFileShortcut,
} from "@/SystemFolder/SystemResources/File/ClassicyFileShortcut";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	isInClassicyTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
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

/**
 * Create Shortcut (shell32.dll's "Create &Shortcut", access key S): makes a
 * shortcut to each selected item (`classicyPlanShortcuts`).
 */
export const classicyCreateShortcutMenuItem = (
	id: string,
	ak: AccessKey,
	onCreate: () => void,
	disabled = false,
): ClassicyMenuItem => ({
	id: `${id}_create_shortcut`,
	title: "Create Shortcut",
	...withKey(ak, "S"),
	disabled,
	onClickFunc: onCreate,
});

const parentOf = (fs: ClassicyFileSystem, path: string): string =>
	path.split(fs.separator).slice(0, -1).join(fs.separator);

/**
 * Where Create Shortcut puts a shortcut to the item at `path`: beside it,
 * in its folder, when New may make an item there
 * (`classicyCanMakeItemIn`); undefined when it may not (a drive at the
 * root of the tree, an item of the derived Applications, Extensions or
 * Control Strip Modules folders, or of a read-only or system folder),
 * where Windows 98 offers the desktop instead (shell32.dll: "Windows
 * cannot create a shortcut here. Do you want the shortcut to be placed on
 * the desktop instead?").
 */
export const classicyShortcutFolderFor = (
	fs: ClassicyFileSystem,
	path: string,
): string | undefined => {
	const folder = parentOf(fs, path);
	return folder !== "" && classicyCanMakeItemIn(fs, folder)
		? folder
		: undefined;
};

/** What Create Shortcut does with a selection (`classicyPlanShortcuts`). */
export type ClassicyShortcutPlan = {
	/** The items whose shortcut goes beside them, by their folder, in order. */
	beside: Map<string, string[]>;
	/** The items whose folder takes no shortcut: Windows offers the desktop. */
	offerDesktop: string[];
};

/**
 * Sorts the items at `paths` for Create Shortcut: those still in the tree
 * and not in the Trash (Windows 98's Recycle Bin offers no Create
 * Shortcut on its items), each beside itself (`classicyShortcutFolderFor`)
 * or, where no shortcut may be made, offered the desktop.
 */
export const classicyPlanShortcuts = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
): ClassicyShortcutPlan => {
	const beside = new Map<string, string[]>();
	const offerDesktop: string[] = [];
	for (const path of paths) {
		if (!fs.resolve(path) || isInClassicyTrash(fs, path)) continue;
		const folder = classicyShortcutFolderFor(fs, path);
		if (folder === undefined) offerDesktop.push(path);
		else beside.set(folder, [...(beside.get(folder) ?? []), path]);
	}
	return { beside, offerDesktop };
};

type Dispatch = (action: ActionMessage) => void;

/**
 * An application's own icon (its record's, as its code gives it), for a
 * shortcut to an entry a derived folder lists for it.
 */
const recordedAppIcon = (appId: string): string | undefined =>
	useAppManager.getState().System.Manager.Applications.apps[appId]?.icon;

/**
 * The desktop's first free grid cell now (`classicyDesktopFreeIconLocation`
 * over the store's icons, theme and grid origin): where a new desktop item
 * goes when no point is given.
 */
export const classicyNextFreeDesktopIconLocation = ():
	| [number, number]
	| undefined => {
	const state = useAppManager.getState().System.Manager;
	return classicyDesktopFreeIconLocation(
		state.Appearance.activeTheme,
		state.Desktop.icons,
		getClassicyAppearanceLayout(state.Appearance.packageId).desktop
			.iconGridOrigin,
	);
};

/**
 * Makes a shortcut to each item at `targetPaths` in the Desktop Folder
 * (created on first use), each icon in the desktop's first free grid cell
 * (the first at the client point `at`, a white-space menu's, when given),
 * then makes the new icons the desktop's selection, as Windows 98 selects
 * the shortcuts it made. Returns the shortcuts' paths.
 */
export const createClassicyDesktopShortcuts = (
	fs: ClassicyFileSystem,
	targetPaths: readonly string[],
	dispatch: Dispatch,
	{ at }: { at?: [number, number] } = {},
): string[] => {
	const folder = ensureClassicyDesktopFolder(fs);
	if (!folder) return [];
	const made: string[] = [];
	for (const targetPath of targetPaths) {
		const path = createClassicyFileShortcut(fs, targetPath, folder, {
			appIcon: recordedAppIcon,
		});
		if (!path) continue;
		const location =
			at && made.length === 0
				? classicyDesktopDropLocation(at)
				: classicyNextFreeDesktopIconLocation();
		// Placed in the tick the shortcut is made, so the desktop's mirror of
		// the Desktop Folder finds its icon placed.
		const action = classicyDesktopItemIconAction(fs, path, location);
		if (action) dispatch(action);
		made.push(path);
	}
	if (made.length > 0) {
		dispatch({
			type: "ClassicyDesktopIconSelectBox",
			iconIds: made.map(
				(path) => `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`,
			),
		});
	}
	return made;
};

/**
 * Explorer's Create Shortcut on the items at `paths` (WIG Ch.10
 * "Registering Commands", pp.200-201, and "System Naming Conventions",
 * p.210; `classicyPlanShortcuts`): a shortcut beside each, "Shortcut to
 * <name>" ("Shortcut (2) to <name>" on a clash); in a folder window
 * (`commands`, its browser) placed in the first free cell and selected,
 * on the desktop for Desktop Folder items (`createClassicyDesktopShortcuts`);
 * for the items whose folder takes none (a drive, the Trash, an item of a
 * derived folder), `ClassicyAppFinderOfferDesktopShortcut`, Finder's offer
 * of the desktop instead. Returns the shortcuts made beside their items.
 */
export const classicyCreateShortcuts = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
	dispatch: Dispatch,
	commands: ClassicyFileBrowserCommands | null = null,
): string[] => {
	const plan = classicyPlanShortcuts(fs, paths);
	const desktopFolder = classicyDesktopFolderPath(fs);
	const made: string[] = [];
	for (const [folder, targets] of plan.beside) {
		if (folder === desktopFolder) {
			made.push(...createClassicyDesktopShortcuts(fs, targets, dispatch));
			continue;
		}
		const inFolder: string[] = [];
		for (const target of targets) {
			const path = classicyFileShortcutPath(fs, target, folder);
			commands?.place(path);
			if (
				createClassicyFileShortcut(fs, target, folder, {
					path,
					appIcon: recordedAppIcon,
				})
			)
				inFolder.push(path);
		}
		if (inFolder.length > 0) commands?.select(inFolder);
		made.push(...inFolder);
	}
	if (plan.offerDesktop.length > 0)
		dispatch({
			type: "ClassicyAppFinderOfferDesktopShortcut",
			paths: plan.offerDesktop,
		});
	return made;
};

/** A verb `classicyVerbsFor` lists, with the app that declared it. */
export type ClassicyFileVerb = ClassicyAppVerbEntry & { appId: string };

/**
 * The verbs an item of type `type` takes (WIG Ch.10 "Registering
 * Commands", pp.200-201): those of the app `fileTypeHandlers` names for
 * the type (`registerApp`'s `verbs`), while it is mounted (an app not
 * mounted cannot run them); none for a folder or drive, whose handler is
 * Finder's own window.
 */
export const classicyVerbsFor = (
	type: string | undefined,
	fileTypeHandlers: Readonly<Record<string, string>>,
	mounted: ReadonlySet<string>,
): ClassicyFileVerb[] => {
	if (
		type === undefined ||
		type === ClassicyFileSystemEntryFileType.Directory ||
		type === ClassicyFileSystemEntryFileType.Drive
	)
		return [];
	const appId = Object.hasOwn(fileTypeHandlers, type)
		? fileTypeHandlers[type]
		: undefined;
	if (!appId || !mounted.has(appId)) return [];
	return listClassicyAppVerbs(appId).map((verb) => ({ ...verb, appId }));
};

/**
 * The menu items of `verbs` (after Open in an item's menu), each running
 * its verb on `targets`, the items of the same handler's type: `dispatch`
 * gets `{ type: action, app: { id }, path }` for each, trusted, as a menu
 * choice is.
 */
export const classicyVerbMenuItems = (
	id: string,
	ak: AccessKey,
	verbs: readonly ClassicyFileVerb[],
	targets: () => readonly string[],
	dispatch: Dispatch,
): ClassicyMenuItem[] =>
	verbs.map((verb) => ({
		id: `${id}_verb_${verb.appId}_${verb.id}`,
		title: verb.title,
		...(verb.accessKey !== undefined ? withKey(ak, verb.accessKey) : {}),
		onClickFunc: () => {
			for (const path of targets())
				dispatch({ type: verb.action, app: { id: verb.appId }, path });
		},
	}));

/**
 * The verbs of the items' handlers, read where each item menu is built:
 * the store's `fileTypeHandlers` and the mounted apps
 * (`classicyVerbsFor`).
 */
export const useClassicyFileVerbs = (): ((
	type: string | undefined,
) => ClassicyFileVerb[]) => {
	const mounted = useClassicyMountedApps();
	const fileTypeHandlers = useAppManager(
		(state) => state.System.Manager.Applications.fileTypeHandlers,
	);
	return useMemo(
		() => (type: string | undefined) =>
			classicyVerbsFor(
				type,
				fileTypeHandlers as Record<string, string>,
				mounted,
			),
		[fileTypeHandlers, mounted],
	);
};

// Explorer's Cut, Copy, Paste and Paste Shortcut of files (WIG Ch.5
// "Command Method", pp.59-61; "Command Method Transfers", p.66; the
// remaining chapters' audit's 5.28), in Finder's Edit menu and item menus
// and the desktop's (`useClassicyDesktopCommands`), under
// `layout.finder.commands` "windows": the file clipboard
// (`ClassicyFileClipboard.ts`) holds the items until a Paste moves (a Cut)
// or copies (a Copy) them into a folder or onto the desktop.

/**
 * Cut (shell32.dll's "Cu&t", access key t): fills the file clipboard with
 * the selection, a paste moving it. `shortcut` shows Ctrl+X, as Explorer's
 * Edit menu does ("Cu&t\tCtrl+X"; an item's pop-up menu shows none), a
 * native key: the browsers' and the desktop's own handlers run it, outside
 * a text field.
 */
export const classicyCutMenuItem = (
	id: string,
	ak: AccessKey,
	onCut: () => void,
	{ disabled = false, shortcut = false } = {},
): ClassicyMenuItem => ({
	id: `${id}_cut`,
	title: "Cut",
	...withKey(ak, "t"),
	...(shortcut ? { keyboardShortcut: "⌘X", nativeShortcut: true } : {}),
	disabled,
	onClickFunc: onCut,
});

/** Copy (shell32.dll's "&Copy", access key C; Ctrl+C in the Edit menu). */
export const classicyCopyMenuItem = (
	id: string,
	ak: AccessKey,
	onCopy: () => void,
	{ disabled = false, shortcut = false } = {},
): ClassicyMenuItem => ({
	id: `${id}_copy`,
	title: "Copy",
	...withKey(ak, "C"),
	...(shortcut ? { keyboardShortcut: "⌘C", nativeShortcut: true } : {}),
	disabled,
	onClickFunc: onCopy,
});

/** Paste (shell32.dll's "&Paste", access key P; Ctrl+V in the Edit menu). */
export const classicyPasteMenuItem = (
	id: string,
	ak: AccessKey,
	onPaste: () => void,
	{ disabled = false, shortcut = false } = {},
): ClassicyMenuItem => ({
	id: `${id}_paste`,
	title: "Paste",
	...withKey(ak, "P"),
	...(shortcut ? { keyboardShortcut: "⌘V", nativeShortcut: true } : {}),
	disabled,
	onClickFunc: onPaste,
});

/**
 * Paste Shortcut (shell32.dll's "Paste &Shortcut", access key S): a
 * shortcut to each copied item, made where a Paste would put it.
 */
export const classicyPasteShortcutMenuItem = (
	id: string,
	ak: AccessKey,
	onPasteShortcut: () => void,
	{ disabled = false } = {},
): ClassicyMenuItem => ({
	id: `${id}_paste_shortcut`,
	title: "Paste Shortcut",
	...withKey(ak, "S"),
	disabled,
	onClickFunc: onPasteShortcut,
});

/**
 * Whether the item at `path` may be cut: an entry a Paste could move
 * (`fs.move`'s rule): no drive, system, read-only or derived entry, the
 * Trash itself or an item of a read-only folder. A Trash item may be (its
 * Paste takes it out of the Trash, as Windows 98's Recycle Bin items took
 * Cut).
 */
export const classicyCanCut = (
	fs: ClassicyFileSystem,
	path: string,
): boolean => {
	const entry = fs.resolve(path);
	return (
		!!entry &&
		path !== CLASSICY_TRASH_PATH &&
		entry._type !== ClassicyFileSystemEntryFileType.Drive &&
		entry._system !== true &&
		entry._readOnly !== true &&
		entry._derived !== true &&
		fs.resolve(parentOf(fs, path))?._readOnly !== true
	);
};

/**
 * Whether the item at `path` may be copied (`fs.copy`'s rule): no drive,
 * system or derived entry, nor anything in the Trash (Windows 98's Recycle
 * Bin items took no Copy).
 */
export const classicyCanCopy = (
	fs: ClassicyFileSystem,
	path: string,
): boolean => {
	const entry = fs.resolve(path);
	return (
		!!entry &&
		path !== CLASSICY_TRASH_PATH &&
		entry._type !== ClassicyFileSystemEntryFileType.Drive &&
		entry._system !== true &&
		entry._derived !== true &&
		!isInClassicyTrash(fs, path)
	);
};

/**
 * Explorer's Cut: the items of `paths` that may be cut (`classicyCanCut`)
 * fill the file clipboard, replacing it, and are drawn cut
 * (`classicyFileCut`) until a Paste, another Cut or Copy, or Escape.
 * Returns the paths cut; none leaves the clipboard as it was.
 */
export const classicyCutItems = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
): string[] => {
	const kept = paths.filter((path) => classicyCanCut(fs, path));
	if (kept.length > 0) setClassicyFileClipboard("cut", kept, fs.storageKey);
	return kept;
};

/**
 * Explorer's Copy: the items of `paths` that may be copied
 * (`classicyCanCopy`) fill the file clipboard, replacing it. Returns the
 * paths copied; none leaves the clipboard as it was.
 */
export const classicyCopyItems = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
): string[] => {
	const kept = paths.filter((path) => classicyCanCopy(fs, path));
	if (kept.length > 0) setClassicyFileClipboard("copy", kept, fs.storageKey);
	return kept;
};

/** Where a Paste puts its items (`classicyPasteItems`). */
export type ClassicyPasteOptions = {
	/**
	 * A folder window's browser: the pasted items are placed (`place`, the
	 * first at `at`) and selected in it.
	 */
	commands?: ClassicyFileBrowserCommands | null;
	/**
	 * The client point a white-space menu was opened at, where the first
	 * item goes; without it, each goes to the next free cell.
	 */
	at?: [number, number];
};

/** The folder a Paste into `destination` fills, when it may take items. */
const pasteFolder = (
	fs: ClassicyFileSystem,
	destination: ClassicyFileDropDestination,
): string | undefined => {
	const folder =
		destination.kind === "desktop"
			? ensureClassicyDesktopFolder(fs)
			: destination.path;
	return folder !== undefined && classicyCanMakeItemIn(fs, folder)
		? folder
		: undefined;
};

/**
 * Whether a Paste into `folder` (a folder window's, `undefined` for the
 * desktop) would take anything: the file clipboard holds items of `fs`'s
 * tree and the folder takes new items (`classicyCanMakeItemIn`; never the
 * Trash, a read-only, system or derived folder). `shortcut` asks for Paste
 * Shortcut, which follows a Copy only.
 */
export const classicyCanPaste = (
	fs: ClassicyFileSystem,
	folder: string | undefined,
	{ shortcut = false } = {},
): boolean => {
	const clipboard = getClassicyFileClipboard();
	if (!clipboard || clipboard.storageKey !== fs.storageKey) return false;
	if (shortcut && clipboard.op !== "copy") return false;
	return folder === undefined || classicyCanMakeItemIn(fs, folder);
};

/** The desktop's icon ids for Desktop Folder items. */
const desktopItemIconIds = (paths: readonly string[]): string[] =>
	paths.map((path) => `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`);

/** The new items become the selection: on the desktop, or in the window. */
const selectPasted = (
	made: readonly string[],
	destination: ClassicyFileDropDestination,
	dispatch: Dispatch,
	{ commands = null, at }: ClassicyPasteOptions,
): void => {
	if (made.length === 0) return;
	if (destination.kind === "desktop") {
		dispatch({
			type: "ClassicyDesktopIconSelectBox",
			iconIds: desktopItemIconIds(made),
		});
		return;
	}
	// In the tick the items are made, before the view lists them.
	made.forEach((path, index) => {
		commands?.place(path, index === 0 ? at : undefined);
	});
	commands?.select([...made]);
};

/**
 * Explorer's Paste into `destination` (a folder window's folder, or the
 * desktop's Desktop Folder, made on first use): the file clipboard's
 * items still in the tree, moved there for a Cut
 * (`moveClassicyFileSystemItems`, the clipboard emptied once something
 * moved) or copied for a Copy (`copyClassicyFileSystemItems`, "Copy of
 * <name>" where the name is taken; the clipboard kept, so pastes repeat).
 * The pasted items become the selection: on the desktop at the client point
 * `at` (stepping down) or each in the next free cell; in a window
 * (`commands`), placed (the first at `at`) and selected. Refusals are told
 * in an alert, as a drag's are. Returns the pasted items' paths; nothing
 * when the clipboard is empty, holds another tree's items, or the folder
 * takes no new items.
 */
export const classicyPasteItems = (
	fs: ClassicyFileSystem,
	destination: ClassicyFileDropDestination,
	dispatch: Dispatch,
	options: ClassicyPasteOptions = {},
): string[] => {
	const clipboard = getClassicyFileClipboard();
	if (!clipboard || clipboard.storageKey !== fs.storageKey) return [];
	const folder = pasteFolder(fs, destination);
	if (folder === undefined) return [];
	const paths = clipboard.paths.filter((path) => fs.resolve(path));
	if (paths.length === 0) return [];
	const target: ClassicyFileDropDestination =
		destination.kind === "desktop"
			? destination
			: { kind: "folder", path: folder };
	const placement: ClassicyFileMoveOptions =
		destination.kind !== "desktop"
			? {}
			: options.at
				? { desktopLocation: classicyDesktopDropLocation(options.at) }
				: { desktopLocationFor: classicyNextFreeDesktopIconLocation };
	const done =
		clipboard.op === "cut"
			? moveClassicyFileSystemItems(fs, paths, target, dispatch, placement)
			: copyClassicyFileSystemItems(fs, paths, target, dispatch, placement);
	if (clipboard.op === "cut" && done.length > 0) clearClassicyFileClipboard();
	const made = done.map(({ to }) => to);
	selectPasted(made, destination, dispatch, options);
	return made;
};

/**
 * Windows 98's Paste Shortcut into `destination` (WIG Ch.5 "The Paste
 * Link, Paste Shortcut, and Create Shortcut Commands", p.68): after a
 * Copy, a shortcut to each copied item still in the tree, "Shortcut to
 * <name>" ("Shortcut (2) to <name>" on a clash), where a Paste would put
 * it, selected; the clipboard is kept. Returns the shortcuts' paths.
 */
export const classicyPasteShortcuts = (
	fs: ClassicyFileSystem,
	destination: ClassicyFileDropDestination,
	dispatch: Dispatch,
	options: ClassicyPasteOptions = {},
): string[] => {
	const clipboard = getClassicyFileClipboard();
	if (clipboard?.op !== "copy" || clipboard.storageKey !== fs.storageKey)
		return [];
	const folder = pasteFolder(fs, destination);
	if (folder === undefined) return [];
	const targets = clipboard.paths.filter((path) => fs.resolve(path));
	if (destination.kind === "desktop")
		return createClassicyDesktopShortcuts(fs, targets, dispatch, {
			at: options.at,
		});
	const made: string[] = [];
	for (const target of targets) {
		const path = classicyFileShortcutPath(fs, target, folder);
		options.commands?.place(path, made.length === 0 ? options.at : undefined);
		if (
			createClassicyFileShortcut(fs, target, folder, {
				path,
				appIcon: recordedAppIcon,
			})
		)
			made.push(path);
	}
	if (made.length > 0) options.commands?.select(made);
	return made;
};

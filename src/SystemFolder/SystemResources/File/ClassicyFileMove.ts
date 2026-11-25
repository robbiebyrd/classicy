import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { isClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	type ClassicyFileDropDestination,
	type ClassicyFileDropTarget,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	CLASSICY_WINDOWS_RENAME_TITLE,
	classicyFileNameRefusal,
	isClassicyValidFileName,
} from "@/SystemFolder/SystemResources/File/ClassicyFileNames";
import type {
	ClassicyFileSystem,
	ClassicyFileSystemCopyRefusal,
	ClassicyFileSystemMoveRefusal,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	CLASSICY_UNTRASHED_METADATA,
	type ClassicyTrashRefusal,
	isClassicyTrashItem,
	restoreClassicyFileSystemItems,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { classicyTrashDisplayName } from "@/SystemFolder/SystemResources/File/ClassicyTrashName";

/**
 * The folder whose contents are the desktop's files and folders — Mac OS 8's
 * invisible "Desktop Folder" at the root of the startup disk (the first drive).
 */
export const CLASSICY_DESKTOP_FOLDER_NAME = "Desktop Folder";

/** `appId` prefix of the desktop icons that stand for Desktop Folder items. */
export const CLASSICY_DESKTOP_ITEM_ICON_PREFIX = "classicy-desktop-item:";

type Dispatch = (action: ActionMessage, trust?: ClassicyActionTrust) => void;

/** The startup disk: the first drive at the root of the tree, if any. */
export const classicyStartupDisk = (
	fs: ClassicyFileSystem,
): string | undefined =>
	Object.keys(fs.filterByType("", ClassicyFileSystemEntryFileType.Drive))[0];

/** The Desktop Folder's path (whether or not it exists yet). */
export const classicyDesktopFolderPath = (
	fs: ClassicyFileSystem,
): string | undefined => {
	const disk = classicyStartupDisk(fs);
	return disk
		? `${disk}${fs.separator}${CLASSICY_DESKTOP_FOLDER_NAME}`
		: undefined;
};

/**
 * The Desktop Folder's path, creating it (invisible, as in Mac OS 8, so it
 * doesn't show in the startup disk's window) the first time something lands
 * on the desktop.
 */
export const ensureClassicyDesktopFolder = (
	fs: ClassicyFileSystem,
): string | undefined => {
	const path = classicyDesktopFolderPath(fs);
	if (!path) return undefined;
	if (!fs.resolve(path)) {
		fs.mkDir(path);
		fs.setMetadata(path, { _invisible: true });
	}
	return path;
};

/**
 * The `ClassicyDesktopIconAdd` action for a Desktop Folder item: an icon that
 * opens the folder or file at `path` (resolved when opened, so nothing large is
 * persisted with the icon) and can be dragged back into a window.
 */
export const classicyDesktopItemIconAction = (
	fs: ClassicyFileSystem,
	path: string,
	location?: [number, number],
): ActionMessage | undefined => {
	const entry = fs.resolve(path);
	if (!entry) return undefined;
	const name = path.split(fs.separator).pop() ?? path;
	const isFolder = entry._type === ClassicyFileSystemEntryFileType.Directory;
	return {
		type: "ClassicyDesktopIconAdd",
		app: {
			id: `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`,
			name,
			// The core's icon for the type, stored with the desktop's icons
			// and drawn as the active package's.
			icon:
				(entry._icon as string | undefined) ??
				iconImageByType(entry._type, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID),
		},
		// A file shortcut (Explorer's Create Shortcut) is an alias kind
		// (`isAliasKind`): the desktop badges its icon and italicizes its label.
		kind: isFolder
			? "directory"
			: entry._type === ClassicyFileSystemEntryFileType.FileShortcut
				? ClassicyFileSystemEntryFileType.FileShortcut
				: "file",
		filePath: path,
		noLaunch: true,
		...(location ? { location } : {}),
	};
};

const refusalMessage = (
	reason: ClassicyFileSystemMoveRefusal,
	name: string,
	folderName: string,
): string => {
	switch (reason) {
		case "exists":
			return `An item named “${name}” already exists in “${folderName}”. It was not moved.`;
		case "into-itself":
			return `“${name}” can’t be moved into itself.`;
		case "locked":
			return `“${name}” can’t be moved, because it or “${folderName}” is locked or used by the system software.`;
		default:
			return `“${name}” could not be moved.`;
	}
};

/**
 * Desktop-relative position for an icon whose outline was let go with its
 * top-left at the client point `topLeft`.
 */
export const classicyDesktopDropLocation = (
	topLeft: [number, number],
): [number, number] => {
	const desktop =
		typeof document !== "undefined"
			? document.getElementById("classicyDesktop")
			: null;
	const rect = desktop?.getBoundingClientRect();
	return [
		Math.round(topLeft[0] - (rect?.left ?? 0)),
		Math.round(topLeft[1] - (rect?.top ?? 0)),
	];
};

export type ClassicyFileMoveOptions = {
	/**
	 * For a desktop drop: where the first item's icon goes (desktop-relative
	 * px); later items step down from it.
	 */
	desktopLocation?: [number, number];
	/** Pixels between successive dropped icons on the desktop. */
	desktopStep?: number;
	/**
	 * For a desktop destination without `desktopLocation`: where each item's
	 * icon goes, asked as each is placed (`index` its place among the items
	 * moved or copied, `from` the original's path), so a caller may give
	 * each the desktop's next free cell (Explorer's Paste from the keyboard)
	 * or the place of the icon it copies (a Control-drag on the desktop).
	 * Undefined lays the desktop out afresh, as an icon added with no
	 * location does.
	 */
	desktopLocationFor?: (
		index: number,
		from: string,
	) => [number, number] | undefined;
};

/**
 * Where the icon of the `index`th item transferred to the desktop (from
 * `from`) goes, by the options: `desktopLocation` stepping down by
 * `desktopStep`, else `desktopLocationFor`, else undefined.
 */
export const classicyDesktopIconLocation = (
	{
		desktopLocation,
		desktopStep = 72,
		desktopLocationFor,
	}: ClassicyFileMoveOptions,
	index: number,
	from: string,
): [number, number] | undefined =>
	desktopLocation
		? [desktopLocation[0], desktopLocation[1] + index * desktopStep]
		: desktopLocationFor?.(index, from);

/**
 * Move `paths` into `destination`:
 *
 * 1. each item moves with `fs.move` (refused moves change nothing) — every
 *    `useClassicyFileSystem` view shares the tree and is notified at once;
 * 2. `ClassicyAppFinderPathsMoved` lets Finder follow moved folders with open
 *    windows;
 * 3. items dropped on the desktop get their icons at the drop point — in the
 *    same tick as the move, so they are placed before any view re-renders;
 * 4. the first refusal (other than "already there") is reported in an alert.
 *
 * Returns the moves that happened.
 */
export function moveClassicyFileSystemItems(
	fs: ClassicyFileSystem,
	paths: string[],
	destination: ClassicyFileDropDestination,
	dispatch: Dispatch,
	options: ClassicyFileMoveOptions = {},
): { from: string; to: string }[] {
	if (
		destination.kind === "folder" &&
		destination.path === CLASSICY_TRASH_PATH
	) {
		return moveClassicyItemsToTrash(fs, paths, dispatch);
	}
	const folder =
		destination.kind === "desktop"
			? ensureClassicyDesktopFolder(fs)
			: destination.path;
	if (!folder) return [];

	const moves: { from: string; to: string }[] = [];
	let refusal: { reason: ClassicyFileSystemMoveRefusal; name: string } | null =
		null;
	for (const path of paths) {
		// A folder let go on itself is a short drag, not a request: no alert.
		if (path === folder) continue;
		// Dragged out of the Trash: it is no longer trashed.
		const result = fs.move(
			path,
			folder,
			isClassicyTrashItem(fs, path)
				? { metadata: CLASSICY_UNTRASHED_METADATA }
				: {},
		);
		if (result.ok) {
			moves.push({ from: path, to: result.path });
		} else if (result.reason !== "same-folder" && !refusal) {
			refusal = {
				reason: result.reason,
				name: path.split(fs.separator).pop() ?? path,
			};
		}
	}

	if (moves.length > 0) {
		dispatch({ type: "ClassicyAppFinderPathsMoved", moves });
		if (destination.kind === "desktop") {
			moves.forEach(({ from, to }, index) => {
				const action = classicyDesktopItemIconAction(
					fs,
					to,
					classicyDesktopIconLocation(options, index, from),
				);
				if (action) dispatch(action);
			});
		}
	}

	if (refusal) {
		const folderName =
			destination.kind === "desktop"
				? "the desktop"
				: (folder.split(fs.separator).pop() ?? folder);
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: refusalMessage(refusal.reason, refusal.name, folderName),
		});
	}
	return moves;
}

const copyRefusalMessage = (
	reason: ClassicyFileSystemCopyRefusal,
	name: string,
	folderName: string,
): string => {
	switch (reason) {
		case "exists":
			return `An item named “${name}” already exists in “${folderName}”. It was not copied.`;
		case "into-itself":
			return `“${name}” can’t be copied into itself.`;
		case "locked":
			return `“${name}” can’t be copied, because it or “${folderName}” is locked or used by the system software.`;
		default:
			return `“${name}” could not be copied.`;
	}
};

/**
 * Copy `paths` into `destination` (Explorer's Paste after a Copy; WIG Ch.5
 * "Command Method", pp.59-61), as `moveClassicyFileSystemItems` moves them:
 *
 * 1. each item is copied with `fs.copy` (refused copies change nothing),
 *    named as it is, else "Copy of <name>", "Copy (2) of <name>"… where
 *    the destination holds the name (`classicyFirstFreeCopyName`);
 * 2. items copied to the desktop (its Desktop Folder, made on first use)
 *    get their icons, at `desktopLocation` stepping down by `desktopStep`,
 *    else where `desktopLocationFor` puts each, in the same tick as the
 *    copy, so they are placed before any view re-renders;
 * 3. the first refusal is reported in an alert.
 *
 * Nothing is dispatched for the originals, which stay where they are.
 * Returns the copies made, `{ from, to }` (the original's path and the
 * copy's).
 */
export function copyClassicyFileSystemItems(
	fs: ClassicyFileSystem,
	paths: string[],
	destination: ClassicyFileDropDestination,
	dispatch: Dispatch,
	options: ClassicyFileMoveOptions = {},
): { from: string; to: string }[] {
	const folder =
		destination.kind === "desktop"
			? ensureClassicyDesktopFolder(fs)
			: destination.path;
	if (!folder) return [];
	const copies: { from: string; to: string }[] = [];
	let refusal: { reason: ClassicyFileSystemCopyRefusal; name: string } | null =
		null;
	for (const path of paths) {
		const result = fs.copy(path, folder);
		if (result.ok) {
			copies.push({ from: path, to: result.path });
		} else if (!refusal) {
			refusal = {
				reason: result.reason,
				name: path.split(fs.separator).pop() ?? path,
			};
		}
	}
	if (destination.kind === "desktop") {
		copies.forEach(({ from, to }, index) => {
			const action = classicyDesktopItemIconAction(
				fs,
				to,
				classicyDesktopIconLocation(options, index, from),
			);
			if (action) dispatch(action);
		});
	}
	if (refusal) {
		const folderName =
			destination.kind === "desktop"
				? "the desktop"
				: (folder.split(fs.separator).pop() ?? folder);
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: copyRefusalMessage(refusal.reason, refusal.name, folderName),
		});
	}
	return copies;
}

/** The Finder's id: its windows are the folder windows a drop activates. */
const FINDER_APP_ID = "Finder.app";

/**
 * After a drop into a Finder window that is not the active one, activates
 * it, as Windows does (WIG Ch.5 "Direct Manipulation Method", p.62: "the
 * user can drop an object in an inactive window. This action activates the
 * window"; the remaining chapters' audit's 5.31), under the active
 * package's `layout.transfer.activateDropWindow` (Windows 98): the window
 * holding `target`'s element (`.classicyWindow`), when it is not `active`
 * and is the Finder window (Finder keys its windows by folder path) of the
 * `.classicyFileBrowserFill` root around the target, its
 * `data-classicy-drop-folder`, gets `ClassicyWindowFocus`. Call it after
 * a drop that moved or copied something. Returns whether it focused a
 * window; without the key, or for a drop on the desktop, a drive, the
 * Trash icon, the active window or another app's window, it does nothing.
 */
export function activateClassicyDropWindow(
	target: ClassicyFileDropTarget | null | undefined,
	dispatch: Dispatch,
): boolean {
	if (
		!target ||
		getClassicyAppearanceLayout().transfer?.activateDropWindow !== true
	)
		return false;
	const windowElement = target.element.closest(".classicyWindow");
	if (!windowElement || windowElement.classList.contains("active"))
		return false;
	const folder = target.element
		.closest(".classicyFileBrowserFill")
		?.getAttribute(CLASSICY_DROP_FOLDER_ATTRIBUTE);
	if (!folder || windowElement.id !== [FINDER_APP_ID, folder].join("_"))
		return false;
	const window = getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[FINDER_APP_ID],
		folder,
	);
	if (!window) return false;
	dispatch({ type: "ClassicyWindowFocus", app: { id: FINDER_APP_ID }, window });
	return true;
}

const trashRefusalMessage = (
	reason: ClassicyTrashRefusal,
	name: string,
): string => {
	switch (reason) {
		case "locked":
			return `“${name}” can’t be moved to the ${classicyTrashDisplayName()}, because it is locked or used by the system software.`;
		default:
			return `“${name}” could not be moved to the ${classicyTrashDisplayName()}.`;
	}
};

/** The desktop icon position of each Desktop Folder item among `paths`. */
const desktopIconLocations = (
	paths: string[],
): Record<string, [number, number] | undefined> => {
	const wanted = new Set(paths);
	const locations: Record<string, [number, number] | undefined> = {};
	for (const icon of useAppManager.getState().System.Manager.Desktop.icons) {
		if (icon.filePath && wanted.has(icon.filePath) && icon.location) {
			locations[icon.filePath] = icon.location;
		}
	}
	return locations;
};

/** Options for `moveClassicyItemsToTrash`. */
export type ClassicyTrashMoveOptions = {
	/**
	 * The Delete confirmation was answered Yes (Finder's box): move without
	 * asking again. Omitted, Explorer's commands ask first.
	 */
	confirmed?: boolean;
	/**
	 * The trust the request arrived with, kept with a pending confirmation
	 * (`ClassicyAppFinderConfirmDelete` is dispatched under it). Defaults to
	 * the kernel's `"trusted"`.
	 */
	trust?: ClassicyActionTrust;
};

/**
 * Whether a Delete asks before anything moves: under Explorer's commands
 * (`layout.finder.commands` "windows"; Windows 98 SE's Recycle Bin, whose
 * "Display delete confirmation dialog box" is on by default), while Finder,
 * which shows the box, is mounted. Store-free: the active package's layout.
 */
export const classicyDeleteConfirms = (): boolean =>
	getClassicyAppearanceLayout().finder?.commands === "windows" &&
	isClassicyAppMounted("Finder.app");

/**
 * Move `paths` to the Trash (Finder's Move To Trash, ⌃⌫/Delete, or a drop on
 * the Trash): Finder windows follow trashed folders, desktop items remember
 * where their icons were, and the first refusal is reported in an alert.
 * Returns the moves that happened.
 *
 * Under Explorer's commands (`classicyDeleteConfirms`; WIG Ch.5
 * "Specialized Transfer Commands", p.67) every route asks first, the menus,
 * the Delete and ⌃⌫ keys and a drop on the Trash alike: the paths are
 * handed to Finder (`ClassicyAppFinderConfirmDelete`, under `trust`), which
 * shows Windows 98 SE's "Confirm File Delete" box and calls this again with
 * `confirmed` on Yes; nothing moves, and `[]` is returned, until then.
 */
export function moveClassicyItemsToTrash(
	fs: ClassicyFileSystem,
	paths: string[],
	dispatch: Dispatch,
	{ confirmed = false, trust }: ClassicyTrashMoveOptions = {},
): { from: string; to: string }[] {
	if (!confirmed && paths.length > 0 && classicyDeleteConfirms()) {
		const action: ActionMessage = {
			type: "ClassicyAppFinderConfirmDelete",
			paths: [...paths],
		};
		if (trust === undefined) dispatch(action);
		else dispatch(action, trust);
		return [];
	}
	const { moves, refusal } = trashClassicyFileSystemItems(
		fs,
		paths,
		desktopIconLocations(paths),
	);
	if (moves.length > 0) {
		dispatch({ type: "ClassicyAppFinderPathsMoved", moves });
	}
	if (refusal) {
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: trashRefusalMessage(refusal.reason, refusal.name),
		});
	}
	return moves;
}

const restoreRefusalMessage = (
	reason: ClassicyTrashRefusal,
	name: string,
): string => {
	switch (reason) {
		case "no-origin":
			return `“${name}” can’t be restored, because the folder it came from no longer exists. Drag it out of the ${classicyTrashDisplayName()} instead.`;
		case "exists":
			return `“${name}” can’t be restored, because an item with that name is already where it came from.`;
		default:
			return `“${name}” could not be restored.`;
	}
};

/**
 * Restore Trash items to the folders they came from (the Trash window's
 * Restore command). Items that were on the desktop get their icons back where
 * they were. The first refusal is reported in an alert. Returns the moves.
 */
export function restoreClassicyTrashItems(
	fs: ClassicyFileSystem,
	paths: string[],
	dispatch: Dispatch,
): { from: string; to: string }[] {
	// Read before the restore clears it.
	const locations = Object.fromEntries(
		paths.map((path) => [path, fs.resolve(path)?._trashedLocation]),
	);
	const { moves, refusal } = restoreClassicyFileSystemItems(fs, paths);
	if (moves.length > 0) {
		dispatch({ type: "ClassicyAppFinderPathsMoved", moves });
		const desktopFolder = classicyDesktopFolderPath(fs);
		for (const { from, to } of moves) {
			const location = locations[from];
			if (
				!desktopFolder ||
				to.split(fs.separator).slice(0, -1).join(fs.separator) !== desktopFolder
			) {
				continue;
			}
			const action = classicyDesktopItemIconAction(
				fs,
				to,
				Array.isArray(location) ? location : undefined,
			);
			if (action) dispatch(action);
		}
	}
	if (refusal) {
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: restoreRefusalMessage(refusal.reason, refusal.name),
		});
	}
	return moves;
}

const renameRefusalMessage = (
	reason: ClassicyFileSystemMoveRefusal | "invalid",
	name: string,
	oldName: string,
): string => {
	switch (reason) {
		case "exists":
			return `The name “${name}” is already taken. Please use a different name.`;
		case "locked":
			return `“${oldName}” can’t be renamed, because it is locked or used by the system software.`;
		case "invalid":
			return `“${name}” can’t be used as a name.`;
		default:
			return `“${oldName}” could not be renamed.`;
	}
};

/**
 * Rename the item at `path` to `name`, in its own folder (Finder's rename
 * of an icon's name): `fs.move` with the new name, so the names of another
 * entry are refused whatever their case (`exists`) and a change of case
 * alone renames in place; Finder's windows on it follow
 * (`ClassicyAppFinderPathsMoved`); a Desktop Folder item's desktop icon is
 * placed where its old one was; any refusal is told in an alert. A name
 * that is empty, holds the separator (`:`) or starts with `_` (the
 * metadata prefix) is refused as invalid; one equal to the old changes
 * nothing. Returns the new path, or undefined.
 */
export function renameClassicyFileSystemItem(
	fs: ClassicyFileSystem,
	path: string,
	name: string,
	dispatch: Dispatch,
): string | undefined {
	const parts = path.split(fs.separator);
	const oldName = parts.pop() ?? path;
	const folder = parts.join(fs.separator);
	if (name === oldName) return undefined;
	// Windows' names (`layout.files.names` "windows"): none of `\ / : * ?
	// " < > |`, refused in Windows 98's own message box (shell32.dll's
	// "Rename" and its text).
	const windowsRefusal = classicyFileNameRefusal();
	if (
		windowsRefusal !== undefined &&
		name.trim() !== "" &&
		!isClassicyValidFileName(name)
	) {
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			title: CLASSICY_WINDOWS_RENAME_TITLE,
			message: windowsRefusal,
		});
		return undefined;
	}
	if (
		name.trim() === "" ||
		name.includes(fs.separator) ||
		!isClassicyValidFileName(name) ||
		name.startsWith("_")
	) {
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: renameRefusalMessage("invalid", name, oldName),
		});
		return undefined;
	}
	const location = desktopIconLocations([path])[path];
	const result = fs.move(path, folder, { name });
	if (!result.ok) {
		dispatch({
			type: "ClassicyDesktopShowErrorDialog",
			message: renameRefusalMessage(result.reason, name, oldName),
		});
		return undefined;
	}
	dispatch({
		type: "ClassicyAppFinderPathsMoved",
		moves: [{ from: path, to: result.path }],
	});
	if (folder === classicyDesktopFolderPath(fs)) {
		const action = classicyDesktopItemIconAction(fs, result.path, location);
		if (action) dispatch(action);
	}
	return result.path;
}

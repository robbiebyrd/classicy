import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type { ClassicyFileDropDestination } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import type {
	ClassicyFileSystem,
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

/**
 * The folder whose contents are the desktop's files and folders — Mac OS 8's
 * invisible "Desktop Folder" at the root of the startup disk (the first drive).
 */
export const CLASSICY_DESKTOP_FOLDER_NAME = "Desktop Folder";

/** `appId` prefix of the desktop icons that stand for Desktop Folder items. */
export const CLASSICY_DESKTOP_ITEM_ICON_PREFIX = "classicy-desktop-item:";

type Dispatch = (action: ActionMessage) => void;

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
			icon: (entry._icon as string | undefined) ?? iconImageByType(entry._type),
		},
		kind: isFolder ? "directory" : "file",
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
};

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
	{ desktopLocation, desktopStep = 72 }: ClassicyFileMoveOptions = {},
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
			moves.forEach(({ to }, index) => {
				const location: [number, number] | undefined = desktopLocation
					? [desktopLocation[0], desktopLocation[1] + index * desktopStep]
					: undefined;
				const action = classicyDesktopItemIconAction(fs, to, location);
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

const trashRefusalMessage = (
	reason: ClassicyTrashRefusal,
	name: string,
): string => {
	switch (reason) {
		case "locked":
			return `“${name}” can’t be moved to the Trash, because it is locked or used by the system software.`;
		default:
			return `“${name}” could not be moved to the Trash.`;
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

/**
 * Move `paths` to the Trash (Finder's Move To Trash, ⌃⌫/Delete, or a drop on
 * the Trash): Finder windows follow trashed folders, desktop items remember
 * where their icons were, and the first refusal is reported in an alert.
 * Returns the moves that happened.
 */
export function moveClassicyItemsToTrash(
	fs: ClassicyFileSystem,
	paths: string[],
	dispatch: Dispatch,
): { from: string; to: string }[] {
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
			return `“${name}” can’t be restored, because the folder it came from no longer exists. Drag it out of the Trash instead.`;
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

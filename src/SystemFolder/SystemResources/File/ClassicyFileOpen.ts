import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopFolderPath } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Open the item at `path` the way the Finder opens one double-clicked: a
 * folder or a disk in a Finder window, brought to the front
 * (`ClassicyAppFinderOpenFolder` with `focus`), any
 * other item through the Finder's open routing (`ClassicyAppFinderOpenFile`:
 * its application, its own OpenFile case or the generic queue, a URL
 * shortcut, an app shortcut, or the Finder's alerts for a system file or an
 * extension). Returns false, dispatching nothing, when nothing is at `path`;
 * the caller says why (Recent Items: the missing-alias alert).
 *
 * Shared by every surface that opens a path it holds, not one the user
 * double-clicked in a window: the Apple menu's Recent Documents, Find File.
 * Its actions are reduced with the trust of the dispatch that carries them,
 * so the open routes, and records a recent document, exactly as a Finder
 * double-click does.
 */
export function openClassicyFileSystemPath(
	fs: ClassicyFileSystem,
	path: string,
	dispatch: (action: ActionMessage) => void,
): boolean {
	const entry = fs.resolve(path);
	if (!entry) return false;
	if (
		entry._type === ClassicyFileSystemEntryFileType.Directory ||
		entry._type === ClassicyFileSystemEntryFileType.Drive
	) {
		dispatch({ type: "ClassicyAppFinderOpenFolder", path, focus: true });
	} else {
		dispatch({ type: "ClassicyAppFinderOpenFile", file: entry, path });
	}
	return true;
}

/** How `revealClassicyFileSystemPath` ended. */
export type ClassicyRevealOutcome = "revealed" | "invisible" | "missing";

/**
 * Reveal the item at `path` the way Find File's Open Enclosing Folder does
 * (Mac OS 8.1): the Finder comes forward with the item selected, in its
 * folder's window, or on the desktop for an item in the Desktop Folder
 * (`ClassicyAppFinderRevealItem`). Dispatches nothing and returns
 * `"missing"` when nothing is at `path`, and `"invisible"` when the item or a
 * folder that holds it is invisible, the Trash included: 8.1 refused those
 * with "Unable to open enclosing folder for “name” because it is invisible
 * (or is inside an invisible folder).", which the caller shows. The Desktop
 * Folder counts as visible (the Mac's is).
 */
export function revealClassicyFileSystemPath(
	fs: ClassicyFileSystem,
	path: string,
	dispatch: (action: ActionMessage) => void,
): ClassicyRevealOutcome {
	if (!fs.resolve(path)) return "missing";
	const desktopFolder = classicyDesktopFolderPath(fs);
	const parts = path.split(fs.separator);
	for (let depth = 1; depth <= parts.length; depth += 1) {
		const ancestor = parts.slice(0, depth).join(fs.separator);
		if (ancestor === desktopFolder) continue;
		if (fs.resolve(ancestor)?._invisible === true) return "invisible";
	}
	dispatch({ type: "ClassicyAppFinderRevealItem", path });
	return "revealed";
}

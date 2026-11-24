import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Open the item at `path` the way the Finder opens one double-clicked: a
 * folder or a disk in a Finder window (`ClassicyAppFinderOpenFolder`), any
 * other item through the Finder's open routing (`ClassicyAppFinderOpenFile`:
 * its application, its own OpenFile case or the generic queue, a URL
 * shortcut, an app shortcut, or the Finder's alerts for a system file or an
 * extension). Returns false, dispatching nothing, when nothing is at `path`;
 * the caller says why (Recent Items: the missing-alias alert).
 *
 * Shared by every surface that opens a path it holds, not one the user
 * double-clicked in a window: the Apple menu's Recent Documents, Find File.
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
		dispatch({ type: "ClassicyAppFinderOpenFolder", path });
	} else {
		dispatch({ type: "ClassicyAppFinderOpenFile", file: entry, path });
	}
	return true;
}

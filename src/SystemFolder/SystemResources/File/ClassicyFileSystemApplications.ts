import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export const APP_SHORTCUT_ICON_KIND = "app_shortcut";

/**
 * Derives the virtual "Applications" folder from the desktop's registered
 * app-shortcut icons. The result is merged into the live file system tree at
 * read time (see useClassicyFileSystem) and is never persisted, so the folder
 * always mirrors the apps currently mounted.
 */
export const buildApplicationsFolder = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.applications,
		_readOnly: true,
	};

	for (const icon of icons) {
		if (icon.kind !== APP_SHORTCUT_ICON_KIND) continue;
		folder[icon.appName] = {
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: icon.icon,
			_creator: icon.appId,
			_readOnly: true,
			_nameLocked: true,
		};
	}

	return folder;
};

/**
 * Returns a copy of the tree with the derived Applications folder merged into
 * its first drive. Consumer-provided static Applications children are kept;
 * derived entries win on name collisions. The input tree is not mutated, and
 * a tree with no drive — or a desktop with no app-shortcut icons — passes
 * through unchanged.
 */
export const withApplicationsFolder = (
	tree: ClassicyFileSystemEntry,
	icons: ClassicyStoreSystemDesktopManagerIcon[],
): ClassicyFileSystemEntry => {
	if (!icons.some((i) => i.kind === APP_SHORTCUT_ICON_KIND)) return tree;

	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const existing = tree[driveKey].Applications;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			Applications: { ...existing, ...buildApplicationsFolder(icons) },
		},
	};
};

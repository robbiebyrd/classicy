import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export const SYSTEM_FOLDER_NAME = "System Folder";

/**
 * Derives the virtual "System Folder/Extensions" directory from the app
 * manager's registered extension apps. Like the Applications folder, the
 * result is merged into the live file system tree at read time (see
 * useClassicyFileSystem) and never persisted, so the folder always mirrors
 * the extensions currently mounted.
 */
export const buildExtensionsFolder = (
	apps: ClassicyStoreSystemApp[],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.extensions,
		_readOnly: true,
	};

	for (const app of apps) {
		if (!app.extension) continue;
		folder[app.name] = {
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: app.icon,
			_creator: app.id,
			_readOnly: true,
			_nameLocked: true,
		};
	}

	return folder;
};

/**
 * Returns a copy of the tree with the derived Extensions folder merged into
 * "System Folder" on its first drive (creating the folder when a custom tree
 * lacks one). Static Extensions children are kept; derived entries win on
 * name collisions. The input tree is not mutated, and a tree with no drive —
 * or a store with no extension apps — passes through unchanged.
 */
export const withExtensionsFolder = (
	tree: ClassicyFileSystemEntry,
	apps: ClassicyStoreSystemApp[],
): ClassicyFileSystemEntry => {
	if (!apps.some((a) => a.extension)) return tree;

	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const systemFolder = tree[driveKey][SYSTEM_FOLDER_NAME] ?? {
		_type: ClassicyFileSystemEntryFileType.Directory,
	};
	const existing = systemFolder.Extensions;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			[SYSTEM_FOLDER_NAME]: {
				...systemFolder,
				Extensions: { ...existing, ...buildExtensionsFolder(apps) },
			},
		},
	};
};

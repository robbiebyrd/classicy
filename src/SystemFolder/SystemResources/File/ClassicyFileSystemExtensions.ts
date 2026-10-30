import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDerivedAppEntryNames } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	withoutDerivedEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const SYSTEM_FOLDER_NAME = "System Folder";

/**
 * Derives the virtual "System Folder/Extensions" directory from the app
 * manager's registered extension apps. Like the Applications folder, the
 * result is merged into the live file system tree at read time (see
 * useClassicyFileSystem) and never persisted, so the folder always mirrors
 * the extensions currently mounted.
 *
 * Like the Applications folder, entries are keyed by display name under
 * `overrides` and drawn with the display icon, with `_creator` the app id, and
 * `reservedNames` (the folder's static entries) are kept free of display
 * names (see `classicyDerivedAppEntryNames`).
 */
export const buildExtensionsFolder = (
	apps: ClassicyStoreSystemApp[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
	reservedNames: Iterable<string> = [],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.extensions,
		_readOnly: true,
	};

	const listed = apps.filter((app) => app.extension);
	const identities = listed.map((app) =>
		classicyAppIdentityFrom(overrides, app.id, {
			name: app.name,
			icon: app.icon,
		}),
	);
	const names = classicyDerivedAppEntryNames(
		"Extensions",
		listed.map((app, i) => ({
			appId: app.id,
			name: app.name,
			displayName: identities[i].name,
		})),
		reservedNames,
		separator,
	);
	listed.forEach((app, i) => {
		folder[names[i]] = {
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: identities[i].icon,
			_creator: app.id,
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		};
	});

	return folder;
};

/**
 * Returns a copy of the tree with the derived Extensions folder merged into
 * "System Folder" on its first drive (creating the folder when a custom tree
 * lacks one). Static Extensions children are kept: a display name never
 * takes one's name, though an extension shown under its own name still
 * replaces a static child of that name. Entries from an earlier build whose
 * extension is gone are dropped. The input tree is not mutated, and a tree with no drive — or
 * with nothing to add or drop — passes through unchanged. `overrides` and
 * `separator` go to `buildExtensionsFolder`.
 */
export const withExtensionsFolder = (
	tree: ClassicyFileSystemEntry,
	apps: ClassicyStoreSystemApp[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
): ClassicyFileSystemEntry => {
	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const systemFolder = tree[driveKey][SYSTEM_FOLDER_NAME];
	const current = systemFolder?.Extensions;
	const kept = withoutDerivedEntries(current);
	const hasSources = apps.some((a) => a.extension);
	if (!hasSources && kept === current) return tree;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			[SYSTEM_FOLDER_NAME]: {
				...(systemFolder ?? {
					_type: ClassicyFileSystemEntryFileType.Directory,
				}),
				Extensions: hasSources
					? {
							...kept,
							...buildExtensionsFolder(
								apps,
								overrides,
								separator,
								Object.keys(kept ?? {}).filter((key) => !key.startsWith("_")),
							),
						}
					: (kept as ClassicyFileSystemEntry),
			},
		},
	};
};

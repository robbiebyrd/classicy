import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	withoutDerivedEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

export const APP_SHORTCUT_ICON_KIND = "app_shortcut";

/**
 * The key a derived folder (Applications, Extensions) gives an app: its
 * display name when the name is usable as a file-system key here, else its
 * own name. A display name is unusable when an earlier entry of this build
 * (`taken`) already has it, when it contains the file-system separator, or
 * when it starts with `_` (metadata keys). Each fallback logs one warning.
 * An app's own name is used as is, even when taken, so two apps sharing one
 * name stay last-wins, as they were before display names. The caller adds
 * the returned key to `taken`.
 */
export const classicyDerivedAppEntryName = (
	folderName: string,
	taken: ReadonlySet<string>,
	appId: string,
	ownName: string,
	displayName: string,
	separator: string,
): string => {
	if (displayName === ownName) return ownName;
	const usable =
		!taken.has(displayName) &&
		!(separator !== "" && displayName.includes(separator)) &&
		!displayName.startsWith("_");
	if (usable) return displayName;
	classicyLog(
		"warn",
		"ClassicyFileSystem",
		`App display name unusable in ${folderName}; using its own name`,
		{ appId, name: displayName },
	);
	return ownName;
};

/** An icon belongs in the derived Applications folder when it is an app
 *  shortcut that has not opted out. Undefined `inApplications` means opted in,
 *  so icons persisted before the field existed keep appearing. */
const isApplicationsEntry = (
	icon: ClassicyStoreSystemDesktopManagerIcon,
): boolean =>
	icon.kind === APP_SHORTCUT_ICON_KIND && icon.inApplications !== false;

/**
 * Derives the virtual "Applications" folder from the desktop's registered
 * app-shortcut icons that have not opted out. The result is merged into the
 * live file system tree at
 * read time (see useClassicyFileSystem) and is never persisted, so the folder
 * always mirrors the apps currently mounted.
 *
 * Each entry is keyed by the app's display name under `overrides` (the active
 * Appearance Package's `apps`) and drawn with its display icon; `_creator`
 * stays the app id, which is what opens it. Entries are named in icon order;
 * a display name that cannot be used falls back to the app's own name (see
 * `classicyDerivedAppEntryName`).
 */
export const buildApplicationsFolder = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.applications,
		_readOnly: true,
	};

	const taken = new Set<string>();
	for (const icon of icons) {
		if (!isApplicationsEntry(icon)) continue;
		const identity = classicyAppIdentityFrom(overrides, icon.appId, {
			name: icon.appName,
			icon: icon.icon,
		});
		const name = classicyDerivedAppEntryName(
			"Applications",
			taken,
			icon.appId,
			icon.appName,
			identity.name,
			separator,
		);
		taken.add(name);
		folder[name] = {
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: identity.icon,
			_creator: icon.appId,
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		};
	}

	return folder;
};

/**
 * Returns a copy of the tree with the derived Applications folder merged into
 * its first drive. Consumer-provided static Applications children are kept;
 * derived entries win on name collisions, and entries from an earlier build
 * whose app is gone are dropped. The input tree is not mutated, and a tree
 * with no drive — or with nothing to add or drop — passes through unchanged.
 * `overrides` and `separator` go to `buildApplicationsFolder`.
 */
export const withApplicationsFolder = (
	tree: ClassicyFileSystemEntry,
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
): ClassicyFileSystemEntry => {
	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const current = tree[driveKey].Applications;
	const kept = withoutDerivedEntries(current);
	const hasApps = icons.some(isApplicationsEntry);
	if (!hasApps && kept === current) return tree;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			Applications: hasApps
				? { ...kept, ...buildApplicationsFolder(icons, overrides, separator) }
				: (kept as ClassicyFileSystemEntry),
		},
	};
};

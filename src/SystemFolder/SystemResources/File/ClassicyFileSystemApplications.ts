import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	resetClassicyDerivedEntryNameWarnings,
	warnClassicyDerivedEntryNameFallback,
} from "@/SystemFolder/SystemResources/File/ClassicyDerivedEntryNameWarnings.internal";
import {
	classicyDerivedFolderReservedNames,
	classicyFreeDerivedEntryName,
} from "@/SystemFolder/SystemResources/File/ClassicyDerivedFolderPlaceholders.internal";
import { classicyCoreIcon } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemCoreIcon.internal";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	withoutDerivedEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export const APP_SHORTCUT_ICON_KIND = "app_shortcut";

/** One app a derived folder lists: its id, its own name, and its display name. */
export type ClassicyDerivedAppEntrySource = {
	appId: string;
	name: string;
	displayName: string;
};

/** Test helper: report every derived-folder name fallback again
 *  (Applications, Extensions and Control Strip Modules). */
export const resetClassicyDerivedAppEntryNameWarnings = (): void => {
	resetClassicyDerivedEntryNameWarnings();
};

/**
 * The keys a derived folder (Applications, Extensions) gives its apps, in
 * `sources` order, so that no app drops out of the folder and no static
 * entry is overwritten (K-D3, K-R4, story 0096):
 *
 * - `reservedNames` (the folder's static entries, placeholders aside) and the
 *   own names of apps shown under their own name are taken before any
 *   display name is placed.
 * - An app shown under its own name keeps it unless a static entry holds it
 *   (two such apps sharing a name stay last-wins).
 * - A display name is placed when it is free, holds no `separator` and does
 *   not start with `_` (metadata keys). Otherwise the app falls back to its
 *   own name, or to "<own name> (<id>)" when that is taken too, the form the
 *   Control Strip Modules folder uses (numbered when a static entry holds
 *   even that); each fallback warns once.
 */
export const classicyDerivedAppEntryNames = (
	folderName: string,
	sources: readonly ClassicyDerivedAppEntrySource[],
	reservedNames: Iterable<string>,
	separator: string,
): string[] => {
	const reserved = new Set(reservedNames);
	const taken = new Set(reserved);
	for (const source of sources) {
		if (source.displayName === source.name) taken.add(source.name);
	}
	return sources.map(({ appId, name, displayName }) => {
		if (displayName === name && !reserved.has(name)) return name;
		const usable =
			!taken.has(displayName) &&
			!(separator !== "" && displayName.includes(separator)) &&
			!displayName.startsWith("_");
		if (usable) {
			taken.add(displayName);
			return displayName;
		}
		const fallback = taken.has(name)
			? classicyFreeDerivedEntryName(`${name} (${appId})`, (candidate) =>
					taken.has(candidate),
				)
			: name;
		taken.add(fallback);
		warnClassicyDerivedEntryNameFallback(
			folderName,
			displayName,
			appId,
			name,
			fallback,
			{ appId, name: displayName },
		);
		return fallback;
	});
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
 * stays the app id, which is what opens it. Entries are named in icon order,
 * and no app takes one of `reservedNames` (the folder's static entries) (see
 * `classicyDerivedAppEntryNames`).
 */
export const buildApplicationsFolder = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
	reservedNames: Iterable<string> = [],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: classicyCoreIcon("system.folders.applications"),
		_readOnly: true,
	};

	const listed = icons.filter(isApplicationsEntry);
	const identities = listed.map((icon) =>
		classicyAppIdentityFrom(overrides, icon.appId, {
			name: icon.appName,
			icon: icon.icon,
		}),
	);
	const names = classicyDerivedAppEntryNames(
		"Applications",
		listed.map((icon, i) => ({
			appId: icon.appId,
			name: icon.appName,
			displayName: identities[i].name,
		})),
		reservedNames,
		separator,
	);
	listed.forEach((icon, i) => {
		folder[names[i]] = {
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: identities[i].icon,
			_creator: icon.appId,
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		};
	});

	return folder;
};

/**
 * Returns a copy of the tree with the derived Applications folder merged into
 * its first drive. Static Applications children, a user's files among them,
 * are kept: no app takes one's name. Only an untouched placeholder (a
 * `_placeholder` entry exactly as seeded, or the unmarked SimpleText and
 * Calculator stand-ins older builds stored) gives way to the app of its name. Entries from an earlier build
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
				? {
						...kept,
						...buildApplicationsFolder(
							icons,
							overrides,
							separator,
							classicyDerivedFolderReservedNames(kept, {
								legacyApplicationsPlaceholders: true,
							}),
						),
					}
				: (kept as ClassicyFileSystemEntry),
		},
	};
};

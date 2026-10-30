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

/** One app a derived folder lists: its id, its own name, and its display name. */
export type ClassicyDerivedAppEntrySource = {
	appId: string;
	name: string;
	displayName: string;
};

// Every fallback already warned about, keyed on folder, display name and the
// losing app id: the derived folders rebuild on every file-system change, so
// a collision is reported once, not once per build (K-R3).
const warnedDerivedAppEntryFallbacks = new Set<string>();

/** Test helper: report every derived-folder name fallback again. */
export const resetClassicyDerivedAppEntryNameWarnings = (): void => {
	warnedDerivedAppEntryFallbacks.clear();
};

/**
 * The keys a derived folder (Applications, Extensions) gives its apps, in
 * `sources` order, so that no app drops out of the folder and no static
 * entry is overwritten by a display name (K-D3, K-R4):
 *
 * - `reservedNames` (the folder's static entries) and the own names of apps
 *   shown under their own name are taken before any display name is placed.
 * - An app shown under its own name keeps it, as before display names (two
 *   such apps sharing a name stay last-wins, and one still replaces a static
 *   entry of that name).
 * - A display name is placed when it is free, holds no `separator` and does
 *   not start with `_` (metadata keys). Otherwise the app falls back to its
 *   own name, or to "<own name> (<id>)" when that is taken too, the form the
 *   Control Strip Modules folder uses; each fallback warns once.
 */
export const classicyDerivedAppEntryNames = (
	folderName: string,
	sources: readonly ClassicyDerivedAppEntrySource[],
	reservedNames: Iterable<string>,
	separator: string,
): string[] => {
	const taken = new Set(reservedNames);
	for (const source of sources) {
		if (source.displayName === source.name) taken.add(source.name);
	}
	return sources.map(({ appId, name, displayName }) => {
		if (displayName === name) return name;
		const usable =
			!taken.has(displayName) &&
			!(separator !== "" && displayName.includes(separator)) &&
			!displayName.startsWith("_");
		if (usable) {
			taken.add(displayName);
			return displayName;
		}
		const fallback = taken.has(name) ? `${name} (${appId})` : name;
		taken.add(fallback);
		const warning = `${folderName}\u0000${displayName}\u0000${appId}`;
		if (!warnedDerivedAppEntryFallbacks.has(warning)) {
			warnedDerivedAppEntryFallbacks.add(warning);
			// Names the form the app is listed under: its own name, or the
			// "<own name> (<id>)" suffix form.
			const used = fallback === name ? "its own name" : `"${fallback}"`;
			classicyLog(
				"warn",
				"ClassicyFileSystem",
				`App display name unusable in ${folderName}; using ${used}`,
				{ appId, name: displayName },
			);
		}
		return fallback;
	});
};

/** The names of a folder's static entries (metadata keys aside), which a
 *  display name may not take. */
const staticEntryNames = (
	folder: ClassicyFileSystemEntry | undefined,
): string[] =>
	folder ? Object.keys(folder).filter((key) => !key.startsWith("_")) : [];

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
 * with `reservedNames` (the folder's static entries) kept free of display
 * names (see `classicyDerivedAppEntryNames`).
 */
export const buildApplicationsFolder = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	separator = ":",
	reservedNames: Iterable<string> = [],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.applications,
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
 * its first drive. Consumer-provided static Applications children are kept: a
 * display name never takes one's name, though an app shown under its own name
 * still replaces a static child of that name. Entries from an earlier build
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
							staticEntryNames(kept),
						),
					}
				: (kept as ClassicyFileSystemEntry),
		},
	};
};

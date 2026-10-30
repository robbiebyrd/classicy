import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { warnClassicyDerivedEntryNameFallback } from "@/SystemFolder/SystemResources/File/ClassicyDerivedEntryNameWarnings.internal";
import {
	classicyDerivedFolderReservedNames,
	classicyFreeDerivedEntryName,
} from "@/SystemFolder/SystemResources/File/ClassicyDerivedFolderPlaceholders.internal";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	withoutDerivedEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const SYSTEM_FOLDER_NAME = "System Folder";
export const CONTROL_STRIP_MODULES_FOLDER_NAME = "Control Strip Modules";

/** One installed Control Strip module, as the file system lists it. */
export type ClassicyControlStripModuleFile = {
	id: string;
	/** File name: the module's label, or its owning app's display name
	 *  (`classicyControlStripModuleLabel`). */
	name: string;
	/** The module's own label. When it differs from `name`, `name` is a
	 *  display name, which never hides a static file (K-R7). Omitted, `name`
	 *  is the module's own label. */
	label?: string;
	/** Finder icon (32 px). */
	icon: string;
	/** The owning app, when the module declares one. */
	appId?: string;
};

/**
 * Derives the virtual "System Folder/Control Strip Modules" directory from
 * the registered Control Strip modules — one read-only file per module, the
 * way Mac OS 8 kept each module as a file there. Like the Extensions folder,
 * it is merged into the live tree at read time (see useClassicyFileSystem) and
 * never persisted, so it always mirrors the modules currently installed.
 *
 * Module files share the Extension type: like an extension, a module adds to
 * the system and is not a document Finder can open. Two modules with the same
 * name are told apart by id. No module takes one of `reservedNames` (the
 * folder's static entries): one shown under a display name falls back to its
 * own label, then to "<label> (<id>)"; one shown under its own label goes
 * straight to "<label> (<id>)", numbered when a static entry holds even that.
 * Each fallback warns once (K-R7, story 0096).
 */
export const buildControlStripModulesFolder = (
	modules: readonly ClassicyControlStripModuleFile[],
	reservedNames: Iterable<string> = [],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.controlStrip,
		_readOnly: true,
	};
	const reserved = new Set(reservedNames);
	const isTaken = (candidate: string) =>
		reserved.has(candidate) || Object.hasOwn(folder, candidate);

	for (const module of modules) {
		const label = module.label ?? module.name;
		let name: string;
		if (reserved.has(module.name)) {
			name =
				module.name !== label && !isTaken(label)
					? label
					: classicyFreeDerivedEntryName(`${label} (${module.id})`, isTaken);
			warnClassicyDerivedEntryNameFallback(
				CONTROL_STRIP_MODULES_FOLDER_NAME,
				module.name,
				module.id,
				label,
				name,
				{ moduleId: module.id, appId: module.appId, name: module.name },
			);
		} else {
			// Unreserved, the name can only be another module's (K-R2).
			name = Object.hasOwn(folder, module.name)
				? classicyFreeDerivedEntryName(`${module.name} (${module.id})`, isTaken)
				: module.name;
		}
		folder[name] = {
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: module.icon,
			_creator: module.appId ?? "ControlStrip",
			_format: "ControlStripModule",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		};
	}

	return folder;
};

/**
 * Returns a copy of the tree with the derived Control Strip Modules folder
 * merged into "System Folder" on its first drive (creating System Folder when
 * a custom tree lacks one). Static children of the folder, a user's files
 * among them, are kept: no module takes one's name, and only a `_placeholder`
 * entry still exactly as seeded gives way to the module of its name. Entries from an earlier build
 * whose module is gone are dropped. The input is not mutated, and a tree with no
 * drive — or with nothing to add or drop — passes through unchanged.
 */
export const withControlStripModulesFolder = (
	tree: ClassicyFileSystemEntry,
	modules: readonly ClassicyControlStripModuleFile[],
): ClassicyFileSystemEntry => {
	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const systemFolder = tree[driveKey][SYSTEM_FOLDER_NAME];
	const current = systemFolder?.[CONTROL_STRIP_MODULES_FOLDER_NAME];
	const kept = withoutDerivedEntries(current);
	const hasSources = modules.length > 0;
	if (!hasSources && kept === current) return tree;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			[SYSTEM_FOLDER_NAME]: {
				...(systemFolder ?? {
					_type: ClassicyFileSystemEntryFileType.Directory,
				}),
				[CONTROL_STRIP_MODULES_FOLDER_NAME]: hasSources
					? {
							...kept,
							...buildControlStripModulesFolder(
								modules,
								classicyDerivedFolderReservedNames(kept),
							),
						}
					: (kept as ClassicyFileSystemEntry),
			},
		},
	};
};

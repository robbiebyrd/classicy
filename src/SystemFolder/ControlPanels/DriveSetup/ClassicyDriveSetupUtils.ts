import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { getClassicyFileSystemAdapters } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export type DriveRow = {
	/** Volume name — the top-level filesystem key. */
	name: string;
	/** Friendly volume type. */
	type: string;
	/** SCSI-era bus label (synthesized unless overridden by `_bus`). */
	bus: string;
	/** SCSI id (synthesized unless overridden by `_scsiId`). */
	id: string;
	/** Logical unit number (synthesized unless overridden by `_lun`). */
	lun: string;
};

/** Derive one table row per top-level drive-type entry. */
export function getDriveRows(fs: ClassicyFileSystem): DriveRow[] {
	const drives = fs.filterByType("", ClassicyFileSystemEntryFileType.Drive);
	return Object.entries(drives).map(([name, meta], index) => ({
		name,
		type:
			typeof meta._driveType === "string" ? meta._driveType : "Classicy Volume",
		bus: typeof meta._bus === "string" ? meta._bus : "ATA",
		id: typeof meta._scsiId === "string" ? meta._scsiId : String(index),
		lun: typeof meta._lun === "string" ? meta._lun : "0",
	}));
}

/**
 * Return a new tree with only `driveName` reset to its default subtree; all
 * other drives are preserved. A drive absent from `resolvedDefault` is
 * reinitialized to a bare drive entry (metadata retained, children dropped).
 */
export function resetDriveInTree(
	currentTree: ClassicyFileSystemTree,
	driveName: string,
	resolvedDefault: ClassicyFileSystemTree,
): ClassicyFileSystemTree {
	const next: ClassicyFileSystemTree = { ...currentTree };
	const defaultDrive = resolvedDefault[driveName];
	if (defaultDrive) {
		next[driveName] = structuredClone(defaultDrive);
	} else if (next[driveName]) {
		const bare: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(next[driveName])) {
			// Keep only metadata keys (leading underscore), drop child entries.
			if (key.startsWith("_")) bare[key] = value;
		}
		next[driveName] = bare as ClassicyFileSystemTree[string];
	}
	return next;
}

/** Connected ("logged in") = at least one filesystem sync adapter registered. */
export function isDriveSyncConnected(): boolean {
	return getClassicyFileSystemAdapters().length > 0;
}

/**
 * The right-click menu for a desktop drive icon. Items are event-driven
 * (serializable — desktop icons persist to localStorage and cannot hold
 * closures). Sync/Backup are disabled unless connected.
 */
export function buildDriveContextMenu(
	drive: string,
	isConnected: boolean,
	options: {
		/**
		 * Lead with Open, the menu's default item (Explorer's commands,
		 * `layout.finder.commands` "windows"; WIG Ch.5 "Default Operations
		 * and Shortcut Techniques", p.45): it opens the drive's window, the
		 * command a double-click runs. Mac OS 8's Finder sets no default item
		 * in a contextual menu (HIGOS8 "Contextual Menus", pp.94-95), so it is
		 * off unless asked for.
		 */
		open?: boolean;
		/** Open's access key, when the package gives one (shell32.dll's "&Open"). */
		openAccessKey?: string;
	} = {},
): ClassicyMenuItem[] {
	return [
		...(options.open
			? [
					{
						id: `drive_${drive}_open`,
						title: "Open",
						...(options.openAccessKey !== undefined
							? { accessKey: options.openAccessKey }
							: {}),
						isDefault: true,
						event: "ClassicyAppFinderOpenFolder",
						eventData: { path: drive },
					},
					{ id: "spacer" },
				]
			: []),
		{
			id: `drive_${drive}_initialize`,
			title: "Initialize…",
			event: "ClassicyDesktopDriveSetupInitialize",
			eventData: { drive },
		},
		{
			id: `drive_${drive}_sync`,
			title: "Sync",
			event: "ClassicyDesktopDriveSetupSync",
			eventData: { drive },
			disabled: !isConnected,
		},
		{
			id: `drive_${drive}_backup`,
			title: "Backup",
			event: "ClassicyDesktopDriveSetupBackup",
			eventData: { drive },
			disabled: !isConnected,
		},
	];
}

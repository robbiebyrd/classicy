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
		type: typeof meta._driveType === "string" ? meta._driveType : "Macintosh Volume",
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
): ClassicyMenuItem[] {
	return [
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

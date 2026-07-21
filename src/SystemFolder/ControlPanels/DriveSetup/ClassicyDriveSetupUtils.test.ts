import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	buildDriveContextMenu,
	getDriveRows,
	isDriveSyncConnected,
	resetDriveInTree,
} from "./ClassicyDriveSetupUtils";

describe("getDriveRows", () => {
	it("derives one row per top-level drive with synthesized bus/id/lun defaults", () => {
		const tree = {
			"Macintosh HD": { _type: "drive", Documents: { _type: "directory" } },
			"Backup Disk": { _type: "drive" },
		};
		const fs = new ClassicyFileSystem("test_rows", tree);
		const rows = getDriveRows(fs);
		expect(rows.map((r) => r.name)).toEqual(["Macintosh HD", "Backup Disk"]);
		expect(rows[0]).toMatchObject({
			type: "Macintosh Volume",
			bus: "ATA",
			id: "0",
			lun: "0",
		});
		expect(rows[1].id).toBe("1");
	});

	it("uses metadata overrides when present", () => {
		const tree = {
			SCSI0: {
				_type: "drive",
				_driveType: "CD-ROM",
				_bus: "SCSI",
				_scsiId: "3",
				_lun: "1",
			},
		};
		const fs = new ClassicyFileSystem("test_rows_meta", tree);
		expect(getDriveRows(fs)[0]).toMatchObject({
			name: "SCSI0",
			type: "CD-ROM",
			bus: "SCSI",
			id: "3",
			lun: "1",
		});
	});
});

describe("resetDriveInTree", () => {
	const resolvedDefault = {
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			System: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	};

	it("resets only the named drive to its default subtree", () => {
		const current = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Junk: { _type: ClassicyFileSystemEntryFileType.File },
			},
			"Backup Disk": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Keep: { _type: ClassicyFileSystemEntryFileType.File },
			},
		};
		const next = resetDriveInTree(current, "Macintosh HD", resolvedDefault);
		expect(next["Macintosh HD"]).toEqual(resolvedDefault["Macintosh HD"]);
		expect(next["Macintosh HD"].Junk).toBeUndefined();
		// Other drives untouched.
		expect(next["Backup Disk"].Keep).toBeDefined();
	});

	it("deep-copies the default so later mutation does not leak back", () => {
		const current = {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		const next = resetDriveInTree(current, "Macintosh HD", resolvedDefault);
		next["Macintosh HD"].System._type = "changed";
		expect(resolvedDefault["Macintosh HD"].System._type).toBe("directory");
	});

	it("reinitializes a drive absent from defaults to a bare entry", () => {
		const current = {
			"USB Stick": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				_icon: "x",
				File: { _type: ClassicyFileSystemEntryFileType.File },
			},
		};
		const next = resetDriveInTree(current, "USB Stick", resolvedDefault);
		expect(next["USB Stick"]).toEqual({
			_type: ClassicyFileSystemEntryFileType.Drive,
			_icon: "x",
		});
	});
});

describe("isDriveSyncConnected", () => {
	it("is false with no adapters and true once one is registered", () => {
		expect(isDriveSyncConnected()).toBe(false);
		registerClassicyFileSystemAdapter({ id: "test-adapter" });
		expect(isDriveSyncConnected()).toBe(true);
		unregisterClassicyFileSystemAdapter("test-adapter");
		expect(isDriveSyncConnected()).toBe(false);
	});
});

describe("buildDriveContextMenu", () => {
	it("emits three event-driven items with the drive in eventData", () => {
		const menu = buildDriveContextMenu("Macintosh HD", true);
		expect(menu.map((m) => m.event)).toEqual([
			"ClassicyDesktopDriveSetupInitialize",
			"ClassicyDesktopDriveSetupSync",
			"ClassicyDesktopDriveSetupBackup",
		]);
		expect(menu.every((m) => m.eventData?.drive === "Macintosh HD")).toBe(true);
	});

	it("disables Sync and Backup when not connected, Initialize stays enabled", () => {
		const menu = buildDriveContextMenu("Macintosh HD", false);
		const byEvent = Object.fromEntries(menu.map((m) => [m.event, m]));
		expect(byEvent.ClassicyDesktopDriveSetupInitialize.disabled).toBeFalsy();
		expect(byEvent.ClassicyDesktopDriveSetupSync.disabled).toBe(true);
		expect(byEvent.ClassicyDesktopDriveSetupBackup.disabled).toBe(true);
	});
});

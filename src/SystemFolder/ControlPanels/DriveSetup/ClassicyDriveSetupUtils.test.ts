import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	getDriveRows,
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
		expect(rows[0]).toMatchObject({ type: "Macintosh Volume", bus: "ATA", id: "0", lun: "0" });
		expect(rows[1].id).toBe("1");
	});

	it("uses metadata overrides when present", () => {
		const tree = {
			SCSI0: { _type: "drive", _driveType: "CD-ROM", _bus: "SCSI", _scsiId: "3", _lun: "1" },
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
		const current = { "Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive } };
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
		expect(next["USB Stick"]).toEqual({ _type: ClassicyFileSystemEntryFileType.Drive, _icon: "x" });
	});
});

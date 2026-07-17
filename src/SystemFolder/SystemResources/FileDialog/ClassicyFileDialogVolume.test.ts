import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { desktopVolume, fileSystemVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";

describe("fileSystemVolume", () => {
	it("lists a folder with folders first, files sorted, invisible entries hidden", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: { _type: ClassicyFileSystemEntryFileType.Directory, _invisible: true },
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = fileSystemVolume(fs, "Macintosh HD");
		const entries = await vol.list(["Documents"]);
		expect(entries.map((e) => e.name)).toEqual(["notes.txt", "Report.pdf"]);
		expect(entries[1]).toMatchObject({
			kind: "file",
			fileType: "pdf",
			meta: { classicyPath: "Macintosh HD:Documents:Report.pdf" },
		});
	});
	it("lists the drive root at path []", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: { _type: ClassicyFileSystemEntryFileType.Directory, _invisible: true },
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = fileSystemVolume(fs, "Macintosh HD");
		const entries = await vol.list([]);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ name: "Documents", kind: "folder" });
	});
});

describe("desktopVolume", () => {
	it("lists top-level drives as folders at the root", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: { _type: ClassicyFileSystemEntryFileType.Directory, _invisible: true },
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = desktopVolume(fs);
		const entries = await vol.list([]);
		expect(entries[0]).toMatchObject({ name: "Macintosh HD", kind: "folder", fileType: "drive" });
	});
	it("descends through a drive", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: { _type: ClassicyFileSystemEntryFileType.Directory, _invisible: true },
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = desktopVolume(fs);
		const entries = await vol.list(["Macintosh HD", "Documents"]);
		expect(entries.map((e) => e.name)).toEqual(["notes.txt", "Report.pdf"]);
	});
});

import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	desktopVolume,
	fileSystemVolume,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";

describe("fileSystemVolume", () => {
	it("lists a folder with folders first, files sorted, invisible entries hidden", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						_invisible: true,
					},
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
					Secret: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						_invisible: true,
					},
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
					Secret: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						_invisible: true,
					},
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = desktopVolume(fs);
		const entries = await vol.list([]);
		expect(entries[0]).toMatchObject({
			name: "Macintosh HD",
			kind: "folder",
			fileType: "drive",
		});
	});
	it("descends through a drive", async () => {
		const FIXTURE = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Report.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
					"notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					Secret: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						_invisible: true,
					},
				},
			},
		};
		const fs = new ClassicyFileSystem("fileDialogTest", FIXTURE);
		const vol = desktopVolume(fs);
		const entries = await vol.list(["Macintosh HD", "Documents"]);
		expect(entries.map((e) => e.name)).toEqual(["notes.txt", "Report.pdf"]);
	});
});

describe("write and mkDir capabilities", () => {
	const FIXTURE = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
			},
		},
	});

	it("fileSystemVolume.write creates a file entry through the drive prefix", async () => {
		const fs = new ClassicyFileSystem("fileDialogWriteTest", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await vol.write?.(["Documents"], "New.stack", {
			data: "STACK",
			fileType: "stack",
		});
		const entry = fs.resolve("Macintosh HD:Documents:New.stack");
		expect(entry._type).toBe("stack");
		expect(entry._data).toBe("STACK");
		const listed = await vol.list(["Documents"]);
		expect(listed.map((e) => e.name)).toContain("New.stack");
	});

	it("desktopVolume.write writes at the desktop-relative path", async () => {
		const fs = new ClassicyFileSystem("fileDialogDesktopWriteTest", FIXTURE());
		const vol = desktopVolume(fs);
		await vol.write?.(["Macintosh HD", "Documents"], "Note.txt", {
			data: "hi",
			fileType: "text_file",
			icon: "custom.png",
		});
		const entry = fs.resolve("Macintosh HD:Documents:Note.txt");
		expect(entry._data).toBe("hi");
		expect(entry._icon).toBe("custom.png");
	});

	it("mkDir creates a folder that then lists", async () => {
		const fs = new ClassicyFileSystem("fileDialogMkdirTest", FIXTURE());
		const vol = desktopVolume(fs);
		await vol.mkDir?.(["Macintosh HD", "Documents"], "Projects");
		expect(fs.resolve("Macintosh HD:Documents:Projects")._type).toBe(
			"directory",
		);
		const listed = await vol.list(["Macintosh HD", "Documents"]);
		expect(listed[0]).toMatchObject({ name: "Projects", kind: "folder" });
	});
});

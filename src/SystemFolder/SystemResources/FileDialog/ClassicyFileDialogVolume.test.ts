import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	ClassicyFileExistsError,
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

	it("fileSystemVolume.write rejects for a forbidden file name instead of resolving", async () => {
		const fs = new ClassicyFileSystem("fileDialogWriteRefuseTest", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await expect(
			vol.write?.(["Documents"], "__proto__", {
				data: "payload",
				fileType: "text_file",
			}),
		).rejects.toThrow();
	});

	it("desktopVolume.write rejects for a forbidden file name instead of resolving", async () => {
		const fs = new ClassicyFileSystem(
			"fileDialogDesktopWriteRefuseTest",
			FIXTURE(),
		);
		const vol = desktopVolume(fs);
		await expect(
			vol.write?.(["Macintosh HD", "Documents"], "__proto__", {
				data: "payload",
				fileType: "text_file",
			}),
		).rejects.toThrow();
	});

	it("fileSystemVolume.mkDir rejects for a folder name deepMerge silently drops", async () => {
		const fs = new ClassicyFileSystem("fileDialogMkdirRefuseTest", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await expect(vol.mkDir?.(["Documents"], "__proto__")).rejects.toThrow();
	});

	it("desktopVolume.mkDir rejects for a folder name deepMerge silently drops", async () => {
		const fs = new ClassicyFileSystem(
			"fileDialogDesktopMkdirRefuseTest",
			FIXTURE(),
		);
		const vol = desktopVolume(fs);
		await expect(
			vol.mkDir?.(["Macintosh HD", "Documents"], "__proto__"),
		).rejects.toThrow();
	});
});

describe("write overwrite guard", () => {
	const FIXTURE = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"notes.txt": {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "original",
				},
				Projects: { _type: ClassicyFileSystemEntryFileType.Directory },
			},
		},
	});

	it("rejects overwriting an existing file when overwrite is false", async () => {
		const fs = new ClassicyFileSystem("fdWriteNoOverwrite", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await expect(
			vol.write?.(
				["Documents"],
				"notes.txt",
				{ data: "changed", fileType: "text_file" },
				{ overwrite: false },
			),
		).rejects.toBeInstanceOf(ClassicyFileExistsError);
		// The existing file is untouched.
		expect(fs.resolve("Macintosh HD:Documents:notes.txt")._data).toBe(
			"original",
		);
	});

	it("replaces an existing file when overwrite is true", async () => {
		const fs = new ClassicyFileSystem("fdWriteOverwrite", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await vol.write?.(
			["Documents"],
			"notes.txt",
			{ data: "changed", fileType: "text_file" },
			{ overwrite: true },
		);
		expect(fs.resolve("Macintosh HD:Documents:notes.txt")._data).toBe(
			"changed",
		);
	});

	it("never replaces a same-named folder, even with overwrite true", async () => {
		const fs = new ClassicyFileSystem("fdWriteFolder", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await expect(
			vol
				.write?.(
					["Documents"],
					"Projects",
					{ data: "x", fileType: "text_file" },
					{ overwrite: true },
				)
				.catch((e) => {
					throw e;
				}),
		).rejects.toMatchObject({ entryKind: "folder" });
		// The folder subtree survives as a directory.
		expect(fs.resolve("Macintosh HD:Documents:Projects")._type).toBe(
			"directory",
		);
	});

	it("writes a brand-new file regardless of the overwrite flag", async () => {
		const fs = new ClassicyFileSystem("fdWriteNew", FIXTURE());
		const vol = fileSystemVolume(fs, "Macintosh HD");
		await vol.write?.(
			["Documents"],
			"fresh.txt",
			{ data: "hi", fileType: "text_file" },
			{ overwrite: false },
		);
		expect(fs.resolve("Macintosh HD:Documents:fresh.txt")._data).toBe("hi");
	});
});

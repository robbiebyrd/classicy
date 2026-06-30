import { describe, expect, it } from "vitest";
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";

describe("ClassicyFileSystem.hash", () => {
	it('returns the SHA-256 hex digest for file content "hello"', () => {
		const cfs = new ClassicyFileSystem("test-hash");
		expect(
			cfs.hash({ _type: ClassicyFileSystemEntryFileType.File, _data: "hello" }),
		).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
	});
});

describe("ClassicyFileSystem.filterByType", () => {
	it("includes File, Directory, TextFile, Markdown, and Pdf entries by default (no byType argument)", () => {
		const cfs = new ClassicyFileSystem("test-filter-by-type-default", {
			_type: "directory",
			"Macintosh HD": {
				_type: "drive",
				Documents: {
					_type: "directory",
					"Read Me.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
					"Release Notes.md": {
						_type: ClassicyFileSystemEntryFileType.Markdown,
					},
					"Sample.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf },
				},
			},
		});

		const filtered = cfs.filterByType("Macintosh HD:Documents");

		expect(Object.keys(filtered)).toEqual([
			"Read Me.txt",
			"Release Notes.md",
			"Sample.pdf",
		]);
	});
});

describe("isValidFileSystemEntry", () => {
	it("accepts a valid FS entry with _type", () => {
		expect(
			isValidFileSystemEntry({
				_type: "directory",
				"Macintosh HD": { _type: "drive" },
			}),
		).toBe(true);
	});

	it("rejects null", () => {
		expect(isValidFileSystemEntry(null)).toBe(false);
	});

	it("rejects a string", () => {
		expect(isValidFileSystemEntry("not an object")).toBe(false);
	});

	it("rejects an array", () => {
		expect(isValidFileSystemEntry([1, 2, 3])).toBe(false);
	});

	it("rejects an empty object", () => {
		expect(isValidFileSystemEntry({})).toBe(false);
	});

	it("rejects an object with __proto__ key", () => {
		const obj = JSON.parse(
			'{"__proto__": {"polluted": true}, "_type": "directory"}',
		);
		expect(isValidFileSystemEntry(obj)).toBe(false);
	});

	it("rejects an object with constructor key", () => {
		expect(
			isValidFileSystemEntry({ constructor: {}, _type: "directory" }),
		).toBe(false);
	});

	it("accepts a nested FS structure", () => {
		const fs = {
			_type: "directory",
			"Macintosh HD": {
				_type: "drive",
				_icon: "icon.png",
				"System Folder": {
					_type: "directory",
				},
			},
		};
		expect(isValidFileSystemEntry(fs)).toBe(true);
	});
});

describe("mergeClassicyFileSystemEntries", () => {
	it("merges a nested entry without touching siblings", () => {
		const base = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Read Me.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "hi",
					},
				},
			},
		};
		const merged = mergeClassicyFileSystemEntries(base, {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Welcome.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "hello",
					},
				},
			},
		});
		expect(merged["Macintosh HD"].Documents["Read Me.txt"]._data).toBe("hi");
		expect(merged["Macintosh HD"].Documents["Welcome.txt"]._data).toBe(
			"hello",
		);
	});

	it("does not mutate the base argument", () => {
		const base = {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		mergeClassicyFileSystemEntries(base, {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Directory },
		});
		expect(base["Macintosh HD"]._type).toBe(
			ClassicyFileSystemEntryFileType.Drive,
		);
	});
});

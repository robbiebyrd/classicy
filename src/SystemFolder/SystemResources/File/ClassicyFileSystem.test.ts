// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type {
	ClassicyFileSystemEntry,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";
import { compressToBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

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

describe("ClassicyFileSystem.size", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the uncompressed byte length for gzip+base64 _data", async () => {
		const cfs = new ClassicyFileSystem("test-size-data-compressed");
		const original = new TextEncoder().encode("hello world, this is a test file");
		const encoded = await compressToBase64(original);
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_data: encoded,
		};
		await expect(cfs.size(entry)).resolves.toBe(original.byteLength);
	});

	it("falls back to raw Blob-length for _data that isn't valid gzip", async () => {
		const cfs = new ClassicyFileSystem("test-size-data-plain");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_data: "hello",
		};
		await expect(cfs.size(entry)).resolves.toBe(5);
	});

	it("returns a pre-set _size on a _url entry without calling fetch", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-cached");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
			_size: 42,
		};
		await expect(cfs.size(entry)).resolves.toBe(42);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("resolves size via HEAD for a _url entry with no _size, and caches it onto the entry", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers({ "Content-Length": "1024" }),
		});
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-head");
		const entry: ClassicyFileSystemEntry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(1024);
		expect(entry._size).toBe(1024);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/file.pdf",
			expect.objectContaining({ method: "HEAD", signal: expect.any(AbortSignal) }),
		);
	});

	it("returns -1 and does not cache when the HEAD request fails", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-fail");
		const entry: ClassicyFileSystemEntry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(-1);
		expect(entry._size).toBeUndefined();
	});

	it("returns -1 when the HEAD response has no Content-Length", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
		});
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-no-length");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(-1);
	});

	it("sums a directory's children concurrently, excluding one that fails to resolve", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("unreachable"));
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-dir-mixed");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"a.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hello" },
			"b.pdf": {
				_type: ClassicyFileSystemEntryFileType.File,
				_url: "https://example.com/b.pdf",
			},
		};
		await expect(cfs.size(entry)).resolves.toBe(5);
	});
});

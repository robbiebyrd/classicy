// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
	ClassicyFileSystem,
	classicyFileSystemEntryKey,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { fileSystemVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";

// HFS (Mac OS 8, System 7) and FAT (Windows 95/98) both compared names
// without case and kept them as typed, so the file system does too, under
// every Appearance Package: "plan.txt" finds "Plan.txt", and no folder
// holds both. A tree saved before this rule may hold such twins; each
// stays reachable by its own spelling.

const tree = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Plan.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "plan",
			},
		},
		Archive: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"plan.TXT": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "old",
			},
		},
		// Saved before names were compared without case.
		Twins: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Notes.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "upper",
			},
			"notes.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "lower",
			},
		},
	},
});

let storageCounter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-case-${++storageCounter}`, tree());

const journal = () => {
	const entries: ClassicyFileSystemJournalEntry[] = [];
	registerClassicyFileSystemAdapter({
		id: "case-test",
		onChange: (entry) => {
			entries.push(entry);
		},
	});
	return entries;
};

afterEach(() => unregisterClassicyFileSystemAdapter("case-test"));

describe("classicyFileSystemEntryKey", () => {
	const folder = {
		_type: "directory",
		"Read Me": { _type: "text_file" },
		"read me": { _type: "text_file" },
		Other: { _type: "text_file" },
	};

	it("prefers the exact spelling, then the first case-only match", () => {
		expect(classicyFileSystemEntryKey(folder, "read me")).toBe("read me");
		expect(classicyFileSystemEntryKey(folder, "Read Me")).toBe("Read Me");
		expect(classicyFileSystemEntryKey(folder, "READ ME")).toBe("Read Me");
		expect(classicyFileSystemEntryKey(folder, "other")).toBe("Other");
		expect(classicyFileSystemEntryKey(folder, "missing")).toBeUndefined();
	});

	it("matches metadata keys and non-entries only exactly", () => {
		expect(classicyFileSystemEntryKey(folder, "_type")).toBe("_type");
		expect(classicyFileSystemEntryKey(folder, "_TYPE")).toBeUndefined();
		expect(
			classicyFileSystemEntryKey({ Label: "a string" }, "label"),
		).toBeUndefined();
	});

	it("never steps up the prototype chain", () => {
		expect(classicyFileSystemEntryKey(folder, "toString")).toBeUndefined();
		expect(classicyFileSystemEntryKey(folder, "TOSTRING")).toBeUndefined();
	});
});

describe("ClassicyFileSystem names without case", () => {
	it("resolves a path whatever the case of its names", () => {
		const fs = makeFs();
		expect(fs.resolve("macintosh hd:DOCUMENTS:plan.txt")?._data).toBe("plan");
		expect(fs.storedPath("macintosh hd:DOCUMENTS:plan.txt")).toBe(
			"Macintosh HD:Documents:Plan.txt",
		);
		expect(fs.storedPath("Macintosh HD:Nowhere")).toBeUndefined();
	});

	it("keeps both of a stored pair of twins reachable by their own spelling", () => {
		const fs = makeFs();
		expect(fs.resolve("Macintosh HD:Twins:Notes.txt")?._data).toBe("upper");
		expect(fs.resolve("Macintosh HD:Twins:notes.txt")?._data).toBe("lower");
		// Another spelling finds the first in the folder's order.
		expect(fs.resolve("Macintosh HD:Twins:NOTES.TXT")?._data).toBe("upper");
		// Moving one away and back leaves the other where it was.
		expect(
			fs.move("Macintosh HD:Twins:notes.txt", "Macintosh HD:Documents"),
		).toEqual({ ok: true, path: "Macintosh HD:Documents:notes.txt" });
		expect(fs.resolve("Macintosh HD:Twins:Notes.txt")?._data).toBe("upper");
	});

	it("refuses a move onto a case-only twin as exists", () => {
		const fs = makeFs();
		expect(
			fs.move("Macintosh HD:Documents:Plan.txt", "Macintosh HD:Archive"),
		).toEqual({ ok: false, reason: "exists" });
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")?._data).toBe("plan");
		expect(
			fs.move("Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents", {
				name: "Notes.TXT",
			}).ok,
		).toBe(true);
		// A rename onto another entry's name in another case is refused too.
		expect(
			fs.move("Macintosh HD:Twins:Notes.txt", "Macintosh HD:Twins", {
				name: "NOTES.txt",
			}),
		).toEqual({ ok: false, reason: "exists" });
	});

	it("renames an entry by a change of case alone, keeping its place in the tree", () => {
		const entries = journal();
		const fs = makeFs();
		expect(
			fs.move("Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents", {
				name: "PLAN.txt",
			}),
		).toEqual({ ok: true, path: "Macintosh HD:Documents:PLAN.txt" });
		const documents = fs.resolve("Macintosh HD:Documents");
		expect(Object.hasOwn(documents, "PLAN.txt")).toBe(true);
		expect(Object.hasOwn(documents, "Plan.txt")).toBe(false);
		expect(entries.at(-1)).toMatchObject({
			op: "move",
			path: "Macintosh HD:Documents:Plan.txt",
			to: "Macintosh HD:Documents:PLAN.txt",
		});
	});

	it("moves by any spelling, keeping the stored name and journaling it", () => {
		const entries = journal();
		const fs = makeFs();
		expect(
			fs.move("macintosh hd:archive:PLAN.txt", "MACINTOSH HD:twins"),
		).toEqual({ ok: true, path: "Macintosh HD:Twins:plan.TXT" });
		expect(entries.at(-1)).toMatchObject({
			op: "move",
			path: "Macintosh HD:Archive:plan.TXT",
			to: "Macintosh HD:Twins:plan.TXT",
		});
		// The moved entry left nothing behind under the spelling typed.
		expect(Object.keys(fs.resolve("Macintosh HD:Archive"))).toEqual(["_type"]);
		expect(fs.readFile("Macintosh HD:Twins:plan.TXT")).toBe("old");
	});

	it("refuses a folder dropped into itself under another spelling", () => {
		const fs = makeFs();
		fs.mkDir("Macintosh HD:Documents:Inner");
		expect(
			fs.move("Macintosh HD:Documents", "macintosh hd:documents:inner"),
		).toEqual({ ok: false, reason: "into-itself" });
		expect(fs.move("Macintosh HD:Documents", "macintosh hd:DOCUMENTS")).toEqual(
			{ ok: false, reason: "into-itself" },
		);
	});

	it("writes over a case-only twin under its stored name", () => {
		const entries = journal();
		const fs = makeFs();
		expect(fs.writeFile("Macintosh HD:documents:PLAN.TXT", "new")).toBe(true);
		const documents = fs.resolve("Macintosh HD:Documents");
		expect(
			Object.keys(documents).filter((key) => !key.startsWith("_")),
		).toEqual(["Plan.txt"]);
		expect(fs.readFile("Macintosh HD:Documents:Plan.txt")).toBe("new");
		expect(entries.at(-1)).toMatchObject({
			op: "write",
			path: "Macintosh HD:Documents:Plan.txt",
		});
		// A new name is kept as typed, in a folder found by any spelling.
		fs.writeFile("macintosh hd:ARCHIVE:New File.txt", "x");
		expect(
			Object.hasOwn(fs.resolve("Macintosh HD:Archive"), "New File.txt"),
		).toBe(true);
		expect(Object.hasOwn(fs.resolve("Macintosh HD"), "ARCHIVE")).toBe(false);
	});

	it("keeps a folder already there under another case rather than making a twin", () => {
		const entries = journal();
		const fs = makeFs();
		fs.mkDir("MACINTOSH HD:documents:Drafts");
		const drive = fs.resolve("Macintosh HD");
		expect(Object.hasOwn(drive, "documents")).toBe(false);
		expect(Object.hasOwn(drive, "MACINTOSH HD")).toBe(false);
		expect(fs.resolve("Macintosh HD:Documents:Drafts")?._type).toBe(
			ClassicyFileSystemEntryFileType.Directory,
		);
		// The existing file is untouched by the merge.
		expect(fs.readFile("Macintosh HD:Documents:Plan.txt")).toBe("plan");
		expect(entries.at(-1)).toMatchObject({
			op: "mkdir",
			path: "Macintosh HD:Documents:Drafts",
		});
		fs.mkDir("macintosh hd:documents:drafts");
		expect(
			Object.keys(fs.resolve("Macintosh HD:Documents")).filter(
				(key) => !key.startsWith("_"),
			),
		).toEqual(expect.arrayContaining(["Plan.txt", "Drafts"]));
		expect(
			Object.keys(fs.resolve("Macintosh HD:Documents")).filter(
				(key) => !key.startsWith("_"),
			),
		).toHaveLength(2);
	});

	it("removes and patches an entry by any spelling, journaling the stored path", () => {
		const entries = journal();
		const fs = makeFs();
		expect(
			fs.setMetadata("macintosh hd:documents:plan.txt", { _label: "1" }),
		).toBe(true);
		expect(entries.at(-1)).toMatchObject({
			op: "meta",
			path: "Macintosh HD:Documents:Plan.txt",
		});
		fs.rmDir("macintosh hd:documents:plan.txt");
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")).toBeUndefined();
		expect(entries.at(-1)).toMatchObject({
			op: "rmdir",
			path: "Macintosh HD:Documents:Plan.txt",
		});
	});

	it("numbers a Trash name whose case-only twin is already there", () => {
		const fs = makeFs();
		ensureClassicyTrash(fs, "");
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Archive:plan.TXT"], {});
		const { moves } = trashClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt"],
			{},
		);
		expect(moves).toEqual([
			{
				from: "Macintosh HD:Documents:Plan.txt",
				to: `${CLASSICY_TRASH_PATH}:Plan 2.txt`,
			},
		]);
	});

	it("lets a file dialog's New Folder find a folder there under another case, and refuses a file", async () => {
		const fs = makeFs();
		const volume = fileSystemVolume(fs, "Macintosh HD");
		await expect(volume.mkDir?.([], "documents")).resolves.toBeUndefined();
		expect(Object.hasOwn(fs.resolve("Macintosh HD"), "documents")).toBe(false);
		await expect(volume.mkDir?.(["Documents"], "plan.txt")).rejects.toThrow(
			/mkDir failed/,
		);
	});
});

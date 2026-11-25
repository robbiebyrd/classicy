// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
	CLASSICY_COPY_DROPPED_METADATA,
	ClassicyFileSystem,
	classicyFirstFreeCopyName,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Explorer's Copy and Paste (WIG Ch.5 "Command Method", pp.59-61; the
// remaining chapters' audit's 5.28): `fs.copy`, its names (Windows 95's
// "Copy of <name>", shell32.dll's "Copy () of " template), its refusals and
// its journal entry.

const tree = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_createdOn: "2001-01-01T00:00:00.000Z",
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hello",
				_createdOn: "2001-01-01T00:00:00.000Z",
				_modifiedOn: "2002-02-02T00:00:00.000Z",
				_readOnly: true,
				_versions: [{ _type: "text_file", _data: "old" }],
			},
			Projects: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				Deep: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				},
			},
		},
		Archive: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
		Locked: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_readOnly: true,
		},
		"System Folder": {
			_type: ClassicyFileSystemEntryFileType.Directory,
			Finder: { _type: ClassicyFileSystemEntryFileType.File, _system: true },
		},
		Applications: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			Calculator: {
				_type: ClassicyFileSystemEntryFileType.AppShortcut,
				_derived: true,
			},
			"My Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
	},
	"Backup Disk": { _type: ClassicyFileSystemEntryFileType.Drive },
	Trash: {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_system: true,
		"Old.txt": {
			_type: ClassicyFileSystemEntryFileType.TextFile,
			_trashed: true,
			_trashedFrom: "Macintosh HD:Documents",
			_placeholder: true,
		},
	},
});

let storageCounter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-copy-${++storageCounter}`, tree());

describe("classicyFirstFreeCopyName", () => {
	it("keeps a free name, then numbers Windows' Copy of", () => {
		expect(classicyFirstFreeCopyName(["Plan.txt"], "Read Me.txt")).toBe(
			"Read Me.txt",
		);
		expect(classicyFirstFreeCopyName(["Read Me.txt"], "Read Me.txt")).toBe(
			"Copy of Read Me.txt",
		);
		expect(
			classicyFirstFreeCopyName(
				["Read Me.txt", "Copy of Read Me.txt"],
				"Read Me.txt",
			),
		).toBe("Copy (2) of Read Me.txt");
		expect(
			classicyFirstFreeCopyName(
				["Read Me.txt", "Copy of Read Me.txt", "Copy (2) of Read Me.txt"],
				"Read Me.txt",
			),
		).toBe("Copy (3) of Read Me.txt");
	});

	it("compares names without case", () => {
		expect(
			classicyFirstFreeCopyName(
				["read me.TXT", "COPY OF read me.txt"],
				"Read Me.txt",
			),
		).toBe("Copy (2) of Read Me.txt");
	});
});

describe("ClassicyFileSystem.copy", () => {
	afterEach(() => unregisterClassicyFileSystemAdapter("copy-test"));

	it("copies a file into another folder under its own name, keeping the original", () => {
		const fs = makeFs();
		const result = fs.copy(
			"Macintosh HD:Documents:Projects:Plan.txt",
			"Macintosh HD:Archive",
		);
		expect(result).toEqual({ ok: true, path: "Macintosh HD:Archive:Plan.txt" });
		expect(
			fs.resolve("Macintosh HD:Documents:Projects:Plan.txt"),
		).toBeDefined();
		expect(fs.resolve("Macintosh HD:Archive:Plan.txt")?._type).toBe(
			ClassicyFileSystemEntryFileType.TextFile,
		);
	});

	it("names a copy in its own folder Copy of, then Copy (2) of", () => {
		const fs = makeFs();
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Documents"),
		).toEqual({ ok: true, path: "Macintosh HD:Documents:Copy of Read Me.txt" });
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Documents"),
		).toEqual({
			ok: true,
			path: "Macintosh HD:Documents:Copy (2) of Read Me.txt",
		});
		// A copy of the copy: Windows' "Copy of Copy of".
		expect(
			fs.copy(
				"Macintosh HD:Documents:Copy of Read Me.txt",
				"Macintosh HD:Documents",
			),
		).toEqual({
			ok: true,
			path: "Macintosh HD:Documents:Copy of Copy of Read Me.txt",
		});
	});

	it("names a copy that clashes in another folder the same way, never replacing", () => {
		const fs = makeFs();
		const archived = fs.resolve("Macintosh HD:Archive:Read Me.txt");
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive"),
		).toEqual({ ok: true, path: "Macintosh HD:Archive:Copy of Read Me.txt" });
		expect(fs.resolve("Macintosh HD:Archive:Read Me.txt")).toBe(archived);
	});

	it("copies deeply, every entry new and created now, the rest as it was", () => {
		const fs = makeFs();
		const before = Date.now();
		expect(
			fs.copy("Macintosh HD:Documents", "Macintosh HD:Archive"),
		).toMatchObject({ ok: true, path: "Macintosh HD:Archive:Documents" });
		const original = fs.resolve("Macintosh HD:Documents:Read Me.txt");
		const copy = fs.resolve("Macintosh HD:Archive:Documents:Read Me.txt");
		expect(copy).not.toBe(original);
		expect(copy._data).toBe("hello");
		expect(copy._modifiedOn).toBe("2002-02-02T00:00:00.000Z");
		expect(copy._readOnly).toBe(true);
		expect(copy._versions).toEqual(original._versions);
		expect(copy._versions).not.toBe(original._versions);
		const created = Date.parse(copy._createdOn as unknown as string);
		expect(created).toBeGreaterThanOrEqual(before);
		const folder = fs.resolve("Macintosh HD:Archive:Documents");
		expect(folder._createdOn).toBe(copy._createdOn);
		expect(
			fs.resolve("Macintosh HD:Archive:Documents:Projects:Deep:Notes.txt")
				._createdOn,
		).toBe(copy._createdOn);
		// Editing the copy leaves the original alone.
		fs.setMetadata("Macintosh HD:Archive:Documents:Read Me.txt", {
			_label: "Hot",
		});
		expect(original._label).toBeUndefined();
		expect(original._createdOn).toBe("2001-01-01T00:00:00.000Z");
	});

	it("leaves out the entries a derived overlay generated", () => {
		const fs = makeFs();
		expect(
			fs.copy("Macintosh HD:Applications", "Macintosh HD:Archive"),
		).toEqual({ ok: true, path: "Macintosh HD:Archive:Applications" });
		expect(fs.resolve("Macintosh HD:Archive:Applications:Calculator")).toBe(
			undefined,
		);
		expect(
			fs.resolve("Macintosh HD:Archive:Applications:My Notes.txt"),
		).toBeDefined();
	});

	it("drops the Trash's markers and a placeholder's mark", () => {
		const fs = makeFs();
		expect(fs.copy("Trash:Old.txt", "Macintosh HD:Archive")).toEqual({
			ok: true,
			path: "Macintosh HD:Archive:Old.txt",
		});
		const copy = fs.resolve("Macintosh HD:Archive:Old.txt");
		for (const key of CLASSICY_COPY_DROPPED_METADATA)
			expect(Object.hasOwn(copy, key), key).toBe(false);
		expect(fs.resolve("Trash:Old.txt")._trashed).toBe(true);
	});

	it("finds both paths whatever their case, spelling the result as stored", () => {
		const fs = makeFs();
		expect(
			fs.copy(
				"macintosh hd:documents:PROJECTS:plan.TXT",
				"MACINTOSH HD:archive",
			),
		).toEqual({ ok: true, path: "Macintosh HD:Archive:Plan.txt" });
	});

	it("takes a name of its own, refusing one taken or unusable", () => {
		const fs = makeFs();
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive", {
				name: "Kept.txt",
			}),
		).toEqual({ ok: true, path: "Macintosh HD:Archive:Kept.txt" });
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive", {
				name: "read me.txt",
			}),
		).toEqual({ ok: false, reason: "exists" });
		for (const name of ["", "_hidden", "a:b", "__proto__"])
			expect(
				fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive", {
					name,
				}),
				name,
			).toEqual({ ok: false, reason: "missing" });
	});

	it("refuses what is missing, a file as the destination, and a folder into itself", () => {
		const fs = makeFs();
		expect(fs.copy("Macintosh HD:Nope", "Macintosh HD:Archive")).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(
			fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Nope"),
		).toEqual({ ok: false, reason: "missing" });
		expect(fs.copy("Macintosh HD:Documents:Read Me.txt", "")).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(
			fs.copy(
				"Macintosh HD:Documents:Projects:Plan.txt",
				"Macintosh HD:Documents:Read Me.txt",
			),
		).toEqual({ ok: false, reason: "not-a-folder" });
		expect(fs.copy("Macintosh HD:Documents", "Macintosh HD:Documents")).toEqual(
			{ ok: false, reason: "into-itself" },
		);
		expect(
			fs.copy("Macintosh HD:Documents", "Macintosh HD:Documents:Projects:Deep"),
		).toEqual({ ok: false, reason: "into-itself" });
		expect(fs.copy("__proto__:x", "Macintosh HD")).toEqual({
			ok: false,
			reason: "missing",
		});
	});

	it("refuses a drive, a system file, a derived entry and a locked or system destination", () => {
		const fs = makeFs();
		for (const [from, to] of [
			["Macintosh HD", "Backup Disk"],
			["Macintosh HD:System Folder:Finder", "Macintosh HD:Archive"],
			["Macintosh HD:Applications:Calculator", "Macintosh HD:Archive"],
			["Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Locked"],
			["Macintosh HD:Documents:Read Me.txt", "Trash"],
		])
			expect(fs.copy(from, to), `${from} -> ${to}`).toEqual({
				ok: false,
				reason: "locked",
			});
	});

	it("journals one 'copy' with both paths, the new _createdOn and the keys left off", () => {
		const fs = makeFs();
		const journal: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "copy-test",
			onChange: (entry) => {
				journal.push(entry);
			},
		});
		fs.copy("macintosh hd:documents:read me.txt", "Macintosh HD:Documents");
		fs.copy("Trash:Old.txt", "Macintosh HD:Archive");
		expect(journal).toHaveLength(2);
		expect(journal[0]).toMatchObject({
			op: "copy",
			path: "Macintosh HD:Documents:Read Me.txt",
			to: "Macintosh HD:Documents:Copy of Read Me.txt",
		});
		expect(journal[0].metadata).toEqual({
			_createdOn: fs.resolve("Macintosh HD:Documents:Copy of Read Me.txt")
				._createdOn,
		});
		expect(journal[0].unsetMetadata).toBeUndefined();
		expect(journal[1]).toMatchObject({
			op: "copy",
			path: "Trash:Old.txt",
			to: "Macintosh HD:Archive:Old.txt",
			unsetMetadata: ["_trashed", "_trashedFrom", "_placeholder"],
		});
	});

	it("journals nothing and changes nothing when refused", () => {
		const fs = makeFs();
		const journal: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "copy-test",
			onChange: (entry) => {
				journal.push(entry);
			},
		});
		const before = fs.snapshot();
		fs.copy("Macintosh HD:Documents", "Macintosh HD:Documents");
		fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Locked");
		expect(journal).toHaveLength(0);
		expect(fs.snapshot()).toBe(before);
	});

	it("persists the copy for the next instance on the key", () => {
		const fs = makeFs();
		fs.copy("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive", {
			name: "Kept.txt",
		});
		fs.flushNow();
		const stored = JSON.parse(localStorage.getItem(fs.storageKey) ?? "{}");
		expect(stored["Macintosh HD"].Archive["Kept.txt"]._data).toBe("hello");
	});
});

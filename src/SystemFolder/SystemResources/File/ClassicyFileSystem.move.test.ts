// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const tree = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hello",
			},
			Projects: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
		},
		Archive: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
		"System Folder": {
			_type: ClassicyFileSystemEntryFileType.Directory,
			Finder: { _type: ClassicyFileSystemEntryFileType.File, _system: true },
		},
		Applications: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_readOnly: true,
			SimpleText: { _type: ClassicyFileSystemEntryFileType.AppShortcut },
		},
	},
	"Backup Disk": { _type: ClassicyFileSystemEntryFileType.Drive },
});

let storageCounter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-move-${++storageCounter}`, tree());

describe("ClassicyFileSystem.move", () => {
	afterEach(() => unregisterClassicyFileSystemAdapter("move-test"));

	it("moves a file into another folder, keeping its name and contents", () => {
		const fs = makeFs();
		const result = fs.move(
			"Macintosh HD:Documents:Projects:Plan.txt",
			"Macintosh HD:Archive",
		);
		expect(result).toEqual({ ok: true, path: "Macintosh HD:Archive:Plan.txt" });
		expect(
			fs.resolve("Macintosh HD:Documents:Projects:Plan.txt"),
		).toBeUndefined();
		expect(fs.resolve("Macintosh HD:Archive:Plan.txt")?._type).toBe(
			ClassicyFileSystemEntryFileType.TextFile,
		);
	});

	it("moves a folder with everything in it", () => {
		const fs = makeFs();
		expect(fs.move("Macintosh HD:Documents:Projects", "Macintosh HD")).toEqual({
			ok: true,
			path: "Macintosh HD:Projects",
		});
		expect(fs.resolve("Macintosh HD:Projects:Plan.txt")).toBeDefined();
	});

	it("moves onto another drive's root", () => {
		const fs = makeFs();
		expect(
			fs.move("Macintosh HD:Documents:Projects:Plan.txt", "Backup Disk"),
		).toEqual({ ok: true, path: "Backup Disk:Plan.txt" });
	});

	it("journals one 'move' with the old and new paths", () => {
		const entries: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "move-test",
			onChange: (entry) => {
				entries.push(entry);
			},
		});
		const fs = makeFs();
		fs.move("Macintosh HD:Documents:Projects", "Macintosh HD:Archive");
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			op: "move",
			path: "Macintosh HD:Documents:Projects",
			to: "Macintosh HD:Archive:Projects",
		});
	});

	it.each([
		[
			"a missing source",
			"Macintosh HD:Nope.txt",
			"Macintosh HD:Archive",
			"missing",
		],
		[
			"a missing destination",
			"Macintosh HD:Documents:Read Me.txt",
			"Macintosh HD:Nope",
			"missing",
		],
		[
			"the filesystem root as the destination",
			"Macintosh HD:Documents:Read Me.txt",
			"",
			"missing",
		],
		[
			"a file as the destination",
			"Macintosh HD:Documents:Projects",
			"Macintosh HD:Documents:Read Me.txt",
			"not-a-folder",
		],
		[
			"the folder it is already in",
			"Macintosh HD:Documents:Read Me.txt",
			"Macintosh HD:Documents",
			"same-folder",
		],
		[
			"a folder onto itself",
			"Macintosh HD:Documents",
			"Macintosh HD:Documents",
			"into-itself",
		],
		[
			"a folder into one of its own folders",
			"Macintosh HD:Documents",
			"Macintosh HD:Documents:Projects",
			"into-itself",
		],
		["a drive", "Backup Disk", "Macintosh HD:Archive", "locked"],
		[
			"a system file",
			"Macintosh HD:System Folder:Finder",
			"Macintosh HD:Archive",
			"locked",
		],
		[
			"an entry out of a read-only folder",
			"Macintosh HD:Applications:SimpleText",
			"Macintosh HD:Archive",
			"locked",
		],
		[
			"an entry into a read-only folder",
			"Macintosh HD:Documents:Read Me.txt",
			"Macintosh HD:Applications",
			"locked",
		],
		[
			"a name the destination already has",
			"Macintosh HD:Documents:Read Me.txt",
			"Macintosh HD:Archive",
			"exists",
		],
	])("refuses %s and changes nothing", (_, from, to, reason) => {
		const entries: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "move-test",
			onChange: (entry) => {
				entries.push(entry);
			},
		});
		const fs = makeFs();
		const before = JSON.stringify(fs.fs);
		expect(fs.move(from, to)).toEqual({ ok: false, reason });
		expect(JSON.stringify(fs.fs)).toBe(before);
		expect(entries).toHaveLength(0);
	});

	it("refuses prototype-polluting paths", () => {
		const fs = makeFs();
		expect(fs.move("Macintosh HD:__proto__", "Macintosh HD:Archive")).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(
			fs.move("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:constructor"),
		).toEqual({ ok: false, reason: "missing" });
	});

	it("renames and patches metadata in the same journaled move", () => {
		const entries: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "move-rename-test",
			onChange: (entry) => {
				entries.push(entry);
			},
		});
		const fs = makeFs();
		fs.setMetadata("Macintosh HD:Documents:Read Me.txt", { _label: "old" });
		entries.length = 0;
		expect(
			fs.move("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Archive", {
				name: "Old Read Me.txt",
				metadata: { _comments: "kept", _label: undefined },
			}),
		).toEqual({ ok: true, path: "Macintosh HD:Archive:Old Read Me.txt" });
		const moved = fs.resolve("Macintosh HD:Archive:Old Read Me.txt");
		expect(moved?._comments).toBe("kept");
		expect(moved && "_label" in moved).toBe(false);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			op: "move",
			to: "Macintosh HD:Archive:Old Read Me.txt",
			metadata: { _comments: "kept" },
		});
	});

	it("renames in place, and refuses names that aren't plain names", () => {
		const fs = makeFs();
		expect(
			fs.move("Macintosh HD:Documents:Read Me.txt", "Macintosh HD:Documents", {
				name: "Read Me 2.txt",
			}),
		).toEqual({ ok: true, path: "Macintosh HD:Documents:Read Me 2.txt" });
		for (const name of ["", "_type", "a:b", "__proto__"]) {
			expect(
				fs.move(
					"Macintosh HD:Documents:Read Me 2.txt",
					"Macintosh HD:Archive",
					{
						name,
					},
				),
			).toEqual({ ok: false, reason: "missing" });
		}
	});
});

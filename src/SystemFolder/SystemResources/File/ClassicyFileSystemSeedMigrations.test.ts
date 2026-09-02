// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	applyClassicyFileSystemSeedMigrations,
	type ClassicyFileSystemSeedMigration,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";

// biome-ignore lint/suspicious/noExplicitAny: fixture is mutated in place by the migrations under test, so a precise literal type (missing "September 12" etc.) would fight every assertion that reads the post-mutation shape
const tree = (): any => ({
	_type: "directory",
	"Macintosh HD": {
		_type: "drive",
		Documents: {
			_type: "directory",
			Newspapers: {
				_type: "directory",
				"September 11": {
					_type: "directory",
					"nyt.jpg": { _type: "file", _data: "front page" },
				},
			},
			"Read Me.txt": { _type: "text_file", _data: "hello" },
		},
	},
});

describe("applyClassicyFileSystemSeedMigrations — rename", () => {
	it("moves the entire subtree from the old path to the new path", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "rename",
				from: "Macintosh HD:Documents:Newspapers:September 11",
				to: "Macintosh HD:Documents:Newspapers:September 12",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		const newspapers = fs["Macintosh HD"].Documents.Newspapers;
		expect(newspapers["September 11"]).toBeUndefined();
		expect(newspapers["September 12"]["nyt.jpg"]._data).toBe("front page");
	});

	it("is a no-op when the source path does not exist", () => {
		const fs = tree();
		delete fs["Macintosh HD"].Documents.Newspapers["September 11"];
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "rename",
				from: "Macintosh HD:Documents:Newspapers:September 11",
				to: "Macintosh HD:Documents:Newspapers:September 12",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(
			fs["Macintosh HD"].Documents.Newspapers["September 12"],
		).toBeUndefined();
	});

	it("is a no-op when the target path already exists, leaving both intact", () => {
		const fs = tree();
		fs["Macintosh HD"].Documents.Newspapers["September 12"] = {
			_type: "directory",
			"already-here.jpg": { _type: "file", _data: "existing" },
		};
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "rename",
				from: "Macintosh HD:Documents:Newspapers:September 11",
				to: "Macintosh HD:Documents:Newspapers:September 12",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		const newspapers = fs["Macintosh HD"].Documents.Newspapers;
		expect(newspapers["September 11"]["nyt.jpg"]._data).toBe("front page");
		expect(newspapers["September 12"]["already-here.jpg"]._data).toBe(
			"existing",
		);
	});

	it("never traverses a __proto__ segment in either path", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "rename",
				from: "Macintosh HD:__proto__:pwned",
				to: "Macintosh HD:__proto__:pwned2",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(Object.hasOwn(Object.prototype, "pwned")).toBe(false);
		expect(Object.hasOwn(Object.prototype, "pwned2")).toBe(false);
	});
});

describe("applyClassicyFileSystemSeedMigrations — replace", () => {
	it("replaces _data when the current value exactly matches ifData", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "replace",
				path: "Macintosh HD:Documents:Read Me.txt",
				ifData: "hello",
				data: "hello, corrected",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Read Me.txt"]._data).toBe(
			"hello, corrected",
		);
	});

	it("leaves _data untouched when it no longer matches ifData (visitor already edited it)", () => {
		const fs = tree();
		fs["Macintosh HD"].Documents["Read Me.txt"]._data = "visitor's own text";
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "replace",
				path: "Macintosh HD:Documents:Read Me.txt",
				ifData: "hello",
				data: "hello, corrected",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Read Me.txt"]._data).toBe(
			"visitor's own text",
		);
	});
});

describe("applyClassicyFileSystemSeedMigrations — delete", () => {
	it("removes the entry when no ifData guard is given", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{ op: "delete", path: "Macintosh HD:Documents:Read Me.txt" },
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Read Me.txt"]).toBeUndefined();
	});

	it("leaves the entry when ifData is given and does not match current _data", () => {
		const fs = tree();
		fs["Macintosh HD"].Documents["Read Me.txt"]._data = "visitor's own text";
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "delete",
				path: "Macintosh HD:Documents:Read Me.txt",
				ifData: "hello",
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Read Me.txt"]._data).toBe(
			"visitor's own text",
		);
	});
});

describe("applyClassicyFileSystemSeedMigrations — add", () => {
	it("creates the entry when the path does not already exist", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "add",
				path: "Macintosh HD:Documents:Newspapers.md",
				entry: {
					_type: ClassicyFileSystemEntryFileType.Markdown,
					_data: "# Newspapers",
				},
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Newspapers.md"]._data).toBe(
			"# Newspapers",
		);
	});

	it("is a no-op when the path already exists, never overwriting it", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "add",
				path: "Macintosh HD:Documents:Read Me.txt",
				entry: {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "clobbered",
				},
			},
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(fs["Macintosh HD"].Documents["Read Me.txt"]._data).toBe("hello");
	});
});

describe("applyClassicyFileSystemSeedMigrations — misc", () => {
	it("applies multiple migrations in order", () => {
		const fs = tree();
		const migrations: ClassicyFileSystemSeedMigration[] = [
			{
				op: "rename",
				from: "Macintosh HD:Documents:Newspapers:September 11",
				to: "Macintosh HD:Documents:Newspapers:September 12",
			},
			{ op: "delete", path: "Macintosh HD:Documents:Read Me.txt" },
		];

		applyClassicyFileSystemSeedMigrations(fs, migrations);

		expect(
			fs["Macintosh HD"].Documents.Newspapers["September 12"],
		).toBeDefined();
		expect(fs["Macintosh HD"].Documents["Read Me.txt"]).toBeUndefined();
	});

	it("does nothing when passed an empty or undefined migration list", () => {
		const fs = tree();
		const before = JSON.stringify(fs);

		applyClassicyFileSystemSeedMigrations(fs, []);
		applyClassicyFileSystemSeedMigrations(fs, undefined);

		expect(JSON.stringify(fs)).toBe(before);
	});
});

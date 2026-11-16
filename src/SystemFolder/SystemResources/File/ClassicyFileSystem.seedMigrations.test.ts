// @vitest-environment node
//
// jsdom is unavailable in this environment (html-encoding-sniffer pulls in an
// ESM-only @exodus/bytes build that crashes vitest's forks pool — a pre-existing,
// unrelated dependency conflict). ClassicyFileSystem only reads localStorage
// when `typeof window !== "undefined"`, so the "returning visitor" tests below
// stub a minimal `window` global to exercise that real branch without jsdom.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ClassicyFileSystem,
	resetClassicyFileSystemSharedTrees,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";
import {
	DefaultFSContent,
	DefaultFSSeedMigrations,
} from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";

const renameSeptember: ClassicyFileSystemSeedMigration = {
	op: "rename",
	from: "Macintosh HD:Documents:Newspapers:September 11",
	to: "Macintosh HD:Documents:Newspapers:September 12",
};

const currentDefault = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: "drive",
		Documents: {
			_type: "directory",
			Newspapers: {
				_type: "directory",
				"September 12": { _type: "directory" },
			},
		},
	},
});

beforeEach(() => {
	localStorage.clear();
	(globalThis as { window?: unknown }).window = globalThis;
});

afterEach(() => {
	localStorage.clear();
	delete (globalThis as { window?: unknown }).window;
});

describe("ClassicyFileSystem seedMigrations integration", () => {
	it("fixes a returning visitor's stale localStorage tree on construction", () => {
		const staleTree = {
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
				},
			},
		};
		localStorage.setItem(
			"test-seed-migrations-stale",
			JSON.stringify(staleTree),
		);

		const cfs = new ClassicyFileSystem(
			"test-seed-migrations-stale",
			currentDefault(),
			":",
			[renameSeptember],
		);

		expect(
			cfs.resolve("Macintosh HD:Documents:Newspapers:September 11"),
		).toBeUndefined();
		expect(
			cfs.resolve("Macintosh HD:Documents:Newspapers:September 12:nyt.jpg")
				._data,
		).toBe("front page");
	});

	it("persists the corrected tree back to localStorage", () => {
		const staleTree = {
			_type: "directory",
			"Macintosh HD": {
				_type: "drive",
				Documents: {
					_type: "directory",
					Newspapers: {
						_type: "directory",
						"September 11": { _type: "directory" },
					},
				},
			},
		};
		localStorage.setItem(
			"test-seed-migrations-persist",
			JSON.stringify(staleTree),
		);

		new ClassicyFileSystem(
			"test-seed-migrations-persist",
			currentDefault(),
			":",
			[renameSeptember],
		);

		const persisted = JSON.parse(
			localStorage.getItem("test-seed-migrations-persist") as string,
		);
		expect(
			persisted["Macintosh HD"].Documents.Newspapers["September 11"],
		).toBeUndefined();
		expect(
			persisted["Macintosh HD"].Documents.Newspapers["September 12"],
		).toBeDefined();
	});

	it("is a harmless no-op for a fresh visitor whose default tree is already correct", () => {
		const cfs = new ClassicyFileSystem(
			"test-seed-migrations-fresh",
			currentDefault(),
			":",
			[renameSeptember],
		);

		expect(
			cfs.resolve("Macintosh HD:Documents:Newspapers:September 12"),
		).toBeDefined();
		expect(
			cfs.resolve("Macintosh HD:Documents:Newspapers:September 11"),
		).toBeUndefined();
	});

	it("leaves the tree untouched when no seedMigrations are passed", () => {
		const cfs = new ClassicyFileSystem(
			"test-seed-migrations-none",
			currentDefault(),
		);

		expect(
			cfs.resolve("Macintosh HD:Documents:Newspapers:September 12"),
		).toBeDefined();
	});
});

/**
 * The visitor deletes a Documents entry and the tree is saved. Written to the
 * stored tree directly: an fs mutation schedules a flush that needs a real
 * `window`, which this node environment only stubs.
 */
const deleteStored = (key: string, name: string) => {
	const stored = JSON.parse(localStorage.getItem(key) as string);
	delete stored["Macintosh HD"].Documents[name];
	localStorage.setItem(key, JSON.stringify(stored));
};

describe("ClassicyFileSystem run-once seed migrations", () => {
	const key = "test-seed-migrations-once";
	const addNote: ClassicyFileSystemSeedMigration = {
		id: "add-note",
		op: "add",
		path: "Macintosh HD:Documents:Note.txt",
		entry: { _type: ClassicyFileSystemEntryFileType.TextFile, _data: "note" },
	};
	const reload = () => {
		resetClassicyFileSystemSharedTrees();
		return new ClassicyFileSystem(key, currentDefault(), ":", [addNote]);
	};

	it("records a fresh visitor's ids without running them", () => {
		const cfs = new ClassicyFileSystem(key, currentDefault(), ":", [addNote]);

		expect(cfs.resolve("Macintosh HD:Documents:Note.txt")).toBeUndefined();
		expect(
			JSON.parse(localStorage.getItem(`${key}:seedMigrations`) as string),
		).toEqual(["add-note"]);
		expect(reload().resolve("Macintosh HD:Documents:Note.txt")).toBeUndefined();
	});

	it("runs once for a returning visitor, and never again after they delete what it added", () => {
		localStorage.setItem(key, JSON.stringify(currentDefault()));

		const cfs = new ClassicyFileSystem(key, currentDefault(), ":", [addNote]);
		expect(cfs.readFile("Macintosh HD:Documents:Note.txt")).toBe("note");

		deleteStored(key, "Note.txt");

		expect(reload().resolve("Macintosh HD:Documents:Note.txt")).toBeUndefined();
	});
});

describe("DefaultFSSeedMigrations (Documents, November 2026)", () => {
	const key = "test-seed-migrations-core";
	const documentsOf = (cfs: ClassicyFileSystem) =>
		Object.keys(cfs.resolve("Macintosh HD:Documents") ?? {})
			.filter((name) => !name.startsWith("_"))
			.sort();
	const migrate = () =>
		new ClassicyFileSystem(key, DefaultFSContent, ":", [
			...DefaultFSSeedMigrations,
		]);

	/** A tree stored before the change: Documents as it was seeded then. */
	const storeOldDocuments = (
		edit?: (documents: Record<string, unknown>) => void,
	) => {
		const old = JSON.parse(JSON.stringify(DefaultFSContent));
		const documents = old["Macintosh HD"].Documents;
		delete documents["The Oregon Trail.stack"];
		for (const migration of DefaultFSSeedMigrations) {
			if (migration.op !== "delete") continue;
			const name = migration.path.split(":").pop() as string;
			documents[name] = {
				_type: name.endsWith(".pdf") ? "pdf" : "markdown",
				...(migration.ifData !== undefined && { _data: migration.ifData }),
				...(migration.ifUrl !== undefined && { _url: migration.ifUrl }),
			};
		}
		edit?.(documents);
		localStorage.setItem(key, JSON.stringify(old));
	};

	it("swaps a returning visitor's release notes and sample PDFs for The Oregon Trail", () => {
		storeOldDocuments();

		const cfs = migrate();

		expect(documentsOf(cfs)).toEqual(["Read Me.txt", "The Oregon Trail.stack"]);
		expect(
			cfs.resolve("Macintosh HD:Documents:The Oregon Trail.stack")?._data,
		).toBe(
			DefaultFSContent["Macintosh HD"].Documents["The Oregon Trail.stack"]
				._data,
		);
	});

	it("keeps a sample the visitor replaced under the same name", () => {
		storeOldDocuments((documents) => {
			documents["Sample.pdf"] = {
				_type: "pdf",
				_url: "https://example.com/mine.pdf",
			};
		});

		expect(documentsOf(migrate())).toEqual([
			"Read Me.txt",
			"Sample.pdf",
			"The Oregon Trail.stack",
		]);
	});

	it("does not bring The Oregon Trail back once the visitor throws it away", () => {
		storeOldDocuments();
		migrate();
		deleteStored(key, "The Oregon Trail.stack");
		resetClassicyFileSystemSharedTrees();

		expect(documentsOf(migrate())).toEqual(["Read Me.txt"]);
	});

	it("gives each migration its own id", () => {
		const ids = DefaultFSSeedMigrations.map((migration) => migration.id);

		expect(ids.every((id) => typeof id === "string")).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

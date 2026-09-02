// @vitest-environment node
//
// jsdom is unavailable in this environment (html-encoding-sniffer pulls in an
// ESM-only @exodus/bytes build that crashes vitest's forks pool — a pre-existing,
// unrelated dependency conflict). ClassicyFileSystem only reads localStorage
// when `typeof window !== "undefined"`, so the "returning visitor" tests below
// stub a minimal `window` global to exercise that real branch without jsdom.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";

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

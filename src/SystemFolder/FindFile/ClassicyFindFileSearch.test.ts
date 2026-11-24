import { describe, expect, it } from "vitest";
import type {
	ClassicyFindCriterion,
	ClassicyFindCriterionKey,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import {
	classicyFindLocationChoices,
	classicyFindUsableLocation,
	searchClassicyFileSystem,
} from "@/SystemFolder/FindFile/ClassicyFindFileSearch";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType as T } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-find-${++counter}`, {
		"Macintosh HD": {
			_type: T.Drive,
			"Desktop DB": { _type: T.File, _invisible: true },
			"Desktop Folder": {
				_type: T.Directory,
				_invisible: true,
				"Desk Plan.txt": { _type: T.TextFile, _data: "desk" },
			},
			Documents: {
				_type: T.Directory,
				"Plan.txt": { _type: T.TextFile, _data: "x".repeat(3000) },
				"Read Me.txt": { _type: T.TextFile, _data: "hello" },
				Projects: {
					_type: T.Directory,
					"Plan.txt": { _type: T.TextFile, _data: "y" },
				},
				Empty: { _type: T.Directory },
				Hidden: {
					_type: T.Directory,
					_invisible: true,
					"Secret Plan.txt": { _type: T.TextFile },
				},
			},
		},
		Backup: {
			_type: T.Drive,
			"Plan copy.txt": { _type: T.TextFile },
		},
		Trash: {
			_type: T.Directory,
			_invisible: true,
			_system: true,
			"Old Plan.txt": {
				_type: T.TextFile,
				_trashed: true,
				_trashedFrom: "Macintosh HD:Documents",
			},
			"Backup Plan.txt": {
				_type: T.TextFile,
				_trashed: true,
				_trashedFrom: "Backup",
			},
		},
	});

const row = (
	key: ClassicyFindCriterionKey,
	operator: string,
	value: string,
): ClassicyFindCriterion => ({ key, operator, value });

const nameContains = (value: string) => [row("name", "contains", value)];

const paths = (results: { path: string }[]) => results.map((r) => r.path);

describe("searchClassicyFileSystem", () => {
	it("searches every disk and the Trash, sorted by name then path", async () => {
		const results = await searchClassicyFileSystem(makeFs(), {
			location: "local",
			criteria: nameContains("plan"),
		});
		expect(paths(results)).toEqual([
			"Trash:Backup Plan.txt",
			"Macintosh HD:Desktop Folder:Desk Plan.txt",
			"Trash:Old Plan.txt",
			"Backup:Plan copy.txt",
			"Macintosh HD:Documents:Plan.txt",
			"Macintosh HD:Documents:Projects:Plan.txt",
			// Inside an invisible folder, as 8.1 found items in the Trash.
			"Macintosh HD:Documents:Hidden:Secret Plan.txt",
		]);
		expect(results[0]).toMatchObject({
			name: "Backup Plan.txt",
			entry: { _type: T.TextFile },
		});
		const all = await searchClassicyFileSystem(makeFs(), {
			location: "all",
			criteria: nameContains("plan"),
		});
		expect(paths(all)).toEqual(paths(results));
	});

	it("searches one disk, with what of the Trash came from it", async () => {
		expect(
			paths(
				await searchClassicyFileSystem(makeFs(), {
					location: "disk:Backup",
					criteria: nameContains("plan"),
				}),
			),
		).toEqual(["Trash:Backup Plan.txt", "Backup:Plan copy.txt"]);
		expect(
			paths(
				await searchClassicyFileSystem(makeFs(), {
					location: "disk:Macintosh HD",
					criteria: nameContains("plan"),
				}),
			),
		).toEqual([
			"Macintosh HD:Desktop Folder:Desk Plan.txt",
			"Trash:Old Plan.txt",
			"Macintosh HD:Documents:Plan.txt",
			"Macintosh HD:Documents:Projects:Plan.txt",
			"Macintosh HD:Documents:Hidden:Secret Plan.txt",
		]);
	});

	it("searches the desktop: the Desktop Folder's items", async () => {
		expect(
			paths(
				await searchClassicyFileSystem(makeFs(), {
					location: "desktop",
					criteria: nameContains("plan"),
				}),
			),
		).toEqual(["Macintosh HD:Desktop Folder:Desk Plan.txt"]);
	});

	it("leaves out invisible items, except the Desktop Folder, unless asked for them", async () => {
		const fs = makeFs();
		expect(
			paths(
				await searchClassicyFileSystem(fs, {
					location: "local",
					criteria: nameContains("desk"),
				}),
			),
		).toEqual([
			"Macintosh HD:Desktop Folder:Desk Plan.txt",
			"Macintosh HD:Desktop Folder",
		]);
		expect(
			paths(
				await searchClassicyFileSystem(fs, {
					location: "local",
					criteria: [row("visibility", "is", "invisible")],
				}),
			),
		).toEqual([
			"Macintosh HD:Desktop DB",
			"Macintosh HD:Documents:Hidden",
			"Trash",
		]);
	});

	it("reads sizes for a size row, files only", async () => {
		const results = await searchClassicyFileSystem(makeFs(), {
			location: "disk:Macintosh HD",
			criteria: [row("size", "greaterThan", "2")],
		});
		expect(paths(results)).toEqual(["Macintosh HD:Documents:Plan.txt"]);
		expect(results[0].size).toBeGreaterThan(2048);
	});

	it("finds empty folders by their folder attribute", async () => {
		expect(
			paths(
				await searchClassicyFileSystem(makeFs(), {
					location: "local",
					criteria: [row("folderAttribute", "is", "empty")],
				}),
			),
		).toEqual(["Macintosh HD:Documents:Empty"]);
	});

	it("rejects once its signal aborts, before or during the walk", async () => {
		const before = new AbortController();
		before.abort();
		await expect(
			searchClassicyFileSystem(makeFs(), {
				location: "local",
				criteria: nameContains("plan"),
				signal: before.signal,
			}),
		).rejects.toMatchObject({ name: "AbortError" });

		// A tree large enough to yield between slices.
		const big: Record<string, unknown> = { _type: T.Drive };
		for (let i = 0; i < 2000; i += 1) {
			big[`File ${i}`] = { _type: T.TextFile };
		}
		const fs = new ClassicyFileSystem(`test-find-big-${++counter}`, {
			Big: big,
		});
		const during = new AbortController();
		const search = searchClassicyFileSystem(fs, {
			location: "local",
			criteria: nameContains("file"),
			signal: during.signal,
		});
		during.abort();
		await expect(search).rejects.toMatchObject({ name: "AbortError" });
	});
});

describe("the location pop-up", () => {
	it("offers 8.1's locations, then each disk", () => {
		expect(classicyFindLocationChoices(makeFs())).toEqual([
			{ value: "all", label: "on all disks" },
			{ value: "local", label: "on local disks" },
			null,
			{ value: "desktop", label: "on the desktop" },
			null,
			{ value: "disk:Macintosh HD", label: "on “Macintosh HD”" },
			{ value: "disk:Backup", label: "on “Backup”" },
		]);
	});

	it("falls back to local disks for a disk that is gone, or junk", () => {
		const fs = makeFs();
		expect(classicyFindUsableLocation(fs, "disk:Backup")).toBe("disk:Backup");
		expect(classicyFindUsableLocation(fs, "disk:Zip")).toBe("local");
		expect(classicyFindUsableLocation(fs, "desktop")).toBe("desktop");
		expect(classicyFindUsableLocation(fs, 7)).toBe("local");
	});
});

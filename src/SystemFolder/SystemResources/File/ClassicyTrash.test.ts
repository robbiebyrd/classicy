import { describe, expect, it, vi } from "vitest";
import {
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
	restoreClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	emptyClassicyTrash,
	ensureClassicyTrash,
	isClassicyTrashItem,
	isInClassicyTrash,
	listClassicyTrashItems,
	restoreClassicyFileSystemItems,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-trash-${++counter}`, {
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				Projects: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				},
			},
			Applications: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				TV: {
					_type: ClassicyFileSystemEntryFileType.AppShortcut,
					_readOnly: true,
				},
			},
		},
	});

describe("the Trash folder", () => {
	it("is created once, at the root, as a system folder", () => {
		const fs = makeFs();
		expect(fs.resolve(CLASSICY_TRASH_PATH)).toBeUndefined();
		ensureClassicyTrash(fs);
		const trash = fs.resolve(CLASSICY_TRASH_PATH);
		expect(trash?._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(trash?._system).toBe(true);
		expect(fs.move(CLASSICY_TRASH_PATH, "Macintosh HD")).toEqual({
			ok: false,
			reason: "locked",
		});
		const before = JSON.stringify(fs.fs);
		ensureClassicyTrash(fs);
		expect(JSON.stringify(fs.fs)).toBe(before);
	});

	it("knows what is in it", () => {
		const fs = makeFs();
		expect(isInClassicyTrash(fs, "Trash")).toBe(true);
		expect(isInClassicyTrash(fs, "Trash:a:b")).toBe(true);
		expect(isInClassicyTrash(fs, "Trashcan")).toBe(false);
		expect(isClassicyTrashItem(fs, "Trash:a")).toBe(true);
		expect(isClassicyTrashItem(fs, "Trash:a:b")).toBe(false);
		expect(isClassicyTrashItem(fs, "Trash")).toBe(false);
	});
});

describe("trashClassicyFileSystemItems", () => {
	it("moves items into the Trash, remembering where they came from", () => {
		const fs = makeFs();
		const { moves, refusal } = trashClassicyFileSystemItems(fs, [
			"Macintosh HD:Documents:Plan.txt",
		]);
		expect(refusal).toBeUndefined();
		expect(moves).toEqual([
			{ from: "Macintosh HD:Documents:Plan.txt", to: "Trash:Plan.txt" },
		]);
		const entry = fs.resolve("Trash:Plan.txt");
		expect(entry?._trashed).toBe(true);
		expect(entry?._trashedFrom).toBe("Macintosh HD:Documents");
		expect(entry?._trashedName).toBeUndefined();
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")).toBeUndefined();
	});

	it("numbers a name already in the Trash instead of refusing", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Plan.txt"]);
		const { moves } = trashClassicyFileSystemItems(fs, [
			"Macintosh HD:Documents:Projects:Plan.txt",
		]);
		expect(moves[0].to).toBe("Trash:Plan 2.txt");
		expect(fs.resolve("Trash:Plan 2.txt")?._trashedName).toBe("Plan.txt");
		expect(listClassicyTrashItems(fs)).toEqual([
			"Trash:Plan.txt",
			"Trash:Plan 2.txt",
		]);
	});

	it("refuses locked items and skips items already in the Trash", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Plan.txt"]);
		const result = trashClassicyFileSystemItems(fs, [
			"Trash:Plan.txt",
			"Macintosh HD:Applications:TV",
			"Macintosh HD",
		]);
		expect(result.moves).toEqual([]);
		expect(result.refusal).toEqual({ reason: "locked", name: "TV" });
	});

	it("moves each item once, carrying the trash metadata", () => {
		const fs = makeFs();
		ensureClassicyTrash(fs);
		const move = vi.spyOn(fs, "move");
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Plan.txt"], {
			"Macintosh HD:Documents:Plan.txt": [5, 6],
		});
		expect(move).toHaveBeenCalledWith(
			"Macintosh HD:Documents:Plan.txt",
			"Trash",
			expect.objectContaining({
				metadata: expect.objectContaining({ _trashedLocation: [5, 6] }),
			}),
		);
	});
});

describe("restoreClassicyFileSystemItems", () => {
	it("puts items back under their original names and clears the trash marks", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, [
			"Macintosh HD:Documents:Plan.txt",
			"Macintosh HD:Documents:Projects:Plan.txt",
		]);
		const { moves, refusal } = restoreClassicyFileSystemItems(fs, [
			"Trash:Plan 2.txt",
			"Trash:Plan.txt",
		]);
		expect(refusal).toBeUndefined();
		expect(moves.map((m) => m.to)).toEqual([
			"Macintosh HD:Documents:Projects:Plan.txt",
			"Macintosh HD:Documents:Plan.txt",
		]);
		const restored = fs.resolve("Macintosh HD:Documents:Projects:Plan.txt");
		expect(restored).toBeDefined();
		expect(
			Object.keys(restored ?? {}).filter((k) => k.startsWith("_trash")),
		).toEqual([]);
		expect(listClassicyTrashItems(fs)).toEqual([]);
	});

	it("leaves an item whose folder is gone, or whose name is taken, in the Trash", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, [
			"Macintosh HD:Documents:Projects:Plan.txt",
		]);
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Projects"]);
		expect(
			restoreClassicyFileSystemItems(fs, ["Trash:Plan.txt"]).refusal,
		).toEqual({
			reason: "no-origin",
			name: "Plan.txt",
		});

		const other = makeFs();
		trashClassicyFileSystemItems(other, ["Macintosh HD:Documents:Plan.txt"]);
		other.writeFile("Macintosh HD:Documents:Plan.txt", "new");
		expect(
			restoreClassicyFileSystemItems(other, ["Trash:Plan.txt"]).refusal,
		).toEqual({
			reason: "exists",
			name: "Plan.txt",
		});
		expect(other.resolve("Trash:Plan.txt")).toBeDefined();
	});
});

describe("emptyClassicyTrash", () => {
	it("removes everything in the Trash and nothing else", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, [
			"Macintosh HD:Documents:Plan.txt",
			"Macintosh HD:Documents:Projects",
		]);
		expect(emptyClassicyTrash(fs)).toBe(2);
		expect(listClassicyTrashItems(fs)).toEqual([]);
		expect(fs.resolve(CLASSICY_TRASH_PATH)).toBeDefined();
		expect(fs.resolve("Macintosh HD:Documents")).toBeDefined();
	});
});

describe("Trash moves through the Finder helpers", () => {
	const types = (dispatch: ReturnType<typeof vi.fn>) =>
		dispatch.mock.calls.map(([a]) => a.type);

	it("treats a drop on the Trash as Move To Trash", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt"],
			{ kind: "folder", path: CLASSICY_TRASH_PATH },
			dispatch,
		);
		expect(fs.resolve("Trash:Plan.txt")?._trashedFrom).toBe(
			"Macintosh HD:Documents",
		);
		expect(types(dispatch)).toEqual(["ClassicyAppFinderPathsMoved"]);
	});

	it("clears the trash marks on an item dragged out of the Trash", () => {
		const fs = makeFs();
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Plan.txt"]);
		moveClassicyFileSystemItems(
			fs,
			["Trash:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD:Documents:Projects" },
			vi.fn(),
		);
		// The folder already holds a Plan.txt: refused, still in the Trash.
		expect(fs.resolve("Trash:Plan.txt")).toBeDefined();
		moveClassicyFileSystemItems(
			fs,
			["Trash:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD:Applications" },
			vi.fn(),
		);
		moveClassicyFileSystemItems(
			fs,
			["Trash:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD" },
			vi.fn(),
		);
		expect(fs.resolve("Macintosh HD:Plan.txt")?._trashed).toBeUndefined();
	});

	it("alerts when an item can't go to the Trash", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyItemsToTrash(fs, ["Macintosh HD:Applications:TV"], dispatch);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyDesktopShowErrorDialog",
				message: expect.stringContaining("“TV” can’t be moved to the Trash"),
			}),
		);
	});

	it("restores a desktop item's icon where it was", () => {
		const fs = makeFs();
		fs.mkDir("Macintosh HD:Desktop Folder");
		fs.writeFile("Macintosh HD:Desktop Folder:Note.txt", "x");
		trashClassicyFileSystemItems(fs, ["Macintosh HD:Desktop Folder:Note.txt"], {
			"Macintosh HD:Desktop Folder:Note.txt": [300, 40],
		});
		const dispatch = vi.fn();
		restoreClassicyTrashItems(fs, ["Trash:Note.txt"], dispatch);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyDesktopIconAdd",
				filePath: "Macintosh HD:Desktop Folder:Note.txt",
				location: [300, 40],
			}),
		);
	});
});

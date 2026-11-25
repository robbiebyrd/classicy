// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	moveClassicyFileSystemItems,
	renameClassicyFileSystemItem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	ClassicyFileSystem,
	subscribeClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-file-move-${++counter}`, {
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				"Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				Projects: { _type: ClassicyFileSystemEntryFileType.Directory },
			},
			Archive: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
		},
	});

const types = (dispatch: ReturnType<typeof vi.fn>) =>
	dispatch.mock.calls.map(([a]) => a.type);

describe("moveClassicyFileSystemItems", () => {
	it("moves into a folder, tells Finder, and notifies every view of the tree", () => {
		const fs = makeFs();
		const notified = vi.fn();
		const unsubscribe = subscribeClassicyFileSystem(fs.storageKey, notified);
		const dispatch = vi.fn();
		const moves = moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD:Archive" },
			dispatch,
		);
		expect(moves).toEqual([
			{
				from: "Macintosh HD:Documents:Plan.txt",
				to: "Macintosh HD:Archive:Plan.txt",
			},
		]);
		expect(notified).toHaveBeenCalledOnce();
		unsubscribe();
		// A second instance for the key shares the tree, so it sees the move.
		expect(
			new ClassicyFileSystem(fs.storageKey).resolve(
				"Macintosh HD:Archive:Plan.txt",
			),
		).toBeDefined();
		expect(types(dispatch)).toEqual(["ClassicyAppFinderPathsMoved"]);
		expect(dispatch.mock.calls[0][0].moves).toEqual(moves);
	});

	it("creates the invisible Desktop Folder for a desktop drop and places icons at the drop point", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents:Projects"],
			{ kind: "desktop" },
			dispatch,
			{ desktopLocation: [300, 100], desktopStep: 70 },
		);
		const folder = classicyDesktopFolderPath(fs) as string;
		expect(folder).toBe("Macintosh HD:Desktop Folder");
		expect(fs.resolve(folder)?._invisible).toBe(true);
		expect(fs.resolve(`${folder}:Plan.txt`)).toBeDefined();

		const icons = dispatch.mock.calls
			.map(([a]) => a)
			.filter((a) => a.type === "ClassicyDesktopIconAdd");
		expect(icons).toEqual([
			expect.objectContaining({
				app: expect.objectContaining({
					id: `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${folder}:Plan.txt`,
					name: "Plan.txt",
				}),
				kind: "file",
				filePath: `${folder}:Plan.txt`,
				noLaunch: true,
				location: [300, 100],
			}),
			expect.objectContaining({
				kind: "directory",
				filePath: `${folder}:Projects`,
				location: [300, 170],
			}),
		]);
	});

	it("reports the first refusal and still moves the rest", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		const moves = moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Notes.txt", "Macintosh HD:Documents:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD:Archive" },
			dispatch,
		);
		expect(moves.map((m) => m.to)).toEqual(["Macintosh HD:Archive:Plan.txt"]);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message:
				"An item named “Notes.txt” already exists in “Archive”. It was not moved.",
		});
	});

	it("does nothing, silently, for a drop on the folder an item is already in", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			moveClassicyFileSystemItems(
				fs,
				["Macintosh HD:Documents:Plan.txt"],
				{ kind: "folder", path: "Macintosh HD:Documents" },
				dispatch,
			),
		).toEqual([]);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("explains a folder dropped into itself", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents"],
			{ kind: "folder", path: "Macintosh HD:Documents:Projects" },
			dispatch,
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message: "“Documents” can’t be moved into itself.",
		});
	});
});

describe("classicyDesktopItemIconAction", () => {
	it("is undefined for a path that no longer exists", () => {
		expect(classicyDesktopItemIconAction(makeFs(), "Macintosh HD:Gone")).toBe(
			undefined,
		);
	});
});

// Renaming an icon's name in place (a slow second click in an icon view, F2
// under Windows' keys): one `fs.move` into the item's own folder, names
// compared without case as HFS and FAT did.
describe("renameClassicyFileSystemItem", () => {
	it("renames in place, keeps the name as typed, and tells Finder", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			renameClassicyFileSystemItem(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				"Budget.txt",
				dispatch,
			),
		).toBe("Macintosh HD:Documents:Budget.txt");
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")).toBeUndefined();
		expect(fs.resolve("Macintosh HD:Documents:Budget.txt")?._type).toBe(
			ClassicyFileSystemEntryFileType.TextFile,
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderPathsMoved",
			moves: [
				{
					from: "Macintosh HD:Documents:Plan.txt",
					to: "Macintosh HD:Documents:Budget.txt",
				},
			],
		});
		expect(types(dispatch)).not.toContain("ClassicyDesktopShowErrorDialog");
	});

	it("renames by a change of case alone", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			renameClassicyFileSystemItem(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				"PLAN.txt",
				dispatch,
			),
		).toBe("Macintosh HD:Documents:PLAN.txt");
		expect(
			Object.hasOwn(fs.resolve("Macintosh HD:Documents"), "PLAN.txt"),
		).toBe(true);
	});

	it("refuses another item's name, whatever its case, in an alert", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			renameClassicyFileSystemItem(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				"notes.TXT",
				dispatch,
			),
		).toBeUndefined();
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")).toBeDefined();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message:
				"The name “notes.TXT” is already taken. Please use a different name.",
		});
	});

	it("refuses an empty name, the separator and the metadata prefix; ignores the same name", () => {
		const fs = makeFs();
		for (const name of ["", "   ", "a:b", "_hidden"]) {
			const dispatch = vi.fn();
			expect(
				renameClassicyFileSystemItem(
					fs,
					"Macintosh HD:Documents:Plan.txt",
					name,
					dispatch,
				),
				name,
			).toBeUndefined();
			expect(types(dispatch), name).toEqual(["ClassicyDesktopShowErrorDialog"]);
		}
		const dispatch = vi.fn();
		expect(
			renameClassicyFileSystemItem(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				"Plan.txt",
				dispatch,
			),
		).toBeUndefined();
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("refuses a locked item in an alert", () => {
		const fs = makeFs();
		fs.setMetadata("Macintosh HD:Documents:Plan.txt", { _system: true });
		const dispatch = vi.fn();
		expect(
			renameClassicyFileSystemItem(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				"Other.txt",
				dispatch,
			),
		).toBeUndefined();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message:
				"“Plan.txt” can’t be renamed, because it is locked or used by the system software.",
		});
	});

	it("re-adds a Desktop Folder item's icon under its new path, where it was", () => {
		const fs = makeFs();
		const folder = classicyDesktopFolderPath(fs) as string;
		fs.mkDir(folder);
		fs.writeFile(`${folder}:Memo.txt`, "hi");
		const dispatch = vi.fn();
		const renamed = renameClassicyFileSystemItem(
			fs,
			`${folder}:Memo.txt`,
			"Letter.txt",
			dispatch,
		);
		expect(renamed).toBe(`${folder}:Letter.txt`);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyDesktopIconAdd",
				app: expect.objectContaining({
					id: `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${folder}:Letter.txt`,
				}),
			}),
		);
	});
});

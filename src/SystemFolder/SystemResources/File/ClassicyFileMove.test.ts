// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	moveClassicyFileSystemItems,
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

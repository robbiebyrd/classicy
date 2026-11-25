// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDeleteConfirms,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
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

	// The remaining chapters' audit's 10.6: a file shortcut's icon is an
	// alias kind (`isAliasKind`), badged with its label italicized; files
	// and folders keep theirs.
	it("gives a file shortcut the file_shortcut kind, a file and a folder theirs", () => {
		const fs = makeFs();
		fs.mkDir("Macintosh HD:Documents:Folder");
		fs.writeFile("Macintosh HD:Documents:Link", "", {
			_type: ClassicyFileSystemEntryFileType.FileShortcut,
			_targetPath: "Macintosh HD:Documents:Plan.txt",
		});
		const kind = (path: string) =>
			classicyDesktopItemIconAction(fs, path)?.kind;
		expect(kind("Macintosh HD:Documents:Link")).toBe("file_shortcut");
		expect(kind("Macintosh HD:Documents:Plan.txt")).toBe("file");
		expect(kind("Macintosh HD:Documents:Folder")).toBe("directory");
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

// The remaining chapters' audit's 5.39 and 10.9 (WIG Ch.5 "Specialized
// Transfer Commands", p.67; Ch.10 p.210; Windows 98 SE, shell32.dll): under
// Explorer's commands every Delete asks before anything moves, a drop on
// the Trash included, while Finder (which shows the box) is mounted; under
// Windows' names a rename to a refused character is told in Windows 98's
// "Rename" box.
describe("Explorer's Delete and names", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const windowsPackage = (
		layout: Record<string, unknown> = { finder: { commands: "windows" } },
	) =>
		registerClassicyAppearancePackage({
			id: "test-explorer",
			name: "Explorer",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-explorer-default",
				package: "test-explorer",
			},
			layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, ...layout },
		});
	const PLAN = "Macintosh HD:Documents:Plan.txt";

	it("asks Finder first on every route, then moves when confirmed", () => {
		windowsPackage();
		const release = markClassicyAppMounted("Finder.app");
		try {
			expect(classicyDeleteConfirms()).toBe(true);
			const fs = makeFs();
			const dispatch = vi.fn();
			expect(
				moveClassicyItemsToTrash(fs, [PLAN], dispatch, { trust: "untrusted" }),
			).toEqual([]);
			expect(dispatch).toHaveBeenCalledWith(
				{ type: "ClassicyAppFinderConfirmDelete", paths: [PLAN] },
				"untrusted",
			);
			expect(fs.resolve(PLAN)).toBeDefined();
			// A drop on the Trash asks the same.
			dispatch.mockClear();
			expect(
				moveClassicyFileSystemItems(
					fs,
					[PLAN],
					{ kind: "folder", path: "Trash" },
					dispatch,
				),
			).toEqual([]);
			expect(dispatch).toHaveBeenCalledWith({
				type: "ClassicyAppFinderConfirmDelete",
				paths: [PLAN],
			});
			const moves = moveClassicyItemsToTrash(fs, [PLAN], dispatch, {
				confirmed: true,
			});
			expect(moves).toHaveLength(1);
			expect(fs.resolve(PLAN)).toBeUndefined();
		} finally {
			release();
		}
	});

	it("moves at once without the key, or with no Finder mounted", () => {
		const fs = makeFs();
		expect(classicyDeleteConfirms()).toBe(false);
		expect(moveClassicyItemsToTrash(fs, [PLAN], vi.fn())).toHaveLength(1);
		windowsPackage();
		const fs2 = makeFs();
		expect(classicyDeleteConfirms()).toBe(false);
		expect(
			moveClassicyItemsToTrash(
				fs2,
				["Macintosh HD:Documents:Notes.txt"],
				vi.fn(),
			),
		).toHaveLength(1);
	});

	it("refuses a Windows name in Windows 98's Rename box, Mac OS 8's names as before", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		// Mac OS 8: a question mark is a name's.
		expect(renameClassicyFileSystemItem(fs, PLAN, "Plan?.txt", dispatch)).toBe(
			"Macintosh HD:Documents:Plan?.txt",
		);
		windowsPackage({ files: { names: "windows" } });
		const fs2 = makeFs();
		const dispatch2 = vi.fn();
		expect(
			renameClassicyFileSystemItem(fs2, PLAN, "Plan?.txt", dispatch2),
		).toBeUndefined();
		expect(dispatch2).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			title: "Rename",
			message:
				'A filename cannot contain any of the following characters:\n\\ / : * ? " < > |',
		});
		expect(fs2.resolve(PLAN)).toBeDefined();
	});
});

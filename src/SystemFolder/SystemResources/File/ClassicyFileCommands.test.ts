import { afterEach, describe, expect, it, vi } from "vitest";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
	setClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import {
	classicyArrangeIconsMenuItem,
	classicyCanCopy,
	classicyCanCut,
	classicyCanMakeItemIn,
	classicyCanPaste,
	classicyCanRename,
	classicyCopyItems,
	classicyCopyMenuItem,
	classicyCreateShortcutMenuItem,
	classicyCreateShortcuts,
	classicyCutItems,
	classicyCutMenuItem,
	classicyDeleteConfirmation,
	classicyDeleteMenuItem,
	classicyLineUpIconsMenuItem,
	classicyNewItemPath,
	classicyNewMenuItem,
	classicyNewTypeAccessKeys,
	classicyPasteItems,
	classicyPasteMenuItem,
	classicyPasteShortcutMenuItem,
	classicyPasteShortcuts,
	classicyPlanShortcuts,
	classicyRenameMenuItem,
	classicyShortcutFolderFor,
	classicyVerbMenuItems,
	classicyVerbsFor,
	makeClassicyNewItem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Explorer's commands' pieces (the remaining chapters' audit's 5.23, 5.39,
// 5.40, 10.3; Windows 98 SE's menus and strings, shell32.dll): what Finder's
// folder windows and the desktop share.

const FOLDER = "Macintosh HD:Commands";
const freshFs = () => {
	const fs = new ClassicyFileSystem("classicyFileCommandsTest");
	fs.mkDir(FOLDER);
	return fs;
};
const TEXT = {
	appId: "SimpleText.app",
	fileType: "text_file",
	typeName: "Text Document",
	extension: "txt",
};
const windowsKeys = (key: string) => key;
const noKeys = () => undefined;

describe("New", () => {
	it("names a folder and a document by Windows 98's first free name, then makes them", () => {
		const fs = freshFs();
		const folderPath = classicyNewItemPath(fs, FOLDER, { kind: "folder" });
		expect(folderPath).toBe(`${FOLDER}:New Folder`);
		expect(makeClassicyNewItem(fs, folderPath, { kind: "folder" })).toBe(true);
		expect(fs.resolve(folderPath)?._type).toBe(
			ClassicyFileSystemEntryFileType.Directory,
		);
		expect(classicyNewItemPath(fs, FOLDER, { kind: "folder" })).toBe(
			`${FOLDER}:New Folder (2)`,
		);
		const docPath = classicyNewItemPath(fs, FOLDER, {
			kind: "file",
			type: { ...TEXT, data: "hello" },
		});
		expect(docPath).toBe(`${FOLDER}:New Text Document.txt`);
		makeClassicyNewItem(fs, docPath, {
			kind: "file",
			type: { ...TEXT, data: "hello" },
		});
		expect(fs.resolve(docPath)).toMatchObject({
			_type: "text_file",
			_data: "hello",
		});
	});

	it("makes nothing in the Trash, a read-only, derived or missing folder", () => {
		const fs = freshFs();
		expect(classicyCanMakeItemIn(fs, FOLDER)).toBe(true);
		expect(classicyCanMakeItemIn(fs, "Macintosh HD")).toBe(true);
		expect(classicyCanMakeItemIn(fs, "Trash")).toBe(false);
		expect(classicyCanMakeItemIn(fs, `${FOLDER}:Missing`)).toBe(false);
		fs.mkDir(`${FOLDER}:Locked`);
		fs.setMetadata(`${FOLDER}:Locked`, { _readOnly: true });
		expect(classicyCanMakeItemIn(fs, `${FOLDER}:Locked`)).toBe(false);
		fs.writeFile(`${FOLDER}:note.txt`, "x");
		expect(classicyCanMakeItemIn(fs, `${FOLDER}:note.txt`)).toBe(false);
	});

	it("lists Folder, a separator and the types, each by its first free letter", () => {
		expect(
			classicyNewTypeAccessKeys(["Text Document", "Bitmap Image", "Folio"]),
		).toEqual(["T", "B", "o"]);
		const onNew = vi.fn();
		const menu = classicyNewMenuItem("x", windowsKeys, [TEXT], onNew);
		expect(menu).toMatchObject({ id: "x_new", title: "New", accessKey: "w" });
		expect(
			menu.menuChildren?.map((item) => [item.title, item.accessKey]),
		).toEqual([
			["Folder", "F"],
			[undefined, undefined],
			["Text Document", "T"],
		]);
		menu.menuChildren?.[0].onClickFunc?.();
		expect(onNew).toHaveBeenLastCalledWith({ kind: "folder" });
		menu.menuChildren?.[2].onClickFunc?.();
		expect(onNew).toHaveBeenLastCalledWith({ kind: "file", type: TEXT });
		// No types: Folder alone; no keys under a package without them.
		const plain = classicyNewMenuItem("x", noKeys, [], onNew, true);
		expect(plain.disabled).toBe(true);
		expect(plain.menuChildren?.map((item) => item.title)).toEqual(["Folder"]);
		expect(JSON.stringify(plain)).not.toContain("accessKey");
	});
});

describe("the view and item commands", () => {
	it("draws Delete with the Delete key, a native key, and gives shell32's letters", () => {
		const onDelete = vi.fn();
		const del = classicyDeleteMenuItem("x", windowsKeys, onDelete);
		expect(del).toMatchObject({
			title: "Delete",
			accessKey: "D",
			keyboardShortcut: "⌦",
			nativeShortcut: true,
		});
		del.onClickFunc?.();
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(classicyRenameMenuItem("x", windowsKeys, vi.fn())).toMatchObject({
			title: "Rename",
			accessKey: "m",
		});
		expect(
			classicyLineUpIconsMenuItem("x", windowsKeys, vi.fn(), true),
		).toMatchObject({ title: "Line Up Icons", accessKey: "U", disabled: true });
	});

	it("arranges by the offered orders only, in Windows 98's order", () => {
		const onArrange = vi.fn();
		const all = classicyArrangeIconsMenuItem(
			"x",
			windowsKeys,
			["modified", "name", "size", "kind"],
			onArrange,
		);
		expect(all).toMatchObject({ title: "Arrange Icons", accessKey: "I" });
		expect(
			all.menuChildren?.map((item) => [item.title, item.accessKey]),
		).toEqual([
			["by Name", "N"],
			["by Type", "T"],
			["by Size", "z"],
			["by Date", "D"],
		]);
		all.menuChildren?.[3].onClickFunc?.();
		expect(onArrange).toHaveBeenCalledWith("modified");
		expect(
			classicyArrangeIconsMenuItem(
				"x",
				noKeys,
				["name", "kind"],
				onArrange,
			).menuChildren?.map((item) => item.title),
		).toEqual(["by Name", "by Type"]);
	});

	it("renames an item that may be, never a drive, a locked or derived entry", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:note.txt`, "x");
		expect(classicyCanRename(fs, `${FOLDER}:note.txt`)).toBe(true);
		expect(classicyCanRename(fs, "Macintosh HD")).toBe(false);
		fs.setMetadata(`${FOLDER}:note.txt`, { _readOnly: true });
		expect(classicyCanRename(fs, `${FOLDER}:note.txt`)).toBe(false);
		fs.writeFile(`${FOLDER}:derived`, "x", { _derived: true });
		expect(classicyCanRename(fs, `${FOLDER}:derived`)).toBe(false);
		expect(classicyCanRename(fs, `${FOLDER}:missing`)).toBe(false);
	});
});

describe("classicyDeleteConfirmation", () => {
	it("reads Windows 98 SE's three boxes (shell32.dll), the container named", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:Plan.txt`, "x");
		fs.mkDir(`${FOLDER}:Old`);
		expect(classicyDeleteConfirmation(fs, [`${FOLDER}:Plan.txt`])).toEqual({
			title: "Confirm File Delete",
			message: "Are you sure you want to send 'Plan.txt' to the Trash?",
		});
		expect(
			classicyDeleteConfirmation(fs, [`${FOLDER}:Old`], "Recycle Bin"),
		).toEqual({
			title: "Confirm Folder Delete",
			message:
				"Are you sure you want to remove the folder 'Old' and move all its contents to the Recycle Bin?",
		});
		expect(
			classicyDeleteConfirmation(fs, [`${FOLDER}:Plan.txt`, `${FOLDER}:Old`]),
		).toEqual({
			title: "Confirm Multiple File Delete",
			message: "Are you sure you want to send these 2 items to the Trash?",
		});
	});
});

// The remaining chapters' audit's 10.6 (WIG Ch.10 "Registering Commands",
// pp.200-201; Windows 98 SE, shell32.dll): Create Shortcut's item, where it
// puts a shortcut, and the handler's verbs.
describe("Create Shortcut", () => {
	it("is shell32's Create Shortcut, access key S under a package with keys", () => {
		const onCreate = vi.fn();
		const item = classicyCreateShortcutMenuItem("x", windowsKeys, onCreate);
		expect(item).toMatchObject({
			id: "x_create_shortcut",
			title: "Create Shortcut",
			accessKey: "S",
			disabled: false,
		});
		item.onClickFunc?.();
		expect(onCreate).toHaveBeenCalled();
		expect(
			"accessKey" in classicyCreateShortcutMenuItem("x", noKeys, onCreate),
		).toBe(false);
	});

	it("puts a shortcut beside its item, and offers the desktop where none may be made", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		fs.mkDir(`${FOLDER}:Locked`);
		fs.writeFile(`${FOLDER}:Locked:b.txt`, "b");
		fs.setMetadata(`${FOLDER}:Locked`, { _readOnly: true });
		fs.writeFile("Trash:c.txt", "c", { _trashed: true });
		expect(classicyShortcutFolderFor(fs, `${FOLDER}:a.txt`)).toBe(FOLDER);
		expect(classicyShortcutFolderFor(fs, `${FOLDER}:Locked:b.txt`)).toBe(
			undefined,
		);
		// A drive lies at the root of the tree.
		expect(classicyShortcutFolderFor(fs, "Macintosh HD")).toBeUndefined();
		const plan = classicyPlanShortcuts(fs, [
			`${FOLDER}:a.txt`,
			`${FOLDER}:Locked:b.txt`,
			"Macintosh HD",
			"Trash:c.txt",
			`${FOLDER}:gone.txt`,
		]);
		expect([...plan.beside]).toEqual([[FOLDER, [`${FOLDER}:a.txt`]]]);
		// The Trash's items take none; a missing item is skipped.
		expect(plan.offerDesktop).toEqual([
			`${FOLDER}:Locked:b.txt`,
			"Macintosh HD",
		]);
	});

	it("makes the shortcuts beside, places and selects them, and asks for the rest", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		fs.writeFile(`${FOLDER}:b.txt`, "b");
		const dispatch = vi.fn();
		const commands = {
			selectedPaths: () => [],
			select: vi.fn(),
			rename: vi.fn(),
			place: vi.fn(),
			arrange: vi.fn(),
			lineUp: vi.fn(),
			display: () => "icons" as const,
		};
		const made = classicyCreateShortcuts(
			fs,
			[`${FOLDER}:a.txt`, `${FOLDER}:b.txt`, "Macintosh HD"],
			dispatch,
			commands,
		);
		const shortcuts = [
			`${FOLDER}:Shortcut to a.txt`,
			`${FOLDER}:Shortcut to b.txt`,
		];
		expect(made).toEqual(shortcuts);
		expect(commands.place.mock.calls).toEqual([[shortcuts[0]], [shortcuts[1]]]);
		expect(commands.select).toHaveBeenCalledWith(shortcuts);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderOfferDesktopShortcut",
			paths: ["Macintosh HD"],
		});
	});
});

describe("verbs", () => {
	registerApp({
		id: "CmdVerbs.app",
		description: "Plays clips.",
		verbs: [
			{ id: "play", title: "Play", action: "ClassicyAppCmdVerbsPlay" },
			{
				id: "print",
				title: "Print",
				action: "ClassicyAppCmdVerbsPrint",
				accessKey: "P",
			},
		],
	});
	const handlers = { video: "CmdVerbs.app", directory: "Finder.app" };

	it("lists the type's handler's verbs while it is mounted, none for a folder", () => {
		const mounted = new Set(["CmdVerbs.app"]);
		expect(
			classicyVerbsFor("video", handlers, mounted).map((v) => [
				v.appId,
				v.title,
			]),
		).toEqual([
			["CmdVerbs.app", "Play"],
			["CmdVerbs.app", "Print"],
		]);
		expect(classicyVerbsFor("video", handlers, new Set())).toEqual([]);
		expect(classicyVerbsFor("directory", handlers, mounted)).toEqual([]);
		expect(classicyVerbsFor("audio", handlers, mounted)).toEqual([]);
		expect(classicyVerbsFor(undefined, handlers, mounted)).toEqual([]);
		expect(classicyVerbsFor("constructor", handlers, mounted)).toEqual([]);
	});

	it("runs a verb on each target, trusted, with the app and the path", () => {
		const dispatch = vi.fn();
		const items = classicyVerbMenuItems(
			"finder_item",
			windowsKeys,
			classicyVerbsFor("video", handlers, new Set(["CmdVerbs.app"])),
			() => ["Macintosh HD:a.mov", "Macintosh HD:b.mov"],
			dispatch,
		);
		expect(items.map((i) => [i.title, i.accessKey])).toEqual([
			["Play", undefined],
			["Print", "P"],
		]);
		items[1].onClickFunc?.();
		expect(dispatch.mock.calls).toEqual([
			[
				{
					type: "ClassicyAppCmdVerbsPrint",
					app: { id: "CmdVerbs.app" },
					path: "Macintosh HD:a.mov",
				},
			],
			[
				{
					type: "ClassicyAppCmdVerbsPrint",
					app: { id: "CmdVerbs.app" },
					path: "Macintosh HD:b.mov",
				},
			],
		]);
		expect(
			classicyVerbMenuItems(
				"finder_item",
				noKeys,
				classicyVerbsFor("video", handlers, new Set(["CmdVerbs.app"])),
				() => [],
				dispatch,
			).some((i) => "accessKey" in i),
		).toBe(false);
	});
});

// The remaining chapters' audit's 5.28 (WIG Ch.5 "Command Method",
// pp.59-61; Windows 98 SE's menus, shell32.dll: "Cu&t", "&Copy", "&Paste",
// "Paste &Shortcut"): Cut, Copy, Paste and Paste Shortcut of files.
describe("Cut, Copy and Paste", () => {
	afterEach(() => clearClassicyFileClipboard());

	const fakeCommands = () => ({
		selectedPaths: () => [],
		select: vi.fn(),
		rename: vi.fn(),
		place: vi.fn(),
		arrange: vi.fn(),
		lineUp: vi.fn(),
		display: () => "icons" as const,
	});

	it("are shell32's items, the Edit menu's with Ctrl+X, Ctrl+C and Ctrl+V as native keys", () => {
		const run = () => {};
		expect(classicyCutMenuItem("m", windowsKeys, run)).toEqual({
			id: "m_cut",
			title: "Cut",
			accessKey: "t",
			disabled: false,
			onClickFunc: run,
		});
		expect(
			classicyCopyMenuItem("m", windowsKeys, run, { shortcut: true }),
		).toMatchObject({
			title: "Copy",
			accessKey: "C",
			keyboardShortcut: "⌘C",
			nativeShortcut: true,
		});
		expect(
			classicyPasteMenuItem("m", windowsKeys, run, {
				shortcut: true,
				disabled: true,
			}),
		).toMatchObject({
			title: "Paste",
			accessKey: "P",
			keyboardShortcut: "⌘V",
			disabled: true,
		});
		expect(classicyPasteShortcutMenuItem("m", windowsKeys, run)).toMatchObject({
			id: "m_paste_shortcut",
			title: "Paste Shortcut",
			accessKey: "S",
		});
		// No access keys under a package without them.
		expect(classicyCutMenuItem("m", noKeys, run)).not.toHaveProperty(
			"accessKey",
		);
		expect(
			classicyCutMenuItem("m", noKeys, run, { shortcut: true }),
		).toMatchObject({ keyboardShortcut: "⌘X", nativeShortcut: true });
	});

	it("cut what a Paste could move and copy what it could copy", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		fs.writeFile(`${FOLDER}:locked.txt`, "l", { _readOnly: true });
		fs.mkDir(`${FOLDER}:RO`);
		fs.writeFile(`${FOLDER}:RO:in.txt`, "i");
		fs.setMetadata(`${FOLDER}:RO`, { _readOnly: true });
		expect(classicyCanCut(fs, `${FOLDER}:a.txt`)).toBe(true);
		expect(classicyCanCopy(fs, `${FOLDER}:a.txt`)).toBe(true);
		// A read-only item, or one in a read-only folder, cannot move, but
		// copies.
		expect(classicyCanCut(fs, `${FOLDER}:locked.txt`)).toBe(false);
		expect(classicyCanCopy(fs, `${FOLDER}:locked.txt`)).toBe(true);
		expect(classicyCanCut(fs, `${FOLDER}:RO:in.txt`)).toBe(false);
		expect(classicyCanCopy(fs, `${FOLDER}:RO:in.txt`)).toBe(true);
		// Never a drive, the Trash, or what is not there.
		for (const path of ["Macintosh HD", "Trash", `${FOLDER}:missing`]) {
			expect(classicyCanCut(fs, path), path).toBe(false);
			expect(classicyCanCopy(fs, path), path).toBe(false);
		}
	});

	it("takes a Trash item for a Cut, never a Copy", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:old.txt`, "o");
		fs.move(`${FOLDER}:old.txt`, "Trash", {
			metadata: { _trashed: true, _trashedFrom: FOLDER },
		});
		expect(classicyCanCut(fs, "Trash:old.txt")).toBe(true);
		expect(classicyCanCopy(fs, "Trash:old.txt")).toBe(false);
	});

	it("fills the file clipboard with what may be cut or copied, and leaves it with nothing", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		expect(classicyCutItems(fs, [`${FOLDER}:a.txt`, "Macintosh HD"])).toEqual([
			`${FOLDER}:a.txt`,
		]);
		expect(getClassicyFileClipboard()).toEqual({
			op: "cut",
			paths: [`${FOLDER}:a.txt`],
			storageKey: "classicyFileCommandsTest",
		});
		expect(classicyCopyItems(fs, ["Macintosh HD"])).toEqual([]);
		expect(getClassicyFileClipboard()?.op).toBe("cut");
		expect(classicyCopyItems(fs, [`${FOLDER}:a.txt`])).toEqual([
			`${FOLDER}:a.txt`,
		]);
		expect(getClassicyFileClipboard()?.op).toBe("copy");
	});

	it("pastes a Copy into a folder as Copy of, placed and selected, and repeats", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		fs.writeFile(`${FOLDER}:b.txt`, "b");
		classicyCopyItems(fs, [`${FOLDER}:a.txt`, `${FOLDER}:b.txt`]);
		const commands = fakeCommands();
		const dispatch = vi.fn();
		expect(classicyCanPaste(fs, FOLDER)).toBe(true);
		const made = classicyPasteItems(
			fs,
			{ kind: "folder", path: FOLDER },
			dispatch,
			{ commands, at: [30, 40] },
		);
		expect(made).toEqual([
			`${FOLDER}:Copy of a.txt`,
			`${FOLDER}:Copy of b.txt`,
		]);
		// The first at the menu's point, the rest to free cells.
		expect(commands.place.mock.calls).toEqual([
			[`${FOLDER}:Copy of a.txt`, [30, 40]],
			[`${FOLDER}:Copy of b.txt`, undefined],
		]);
		expect(commands.select).toHaveBeenCalledWith(made);
		expect(getClassicyFileClipboard()?.op).toBe("copy");
		expect(
			classicyPasteItems(fs, { kind: "folder", path: FOLDER }, dispatch),
		).toEqual([`${FOLDER}:Copy (2) of a.txt`, `${FOLDER}:Copy (2) of b.txt`]);
	});

	it("pastes a Cut by moving it, telling Finder, and empties the clipboard", () => {
		const fs = freshFs();
		fs.mkDir(`${FOLDER}:Into`);
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		classicyCutItems(fs, [`${FOLDER}:a.txt`]);
		const dispatch = vi.fn();
		expect(
			classicyPasteItems(
				fs,
				{ kind: "folder", path: `${FOLDER}:Into` },
				dispatch,
			),
		).toEqual([`${FOLDER}:Into:a.txt`]);
		expect(fs.resolve(`${FOLDER}:a.txt`)).toBeUndefined();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderPathsMoved",
			moves: [{ from: `${FOLDER}:a.txt`, to: `${FOLDER}:Into:a.txt` }],
		});
		expect(getClassicyFileClipboard()).toBeNull();
	});

	it("keeps a Cut pasted into its own folder, where nothing moves", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		classicyCutItems(fs, [`${FOLDER}:a.txt`]);
		expect(
			classicyPasteItems(fs, { kind: "folder", path: FOLDER }, vi.fn()),
		).toEqual([]);
		expect(getClassicyFileClipboard()?.op).toBe("cut");
	});

	it("pastes nothing into a folder that takes no items, from another tree, or once the items are gone", () => {
		const fs = freshFs();
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		const dispatch = vi.fn();
		classicyCopyItems(fs, [`${FOLDER}:a.txt`]);
		expect(classicyCanPaste(fs, "Trash")).toBe(false);
		expect(
			classicyPasteItems(fs, { kind: "folder", path: "Trash" }, dispatch),
		).toEqual([]);
		setClassicyFileClipboard("copy", [`${FOLDER}:a.txt`], "another-tree");
		expect(classicyCanPaste(fs, FOLDER)).toBe(false);
		expect(
			classicyPasteItems(fs, { kind: "folder", path: FOLDER }, dispatch),
		).toEqual([]);
		setClassicyFileClipboard("copy", [`${FOLDER}:gone.txt`], fs.storageKey);
		expect(
			classicyPasteItems(fs, { kind: "folder", path: FOLDER }, dispatch),
		).toEqual([]);
		clearClassicyFileClipboard();
		expect(classicyCanPaste(fs, FOLDER)).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("makes Paste Shortcut's shortcuts after a Copy only, placed and selected", () => {
		const fs = freshFs();
		fs.mkDir(`${FOLDER}:Into`);
		fs.writeFile(`${FOLDER}:a.txt`, "a");
		classicyCutItems(fs, [`${FOLDER}:a.txt`]);
		expect(classicyCanPaste(fs, `${FOLDER}:Into`, { shortcut: true })).toBe(
			false,
		);
		expect(
			classicyPasteShortcuts(
				fs,
				{ kind: "folder", path: `${FOLDER}:Into` },
				vi.fn(),
			),
		).toEqual([]);
		classicyCopyItems(fs, [`${FOLDER}:a.txt`]);
		expect(classicyCanPaste(fs, `${FOLDER}:Into`, { shortcut: true })).toBe(
			true,
		);
		const commands = fakeCommands();
		const made = classicyPasteShortcuts(
			fs,
			{ kind: "folder", path: `${FOLDER}:Into` },
			vi.fn(),
			{ commands, at: [1, 2] },
		);
		expect(made).toEqual([`${FOLDER}:Into:Shortcut to a.txt`]);
		expect(fs.resolve(made[0])).toMatchObject({
			_type: "file_shortcut",
			_targetPath: `${FOLDER}:a.txt`,
		});
		expect(commands.place).toHaveBeenCalledWith(made[0], [1, 2]);
		expect(commands.select).toHaveBeenCalledWith(made);
		expect(getClassicyFileClipboard()?.op).toBe("copy");
	});
});

import { describe, expect, it, vi } from "vitest";
import {
	classicyArrangeIconsMenuItem,
	classicyCanMakeItemIn,
	classicyCanRename,
	classicyDeleteConfirmation,
	classicyDeleteMenuItem,
	classicyLineUpIconsMenuItem,
	classicyNewItemPath,
	classicyNewMenuItem,
	classicyNewTypeAccessKeys,
	classicyRenameMenuItem,
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

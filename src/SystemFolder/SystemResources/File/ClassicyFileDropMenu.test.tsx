import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef, type RefObject, useImperativeHandle } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyFileDropTarget } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	CLASSICY_FILE_DROP_MENU_ITEMS,
	type ClassicyFileDropMenuApi,
	classicyFileDropEffects,
	classicyFileDropMenuItems,
	useClassicyFileDropMenu,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDropMenu";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Windows 98 SE's transfer menu (the remaining chapters' audit's 5.33 /
// 11.7 / A.5; WIG Ch.5 "Nondefault Drag and Drop", pp.62-63, Figure 5.13;
// shell32.dll's menus 200 and 201).

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-file-drop-menu-${++counter}`, {
		_type: "directory",
		HD: {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Docs: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
		},
		Trash: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_system: true,
			"Old.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
	});

const FOLDER = { kind: "folder", path: "HD:Docs" } as const;

describe("classicyFileDropEffects", () => {
	it("offers a move alone into the Trash (menu 201)", () => {
		expect(
			classicyFileDropEffects(makeFs(), ["HD:Docs:Plan.txt"], {
				kind: "folder",
				path: "Trash",
			}),
		).toEqual(["move"]);
	});

	it("offers every effect for items that may be copied and linked (menu 200)", () => {
		expect(
			classicyFileDropEffects(makeFs(), ["HD:Docs:Plan.txt"], {
				kind: "desktop",
			}),
		).toEqual(["move", "copy", "link"]);
	});

	it("leaves out a copy of a drive, and a copy or shortcut of a Trash item", () => {
		const fs = makeFs();
		expect(classicyFileDropEffects(fs, ["HD"], FOLDER)).toEqual([
			"move",
			"link",
		]);
		expect(classicyFileDropEffects(fs, ["Trash:Old.txt"], FOLDER)).toEqual([
			"move",
		]);
		// One item that may be copied is enough.
		expect(
			classicyFileDropEffects(fs, ["HD", "HD:Docs:Plan.txt"], FOLDER),
		).toEqual(["move", "copy", "link"]);
	});

	it("goes by the destination alone without a tree", () => {
		expect(classicyFileDropEffects(undefined, ["anything"], FOLDER)).toEqual([
			"move",
			"copy",
			"link",
		]);
	});
});

describe("classicyFileDropMenuItems", () => {
	const noKeys = () => undefined;
	const keys = (key: string) => key;

	it("lists shell32.dll's items, the default bold, a separator and Cancel", () => {
		const onChoose = vi.fn();
		const items = classicyFileDropMenuItems(
			["move", "copy", "link"],
			"move",
			noKeys,
			onChoose,
		);
		expect(items.map((i) => i.title ?? i.id)).toEqual([
			"Move Here",
			"Copy Here",
			"Create Shortcut(s) Here",
			"spacer",
			"Cancel",
		]);
		expect(items.filter((i) => i.isDefault).map((i) => i.title)).toEqual([
			"Move Here",
		]);
		// No letter without the package's access keys.
		expect(items.some((i) => "accessKey" in i)).toBe(false);
		items[1].onClickFunc?.();
		expect(onChoose).toHaveBeenCalledWith("copy");
		items[2].onClickFunc?.();
		expect(onChoose).toHaveBeenLastCalledWith("link");
		// Cancel does nothing.
		items[4].onClickFunc?.();
		expect(onChoose).toHaveBeenCalledTimes(2);
	});

	it("makes the would-be drop's command the default and carries shell32's letters", () => {
		const items = classicyFileDropMenuItems(
			["move", "copy", "link"],
			"copy",
			keys,
			vi.fn(),
		);
		expect(items.filter((i) => i.isDefault).map((i) => i.title)).toEqual([
			"Copy Here",
		]);
		expect(items.map((i) => i.accessKey)).toEqual([
			CLASSICY_FILE_DROP_MENU_ITEMS.move.accessKey,
			"C",
			"S",
			undefined,
			undefined,
		]);
		expect(CLASSICY_FILE_DROP_MENU_ITEMS.move.accessKey).toBe("M");
	});

	it("leaves out the effects not taken, the default falling to the first left", () => {
		const items = classicyFileDropMenuItems(["move"], "copy", noKeys, vi.fn());
		expect(items.map((i) => i.title ?? i.id)).toEqual([
			"Move Here",
			"spacer",
			"Cancel",
		]);
		expect(items[0].isDefault).toBe(true);
	});
});

describe("useClassicyFileDropMenu", () => {
	let restore: () => void = () => {};
	afterEach(() => {
		cleanup();
		restore();
		restore = () => {};
	});

	type Harness = ClassicyFileDropMenuApi & {
		showContextMenu: ReturnType<
			typeof useClassicyContextualMenu
		>["showContextMenu"];
	};
	const Probe = ({ api }: { api: RefObject<Harness | null> }) => {
		const menu = useClassicyFileDropMenu();
		const { showContextMenu } = useClassicyContextualMenu();
		useImperativeHandle(api, () => ({ ...menu, showContextMenu }));
		return null;
	};
	const mount = () => {
		const api = createRef<Harness>();
		render(
			<ClassicyContextualMenuProvider>
				<Probe api={api} />
			</ClassicyContextualMenuProvider>,
		);
		return api;
	};
	const target: ClassicyFileDropTarget = {
		destination: FOLDER,
		element: document.createElement("div"),
	};
	const menuText = () =>
		document.querySelector(".classicyContextMenuWrapper")?.textContent ?? null;

	it("drags on button 1 alone, and adds nothing but the effects, without the key", () => {
		const api = mount();
		const menu = api.current as Harness;
		expect(menu.secondaryDrags).toBe(false);
		expect(menu.startsDrag({ button: 0 })).toBe(true);
		expect(menu.startsDrag({ button: 2 })).toBe(false);
		const effects = () => ["move"] as const;
		const options = menu.dragOptions(
			{ button: 2 },
			{ effects, transferAt: () => vi.fn() },
		);
		expect(options).toEqual({ effects });
	});

	it("drags on button 2 too, ending in the menu, under the key", async () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { secondaryButton: "menu" },
		});
		const api = mount();
		const menu = api.current as Harness;
		expect(menu.secondaryDrags).toBe(true);
		expect(menu.startsDrag({ button: 2 })).toBe(true);
		expect(menu.startsDrag({ button: 1 })).toBe(false);
		const transfer = vi.fn();
		const transferAt = vi.fn(() => transfer);
		const onStart = vi.fn();
		const options = menu.dragOptions(
			{ button: 2 },
			{ effects: () => ["move", "copy", "link"], onStart, transferAt },
		);
		expect(options.button).toBe(2);
		// The press's own menu, open or held, goes when the drag starts.
		act(() => menu.showContextMenu([{ id: "open", title: "Open" }], [5, 5]));
		expect(menuText()).toContain("Open");
		act(() => options.onStart?.());
		expect(menuText()).toBeNull();
		expect(onStart).toHaveBeenCalledOnce();
		// The release over a target shows the transfer menu at the pointer.
		act(() => options.onMenu?.(target, [40, 50], [30, 40], "move"));
		expect(transferAt).toHaveBeenCalledWith(target, [40, 50], [30, 40]);
		expect(menuText()).toContain("Move Here");
		expect(menuText()).toContain("Copy Here");
		expect(menuText()).toContain("Create Shortcut(s) Here");
		expect(menuText()).toContain("Cancel");
		expect(
			document.getElementById("classicy_file_drop_move")?.className,
		).toContain("default");
		fireEvent.click(
			document.getElementById("classicy_file_drop_copy") as HTMLElement,
		);
		await waitFor(() => expect(transfer).toHaveBeenCalledWith("copy"));
	});

	it("does nothing on Cancel", async () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { secondaryButton: "menu" },
		});
		const api = mount();
		const transfer = vi.fn();
		const options = (api.current as Harness).dragOptions(
			{ button: 2 },
			{ effects: () => ["move"], transferAt: () => transfer },
		);
		act(() => options.onMenu?.(target, [40, 50], [30, 40], "move"));
		fireEvent.click(
			document.getElementById("classicy_file_drop_cancel") as HTMLElement,
		);
		await waitFor(() => expect(menuText()).toBeNull());
		expect(transfer).not.toHaveBeenCalled();
	});

	it("gives shell32's letters under the package's access keys", () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { secondaryButton: "menu" },
			menu: { keys: "windows", accessKeys: "auto" },
		});
		const api = mount();
		const options = (api.current as Harness).dragOptions(
			{ button: 2 },
			{ effects: () => ["move", "copy", "link"], transferAt: () => vi.fn() },
		);
		act(() => options.onMenu?.(target, [40, 50], [30, 40], "move"));
		expect(
			document
				.getElementById("classicy_file_drop_link")
				?.getAttribute("aria-keyshortcuts"),
		).toBe("S");
	});
});

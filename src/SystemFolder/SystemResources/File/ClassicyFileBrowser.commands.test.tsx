import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The browser's commands handle (`commandsRef`), which Finder's Explorer
// commands run (the remaining chapters' audit's 5.40, 10.3, A.4): select an
// item, rename it in place, place a new icon, Arrange Icons and Line Up
// Icons, in either view; and the white space's menu.

// jsdom lays nothing out: every element a 400 px box, so the icon view has
// columns to place its icons in.
beforeEach(() => {
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 0, 400, 400),
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	resetClassicyAppearancePackagesForTests();
});

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-browser-commands-${++counter}`, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"b.txt": { _type: ClassicyFileSystemEntryFileType.TextFile, _size: 9 },
			"a.txt": { _type: ClassicyFileSystemEntryFileType.TextFile, _size: 1 },
			"c.pdf": { _type: ClassicyFileSystemEntryFileType.Pdf, _size: 5 },
		},
	});

const windowsKeys = () =>
	registerClassicyAppearancePackage({
		id: "test-browser-commands",
		name: "Commands",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "test-browser-commands-default",
			package: "test-browser-commands",
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			fileBrowser: { keys: "windows" },
		},
	});

const renderBrowser = (
	display: "icons" | "list",
	{
		fs = makeFs(),
		onRenameItem = vi.fn((path: string, name: string) => {
			const folder = path.split(":").slice(0, -1).join(":");
			const result = fs.move(path, folder, { name });
			return result.ok ? result.path : undefined;
		}),
		backgroundContextMenu,
	}: {
		fs?: ClassicyFileSystem;
		onRenameItem?: (path: string, name: string) => string | undefined;
		backgroundContextMenu?: (at: [number, number]) => ClassicyMenuItem[];
	} = {},
) => {
	const commandsRef = createRef<ClassicyFileBrowserCommands>();
	const browser = (instance: ClassicyFileSystem) => (
		<ClassicyFileBrowser
			fs={instance}
			path="Documents"
			appId="Finder.app"
			display={display}
			commandsRef={commandsRef}
			onRenameItem={onRenameItem}
			backgroundContextMenu={backgroundContextMenu}
		/>
	);
	const view = render(browser(fs));
	// Finder's `useClassicyFileSystem` hands out a fresh instance on every
	// change to the tree; a test does it by hand.
	const refresh = () =>
		view.rerender(browser(new ClassicyFileSystem(fs.storageKey)));
	return { ...view, fs, commandsRef, onRenameItem, refresh };
};

const iconAt = (container: HTMLElement, path: string) =>
	container.querySelector<HTMLElement>(
		`.classicyIcon[data-classicy-file-path="${CSS.escape(path)}"]`,
	);
const place = (el: HTMLElement | null) => [
	Number.parseFloat(el?.style.left ?? "NaN"),
	Number.parseFloat(el?.style.top ?? "NaN"),
];

describe("the icon view's commands", () => {
	it("selects, renames in place and places an item New makes, once it is listed", async () => {
		const { container, fs, commandsRef, onRenameItem, refresh } =
			renderBrowser("icons");
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		const made = "Documents:New Folder";
		act(() => {
			commandsRef.current?.place(made);
			fs.mkDir(made);
			commandsRef.current?.select([made]);
			commandsRef.current?.rename(made);
		});
		refresh();
		const field = await waitFor(() => {
			const input = container.querySelector<HTMLInputElement>(
				".classicyIconRename",
			);
			expect(input).not.toBeNull();
			return input as HTMLInputElement;
		});
		expect(field.value).toBe("New Folder");
		expect(iconAt(container, made)?.classList.contains("selected")).toBe(true);
		expect(commandsRef.current?.selectedPaths()).toEqual([made]);
		// The first free cell: no other icon sits there.
		const newPlace = place(iconAt(container, made)).join(",");
		for (const other of ["a.txt", "b.txt", "c.pdf"])
			expect(place(iconAt(container, `Documents:${other}`)).join(",")).not.toBe(
				newPlace,
			);
		fireEvent.change(field, { target: { value: "Plans" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(onRenameItem).toHaveBeenCalledWith(made, "Plans");
		refresh();
		await waitFor(() =>
			expect(commandsRef.current?.selectedPaths()).toEqual(["Documents:Plans"]),
		);
	});

	it("places a new icon at a client point", async () => {
		const { container, fs, commandsRef, refresh } = renderBrowser("icons");
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		act(() => {
			commandsRef.current?.place("Documents:Here", [123, 77]);
			fs.mkDir("Documents:Here");
		});
		refresh();
		await waitFor(() =>
			expect(place(iconAt(container, "Documents:Here"))).toEqual([123, 77]),
		);
	});

	it("arranges the icons once by a key and lines them up on the grid", async () => {
		const { container, commandsRef } = renderBrowser("icons");
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		const order = () =>
			["a.txt", "b.txt", "c.pdf"]
				.map((name) => ({
					name,
					at: place(iconAt(container, `Documents:${name}`)),
				}))
				.sort((x, y) => x.at[0] - y.at[0] || x.at[1] - y.at[1])
				.map((x) => x.name);
		act(() => commandsRef.current?.arrange("size"));
		await waitFor(() => expect(order()).toEqual(["a.txt", "c.pdf", "b.txt"]));
		act(() => commandsRef.current?.arrange("name"));
		await waitFor(() => expect(order()).toEqual(["a.txt", "b.txt", "c.pdf"]));
		// Moved off the grid, then lined up: back on a cell, none shared.
		const before = place(iconAt(container, "Documents:b.txt"));
		const icon = iconAt(container, "Documents:b.txt");
		if (icon) {
			icon.style.left = `${before[0] + 7}px`;
			icon.style.top = `${before[1] + 5}px`;
		}
		act(() => commandsRef.current?.lineUp());
		await waitFor(() =>
			expect(place(iconAt(container, "Documents:b.txt"))).toEqual(before),
		);
		expect(commandsRef.current?.display()).toBe("icons");
	});
});

describe("the list view's commands", () => {
	const nameCell = (container: HTMLElement, path: string) =>
		container.querySelector<HTMLElement>(
			`[data-classicy-file-path="${CSS.escape(path)}"]`,
		);
	const rowOrder = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("tr.classicyTableRow")).map((row) =>
			row.getAttribute("data-row-id"),
		);

	it("selects and renames a row in place, and sorts by a column", async () => {
		const { container, fs, commandsRef, onRenameItem, refresh } =
			renderBrowser("list");
		await waitFor(() => expect(rowOrder(container)).toHaveLength(3));
		act(() => {
			fs.writeFile("Documents:New Text Document.txt", "");
			commandsRef.current?.select(["Documents:New Text Document.txt"]);
			commandsRef.current?.rename("Documents:New Text Document.txt");
		});
		refresh();
		const field = await waitFor(() => {
			const input = container.querySelector<HTMLInputElement>(
				".classicyFileBrowserViewTableRename",
			);
			expect(input).not.toBeNull();
			return input as HTMLInputElement;
		});
		expect(commandsRef.current?.selectedPaths()).toEqual([
			"Documents:New Text Document.txt",
		]);
		expect(field.value).toBe("New Text Document.txt");
		fireEvent.keyDown(field, { key: "Escape" });
		expect(onRenameItem).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(
				container.querySelector(".classicyFileBrowserViewTableRename"),
			).toBeNull(),
		);
		act(() => commandsRef.current?.arrange("size"));
		await waitFor(() =>
			expect(rowOrder(container)).toEqual([
				"Documents:New Text Document.txt",
				"Documents:a.txt",
				"Documents:c.pdf",
				"Documents:b.txt",
			]),
		);
		expect(nameCell(container, "Documents:a.txt")).not.toBeNull();
		expect(commandsRef.current?.display()).toBe("list");
	});

	it("renames the one selected row on F2 under Windows' keys, never without them", async () => {
		const first = renderBrowser("list");
		await waitFor(() => expect(rowOrder(first.container)).toHaveLength(3));
		act(() => first.commandsRef.current?.select(["Documents:a.txt"]));
		const list = first.container.querySelector(".classicyTableContainer");
		fireEvent.keyDown(list as Element, { key: "F2" });
		expect(
			first.container.querySelector(".classicyFileBrowserViewTableRename"),
		).toBeNull();
		cleanup();

		windowsKeys();
		const second = renderBrowser("list");
		await waitFor(() => expect(rowOrder(second.container)).toHaveLength(3));
		act(() => second.commandsRef.current?.select(["Documents:a.txt"]));
		await waitFor(() =>
			expect(second.commandsRef.current?.selectedPaths()).toEqual([
				"Documents:a.txt",
			]),
		);
		fireEvent.keyDown(
			second.container.querySelector(".classicyTableContainer") as Element,
			{ key: "F2" },
		);
		await waitFor(() =>
			expect(
				second.container.querySelector(".classicyFileBrowserViewTableRename"),
			).not.toBeNull(),
		);
	});
});

describe("the white space's menu", () => {
	it("opens the browser's background menu on no item, at the pointer", async () => {
		const backgroundContextMenu = vi.fn(() => [
			{ id: "x", title: "Line Up Icons" },
		]);
		const { container } = renderBrowser("icons", { backgroundContextMenu });
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		fireEvent.contextMenu(iconAt(container, "Documents:a.txt") as Element, {
			clientX: 5,
			clientY: 6,
		});
		expect(backgroundContextMenu).not.toHaveBeenCalled();
		fireEvent.contextMenu(
			container.querySelector(
				".classicyFileBrowserFill .classicyFileBrowserFill",
			) as Element,
			{ clientX: 40, clientY: 50 },
		);
		expect(backgroundContextMenu).toHaveBeenCalledWith([40, 50]);
	});
});

import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

afterEach(cleanup);

const makeFs = (key: string) =>
	new ClassicyFileSystem(key, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"apple.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
			},
			"mango.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/m.pdf",
			},
			"zebra.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/z.pdf",
			},
		},
	});

// ClassicyTable's own tests prove `selectAll` works when the handle is wired
// directly to it. These prove the handle actually survives the trip
// ClassicyFileBrowser → ClassicyFileBrowserViewTable → ClassicyTable — the
// second half of the chain Finder's Edit → Select All depends on. Without
// them, dropping the prop anywhere along the way leaves every suite green
// while Select All silently does nothing.
describe("ClassicyFileBrowser selection handle", () => {
	const renderList = (key: string) => {
		const apiRef = createRef<ClassicyTableSelectionApi>();
		const { container } = render(
			<ClassicyFileBrowser
				fs={makeFs(key)}
				path="Documents"
				appId="Finder.app"
				display="list"
				selectionApiRef={apiRef}
			/>,
		);
		return { apiRef, container };
	};

	const rows = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("tr.classicyTableRow"));

	const selectedNames = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("tr.classicyTableRow.selected")).map(
			(row) => row.getAttribute("data-row-id"),
		);

	it("hands the caller a working handle in list view", async () => {
		const { apiRef, container } = renderList("test-browser-selectall");
		await waitFor(() => expect(rows(container)).toHaveLength(3));
		expect(apiRef.current).not.toBeNull();

		expect(selectedNames(container)).toEqual([]);
		act(() => apiRef.current?.selectAll());

		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
			"Documents:zebra.pdf",
		]);
	});

	it("selects rows through the browser's own multi-select semantics", async () => {
		const { container } = renderList("test-browser-multiselect");
		await waitFor(() => expect(rows(container)).toHaveLength(3));
		const [first, , third] = rows(container);

		act(() => {
			first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(selectedNames(container)).toEqual(["Documents:apple.pdf"]);

		// Shift extends from the anchor over the current visual order.
		act(() => {
			third.dispatchEvent(
				new MouseEvent("click", { bubbles: true, shiftKey: true }),
			);
		});
		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
			"Documents:zebra.pdf",
		]);

		// Command-click toggles a single row out of the selection.
		act(() => {
			third.dispatchEvent(
				new MouseEvent("click", { bubbles: true, metaKey: true }),
			);
		});
		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
		]);
	});

	// The icon view keeps one selection for its icons, so the handle works
	// there too (Edit ▸ Select All in either view, as Mac OS 8's Finder).
	it("hands the caller a working handle in the icons view too", async () => {
		const apiRef = createRef<ClassicyTableSelectionApi>();
		const { container } = render(
			<ClassicyFileBrowser
				fs={makeFs("test-browser-icons")}
				path="Documents"
				appId="Finder.app"
				display="icons"
				selectionApiRef={apiRef}
			/>,
		);
		await waitFor(() =>
			expect(container.querySelectorAll(".classicyIcon")).toHaveLength(3),
		);
		expect(container.querySelectorAll(".classicyIcon.selected")).toHaveLength(
			0,
		);
		act(() => apiRef.current?.selectAll());
		expect(container.querySelectorAll(".classicyIcon.selected")).toHaveLength(
			3,
		);
	});
});

describe("ClassicyFileBrowser delete key and item menus", () => {
	it("hands the list selection to onDeleteItems on Delete and ⌃⌫", async () => {
		const onDeleteItems = vi.fn();
		const { container } = render(
			<ClassicyFileBrowser
				fs={makeFs("test-browser-delete")}
				path="Documents"
				appId="Finder.app"
				display="list"
				onDeleteItems={onDeleteItems}
			/>,
		);
		const box = container.querySelector(
			".classicyFileBrowserViewTableContainer",
		) as HTMLElement;
		// Nothing selected: nothing to delete, and the key isn't consumed.
		expect(fireEvent.keyDown(box, { key: "Delete" })).toBe(true);
		expect(onDeleteItems).not.toHaveBeenCalled();

		const row = container.querySelector(
			'tr[data-row-id="Documents:mango.pdf"]',
		) as HTMLElement;
		fireEvent.mouseDown(row);
		fireEvent.click(row);
		await waitFor(() => expect(row.classList.contains("selected")).toBe(true));
		expect(fireEvent.keyDown(box, { key: "Delete" })).toBe(false);
		fireEvent.keyDown(box, { key: "Backspace", ctrlKey: true });
		expect(onDeleteItems.mock.calls).toEqual([
			[["Documents:mango.pdf"]],
			[["Documents:mango.pdf"]],
		]);
	});

	it("reads the icon view's highlighted icons as its selection", () => {
		const commandsRef = createRef<ClassicyFileBrowserCommands>();
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowser
					fs={makeFs("test-browser-icons-selection")}
					path="Documents"
					appId="Finder.app"
					display="icons"
					commandsRef={commandsRef}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(commandsRef.current?.selectedPaths()).toEqual([]);
		const zebra = container.querySelector(
			'[data-classicy-file-path="Documents:zebra.pdf"]',
		) as HTMLElement;
		fireEvent.click(zebra);
		expect(commandsRef.current?.selectedPaths()).toEqual([
			"Documents:zebra.pdf",
		]);
	});

	it("asks itemContextMenu for the right-clicked item's menu", () => {
		const itemContextMenu = vi.fn(() => [{ id: "restore", title: "Restore" }]);
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowser
					fs={makeFs("test-browser-item-menu")}
					path="Documents"
					appId="Finder.app"
					display="icons"
					itemContextMenu={itemContextMenu}
				/>
			</ClassicyAppManagerProvider>,
		);
		const apple = container.querySelector(
			'[data-classicy-file-path="Documents:apple.pdf"]',
		) as HTMLElement;
		const notPrevented = fireEvent.contextMenu(apple);
		expect(itemContextMenu).toHaveBeenCalledWith("Documents:apple.pdf", []);
		expect(notPrevented).toBe(false);
		// Off any item: the window's own menu applies.
		itemContextMenu.mockClear();
		fireEvent.contextMenu(
			container.querySelector(".classicyFileBrowserFill") as HTMLElement,
		);
		expect(itemContextMenu).not.toHaveBeenCalled();
	});
});

// A right-click on an item in the list view, under a package whose layout
// says `selection.secondaryButton: "select"` (Windows 98; WIG Ch.11
// "Accessing Commands for Selected Objects", p.234; Ch.5 "Selection with the
// Mouse", pp.37-38; App. A Table A.1, p.349): an unselected item is selected
// alone at the press, so its menu acts on the item drawn selected; a
// selected one keeps the whole selection. Without the key the press leaves
// the selection as it is (the audit's 11.3 and A.3).
describe("ClassicyFileBrowser — button 2 in the list view (layout.selection.secondaryButton)", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-browser",
			name: "Windows browser",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-browser-default",
				package: "windows-browser",
			},
			layout: windows98.layout as never,
		});
	const renderList = (key: string) => {
		const itemContextMenu = vi.fn(() => [{ id: "trash", title: "Delete" }]);
		const view = render(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowser
					fs={makeFs(key)}
					path="Documents"
					appId="Finder.app"
					display="list"
					itemContextMenu={itemContextMenu}
				/>
			</ClassicyAppManagerProvider>,
		);
		const item = (name: string) =>
			view.container.querySelector(
				`[data-classicy-file-path="Documents:${name}"]`,
			) as HTMLElement;
		const selected = () =>
			Array.from(
				view.container.querySelectorAll("tr.classicyTableRow.selected"),
				(row) => row.getAttribute("data-row-id"),
			);
		const rightClick = (name: string) => {
			fireEvent.mouseDown(item(name), { button: 2 });
			fireEvent.contextMenu(item(name), { button: 2 });
			fireEvent.mouseUp(item(name), { button: 2 });
		};
		return { ...view, itemContextMenu, item, selected, rightClick };
	};

	it("selects the unselected item it presses on, and its menu acts on it", () => {
		useWindowsLayout();
		const { item, selected, rightClick, itemContextMenu } = renderList(
			"test-browser-button2-select",
		);
		fireEvent.click(item("apple.pdf"));
		rightClick("mango.pdf");
		expect(selected()).toEqual(["Documents:mango.pdf"]);
		expect(itemContextMenu).toHaveBeenCalledWith("Documents:mango.pdf", [
			"Documents:mango.pdf",
		]);
	});

	it("keeps the selection a press lands inside, and its menu acts on all of it", () => {
		useWindowsLayout();
		const { item, selected, rightClick, itemContextMenu } = renderList(
			"test-browser-button2-keep",
		);
		fireEvent.click(item("apple.pdf"));
		fireEvent.click(item("zebra.pdf"), { shiftKey: true });
		rightClick("mango.pdf");
		const all = [
			"Documents:apple.pdf",
			"Documents:mango.pdf",
			"Documents:zebra.pdf",
		];
		expect(selected()).toEqual(all);
		expect(itemContextMenu).toHaveBeenCalledWith("Documents:mango.pdf", all);
	});

	it("leaves the selection as it is without the key", () => {
		const { item, selected, rightClick, itemContextMenu } = renderList(
			"test-browser-button2-mac",
		);
		fireEvent.click(item("apple.pdf"));
		rightClick("mango.pdf");
		expect(selected()).toEqual(["Documents:apple.pdf"]);
		expect(itemContextMenu).toHaveBeenCalledWith("Documents:mango.pdf", [
			"Documents:apple.pdf",
		]);
	});
});

// Shift+F10 and the Application key (the remaining chapters' audit's 4.17 /
// 11.4; WIG Ch.4 "Shortcut Keys", p.28; App. B Table B.2): the view's
// selection's menu, the first selected item's `itemContextMenu`, whatever
// element of the view holds focus.
describe("ClassicyFileBrowser — the context-menu keys (layout.keyboard.contextMenuKey)", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	it.each([
		"icons",
		"list",
	] as const)("opens the selected item's menu from the %s view", (display) => {
		registerClassicyAppearancePackage({
			id: "windows-browser-keys",
			name: "Windows browser keys",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-browser-keys-default",
				package: "windows-browser-keys",
			},
			layout: windows98.layout as never,
		});
		const itemContextMenu = vi.fn(() => [{ id: "x", title: "Delete" }]);
		const view = render(
			<ClassicyAppManagerProvider>
				<ClassicyContextualMenuProvider>
					<ClassicyFileBrowser
						fs={makeFs(`test-browser-menu-key-${display}`)}
						path="Documents"
						appId="Finder.app"
						display={display}
						itemContextMenu={itemContextMenu}
					/>
				</ClassicyContextualMenuProvider>
			</ClassicyAppManagerProvider>,
		);
		const item = view.container.querySelector(
			'[data-classicy-file-path="Documents:mango.pdf"]',
		) as HTMLElement;
		fireEvent.mouseDown(item);
		fireEvent.mouseUp(item);
		fireEvent.click(item);
		itemContextMenu.mockClear();
		const focusable = view.container.querySelector(
			".classicyFileBrowserFill",
		) as HTMLElement;
		focusable.tabIndex = -1;
		focusable.focus();
		fireEvent.keyDown(focusable, { key: "F10", shiftKey: true });
		expect(itemContextMenu).toHaveBeenCalledWith("Documents:mango.pdf", [
			"Documents:mango.pdf",
		]);
	});
});

describe("ClassicyFileBrowser invisible items", () => {
	const makeFsWithInvisible = (key: string) => {
		const fs = makeFs(key);
		fs.mkDir("Documents:Desktop Folder");
		fs.setMetadata("Documents:Desktop Folder", { _invisible: true });
		return fs;
	};
	const listed = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("[data-classicy-file-path]"), (el) =>
			el.getAttribute("data-classicy-file-path"),
		);

	it.each([
		"icons",
		"list",
	] as const)("lists them by default and hides them with showInvisible={false} (%s view)", (display) => {
		const { container, rerender } = render(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowser
					fs={makeFsWithInvisible(`test-browser-invisible-${display}`)}
					path="Documents"
					appId="Finder.app"
					display={display}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(listed(container)).toContain("Documents:Desktop Folder");
		rerender(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowser
					fs={makeFsWithInvisible(`test-browser-invisible-${display}`)}
					path="Documents"
					appId="Finder.app"
					display={display}
					showInvisible={false}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(listed(container)).not.toContain("Documents:Desktop Folder");
		expect(listed(container)).toContain("Documents:apple.pdf");
	});
});

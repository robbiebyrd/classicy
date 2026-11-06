import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

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

	it("leaves the handle unset in the icons view, where the command is disabled", async () => {
		const apiRef = createRef<ClassicyTableSelectionApi>();
		render(
			<ClassicyFileBrowser
				fs={makeFs("test-browser-icons")}
				path="Documents"
				appId="Finder.app"
				display="icons"
				selectionApiRef={apiRef}
			/>,
		);
		await waitFor(() => expect(apiRef.current).toBeNull());
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

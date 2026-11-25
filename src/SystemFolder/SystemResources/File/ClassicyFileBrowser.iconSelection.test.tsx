import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { CLASSICY_FILE_BROWSER_RENAME_DELAY_MS } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";
import type { ClassicyFileDragOutlinePart } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The parts each drag's outline traces, in the order the drags began.
const outlines = vi.hoisted(() => ({
	parts: [] as ClassicyFileDragOutlinePart[][],
}));
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileDragOutline",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/SystemResources/File/ClassicyFileDragOutline")
			>();
		return {
			...actual,
			drawClassicyDragOutline: (parts: ClassicyFileDragOutlinePart[]) => {
				outlines.parts.push(parts);
				return actual.drawClassicyDragOutline(parts);
			},
		};
	},
);

// The icon view keeps one selection for its icons. What Mac OS 8's Finder
// did too is the core's, for every package (a click selects one icon, a
// modified click adds or removes one, arrows move to the nearest icon,
// typing selects by name, a drag across empty space draws the selection
// rectangle, a slow second click on a selected icon's name renames it,
// HIG7 pp.288-291); what only Windows Explorer did waits for a package
// whose `layout.fileBrowser.keys` is "windows" (Shift ranges, Control
// toggles, the paging keys, a letter typed again stepping on, F2), and its
// `fileList.foldersFirst` puts folders first.

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.useRealTimers();
	resetClassicyAppearancePackagesForTests();
	outlines.parts.length = 0;
});

let counter = 0;
// Listing order: a folder last, so folders-first ordering shows.
const makeFs = (extra: Record<string, unknown> = {}) =>
	new ClassicyFileSystem(`test-icon-selection-${++counter}`, {
		_type: "directory",
		D: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			...extra,
			apple: { _type: ClassicyFileSystemEntryFileType.TextFile },
			banana: { _type: ClassicyFileSystemEntryFileType.TextFile },
			blueberry: { _type: ClassicyFileSystemEntryFileType.TextFile },
			cherry: { _type: ClassicyFileSystemEntryFileType.TextFile },
			date: { _type: ClassicyFileSystemEntryFileType.TextFile },
			Folder: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

// A 300 px holder lays the six icons out two to a row, 96 px apart:
//   apple (12,12)       banana (108,12)
//   blueberry (12,108)  cherry (108,108)
//   date (12,204)       Folder (108,204)
// Each icon is 64 px square on screen, where its style puts it.
const placeOnScreen = () =>
	vi
		.spyOn(HTMLElement.prototype, "getBoundingClientRect")
		.mockImplementation(function (this: HTMLElement) {
			if (this.classList.contains("classicyFileBrowserFill"))
				return DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 300 });
			if (this.classList.contains("classicyIcon"))
				return DOMRect.fromRect({
					x: Number.parseFloat(this.style.left) || 0,
					y: Number.parseFloat(this.style.top) || 0,
					width: 64,
					height: 64,
				});
			// The window's viewport: 300 x 200.
			if (this.classList.contains("classicyScrollAreaViewport"))
				return DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 200 });
			// A list row's name, one 20 px row under another from y 20.
			if (this.classList.contains("classicyFileBrowserViewTableRowContainer")) {
				const row = this.closest("tr");
				const index = row?.parentElement
					? Array.from(row.parentElement.children).indexOf(row)
					: 0;
				return DOMRect.fromRect({
					x: 0,
					y: 20 + index * 20,
					width: 100,
					height: 18,
				});
			}
			return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
		});

const registerWindowsKeys = () =>
	registerClassicyAppearancePackage({
		id: "windows-files",
		name: "Windows files",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "windows-files-default",
			package: "windows-files",
		},
		layout: windows98.layout as never,
	});

const renderBrowser = (
	props: Partial<Parameters<typeof ClassicyFileBrowser>[0]> = {},
	extra: Record<string, unknown> = {},
) => {
	placeOnScreen();
	const fs = makeFs(extra);
	const result = render(
		<ClassicyAppManagerProvider>
			{/* The window's scroll area viewport, whose height is a page. */}
			<div className={"classicyScrollAreaViewport"}>
				<ClassicyFileBrowser
					fs={fs}
					path="D"
					appId="Finder.app"
					display="icons"
					{...props}
				/>
			</div>
		</ClassicyAppManagerProvider>,
	);
	const icon = (name: string) =>
		result.container.querySelector(
			`.classicyIcon[data-classicy-file-path="D:${name}"]`,
		) as HTMLElement;
	const selected = () =>
		Array.from(
			result.container.querySelectorAll(".classicyIcon.selected"),
			(el) => el.getAttribute("data-classicy-file-path")?.slice(2),
		).sort();
	const holder = result.container.querySelector(
		".classicyFileBrowserFill .classicyFileBrowserFill",
	) as HTMLElement;
	return { ...result, fs, icon, selected, holder };
};

const order = (container: HTMLElement) =>
	Array.from(container.querySelectorAll(".classicyIcon"), (el) =>
		el.getAttribute("data-classicy-file-path")?.slice(2),
	);

describe("the icon view's selection (every package)", () => {
	it("selects one icon on a click, and clears on a click on empty space", () => {
		const { icon, selected, holder } = renderBrowser();
		fireEvent.click(icon("apple"));
		expect(selected()).toEqual(["apple"]);
		fireEvent.click(icon("banana"));
		expect(selected()).toEqual(["banana"]);
		fireEvent.mouseDown(holder, { button: 0, clientX: 250, clientY: 290 });
		fireEvent.mouseUp(document);
		expect(selected()).toEqual([]);
	});

	it("adds or removes an icon with Shift, ⌘ or Control (the Finder's discontinuous selection)", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		fireEvent.click(icon("cherry"), { shiftKey: true });
		expect(selected()).toEqual(["apple", "cherry"]);
		fireEvent.click(icon("date"), { metaKey: true });
		fireEvent.click(icon("apple"), { ctrlKey: true });
		expect(selected()).toEqual(["cherry", "date"]);
	});

	it("moves to the nearest icon each arrow's way, focusing it", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		fireEvent.keyDown(icon("apple"), { key: "ArrowRight" });
		expect(selected()).toEqual(["banana"]);
		expect(document.activeElement).toBe(icon("banana"));
		fireEvent.keyDown(icon("banana"), { key: "ArrowDown" });
		expect(selected()).toEqual(["cherry"]);
		fireEvent.keyDown(icon("cherry"), { key: "ArrowLeft" });
		expect(selected()).toEqual(["blueberry"]);
		// Nothing further up: the selection stays.
		fireEvent.keyDown(icon("blueberry"), { key: "ArrowUp" });
		fireEvent.keyDown(icon("apple"), { key: "ArrowUp" });
		expect(selected()).toEqual(["apple"]);
		// Shift with an arrow is a plain arrow on the Mac.
		fireEvent.keyDown(icon("apple"), { key: "ArrowDown", shiftKey: true });
		expect(selected()).toEqual(["blueberry"]);
	});

	it("selects the first icon on an arrow when the view has focus and nothing is selected", () => {
		const { selected, holder } = renderBrowser();
		fireEvent.mouseDown(holder, { button: 0, clientX: 250, clientY: 290 });
		fireEvent.mouseUp(document);
		expect(document.activeElement).toBe(holder);
		fireEvent.keyDown(holder, { key: "ArrowDown" });
		expect(selected()).toEqual(["apple"]);
	});

	it("selects by the name typed, forgetting the keys after a second", () => {
		vi.useFakeTimers();
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		fireEvent.keyDown(icon("apple"), { key: "b" });
		expect(selected()).toEqual(["banana"]);
		fireEvent.keyDown(icon("banana"), { key: "l" });
		expect(selected()).toEqual(["blueberry"]);
		// "b" again within the second is "blb": no item, no change (the Mac
		// steps through no letter).
		fireEvent.keyDown(icon("blueberry"), { key: "b" });
		expect(selected()).toEqual(["blueberry"]);
		act(() => vi.advanceTimersByTime(1000));
		fireEvent.keyDown(icon("blueberry"), { key: "c" });
		expect(selected()).toEqual(["cherry"]);
	});

	it("leaves Home, End and the page keys to the window on the Mac", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("cherry"));
		for (const key of ["Home", "End", "PageUp", "PageDown"])
			expect(fireEvent.keyDown(icon("cherry"), { key }), key).toBe(true);
		expect(selected()).toEqual(["cherry"]);
	});

	it("draws the selection rectangle across empty space, selecting the icons it touches", () => {
		const { container, icon, selected, holder } = renderBrowser();
		fireEvent.mouseDown(holder, { button: 0, clientX: 0, clientY: 0 });
		fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
		const box = container.querySelector(
			".classicyFileBrowserSelect",
		) as HTMLElement;
		expect(box).not.toBeNull();
		expect(box.getAttribute("aria-hidden")).toBe("true");
		expect([
			box.style.left,
			box.style.top,
			box.style.width,
			box.style.height,
		]).toEqual(["0px", "0px", "150px", "100px"]);
		expect(selected()).toEqual(["apple", "banana"]);
		fireEvent.mouseUp(document);
		expect(container.querySelector(".classicyFileBrowserSelect")).toBeNull();
		expect(selected()).toEqual(["apple", "banana"]);
		// With Shift, the rectangle adds to the selection.
		fireEvent.mouseDown(holder, {
			button: 0,
			clientX: 0,
			clientY: 300,
			shiftKey: true,
		});
		fireEvent.mouseMove(document, { clientX: 20, clientY: 220 });
		fireEvent.mouseUp(document);
		expect(selected()).toEqual(["apple", "banana", "date"]);
		expect(icon("date").classList.contains("selected")).toBe(true);
	});

	it("selects every icon on Select All", () => {
		const selectionApiRef = { current: null } as Parameters<
			typeof ClassicyFileBrowser
		>[0]["selectionApiRef"];
		const { selected } = renderBrowser({ selectionApiRef });
		act(() => selectionApiRef?.current?.selectAll());
		expect(selected()).toEqual([
			"Folder",
			"apple",
			"banana",
			"blueberry",
			"cherry",
			"date",
		]);
	});

	describe("renaming", () => {
		const slowClick = (target: HTMLElement) => {
			fireEvent.mouseDown(target, { button: 0, clientX: 40, clientY: 70 });
			fireEvent.mouseUp(target, { clientX: 40, clientY: 70 });
			fireEvent.click(target, { detail: 1, clientX: 40, clientY: 70 });
		};
		const label = (el: HTMLElement) => el.querySelector("p") as HTMLElement;

		it("opens a selected icon's name for editing on a slow second click, and commits it", () => {
			vi.useFakeTimers();
			const onRenameItem = vi.fn(() => "D:avocado");
			const { container, icon } = renderBrowser({ onRenameItem });
			slowClick(label(icon("apple")));
			act(() => vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS));
			// The first click only selected it.
			expect(container.querySelector(".classicyIconRename")).toBeNull();
			slowClick(label(icon("apple")));
			act(() =>
				vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS - 1),
			);
			expect(container.querySelector(".classicyIconRename")).toBeNull();
			act(() => vi.advanceTimersByTime(1));
			const field = container.querySelector(
				".classicyIconRename",
			) as HTMLInputElement;
			expect(field.value).toBe("apple");
			expect(document.activeElement).toBe(field);
			expect([field.selectionStart, field.selectionEnd]).toEqual([0, 5]);
			fireEvent.change(field, { target: { value: "avocado" } });
			fireEvent.keyDown(field, { key: "Enter" });
			expect(onRenameItem).toHaveBeenCalledWith("D:apple", "avocado");
			expect(container.querySelector(".classicyIconRename")).toBeNull();
		});

		it("never renames on a double-click, an unselected icon's name, or without onRenameItem", () => {
			vi.useFakeTimers();
			const onRenameItem = vi.fn(() => undefined);
			const { container, icon } = renderBrowser({ onRenameItem });
			fireEvent.click(icon("apple"));
			slowClick(label(icon("apple")));
			fireEvent.click(label(icon("apple")), { detail: 2 });
			act(() => vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS));
			expect(container.querySelector(".classicyIconRename")).toBeNull();
			slowClick(label(icon("banana")));
			act(() => vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS));
			expect(container.querySelector(".classicyIconRename")).toBeNull();
			cleanup();
			const plain = renderBrowser();
			fireEvent.click(plain.icon("apple"));
			slowClick(label(plain.icon("apple")));
			act(() => vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS));
			expect(plain.container.querySelector(".classicyIconRename")).toBeNull();
		});

		it("cancels on Escape, renaming nothing", () => {
			vi.useFakeTimers();
			const onRenameItem = vi.fn(() => undefined);
			const { container, icon } = renderBrowser({ onRenameItem });
			fireEvent.click(icon("apple"));
			slowClick(label(icon("apple")));
			act(() => vi.advanceTimersByTime(CLASSICY_FILE_BROWSER_RENAME_DELAY_MS));
			const field = container.querySelector(
				".classicyIconRename",
			) as HTMLInputElement;
			fireEvent.change(field, { target: { value: "x" } });
			fireEvent.keyDown(field, { key: "Escape" });
			expect(container.querySelector(".classicyIconRename")).toBeNull();
			expect(onRenameItem).not.toHaveBeenCalled();
		});

		it("does not open F2 for renaming on the Mac", () => {
			const onRenameItem = vi.fn(() => undefined);
			const { container, icon } = renderBrowser({ onRenameItem });
			fireEvent.click(icon("apple"));
			fireEvent.keyDown(icon("apple"), { key: "F2" });
			expect(container.querySelector(".classicyIconRename")).toBeNull();
		});
	});

	it("sorts the list view's folders among its files without foldersFirst", () => {
		const { container } = renderBrowser(
			{ display: "list" },
			{ canyon: { _type: ClassicyFileSystemEntryFileType.Directory } },
		);
		const names = Array.from(
			container.querySelectorAll("tr.classicyTableRow"),
			(row) => row.getAttribute("data-row-id")?.slice(2),
		);
		expect(names.indexOf("canyon")).toBe(names.indexOf("blueberry") + 1);
		expect(names.indexOf("cherry")).toBe(names.indexOf("canyon") + 1);
	});

	it("keeps the listing order, folders among files, without foldersFirst", () => {
		const { container } = renderBrowser();
		expect(order(container)).toEqual([
			"apple",
			"banana",
			"blueberry",
			"cherry",
			"date",
			"Folder",
		]);
	});
});

describe("the icon view's selection under Windows' keys", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerWindowsKeys();
	});

	it("lists folders first (fileList.foldersFirst)", () => {
		const { container } = renderBrowser();
		expect(order(container)).toEqual([
			"Folder",
			"apple",
			"banana",
			"blueberry",
			"cherry",
			"date",
		]);
	});

	// With Folder first the layout is:
	//   Folder (12,12)   apple (108,12)
	//   banana (12,108)  blueberry (108,108)
	//   cherry (12,204)  date (108,204)
	// Shift selects the icons in the rectangle the anchor's icon and the
	// clicked one span (comctl32's icon-view LISTVIEW_SetGroupSelection),
	// not a run of the view's order.
	it("selects the rectangle from the anchor with Shift, toggles one with Control", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		// apple (108,12) and cherry (12,204) span both columns, three rows.
		fireEvent.click(icon("cherry"), { shiftKey: true });
		expect(selected()).toEqual([
			"Folder",
			"apple",
			"banana",
			"blueberry",
			"cherry",
			"date",
		]);
		fireEvent.click(icon("banana"), { ctrlKey: true });
		expect(selected()).toEqual([
			"Folder",
			"apple",
			"blueberry",
			"cherry",
			"date",
		]);
		// Shift from the new anchor (banana): banana (12,108) to date
		// (108,204), the lower two rows; the rest go.
		fireEvent.click(icon("date"), { shiftKey: true });
		expect(selected()).toEqual(["banana", "blueberry", "cherry", "date"]);
		// Shift with an arrow takes the rectangle too: Folder over banana,
		// one column, apple beside them left out.
		fireEvent.click(icon("Folder"));
		fireEvent.keyDown(icon("Folder"), { key: "ArrowDown", shiftKey: true });
		expect(selected()).toEqual(["Folder", "banana"]);
	});

	// WIG Ch.5 "Selection Adjustment" (p.39): Control with Shift keeps the
	// other selections and sets the anchor's rectangle to the anchor's state.
	it("keeps the rest with Control-Shift, the rectangle taking the anchor's state", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("Folder"));
		fireEvent.click(icon("date"), { ctrlKey: true });
		// The anchor (date) is selected: Folder stays, cherry joins.
		fireEvent.click(icon("cherry"), { ctrlKey: true, shiftKey: true });
		expect(selected()).toEqual(["Folder", "cherry", "date"]);
		// Control-click takes date out and makes it the (unselected) anchor:
		// its rectangle with blueberry (the right column's lower two) is
		// taken out; cherry, beside it, stays.
		fireEvent.click(icon("blueberry"), { ctrlKey: true });
		fireEvent.click(icon("date"), { ctrlKey: true });
		expect(selected()).toEqual(["Folder", "blueberry", "cherry"]);
		fireEvent.click(icon("blueberry"), { ctrlKey: true, shiftKey: true });
		expect(selected()).toEqual(["Folder", "cherry"]);
	});

	it("selects the first, the last and a page's icons with Home, End and the page keys", () => {
		// A page is the viewport's height: 200 px, two rows of icons.
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyScrollAreaViewport") ? 200 : 0;
			},
		);
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("blueberry"));
		expect(fireEvent.keyDown(icon("blueberry"), { key: "Home" })).toBe(false);
		expect(selected()).toEqual(["Folder"]);
		fireEvent.keyDown(icon("Folder"), { key: "End" });
		expect(selected()).toEqual(["date"]);
		fireEvent.keyDown(icon("date"), { key: "PageUp" });
		expect(selected()).toEqual(["apple"]);
		fireEvent.keyDown(icon("apple"), { key: "PageDown" });
		expect(selected()).toEqual(["date"]);
	});

	it("steps through the icons starting with a letter typed again", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		fireEvent.keyDown(icon("apple"), { key: "b" });
		expect(selected()).toEqual(["banana"]);
		fireEvent.keyDown(icon("banana"), { key: "b" });
		expect(selected()).toEqual(["blueberry"]);
		fireEvent.keyDown(icon("blueberry"), { key: "b" });
		expect(selected()).toEqual(["banana"]);
	});

	it("lists folders first in the list view too, and last when its sort runs down", () => {
		const { container } = renderBrowser({ display: "list" });
		const names = () =>
			Array.from(container.querySelectorAll("tr.classicyTableRow"), (row) =>
				row.getAttribute("data-row-id")?.slice(2),
			);
		expect(names()).toEqual([
			"Folder",
			"apple",
			"banana",
			"blueberry",
			"cherry",
			"date",
		]);
		fireEvent.click(container.querySelector("th[aria-sort]") as HTMLElement);
		expect(names()).toEqual([
			"date",
			"cherry",
			"blueberry",
			"banana",
			"apple",
			"Folder",
		]);
	});

	it("opens the selected icon's name for editing with F2", () => {
		const onRenameItem = vi.fn(() => undefined);
		const { container, icon } = renderBrowser({ onRenameItem });
		fireEvent.click(icon("apple"));
		fireEvent.keyDown(icon("apple"), { key: "F2" });
		expect(
			(container.querySelector(".classicyIconRename") as HTMLInputElement)
				.value,
		).toBe("apple");
	});
});

// What the icon view does under the Windows 98 layout beyond Explorer's
// keys (the WIG audit's 5.8 / 5.22 / A.1, 5.12 and the icon view's parts of
// 5.5, 5.6, 5.16 and 5.17; WIG Ch.5 "Selection with the Mouse", pp.37-38,
// "Selection Adjustment", pp.38-39, "Region Selection", p.42, "Keyboard
// Selection", p.43, "Operations for a Multiple Selection", p.44, "Direct
// Manipulation Transfers", p.66; App. A Tables A.1-A.3), each beside the
// default layout's behavior, which is today's.
//
// With Folder first (Windows' foldersFirst) the layout is:
//   Folder (12,12)   apple (108,12)
//   banana (12,108)  blueberry (108,108)
//   cherry (12,204)  date (108,204)
describe("the icon view under the Windows 98 layout", () => {
	const press = (
		el: HTMLElement,
		init: Partial<MouseEventInit & { detail: number }> = {},
	) => {
		fireEvent.mouseDown(el, { button: 0, detail: 1, ...init });
		fireEvent.mouseUp(el, { button: 0, ...init });
		fireEvent.click(el, { detail: 1, ...init });
	};

	describe("a press selects (selection.selectOn: press)", () => {
		it("selects an unselected icon at the press, and a modified press at once", () => {
			registerWindowsKeys();
			const { icon, selected } = renderBrowser();
			fireEvent.mouseDown(icon("apple"), { button: 0, detail: 1 });
			expect(selected()).toEqual(["apple"]);
			fireEvent.click(icon("apple"), { detail: 1 });
			expect(selected()).toEqual(["apple"]);
			// Control toggles at the press, and its click adds nothing.
			fireEvent.mouseDown(icon("banana"), {
				button: 0,
				detail: 1,
				ctrlKey: true,
			});
			expect(selected()).toEqual(["apple", "banana"]);
			fireEvent.click(icon("banana"), { detail: 1, ctrlKey: true });
			expect(selected()).toEqual(["apple", "banana"]);
		});

		it("keeps the selection a plain press lands in until its click resets it to that icon", () => {
			registerWindowsKeys();
			const { icon, selected } = renderBrowser();
			press(icon("apple"));
			press(icon("banana"), { ctrlKey: true });
			fireEvent.mouseDown(icon("apple"), { button: 0, detail: 1 });
			expect(selected()).toEqual(["apple", "banana"]);
			fireEvent.click(icon("apple"), { detail: 1 });
			expect(selected()).toEqual(["apple"]);
		});

		it("changes nothing at a double-click's second press", () => {
			registerWindowsKeys();
			const { icon, selected } = renderBrowser();
			press(icon("apple"));
			fireEvent.mouseDown(icon("banana"), {
				button: 0,
				detail: 2,
				ctrlKey: true,
			});
			fireEvent.click(icon("banana"), { detail: 2, ctrlKey: true });
			expect(selected()).toEqual(["apple"]);
		});

		it("selects nothing at a press under the default layout, only at the click", () => {
			const { icon, selected } = renderBrowser();
			fireEvent.mouseDown(icon("apple"), { button: 0, detail: 1 });
			expect(selected()).toEqual([]);
			fireEvent.click(icon("apple"), { detail: 1 });
			expect(selected()).toEqual(["apple"]);
		});
	});

	describe("button 2 (selection.secondaryButton: select)", () => {
		const rightPress = (el: HTMLElement, init: MouseEventInit = {}) => {
			fireEvent.mouseDown(el, { button: 2, ...init });
			fireEvent.contextMenu(el, { button: 2, ...init });
			fireEvent.mouseUp(el, { button: 2, ...init });
		};

		it("selects an unselected icon alone, keeps a selection it lands in, and the menu acts on what is drawn", () => {
			registerWindowsKeys();
			const itemContextMenu = vi.fn(() => [{ id: "x", title: "Delete" }]);
			const { icon, selected } = renderBrowser({ itemContextMenu });
			press(icon("apple"));
			rightPress(icon("banana"));
			expect(selected()).toEqual(["banana"]);
			expect(itemContextMenu).toHaveBeenLastCalledWith("D:banana", [
				"D:banana",
			]);
			press(icon("apple"), { ctrlKey: true });
			rightPress(icon("apple"));
			expect(selected()).toEqual(["apple", "banana"]);
			expect(itemContextMenu).toHaveBeenLastCalledWith("D:apple", [
				"D:apple",
				"D:banana",
			]);
			// With Control held it changes nothing (LISTVIEW_RButtonDown).
			rightPress(icon("cherry"), { ctrlKey: true });
			expect(selected()).toEqual(["apple", "banana"]);
		});

		it("clears the selection on empty space and draws the rectangle", () => {
			registerWindowsKeys();
			const { container, icon, selected, holder } = renderBrowser();
			press(icon("apple"));
			fireEvent.mouseDown(holder, {
				button: 2,
				clientX: 0,
				clientY: 0,
				shiftKey: true,
			});
			expect(selected()).toEqual([]);
			fireEvent.mouseMove(document, { clientX: 80, clientY: 150 });
			expect(
				container.querySelector(".classicyFileBrowserSelect"),
			).not.toBeNull();
			expect(selected()).toEqual(["Folder", "banana"]);
			fireEvent.mouseUp(document, { button: 2 });
			expect(selected()).toEqual(["Folder", "banana"]);
		});

		it("leaves the selection as it is under the default layout", () => {
			const itemContextMenu = vi.fn(() => [{ id: "x", title: "Delete" }]);
			const { icon, selected, holder } = renderBrowser({ itemContextMenu });
			press(icon("apple"));
			rightPress(icon("banana"));
			expect(selected()).toEqual(["apple"]);
			expect(itemContextMenu).toHaveBeenLastCalledWith("D:banana", ["D:apple"]);
			fireEvent.mouseDown(holder, { button: 2, clientX: 0, clientY: 0 });
			fireEvent.mouseMove(document, { clientX: 80, clientY: 150 });
			fireEvent.mouseUp(document, { button: 2 });
			expect(selected()).toEqual(["apple"]);
		});
	});

	describe("a drag carries the selection (fileBrowser.iconSelection: view)", () => {
		const dropOn = (folderPath: string) => {
			const folder = document.createElement("div");
			folder.setAttribute("data-classicy-drop-folder", folderPath);
			return folder;
		};
		const drag = (
			from: HTMLElement,
			to: [number, number],
			over: HTMLElement,
		) => {
			const original = document.elementsFromPoint;
			document.elementsFromPoint = () => [over];
			try {
				fireEvent.mouseDown(from, {
					button: 0,
					detail: 1,
					clientX: 0,
					clientY: 0,
				});
				fireEvent.mouseMove(document, { clientX: to[0], clientY: to[1] });
				fireEvent.mouseUp(document, { clientX: to[0], clientY: to[1] });
				fireEvent.click(from, { detail: 1, clientX: to[0], clientY: to[1] });
			} finally {
				document.elementsFromPoint = original;
			}
		};

		it("moves every selected item, outlining each, and keeps the selection", () => {
			registerWindowsKeys();
			const onMoveItems = vi.fn();
			const { icon, selected } = renderBrowser({ onMoveItems });
			press(icon("apple"));
			press(icon("cherry"), { ctrlKey: true });
			drag(icon("cherry"), [40, 40], dropOn("Elsewhere"));
			expect(onMoveItems).toHaveBeenCalledWith(
				["D:apple", "D:cherry"],
				{ kind: "folder", path: "Elsewhere" },
				expect.any(Array),
				// The drop target itself, its element included.
				expect.objectContaining({
					destination: { kind: "folder", path: "Elsewhere" },
				}),
				// A plain drag moves.
				"move",
			);
			expect(outlines.parts).toHaveLength(1);
			expect(outlines.parts[0].map((part) => part.label?.textContent)).toEqual([
				"apple",
				"cherry",
			]);
			// The click that ends the drag (over the icon) keeps the selection.
			expect(selected()).toEqual(["apple", "cherry"]);
		});

		it("carries an unselected icon alone, selected at the press", () => {
			registerWindowsKeys();
			const onMoveItems = vi.fn();
			const { icon, selected } = renderBrowser({ onMoveItems });
			press(icon("apple"));
			drag(icon("banana"), [40, 40], dropOn("Elsewhere"));
			expect(onMoveItems.mock.calls[0][0]).toEqual(["D:banana"]);
			expect(selected()).toEqual(["banana"]);
		});

		it("moves every selected icon as far, let go in its own folder", () => {
			registerWindowsKeys();
			const { icon } = renderBrowser({ onMoveItems: vi.fn() });
			press(icon("apple"));
			press(icon("banana"), { ctrlKey: true });
			drag(icon("apple"), [40, 20], dropOn("D"));
			expect([icon("apple").style.left, icon("apple").style.top]).toEqual([
				"148px",
				"32px",
			]);
			expect([icon("banana").style.left, icon("banana").style.top]).toEqual([
				"52px",
				"128px",
			]);
			// One not selected stays.
			expect([icon("cherry").style.left, icon("cherry").style.top]).toEqual([
				"12px",
				"204px",
			]);
		});

		it("carries the pressed icon alone under the default layout", () => {
			const onMoveItems = vi.fn();
			const { icon } = renderBrowser({ onMoveItems });
			press(icon("apple"));
			press(icon("cherry"), { ctrlKey: true });
			drag(icon("cherry"), [40, 40], dropOn("Elsewhere"));
			expect(onMoveItems.mock.calls[0][0]).toEqual(["D:cherry"]);
			expect(outlines.parts[0].map((part) => part.label?.textContent)).toEqual([
				"cherry",
			]);
		});
	});

	describe("the keyboard and assistive technology (selection.keyboard, iconNavigation)", () => {
		it("selects on Space, toggles on Control-Space and opens on Return alone", () => {
			registerWindowsKeys();
			const fileOnClickFunc = vi.fn();
			const { icon, selected, holder } = renderBrowser({ fileOnClickFunc });
			// The view focused, nothing selected: Space selects the first.
			fireEvent.mouseDown(holder, { button: 0, clientX: 250, clientY: 290 });
			fireEvent.mouseUp(document);
			fireEvent.keyDown(holder, { key: " " });
			expect(selected()).toEqual(["Folder"]);
			fireEvent.keyDown(icon("Folder"), { key: "ArrowRight" });
			expect(selected()).toEqual(["apple"]);
			fireEvent.keyDown(icon("apple"), { key: " ", ctrlKey: true });
			expect(selected()).toEqual([]);
			fireEvent.keyDown(icon("apple"), { key: " ", ctrlKey: true });
			expect(selected()).toEqual(["apple"]);
			fireEvent.keyDown(icon("apple"), { key: " " });
			expect(fileOnClickFunc).not.toHaveBeenCalled();
			fireEvent.keyDown(icon("apple"), { key: "Enter" });
			expect(fileOnClickFunc).toHaveBeenCalledWith("D:apple");
		});

		it("opens on Space under the default layout", () => {
			const fileOnClickFunc = vi.fn();
			const { icon } = renderBrowser({ fileOnClickFunc });
			fireEvent.keyDown(icon("apple"), { key: " " });
			expect(fileOnClickFunc).toHaveBeenCalledWith("D:apple");
		});

		it("is a list box of options under Windows' keys, and buttons otherwise", () => {
			registerWindowsKeys();
			const windows = renderBrowser();
			expect(windows.holder.getAttribute("role")).toBe("listbox");
			expect(windows.holder.getAttribute("aria-multiselectable")).toBe("true");
			press(windows.icon("apple"));
			expect(windows.icon("apple").getAttribute("role")).toBe("option");
			expect(windows.icon("apple").getAttribute("aria-selected")).toBe("true");
			expect(windows.icon("banana").getAttribute("aria-selected")).toBe(
				"false",
			);
			cleanup();
			resetClassicyAppearancePackagesForTests();
			const mac = renderBrowser();
			expect(mac.holder.hasAttribute("role")).toBe(false);
			expect(mac.holder.hasAttribute("aria-multiselectable")).toBe(false);
			expect(mac.icon("apple").getAttribute("role")).toBe("button");
			expect(mac.icon("apple").hasAttribute("aria-selected")).toBe(false);
		});

		it("keeps one Tab stop, the icon last pressed or moved to, under iconNavigation roving", () => {
			registerWindowsKeys();
			const { container, icon } = renderBrowser();
			const stops = () =>
				Array.from(
					container.querySelectorAll(".classicyIcon"),
					(el) =>
						`${el.getAttribute("data-classicy-file-path")?.slice(2)}:${el.getAttribute("tabindex")}`,
				).filter((entry) => entry.endsWith(":0"));
			expect(stops()).toEqual(["Folder:0"]);
			press(icon("cherry"));
			expect(stops()).toEqual(["cherry:0"]);
			fireEvent.keyDown(icon("cherry"), { key: "ArrowRight" });
			expect(stops()).toEqual(["date:0"]);
			expect(icon("Folder").getAttribute("tabindex")).toBe("-1");
		});

		it("makes every icon a Tab stop under the default layout", () => {
			const { container } = renderBrowser();
			for (const el of container.querySelectorAll(".classicyIcon"))
				expect(el.getAttribute("tabindex")).toBe("0");
		});
	});

	describe("a double-click opens the selection (selection.modifiers: windows)", () => {
		it("hands the whole selection to openItemsFunc", () => {
			registerWindowsKeys();
			const openItemsFunc = vi.fn();
			const fileOnClickFunc = vi.fn();
			const { icon } = renderBrowser({ openItemsFunc, fileOnClickFunc });
			press(icon("apple"));
			press(icon("cherry"), { ctrlKey: true });
			fireEvent.mouseDown(icon("cherry"), { button: 0, detail: 2 });
			fireEvent.click(icon("cherry"), { detail: 2 });
			fireEvent.doubleClick(icon("cherry"));
			expect(openItemsFunc).toHaveBeenCalledWith(["D:apple", "D:cherry"]);
			expect(fileOnClickFunc).not.toHaveBeenCalled();
		});

		it("opens the icon alone under the default layout", () => {
			const openItemsFunc = vi.fn();
			const fileOnClickFunc = vi.fn();
			const { icon } = renderBrowser({ openItemsFunc, fileOnClickFunc });
			press(icon("apple"));
			press(icon("cherry"), { ctrlKey: true });
			fireEvent.doubleClick(icon("cherry"));
			expect(fileOnClickFunc).toHaveBeenCalledWith("D:cherry");
			expect(openItemsFunc).not.toHaveBeenCalled();
		});
	});

	describe("the selection rectangle", () => {
		it("adds with Shift and toggles with Control under Windows' keys", () => {
			registerWindowsKeys();
			const { icon, selected, holder } = renderBrowser();
			press(icon("Folder"));
			press(icon("apple"), { ctrlKey: true });
			// Control: the icons touched, the right column's top two, toggle
			// (apple out, blueberry in); Folder, untouched, stays.
			fireEvent.mouseDown(holder, {
				button: 0,
				clientX: 299,
				clientY: 0,
				ctrlKey: true,
			});
			fireEvent.mouseMove(document, { clientX: 80, clientY: 150 });
			fireEvent.mouseUp(document);
			expect(selected()).toEqual(["Folder", "blueberry"]);
			// Shift: added.
			fireEvent.mouseDown(holder, {
				button: 0,
				clientX: 0,
				clientY: 299,
				shiftKey: true,
			});
			fireEvent.mouseMove(document, { clientX: 20, clientY: 220 });
			fireEvent.mouseUp(document);
			expect(selected()).toEqual(["Folder", "blueberry", "cherry"]);
		});

		it("adds with Control under the default layout", () => {
			const { icon, selected, holder } = renderBrowser();
			press(icon("apple"));
			press(icon("banana"), { ctrlKey: true });
			fireEvent.mouseDown(holder, {
				button: 0,
				clientX: 299,
				clientY: 0,
				ctrlKey: true,
			});
			fireEvent.mouseMove(document, { clientX: 150, clientY: 50 });
			fireEvent.mouseUp(document);
			expect(selected()).toEqual(["apple", "banana"]);
		});

		const scrollingViewport = (container: HTMLElement) => {
			const viewport = container.querySelector(
				".classicyScrollAreaViewport",
			) as HTMLElement;
			Object.defineProperty(viewport, "scrollHeight", { value: 600 });
			Object.defineProperty(viewport, "clientHeight", { value: 200 });
			Object.defineProperty(viewport, "scrollWidth", { value: 300 });
			Object.defineProperty(viewport, "clientWidth", { value: 300 });
			const scrollBy = vi.fn();
			registerClassicyScrollViewport(viewport, {
				lineStep: () => 16,
				scrollBy,
			});
			return scrollBy;
		};

		it("scrolls the window toward an edge the pointer is past (fileBrowser.regionSelect)", () => {
			vi.useFakeTimers();
			registerWindowsKeys();
			const { container, holder } = renderBrowser();
			const scrollBy = scrollingViewport(container);
			fireEvent.mouseDown(holder, { button: 0, clientX: 10, clientY: 100 });
			fireEvent.mouseMove(document, { clientX: 10, clientY: 260 });
			expect(scrollBy).not.toHaveBeenCalled();
			act(() => vi.advanceTimersByTime(120));
			expect(scrollBy).toHaveBeenCalledWith(0, 16);
			act(() => vi.advanceTimersByTime(120));
			expect(scrollBy).toHaveBeenCalledTimes(2);
			// Back inside, clear of the edge: it stops.
			fireEvent.mouseMove(document, { clientX: 10, clientY: 100 });
			act(() => vi.advanceTimersByTime(360));
			expect(scrollBy).toHaveBeenCalledTimes(2);
			fireEvent.mouseUp(document);
		});

		it("never scrolls under the default layout", () => {
			vi.useFakeTimers();
			const { container, holder } = renderBrowser();
			const scrollBy = scrollingViewport(container);
			fireEvent.mouseDown(holder, { button: 0, clientX: 10, clientY: 100 });
			fireEvent.mouseMove(document, { clientX: 10, clientY: 260 });
			act(() => vi.advanceTimersByTime(600));
			expect(scrollBy).not.toHaveBeenCalled();
			fireEvent.mouseUp(document);
		});

		it("takes the selection back on Escape (input.escapeCancels)", () => {
			registerWindowsKeys();
			const { container, icon, selected, holder } = renderBrowser();
			press(icon("cherry"));
			fireEvent.mouseDown(holder, { button: 0, clientX: 0, clientY: 0 });
			fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
			expect(selected()).toEqual(["Folder", "apple"]);
			fireEvent.keyDown(document, { key: "Escape" });
			expect(container.querySelector(".classicyFileBrowserSelect")).toBeNull();
			expect(selected()).toEqual(["cherry"]);
			// The release after it changes nothing.
			fireEvent.mouseMove(document, { clientX: 299, clientY: 299 });
			fireEvent.mouseUp(document);
			expect(selected()).toEqual(["cherry"]);
		});
	});
});

// The list view's selection rectangle (`fileBrowser.regionSelect`, the
// audit's 5.12; WIG Ch.5 "Region Selection", p.42; Ch.7 "List View
// Controls", p.123): from a press below the rows, the rows whose names it
// touches. The rows' names lie 20 px apart from y 20 (placeOnScreen):
// Folder, apple, banana, blueberry, cherry, date.
describe("the list view's selection rectangle", () => {
	const rows = (container: HTMLElement) =>
		Array.from(
			container.querySelectorAll("tr.classicyTableRow.selected"),
			(row) => row.getAttribute("data-row-id")?.slice(2),
		);
	const emptySpace = (container: HTMLElement) =>
		container.querySelector(
			".classicyFileBrowserViewTableContainer",
		) as HTMLElement;

	it("selects the rows it touches, live, and keeps them at the release", () => {
		registerWindowsKeys();
		const onSelectionChange = vi.fn();
		const { container } = renderBrowser({
			display: "list",
			onSelectionChange,
		});
		fireEvent.click(
			container.querySelector('tr[data-row-id="D:apple"]') as HTMLElement,
		);
		expect(rows(container)).toEqual(["apple"]);
		fireEvent.mouseDown(emptySpace(container), {
			button: 0,
			clientX: 150,
			clientY: 290,
		});
		// The press clears the selection.
		expect(rows(container)).toEqual([]);
		fireEvent.mouseMove(document, { clientX: 10, clientY: 70 });
		const box = container.querySelector(
			".classicyFileBrowserSelect",
		) as HTMLElement;
		expect(box.getAttribute("aria-hidden")).toBe("true");
		expect([box.style.left, box.style.top]).toEqual(["10px", "70px"]);
		expect(rows(container)).toEqual(["banana", "blueberry", "cherry", "date"]);
		expect(onSelectionChange).toHaveBeenLastCalledWith([
			"D:banana",
			"D:blueberry",
			"D:cherry",
			"D:date",
		]);
		fireEvent.mouseUp(document);
		expect(container.querySelector(".classicyFileBrowserSelect")).toBeNull();
		expect(rows(container)).toEqual(["banana", "blueberry", "cherry", "date"]);
		// With Control the rows it touches toggle, the rest staying.
		fireEvent.mouseDown(emptySpace(container), {
			button: 0,
			clientX: 150,
			clientY: 290,
			ctrlKey: true,
		});
		fireEvent.mouseMove(document, { clientX: 10, clientY: 110 });
		fireEvent.mouseUp(document);
		expect(rows(container)).toEqual(["banana", "blueberry"]);
	});

	it("starts no rectangle on a row", () => {
		registerWindowsKeys();
		const { container } = renderBrowser({ display: "list" });
		const name = container.querySelector(
			'[data-classicy-file-path="D:apple"]',
		) as HTMLElement;
		fireEvent.mouseDown(name, { button: 0, clientX: 10, clientY: 30 });
		fireEvent.mouseMove(document, { clientX: 10, clientY: 130 });
		expect(container.querySelector(".classicyFileBrowserSelect")).toBeNull();
		fireEvent.mouseUp(document);
	});

	it("draws none under the default layout", () => {
		const { container } = renderBrowser({ display: "list" });
		fireEvent.click(
			container.querySelector('tr[data-row-id="D:apple"]') as HTMLElement,
		);
		fireEvent.mouseDown(emptySpace(container), {
			button: 0,
			clientX: 150,
			clientY: 290,
		});
		fireEvent.mouseMove(document, { clientX: 10, clientY: 70 });
		expect(container.querySelector(".classicyFileBrowserSelect")).toBeNull();
		fireEvent.mouseUp(document);
		expect(rows(container)).toEqual(["apple"]);
	});
});

// The icon view's transfers under Windows 98's `layout.transfer` (the
// remaining chapters' audit's 5.33 and 5.34; WIG Ch.5 "Shortcut Keys for
// Transfer Operations", pp.67-68): a copy or shortcut let go in the icons'
// own folder is made there ("Copy of", "Shortcut to") instead of moving
// the icons, and the transfer menu offers what the dragged items allow.
describe("the icon view's transfers under the Windows 98 layout", () => {
	const dropOn = (folderPath: string) => {
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", folderPath);
		return folder;
	};
	const drag = (
		from: HTMLElement,
		over: HTMLElement,
		{
			button = 0,
			ctrlKey = false,
		}: { button?: number; ctrlKey?: boolean } = {},
	) => {
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [over];
		try {
			fireEvent.mouseDown(from, { button, detail: 1, clientX: 0, clientY: 0 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 20, ctrlKey });
			fireEvent.mouseUp(document, {
				button,
				clientX: 40,
				clientY: 20,
				ctrlKey,
			});
		} finally {
			document.elementsFromPoint = original;
		}
	};

	it("copies into the icons' own folder with Control held, the icon staying put", () => {
		registerWindowsKeys();
		const onMoveItems = vi.fn();
		const { icon } = renderBrowser({ onMoveItems });
		const before = [icon("apple").style.left, icon("apple").style.top];
		drag(icon("apple"), dropOn("D"), { ctrlKey: true });
		expect(onMoveItems).toHaveBeenCalledTimes(1);
		expect(onMoveItems.mock.calls[0][0]).toEqual(["D:apple"]);
		expect(onMoveItems.mock.calls[0][1]).toEqual({ kind: "folder", path: "D" });
		expect(onMoveItems.mock.calls[0][4]).toBe("copy");
		expect([icon("apple").style.left, icon("apple").style.top]).toEqual(before);
	});

	it("copies elsewhere with Control held, and moves without it", () => {
		registerWindowsKeys();
		const onMoveItems = vi.fn();
		const { icon } = renderBrowser({ onMoveItems });
		drag(icon("apple"), dropOn("Elsewhere"), { ctrlKey: true });
		drag(icon("banana"), dropOn("Elsewhere"));
		expect(onMoveItems.mock.calls.map((call) => call[4])).toEqual([
			"copy",
			"move",
		]);
	});

	it("rearranges, never copies, in its own folder under the default layout", () => {
		const onMoveItems = vi.fn();
		const { icon } = renderBrowser({ onMoveItems });
		drag(icon("apple"), dropOn("D"), { ctrlKey: true });
		expect(onMoveItems).not.toHaveBeenCalled();
		expect(icon("apple").style.left).toBe("52px");
	});
});

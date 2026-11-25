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
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

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
	it("selects from the anchor with Shift, toggles one with Control", () => {
		const { icon, selected } = renderBrowser();
		fireEvent.click(icon("apple"));
		fireEvent.click(icon("cherry"), { shiftKey: true });
		expect(selected()).toEqual(["apple", "banana", "blueberry", "cherry"]);
		fireEvent.click(icon("banana"), { ctrlKey: true });
		expect(selected()).toEqual(["apple", "blueberry", "cherry"]);
		// Shift from the new anchor (banana).
		fireEvent.click(icon("date"), { shiftKey: true });
		expect(selected()).toEqual(["banana", "blueberry", "cherry", "date"]);
		// Shift with an arrow extends from the anchor too.
		fireEvent.click(icon("Folder"));
		fireEvent.keyDown(icon("Folder"), { key: "ArrowDown", shiftKey: true });
		expect(selected()).toEqual(["Folder", "apple", "banana"]);
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

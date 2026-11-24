import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
} from "@/__tests__/losePointerStream";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import { CLASSICY_SCROLL_LINE_STEP } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";
import { ClassicyWindowTitleBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar";

// The selection rectangle in a file browser (story 0228-e9l): from empty
// space in the icon view, and in the list view from a row's empty space
// beside its icon and name or below the rows, as the Mac OS 8.1 Finder has
// it, scrolling the window past its edges.

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

const PATHS = ["apple", "mango", "zebra"].map((n) => `Documents:${n}.pdf`);

// What stays put while the window's contents scroll: the window itself and
// the list's sticky column titles.
const FIXED = new Set([".classicyScrollAreaViewport", ".classicyTableHeader"]);

// jsdom lays nothing out: each element's client box comes from here, by
// selector, the first match winning.
const boxes: [string, [number, number, number, number]][] = [];
let scrollTop = 0;
beforeEach(() => {
	boxes.length = 0;
	scrollTop = 0;
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			for (const [selector, [x, y, width, height]] of boxes)
				if (this.matches(selector)) {
					const shift = FIXED.has(selector) ? 0 : scrollTop;
					return DOMRect.fromRect({ x, y: y - shift, width, height });
				}
			return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
		},
	);
	vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockImplementation(
		() => scrollTop,
	);
	vi.spyOn(HTMLElement.prototype, "scrollTop", "set").mockImplementation(
		(value: number) => {
			scrollTop = Math.max(0, value);
		},
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/** A task later: the Control-press's contextual menu, a swallow's end. */
const nextTask = () =>
	act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** The drop target a drag hit-tests (jsdom has no `elementsFromPoint`). */
const dropOn = (element: Element) => {
	const original = document.elementsFromPoint;
	document.elementsFromPoint = () => [element];
	return () => {
		document.elementsFromPoint = original;
	};
};

const renderBrowser = (
	key: string,
	display: "icons" | "list",
	props: Partial<Parameters<typeof ClassicyFileBrowser>[0]> = {},
) => {
	const commandsRef = createRef<ClassicyFileBrowserCommands>();
	const view = render(
		// The window contents the browser scrolls in.
		<div className="classicyScrollAreaViewport">
			<div className="classicyWindowContentsInner">
				<ClassicyFileBrowser
					fs={makeFs(key)}
					path="Documents"
					appId="Finder.app"
					display={display}
					commandsRef={commandsRef}
					{...props}
				/>
			</div>
		</div>,
	);
	const viewport = view.container.querySelector(
		".classicyScrollAreaViewport",
	) as HTMLElement;
	const marquee = () =>
		view.container.querySelector<HTMLElement>(
			'[data-classicy-part="selection-marquee"]',
		);
	const move = (x: number, y: number) =>
		fireEvent.mouseMove(document, { clientX: x, clientY: y });
	const release = (x: number, y: number) =>
		fireEvent.mouseUp(document, { clientX: x, clientY: y });
	return { ...view, commandsRef, viewport, marquee, move, release };
};

describe("ClassicyFileBrowser icon view selection rectangle", () => {
	// The window shows (0, 0) to (400, 200); the icons' images sit in a row
	// at y 20, apple at x 20, mango at x 120, and zebra below the fold at
	// (20, 300), each label 14 px below its image.
	const layIcons = () => {
		boxes.push([".classicyScrollAreaViewport", [0, 0, 400, 200]]);
		boxes.push([
			".classicyFileBrowserFill .classicyFileBrowserFill",
			[0, 0, 400, 200],
		]);
		const at: [number, number][] = [
			[20, 20],
			[120, 20],
			[20, 300],
		];
		PATHS.forEach((path, i) => {
			const [x, y] = at[i];
			boxes.push([`[data-classicy-file-path="${path}"] img`, [x, y, 32, 32]]);
			boxes.push([
				`[data-classicy-file-path="${path}"] p`,
				[x - 10, y + 34, 52, 12],
			]);
		});
	};

	const setup = async (
		key: string,
		props: Partial<Parameters<typeof ClassicyFileBrowser>[0]> = {},
	) => {
		const t = renderBrowser(key, "icons", props);
		await waitFor(() =>
			expect(t.container.querySelectorAll(".classicyIcon")).toHaveLength(3),
		);
		layIcons();
		const holder = t.container.querySelector(
			".classicyFileBrowserFill .classicyFileBrowserFill",
		) as HTMLElement;
		const icon = (path: string) =>
			t.container.querySelector(
				`.classicyIcon[data-classicy-file-path="${path}"]`,
			) as HTMLElement;
		const selected = () =>
			PATHS.filter((p) => icon(p).classList.contains("selected"));
		const click = (path: string, init: MouseEventInit = {}) => {
			fireEvent.mouseDown(icon(path), { button: 0, ...init });
			fireEvent.mouseUp(icon(path), { button: 0, ...init });
			fireEvent.click(icon(path), { button: 0, detail: 1, ...init });
		};
		return { ...t, holder, icon, selected, click };
	};

	it("selects the icons it touches from a press on empty space", async () => {
		const t = await setup("marquee-icons-basic");
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.move(6, 6);
		expect(t.marquee()).toBeNull();
		t.move(40, 40);
		expect(t.marquee()).not.toBeNull();
		expect(t.selected()).toEqual([PATHS[0]]);
		t.move(130, 30);
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		t.release(130, 30);
		expect(t.marquee()).toBeNull();
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		// The browser's commands see the selection it made.
		expect(t.commandsRef.current?.selectedPaths().sort()).toEqual([
			PATHS[0],
			PATHS[1],
		]);
	});

	it("selects a clicked icon alone, and Shift or Command toggles one (8.1)", async () => {
		const t = await setup("marquee-icons-click");
		t.click(PATHS[0]);
		expect(t.selected()).toEqual([PATHS[0]]);
		t.click(PATHS[1]);
		expect(t.selected()).toEqual([PATHS[1]]);
		t.click(PATHS[0], { shiftKey: true });
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		t.click(PATHS[1], { metaKey: true });
		expect(t.selected()).toEqual([PATHS[0]]);
		t.click(PATHS[2], { metaKey: true });
		expect(t.selected()).toEqual([PATHS[0], PATHS[2]]);
		// A plain click on one of a selection collapses it to that one.
		t.click(PATHS[2]);
		expect(t.selected()).toEqual([PATHS[2]]);
		// A press on empty space deselects everything.
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.release(5, 5);
		expect(t.selected()).toEqual([]);
	});

	it("selects an unselected icon alone at the press, keeping a selected one's selection", async () => {
		const t = await setup("marquee-icons-press");
		t.click(PATHS[0]);
		t.click(PATHS[1], { shiftKey: true });
		// A press on a selected icon keeps the selection, for a group drag.
		fireEvent.mouseDown(t.icon(PATHS[0]), { button: 0 });
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		fireEvent.mouseUp(document);
		// A press on an unselected one selects it alone at once.
		fireEvent.mouseDown(t.icon(PATHS[2]), { button: 0 });
		expect(t.selected()).toEqual([PATHS[2]]);
		fireEvent.mouseUp(document);
	});

	it("starts from the window contents below the holder, too", async () => {
		const t = await setup("marquee-icons-viewport");
		fireEvent.mouseDown(t.viewport, { button: 0, clientX: 300, clientY: 190 });
		t.move(130, 30);
		expect(t.selected()).toEqual([PATHS[1]]);
	});

	it("leaves a press on an icon to the icon", async () => {
		const t = await setup("marquee-icons-on-icon");
		fireEvent.mouseDown(t.icon(PATHS[0]).querySelector("img") as Element, {
			button: 0,
			clientX: 30,
			clientY: 30,
		});
		t.move(140, 40);
		expect(t.marquee()).toBeNull();
		t.release(140, 40);
	});

	it("toggles with Shift and restores the old selection on Escape", async () => {
		const t = await setup("marquee-icons-modifiers");
		t.click(PATHS[0]);
		fireEvent.mouseDown(t.holder, {
			button: 0,
			clientX: 5,
			clientY: 5,
			shiftKey: true,
		});
		t.move(130, 30);
		expect(t.selected()).toEqual([PATHS[1]]);
		t.release(130, 30);
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.move(40, 40);
		expect(t.selected()).toEqual([PATHS[0]]);
		fireEvent.keyDown(document.body, { key: "Escape" });
		expect(t.marquee()).toBeNull();
		expect(t.selected()).toEqual([PATHS[1]]);
	});

	it("takes a Control-press as the contextual-menu click: no rectangle, deselected, a menu asked for", async () => {
		const t = await setup("marquee-icons-control");
		t.click(PATHS[0]);
		const menus = vi.fn();
		t.holder.addEventListener("contextmenu", menus);
		fireEvent.mouseDown(t.holder, {
			button: 0,
			clientX: 5,
			clientY: 5,
			ctrlKey: true,
		});
		expect(t.selected()).toEqual([]);
		t.move(130, 30);
		expect(t.marquee()).toBeNull();
		expect(t.selected()).toEqual([]);
		await nextTask();
		expect(menus).toHaveBeenCalledTimes(1);
		const [event] = menus.mock.calls[0];
		expect([event.clientX, event.clientY]).toEqual([5, 5]);
		t.release(130, 30);
	});

	it("asks for no second menu when the browser fires its own (a macOS Control-click)", async () => {
		const t = await setup("marquee-icons-control-native");
		const menus = vi.fn();
		t.holder.addEventListener("contextmenu", menus);
		fireEvent.mouseDown(t.holder, {
			button: 0,
			clientX: 5,
			clientY: 5,
			ctrlKey: true,
		});
		fireEvent.contextMenu(t.holder, { clientX: 5, clientY: 5, ctrlKey: true });
		await nextTask();
		expect(menus).toHaveBeenCalledTimes(1);
	});

	it.each([
		["⌘A", { metaKey: true }],
		["Ctrl-A", { ctrlKey: true }],
	])("selects every icon on %s once a press has put the keyboard there", async (_name, mods) => {
		const t = await setup(`marquee-icons-select-all-${_name}`);
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.release(5, 5);
		expect(document.activeElement).toBe(t.holder);
		const key = new KeyboardEvent("keydown", {
			key: "a",
			bubbles: true,
			cancelable: true,
			...mods,
		});
		act(() => {
			t.holder.dispatchEvent(key);
		});
		expect(key.defaultPrevented).toBe(true);
		expect(t.selected()).toEqual(PATHS);
	});

	it("leaves ⌘A to a text field inside the browser", async () => {
		const t = await setup("marquee-icons-select-all-field");
		const field = document.createElement("input");
		t.holder.append(field);
		const key = new KeyboardEvent("keydown", {
			key: "a",
			metaKey: true,
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			field.dispatchEvent(key);
		});
		expect(key.defaultPrevented).toBe(false);
		expect(t.selected()).toEqual([]);
		field.remove();
	});

	it("scrolls the window past its edge, selecting what scrolls under it", async () => {
		const t = await setup("marquee-icons-scroll");
		vi.useFakeTimers();
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.move(40, 150);
		expect(t.selected()).toEqual([PATHS[0]]);
		t.move(40, 230);
		expect(scrollTop).toBe(CLASSICY_SCROLL_LINE_STEP);
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(scrollTop).toBeGreaterThan(100);
		expect(t.selected()).toEqual([PATHS[0], PATHS[2]]);
		t.release(40, 230);
	});

	describe("a drag of a selected icon carries the selection (8.1, as the desktop and list view)", () => {
		const selectTwo = async (key: string) => {
			const onMoveItems = vi.fn();
			const t = await setup(key, { onMoveItems });
			fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
			t.move(130, 30);
			t.release(130, 30);
			expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
			return { ...t, onMoveItems };
		};

		it("moves every selected item into another folder", async () => {
			const t = await selectTwo("marquee-icons-group-move");
			const folder = document.createElement("div");
			folder.setAttribute(
				"data-classicy-drop-folder",
				"Macintosh HD:Elsewhere",
			);
			const restore = dropOn(folder);
			try {
				fireEvent.mouseDown(t.icon(PATHS[1]), {
					button: 0,
					clientX: 130,
					clientY: 30,
				});
				fireEvent.mouseMove(document, { clientX: 200, clientY: 120 });
				fireEvent.mouseUp(document, { clientX: 200, clientY: 120 });
			} finally {
				restore();
			}
			expect(t.onMoveItems).toHaveBeenCalledTimes(1);
			const [paths, destination] = t.onMoveItems.mock.calls[0];
			expect([...paths].sort()).toEqual([PATHS[0], PATHS[1]]);
			expect(destination).toEqual({
				kind: "folder",
				path: "Macintosh HD:Elsewhere",
			});
		});

		it("drags an unselected icon alone", async () => {
			const t = await selectTwo("marquee-icons-single-move");
			const folder = document.createElement("div");
			folder.setAttribute(
				"data-classicy-drop-folder",
				"Macintosh HD:Elsewhere",
			);
			const restore = dropOn(folder);
			try {
				fireEvent.mouseDown(t.icon(PATHS[2]), {
					button: 0,
					clientX: 30,
					clientY: 310,
				});
				fireEvent.mouseMove(document, { clientX: 200, clientY: 120 });
				fireEvent.mouseUp(document, { clientX: 200, clientY: 120 });
			} finally {
				restore();
			}
			expect(t.onMoveItems.mock.calls[0][0]).toEqual([PATHS[2]]);
		});

		it("keeps the selection after a short drag let go over the pressed icon: no click after a drag (8.1)", async () => {
			const t = await selectTwo("marquee-icons-group-nudge");
			const restore = dropOn(
				t.container.querySelector(
					"[data-classicy-drop-folder='Documents']",
				) as Element,
			);
			try {
				fireEvent.mouseDown(t.icon(PATHS[0]), {
					button: 0,
					clientX: 30,
					clientY: 30,
				});
				fireEvent.mouseMove(document, { clientX: 36, clientY: 30 });
				fireEvent.mouseUp(t.icon(PATHS[0]), { clientX: 36, clientY: 30 });
			} finally {
				restore();
			}
			// Pressed and let go on the same icon: the browser clicks it.
			fireEvent.click(t.icon(PATHS[0]), { detail: 1 });
			expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
			// The next click is a click again.
			t.click(PATHS[1]);
			expect(t.selected()).toEqual([PATHS[1]]);
		});

		it("moves the selection's other icons as far, let go in its own folder", async () => {
			const t = await selectTwo("marquee-icons-group-rearrange");
			const at = (path: string) => [
				Number.parseFloat(t.icon(path).style.left),
				Number.parseFloat(t.icon(path).style.top),
			];
			const before = PATHS.map(at);
			const restore = dropOn(
				t.container.querySelector(
					"[data-classicy-drop-folder='Documents']",
				) as Element,
			);
			try {
				fireEvent.mouseDown(t.icon(PATHS[0]), {
					button: 0,
					clientX: 30,
					clientY: 30,
				});
				fireEvent.mouseMove(document, { clientX: 60, clientY: 70 });
				fireEvent.mouseUp(document, { clientX: 60, clientY: 70 });
			} finally {
				restore();
			}
			expect(t.onMoveItems).not.toHaveBeenCalled();
			const after = PATHS.map(at);
			expect(after[0]).toEqual([before[0][0] + 30, before[0][1] + 40]);
			expect(after[1]).toEqual([before[1][0] + 30, before[1][1] + 40]);
			// Not selected: stays put.
			expect(after[2]).toEqual(before[2]);
		});
	});
});

describe("ClassicyFileBrowser list view selection rectangle", () => {
	// Rows 20 px apart from y 20; in each, the name cell spans x 0 to 300,
	// the icon (20, 2) 16 px square and the name (40, 2) 60 x 16.
	const layRows = () => {
		boxes.push([".classicyScrollAreaViewport", [0, 0, 400, 200]]);
		boxes.push([".classicyFileBrowserFillList", [0, 0, 400, 200]]);
		PATHS.forEach((path, i) => {
			const y = 20 + i * 20;
			const row = `.classicyFileBrowserViewTableRowContainer[data-classicy-file-path="${path}"]`;
			boxes.push([`${row} img`, [20, y + 2, 16, 16]]);
			boxes.push([
				`${row} .classicyFileBrowserViewTableRowIconLabel`,
				[40, y + 2, 60, 16],
			]);
			boxes.push([row, [0, y, 300, 20]]);
		});
	};

	const setup = async (
		key: string,
		props: Partial<Parameters<typeof ClassicyFileBrowser>[0]> = {},
	) => {
		const t = renderBrowser(key, "list", props);
		await waitFor(() =>
			expect(t.container.querySelectorAll("tr.classicyTableRow")).toHaveLength(
				3,
			),
		);
		layRows();
		const row = (path: string) =>
			t.container.querySelector(
				`.classicyFileBrowserViewTableRowContainer[data-classicy-file-path="${path}"]`,
			) as HTMLElement;
		const selected = () =>
			Array.from(
				t.container.querySelectorAll("tr.classicyTableRow.selected"),
				(tr) => tr.getAttribute("data-row-id"),
			);
		const list = t.container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		/** A press beside a row's name, released where it was: a click there. */
		const pressBeside = (
			path: string,
			y: number,
			init: MouseEventInit = {},
		) => {
			fireEvent.mouseDown(row(path), {
				button: 0,
				clientX: 200,
				clientY: y,
				...init,
			});
			t.release(200, y);
			fireEvent.click(row(path), { detail: 1, ...init });
		};
		return { ...t, row, selected, list, pressBeside };
	};

	it("starts beside a row's icon and name and selects the rows it touches", async () => {
		const t = await setup("marquee-list-basic");
		fireEvent.mouseDown(t.row(PATHS[0]), {
			button: 0,
			clientX: 200,
			clientY: 25,
		});
		t.move(50, 45);
		expect(t.marquee()).not.toBeNull();
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		t.release(50, 45);
		// The click ending the press is not the row's.
		fireEvent.click(t.row(PATHS[1]), { detail: 1 });
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		expect(t.commandsRef.current?.selectedPaths()).toEqual([
			PATHS[0],
			PATHS[1],
		]);
	});

	it("swallows only the gesture's own click: keyboard clicks and later clicks pass", async () => {
		const t = await setup("marquee-list-swallow");
		t.pressBeside(PATHS[0], 25);
		expect(t.selected()).toEqual([]);
		// A keyboard click (detail 0) right away, as Space on a focused
		// button: not the gesture's.
		fireEvent.click(t.row(PATHS[2]), { detail: 0 });
		expect(t.selected()).toEqual([PATHS[2]]);
		// The swallow ended a task after the gesture's click.
		await nextTask();
		fireEvent.click(t.row(PATHS[1]), { detail: 1 });
		expect(t.selected()).toEqual([PATHS[1]]);
	});

	it("leaves a keyboard Space on a button and on a title-bar control working after a marquee", async () => {
		const onClickFunc = vi.fn();
		const onCollapse = vi.fn();
		const t = renderBrowser("marquee-list-keyboard", "list");
		const extra = render(
			<div>
				<ClassicyButton onClickFunc={onClickFunc}>OK</ClassicyButton>
				<ClassicyWindowTitleBar title="Docs" onCollapse={onCollapse} />
			</div>,
		);
		await waitFor(() =>
			expect(t.container.querySelectorAll("tr.classicyTableRow")).toHaveLength(
				3,
			),
		);
		layRows();
		const row = t.container.querySelector(
			`.classicyFileBrowserViewTableRowContainer[data-classicy-file-path="${PATHS[0]}"]`,
		) as HTMLElement;
		// A marquee beside a name, and its own click, swallowed.
		fireEvent.mouseDown(row, { button: 0, clientX: 200, clientY: 25 });
		t.move(50, 45);
		t.release(50, 45);
		fireEvent.click(row, { detail: 1 });
		// Space on the button: keydown, keyup, and the click the browser
		// sends for it (detail 0).
		const button = extra.getByRole("button", { name: "OK" });
		button.focus();
		fireEvent.keyDown(button, { key: " " });
		fireEvent.keyUp(button, { key: " " });
		fireEvent.click(button, { detail: 0 });
		expect(onClickFunc).toHaveBeenCalledTimes(1);
		// Space on the collapse box, which clicks itself.
		const collapse = extra.getByRole("button", { name: "Collapse" });
		fireEvent.keyDown(collapse, { key: " " });
		expect(onCollapse).toHaveBeenCalledTimes(1);
	});

	it("leaves a press on a row's name to the row", async () => {
		const t = await setup("marquee-list-name");
		const name = t
			.row(PATHS[0])
			.querySelector(".classicyFileBrowserViewTableRowIconLabel") as Element;
		fireEvent.mouseDown(name, { button: 0, clientX: 60, clientY: 30 });
		t.move(60, 80);
		expect(t.marquee()).toBeNull();
		t.release(60, 80);
		fireEvent.click(name, { detail: 1 });
		expect(t.selected()).toEqual([PATHS[0]]);
	});

	it("starts below the rows, and a double-click beside a name opens nothing", async () => {
		const dirOnClickFunc = vi.fn();
		const fileOnClickFunc = vi.fn();
		const t = await setup("marquee-list-below", {
			dirOnClickFunc,
			fileOnClickFunc,
		});
		fireEvent.mouseDown(t.viewport, { button: 0, clientX: 50, clientY: 150 });
		t.move(50, 70);
		expect(t.selected()).toEqual([PATHS[2]]);
		t.release(50, 70);
		t.pressBeside(PATHS[0], 25);
		t.pressBeside(PATHS[0], 25, { detail: 2 });
		fireEvent.doubleClick(t.row(PATHS[0]), { detail: 2 });
		expect(fileOnClickFunc).not.toHaveBeenCalled();
		expect(t.selected()).toEqual([]);
	});

	it("toggles rows with Shift, and Escape restores the old selection", async () => {
		const t = await setup("marquee-list-modifiers");
		fireEvent.click(t.row(PATHS[0]), { detail: 1 });
		expect(t.selected()).toEqual([PATHS[0]]);
		fireEvent.mouseDown(t.row(PATHS[2]), {
			button: 0,
			clientX: 200,
			clientY: 65,
			shiftKey: true,
		});
		t.move(50, 25);
		// Apple toggled off, mango and zebra on.
		expect(t.selected()).toEqual([PATHS[1], PATHS[2]]);
		fireEvent.keyDown(document.body, { key: "Escape" });
		expect(t.marquee()).toBeNull();
		expect(t.selected()).toEqual([PATHS[0]]);
		t.release(50, 25);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends where it is on a %s, keeping the rows", async (loss) => {
		const t = await setup(`marquee-list-lost-${loss}`);
		fireEvent.mouseDown(t.row(PATHS[0]), {
			button: 0,
			clientX: 200,
			clientY: 25,
		});
		t.move(50, 45);
		losePointerStream(loss);
		expect(t.marquee()).toBeNull();
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		t.move(50, 65);
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
	});

	it("scrolls the window past its bottom edge", async () => {
		const t = await setup("marquee-list-scroll");
		// The window shows only the first two rows.
		boxes.unshift([".classicyScrollAreaViewport", [0, 0, 400, 60]]);
		vi.useFakeTimers();
		fireEvent.mouseDown(t.row(PATHS[0]), {
			button: 0,
			clientX: 200,
			clientY: 25,
		});
		t.move(50, 70);
		expect(scrollTop).toBe(CLASSICY_SCROLL_LINE_STEP);
		act(() => {
			vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS);
		});
		expect(scrollTop).toBe(CLASSICY_SCROLL_LINE_STEP * 2);
		expect(t.selected()).toEqual([PATHS[0], PATHS[1], PATHS[2]]);
		t.release(50, 70);
	});

	it("keeps under Platinum's column titles, scrolling up past them", async () => {
		const t = await setup("marquee-list-titles");
		// The sticky titles across the window's top 18 px; scrolled down 40.
		boxes.unshift([".classicyTableHeader", [0, 0, 400, 18]]);
		scrollTop = 40;
		vi.useFakeTimers();
		fireEvent.mouseDown(t.row(PATHS[2]), {
			button: 0,
			clientX: 200,
			clientY: 65 - 40,
		});
		// Over the titles, inside the window: past the rows' top edge, so it
		// scrolls up.
		t.move(50, 10);
		expect(scrollTop).toBe(40 - CLASSICY_SCROLL_LINE_STEP);
		// Clipped below the titles.
		const clip = t.marquee()?.parentElement;
		expect(Number.parseFloat(clip?.style.top ?? "")).toBe(18 + scrollTop);
		t.release(50, 10);
	});

	it("puts the keyboard on the list from a press below the rows, for ⌘A", async () => {
		const t = await setup("marquee-list-focus");
		fireEvent.mouseDown(t.viewport, { button: 0, clientX: 50, clientY: 150 });
		t.release(50, 150);
		expect(document.activeElement).toBe(t.list);
		fireEvent.keyDown(t.list, { key: "a", metaKey: true });
		expect(t.selected()).toEqual(PATHS);
	});

	it("goes on from the rectangle's rows with the arrow keys", async () => {
		const t = await setup("marquee-list-keys");
		fireEvent.click(t.row(PATHS[0]), { detail: 1 });
		fireEvent.mouseDown(t.row(PATHS[1]), {
			button: 0,
			clientX: 200,
			clientY: 45,
		});
		t.move(50, 65);
		t.release(50, 65);
		expect(t.selected()).toEqual([PATHS[1], PATHS[2]]);
		// From the rectangle's first row (mango), not the row clicked before.
		fireEvent.keyDown(t.list, { key: "ArrowDown" });
		expect(t.selected()).toEqual([PATHS[2]]);
		fireEvent.keyDown(t.list, { key: "ArrowUp" });
		expect(t.selected()).toEqual([PATHS[1]]);
	});

	it("takes a Control-press beside a name as the contextual-menu click", async () => {
		const t = await setup("marquee-list-control");
		fireEvent.click(t.row(PATHS[0]), { detail: 1 });
		const menus = vi.fn();
		t.row(PATHS[1]).addEventListener("contextmenu", menus);
		t.pressBeside(PATHS[1], 45, { ctrlKey: true });
		expect(t.marquee()).toBeNull();
		// Deselected, and the Control-click did not select its row.
		expect(t.selected()).toEqual([]);
		await nextTask();
		expect(menus).toHaveBeenCalledTimes(1);
	});
});

describe("ClassicyFileBrowserViewTable used alone (no browser around it)", () => {
	it("still drags a row from beside its name, as it has no rectangle", async () => {
		const onMoveItems = vi.fn();
		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("marquee-standalone-table")}
				path="Documents"
				appId="Finder.app"
				onMoveItems={onMoveItems}
			/>,
		);
		await waitFor(() =>
			expect(container.querySelectorAll("tr.classicyTableRow")).toHaveLength(3),
		);
		const rowSelector = `.classicyFileBrowserViewTableRowContainer[data-classicy-file-path="${PATHS[0]}"]`;
		boxes.push([`${rowSelector} img`, [20, 22, 16, 16]]);
		boxes.push([
			`${rowSelector} .classicyFileBrowserViewTableRowIconLabel`,
			[40, 22, 60, 16],
		]);
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", "Macintosh HD:Elsewhere");
		const restore = dropOn(folder);
		try {
			fireEvent.mouseDown(container.querySelector(rowSelector) as Element, {
				button: 0,
				clientX: 200,
				clientY: 25,
			});
			fireEvent.mouseMove(document, { clientX: 260, clientY: 120 });
			fireEvent.mouseUp(document, { clientX: 260, clientY: 120 });
		} finally {
			restore();
		}
		expect(onMoveItems).toHaveBeenCalledTimes(1);
		expect(onMoveItems.mock.calls[0][0]).toEqual([PATHS[0]]);
		expect(
			container.querySelector('[data-classicy-part="selection-marquee"]'),
		).toBeNull();
	});
});

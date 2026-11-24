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
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { CLASSICY_SCROLL_LINE_STEP } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";

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
					// The window's contents scroll; the window itself does not.
					const shift =
						selector === ".classicyScrollAreaViewport" ? 0 : scrollTop;
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
			scrollTop = value;
		},
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

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
		view.container.querySelector('[data-classicy-part="selection-marquee"]');
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

	const setup = async (key: string) => {
		const t = renderBrowser(key, "icons");
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
		return { ...t, holder, icon, selected };
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

	it("deselects at a press on empty space, and an icon's click still toggles it", async () => {
		const t = await setup("marquee-icons-click");
		fireEvent.click(t.icon(PATHS[2]));
		expect(t.selected()).toEqual([PATHS[2]]);
		fireEvent.mouseDown(t.holder, { button: 0, clientX: 5, clientY: 5 });
		t.release(5, 5);
		expect(t.selected()).toEqual([]);
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
		fireEvent.click(t.icon(PATHS[0]));
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
		return { ...t, row, selected };
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
		fireEvent.click(t.row(PATHS[1]));
		expect(t.selected()).toEqual([PATHS[0], PATHS[1]]);
		expect(t.commandsRef.current?.selectedPaths()).toEqual([
			PATHS[0],
			PATHS[1],
		]);
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
		fireEvent.click(name);
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
		fireEvent.mouseDown(t.row(PATHS[0]), {
			button: 0,
			clientX: 200,
			clientY: 25,
		});
		t.release(200, 25);
		fireEvent.click(t.row(PATHS[0]));
		fireEvent.doubleClick(t.row(PATHS[0]));
		expect(fileOnClickFunc).not.toHaveBeenCalled();
		expect(t.selected()).toEqual([]);
	});
});

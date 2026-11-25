import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import {
	classicyIconsRoveFocus,
	classicyListPageIndex,
	classicyListPageOf,
	classicyListPageRows,
	classicyListScroller,
	classicyListViewBox,
	classicyMovesCursorOnly,
	classicyPageKeysMove,
	classicyRevealListRow,
	classicyScrollListBy,
	classicyShownRowRange,
	classicyTreeScrollChord,
	classicyWindowsSelectionKeys,
	classicyWindowsTreeKeys,
	isClassicyAddModeKey,
	isClassicyListNavigationKey,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const box = (top: number, height: number, left = 0, width = 200) =>
	({
		top,
		bottom: top + height,
		left,
		right: left + width,
		width,
		height,
		x: left,
		y: top,
		toJSON: () => ({}),
	}) as DOMRect;

const element = (rect: DOMRect, client?: { height: number; width: number }) => {
	const el = document.createElement("div");
	el.getBoundingClientRect = () => rect;
	if (client) {
		Object.defineProperty(el, "clientHeight", { value: client.height });
		Object.defineProperty(el, "clientWidth", { value: client.width });
	}
	return el;
};

const noKeys = {
	shiftKey: false,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
};

afterEach(() => {
	document.body.innerHTML = "";
});

// The readers give today's rule with the keys absent (Platinum, System 7),
// Windows' with Windows 98's layout.
describe("the list keys' layout readers", () => {
	it("read nothing from the default layout", () => {
		expect(classicyPageKeysMove(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(
			classicyWindowsSelectionKeys(CLASSICY_DEFAULT_APPEARANCE_LAYOUT),
		).toBe(false);
		expect(classicyWindowsTreeKeys(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(classicyPageKeysMove({ selection: { pageKeys: "scroll" } })).toBe(
			false,
		);
		expect(
			classicyWindowsSelectionKeys({ selection: { keyboard: "follow" } }),
		).toBe(false);
		expect(classicyWindowsTreeKeys({ tree: { keys: "mac" } })).toBe(false);
		expect(classicyIconsRoveFocus(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(
			classicyIconsRoveFocus({ selection: { iconNavigation: "each" } }),
		).toBe(false);
	});

	it("read Windows' keys from Windows 98's layout", () => {
		const layout = windows98.layout as Parameters<
			typeof classicyPageKeysMove
		>[0] &
			Parameters<typeof classicyWindowsTreeKeys>[0];
		expect(classicyPageKeysMove(layout)).toBe(true);
		expect(classicyWindowsSelectionKeys(layout)).toBe(true);
		expect(classicyWindowsTreeKeys(layout)).toBe(true);
		expect(classicyIconsRoveFocus(layout)).toBe(true);
	});
});

describe("the list keys' key tests", () => {
	it("names the vertical navigation keys", () => {
		for (const key of [
			"ArrowUp",
			"ArrowDown",
			"Home",
			"End",
			"PageUp",
			"PageDown",
		])
			expect(isClassicyListNavigationKey(key), key).toBe(true);
		for (const key of ["ArrowLeft", "ArrowRight", " ", "Enter", "a"])
			expect(isClassicyListNavigationKey(key), key).toBe(false);
	});

	it("moves the cursor alone for Control, ⌘ or Option, never with Shift", () => {
		expect(classicyMovesCursorOnly(noKeys)).toBe(false);
		expect(classicyMovesCursorOnly({ ...noKeys, ctrlKey: true })).toBe(true);
		expect(classicyMovesCursorOnly({ ...noKeys, metaKey: true })).toBe(true);
		expect(classicyMovesCursorOnly({ ...noKeys, altKey: true })).toBe(true);
		expect(
			classicyMovesCursorOnly({ ...noKeys, ctrlKey: true, shiftKey: true }),
		).toBe(false);
	});

	it("takes Shift+F8 alone as the Add mode key", () => {
		expect(isClassicyAddModeKey({ ...noKeys, key: "F8", shiftKey: true })).toBe(
			true,
		);
		expect(isClassicyAddModeKey({ ...noKeys, key: "F8" })).toBe(false);
		expect(
			isClassicyAddModeKey({
				...noKeys,
				key: "F8",
				shiftKey: true,
				ctrlKey: true,
			}),
		).toBe(false);
		expect(isClassicyAddModeKey({ ...noKeys, key: "F7", shiftKey: true })).toBe(
			false,
		);
	});
});

// comctl32's list view in report view (LISTVIEW_KeyDown's VK_PRIOR and
// VK_NEXT): the page's edge first, then a page less one further.
describe("classicyListPageIndex", () => {
	const shown = { first: 3, last: 7 };
	it("goes to the last row shown, then a page less one further", () => {
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 4,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(7);
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 7,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(11);
	});

	it("goes to the first row shown, then a page less one back", () => {
		expect(
			classicyListPageIndex({
				key: "PageUp",
				current: 5,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(3);
		expect(
			classicyListPageIndex({
				key: "PageUp",
				current: 3,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(0);
	});

	it("clamps to the list, and starts from the page with no keyboard row", () => {
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 18,
				count: 20,
				shown: { first: 15, last: 18 },
				pageRows: 4,
			}),
		).toBe(19);
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: -1,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(7);
		expect(
			classicyListPageIndex({
				key: "PageUp",
				current: -1,
				count: 20,
				shown,
				pageRows: 5,
			}),
		).toBe(3);
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 0,
				count: 0,
				shown: null,
				pageRows: 5,
			}),
		).toBe(-1);
	});

	it("steps from the keyboard row with nothing shown, at least one row", () => {
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 2,
				count: 20,
				shown: null,
				pageRows: 5,
			}),
		).toBe(6);
		expect(
			classicyListPageIndex({
				key: "PageUp",
				current: 2,
				count: 20,
				shown: null,
				pageRows: 5,
			}),
		).toBe(0);
		expect(
			classicyListPageIndex({
				key: "PageDown",
				current: 2,
				count: 20,
				shown: { first: 2, last: 2 },
				pageRows: 1,
			}),
		).toBe(3);
	});
});

describe("the list's page geometry", () => {
	it("measures the scroller's client box, below what covers its top", () => {
		const scroller = element(box(100, 90), { height: 80, width: 180 });
		expect(classicyListViewBox(scroller)).toEqual({
			top: 100,
			bottom: 180,
			left: 0,
			right: 180,
		});
		expect(classicyListViewBox(scroller, 120).top).toBe(120);
		// Something covering nothing of it, or all of it, moves nothing.
		expect(classicyListViewBox(scroller, 90).top).toBe(100);
		expect(classicyListViewBox(scroller, 200).top).toBe(100);
	});

	it("finds the first and last rows wholly shown", () => {
		const view = { top: 100, bottom: 180, left: 0, right: 200 };
		const rows = [80, 95, 110, 130, 150, 170, 190].map((top) =>
			element(box(top, 20)),
		);
		// 110, 130 and 150 fit; 95 starts above, 170 ends below.
		expect(classicyShownRowRange(rows, view)).toEqual({ first: 2, last: 4 });
		// A row in a column flowed out of the view is not shown.
		const columns = [element(box(100, 20)), element(box(100, 20, 300))];
		expect(classicyShownRowRange(columns, view)).toEqual({
			first: 0,
			last: 0,
		});
		// Nothing laid out, or nothing shown.
		expect(classicyShownRowRange([element(box(0, 0)), null], view)).toBeNull();
		expect(classicyShownRowRange([element(box(300, 20))], view)).toBeNull();
	});

	it("counts the whole rows a page holds, at least one", () => {
		const view = { top: 100, bottom: 180, left: 0, right: 200 };
		expect(classicyListPageRows(element(box(0, 20)), view)).toBe(4);
		expect(classicyListPageRows(element(box(0, 19.999)), view)).toBe(4);
		expect(classicyListPageRows(element(box(0, 30)), view)).toBe(2);
		expect(classicyListPageRows(element(box(0, 100)), view)).toBe(1);
		expect(classicyListPageRows(element(box(0, 0)), view)).toBe(1);
		expect(classicyListPageRows(null, view)).toBe(1);
		expect(classicyListPageRows(element(box(0, 20)), null)).toBe(1);
	});

	it("finds the scroller: a registered viewport, else an ancestor that scrolls", () => {
		const outer = document.createElement("div");
		outer.style.overflowY = "auto";
		const viewport = document.createElement("div");
		const row = document.createElement("div");
		viewport.appendChild(row);
		outer.appendChild(viewport);
		document.body.appendChild(outer);
		expect(classicyListScroller(row)).toBe(outer);
		const unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => 16,
			scrollBy: () => {},
		});
		expect(classicyListScroller(row)).toBe(viewport);
		unregister();
		expect(classicyListScroller(document.createElement("div"))).toBeNull();
		expect(classicyListScroller(null)).toBeNull();
	});

	it("measures a row's page from its scroller", () => {
		const scroller = element(box(100, 80), { height: 80, width: 200 });
		const unregister = registerClassicyScrollViewport(scroller, {
			lineStep: () => 16,
			scrollBy: () => {},
		});
		const row = element(box(100, 20));
		scroller.appendChild(row);
		expect(classicyListPageOf(row)).toEqual({
			view: { top: 100, bottom: 180, left: 0, right: 200 },
			pageRows: 4,
		});
		expect(classicyListPageOf(row, 120)?.pageRows).toBe(3);
		unregister();
		expect(classicyListPageOf(row)).toBeNull();
	});
});

describe("revealing and scrolling a list", () => {
	it("scrolls a row into view by the least amount, where it can", () => {
		const row = document.createElement("div");
		expect(() => classicyRevealListRow(row)).not.toThrow();
		row.scrollIntoView = vi.fn();
		classicyRevealListRow(row);
		expect(row.scrollIntoView).toHaveBeenCalledWith({
			block: "nearest",
			inline: "nearest",
		});
		expect(() => classicyRevealListRow(null)).not.toThrow();
	});

	it("scrolls through a registered viewport, else the scroller itself", () => {
		const viewport = document.createElement("div");
		const tree = document.createElement("ul");
		viewport.appendChild(tree);
		const scrollBy = vi.fn();
		const unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => 16,
			scrollBy,
		});
		expect(classicyScrollListBy(tree, 3, 20)).toBe(true);
		expect(scrollBy).toHaveBeenCalledWith(3, 20);
		unregister();
		viewport.style.overflowY = "scroll";
		document.body.appendChild(viewport);
		expect(classicyScrollListBy(tree, 4, 18)).toBe(true);
		expect(viewport.scrollTop).toBe(18);
		expect(viewport.scrollLeft).toBe(4);
		expect(classicyScrollListBy(document.createElement("ul"), 0, 5)).toBe(
			false,
		);
		expect(classicyScrollListBy(null, 0, 5)).toBe(false);
	});
});

// TREEVIEW_ScrollKeyDown: every Control key a scroll.
describe("classicyTreeScrollChord", () => {
	const at = {
		rowHeight: 18,
		scrollTop: 40,
		scrollHeight: 400,
		clientHeight: 100,
	};
	it("scrolls a row, a row's height sideways, a page, or to an end", () => {
		expect(classicyTreeScrollChord("ArrowUp", at)).toEqual([0, -18]);
		expect(classicyTreeScrollChord("ArrowDown", at)).toEqual([0, 18]);
		expect(classicyTreeScrollChord("ArrowLeft", at)).toEqual([-18, 0]);
		expect(classicyTreeScrollChord("ArrowRight", at)).toEqual([18, 0]);
		// Five whole rows of 18 px in 100.
		expect(classicyTreeScrollChord("PageUp", at)).toEqual([0, -90]);
		expect(classicyTreeScrollChord("PageDown", at)).toEqual([0, 90]);
		expect(classicyTreeScrollChord("Home", at)).toEqual([0, -40]);
		expect(classicyTreeScrollChord("End", at)).toEqual([0, 260]);
	});

	it("takes no other key, and a line of a pixel with no row height", () => {
		expect(classicyTreeScrollChord("Enter", at)).toBeNull();
		expect(classicyTreeScrollChord("a", at)).toBeNull();
		expect(
			classicyTreeScrollChord("ArrowDown", {
				rowHeight: 0,
				scrollTop: 0,
				scrollHeight: 0,
				clientHeight: 0,
			}),
		).toEqual([0, 1]);
		expect(
			classicyTreeScrollChord("End", {
				rowHeight: 18,
				scrollTop: 0,
				scrollHeight: 50,
				clientHeight: 100,
			}),
		).toEqual([0, 0]);
	});
});

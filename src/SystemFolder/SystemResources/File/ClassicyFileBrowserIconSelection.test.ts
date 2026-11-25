// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	classicyFileBrowserRegionSelect,
	classicyIconClickSelection,
	classicyIconMarqueeSelection,
	classicyIconPage,
	classicyIconRange,
	classicyIconRectRange,
	classicyIconTypeahead,
	classicyIconViewDragsSelection,
	classicyRectsIntersect,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";

const none = { shiftKey: false, metaKey: false, ctrlKey: false };
const order = ["a", "b", "c", "d"];
const places = [
	{ path: "a", name: "Alpha", location: [0, 0] as [number, number] },
	{ path: "b", name: "beta", location: [100, 0] as [number, number] },
	{ path: "c", name: "Bravo", location: [0, 100] as [number, number] },
	{ path: "d", name: "delta", location: [100, 100] as [number, number] },
];

describe("classicyIconClickSelection", () => {
	it("selects alone on a plain click under either keys", () => {
		for (const keys of ["mac", "windows"] as const)
			expect(
				classicyIconClickSelection(
					keys,
					order,
					{ selected: ["a", "b"] },
					"c",
					none,
				),
			).toEqual({ selected: ["c"], anchor: "c" });
	});

	it("toggles with any modifier on the Mac, Shift included", () => {
		expect(
			classicyIconClickSelection(
				"mac",
				order,
				{ selected: ["a"], anchor: "a" },
				"c",
				{
					...none,
					shiftKey: true,
				},
			),
		).toEqual({ selected: ["a", "c"], anchor: "c" });
	});

	it("ranges from the anchor with Shift under Windows, adding with Control, and selects alone with no anchor", () => {
		const current = { selected: ["b"], anchor: "b" };
		expect(
			classicyIconClickSelection("windows", order, current, "d", {
				...none,
				shiftKey: true,
			}),
		).toEqual({ selected: ["b", "c", "d"], anchor: "b" });
		// Control with Shift: the others stay, the range takes the anchor's
		// state (WIG p.39): added from a selected anchor, removed from an
		// unselected one.
		expect(
			classicyIconClickSelection(
				"windows",
				order,
				{ selected: ["a", "c"], anchor: "c" },
				"d",
				{ ...none, shiftKey: true, ctrlKey: true },
			),
		).toEqual({ selected: ["a", "c", "d"], anchor: "c" });
		expect(
			classicyIconClickSelection(
				"windows",
				order,
				{ selected: ["a", "b", "d"], anchor: "c" },
				"b",
				{ ...none, shiftKey: true, metaKey: true },
			),
		).toEqual({ selected: ["a", "d"], anchor: "c" });
		expect(
			classicyIconClickSelection("windows", order, { selected: [] }, "c", {
				...none,
				shiftKey: true,
			}),
		).toEqual({ selected: ["c"], anchor: "c" });
	});
});

// Four icons on a 100 px grid, 64 px boxes: a b / c d.
const boxes = places.map((p) => ({
	path: p.path,
	left: p.location[0],
	top: p.location[1],
	right: p.location[0] + 64,
	bottom: p.location[1] + 64,
}));

describe("classicyIconClickSelection with boxes (Windows' rectangle)", () => {
	it("ranges over the rectangle the anchor's box and the item's span", () => {
		// a (0,0) to b (100,0): one row, both columns.
		expect(
			classicyIconClickSelection(
				"windows",
				order,
				{ selected: ["a"], anchor: "a" },
				"b",
				{ ...none, shiftKey: true },
				boxes,
			),
		).toEqual({ selected: ["a", "b"], anchor: "a" });
		// b (100,0) to c (0,100): every icon, though c's order is after b's.
		expect(
			classicyIconClickSelection(
				"windows",
				order,
				{ selected: ["b"], anchor: "b" },
				"c",
				{ ...none, shiftKey: true },
				boxes,
			),
		).toEqual({ selected: ["a", "b", "c", "d"], anchor: "b" });
		// The Mac ignores the boxes: Shift toggles.
		expect(
			classicyIconClickSelection(
				"mac",
				order,
				{ selected: ["b"], anchor: "b" },
				"c",
				{ ...none, shiftKey: true },
				boxes,
			),
		).toEqual({ selected: ["b", "c"], anchor: "c" });
	});
});

describe("classicyIconRectRange", () => {
	it("takes the icons whose top left lies in the union of the two boxes", () => {
		expect(classicyIconRectRange(boxes, "a", "c")).toEqual(["a", "c"]);
		expect(classicyIconRectRange(boxes, "d", "a")).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
		expect(classicyIconRectRange(boxes, "b", "b")).toEqual(["b"]);
	});

	it("leaves out an icon whose top left is on the union's right or bottom edge", () => {
		const edge = [
			...boxes,
			// Its top left at the union's right edge (164): outside.
			{ path: "e", left: 164, top: 0, right: 228, bottom: 64 },
			// Just inside the bottom edge (163).
			{ path: "f", left: 0, top: 163, right: 64, bottom: 227 },
		];
		expect(classicyIconRectRange(edge, "a", "d")).toEqual([
			"a",
			"b",
			"c",
			"d",
			"f",
		]);
	});

	it("falls back to the item when either end is not listed", () => {
		expect(classicyIconRectRange(boxes, "x", "b")).toEqual(["b"]);
		expect(classicyIconRectRange(boxes, "a", "x")).toEqual(["x"]);
	});
});

describe("classicyIconMarqueeSelection", () => {
	const base = ["a", "b"];
	const boxed = ["b", "c"];
	it("selects what it touches alone with no modifier, under either keys", () => {
		for (const keys of ["mac", "windows"] as const)
			expect(classicyIconMarqueeSelection(keys, base, boxed, none)).toEqual([
				"b",
				"c",
			]);
	});

	it("adds what it touches with any modifier on the Mac", () => {
		for (const mods of [
			{ ...none, shiftKey: true },
			{ ...none, metaKey: true },
			{ ...none, ctrlKey: true },
		])
			expect(classicyIconMarqueeSelection("mac", base, boxed, mods)).toEqual([
				"a",
				"b",
				"c",
			]);
	});

	it("adds with Shift and toggles with Control or ⌘ under Windows", () => {
		expect(
			classicyIconMarqueeSelection("windows", base, boxed, {
				...none,
				shiftKey: true,
			}),
		).toEqual(["a", "b", "c"]);
		for (const mods of [
			{ ...none, ctrlKey: true },
			{ ...none, metaKey: true },
			{ ...none, ctrlKey: true, shiftKey: true },
		])
			expect(
				classicyIconMarqueeSelection("windows", base, boxed, mods),
			).toEqual(["a", "c"]);
	});
});

describe("the file browser's layout readers", () => {
	it("reads fileBrowser.iconSelection and regionSelect, absent as today", () => {
		expect(classicyIconViewDragsSelection({})).toBe(false);
		expect(
			classicyIconViewDragsSelection({
				fileBrowser: { iconSelection: "perIcon" },
			}),
		).toBe(false);
		expect(
			classicyIconViewDragsSelection({
				fileBrowser: { iconSelection: "view" },
			}),
		).toBe(true);
		expect(classicyFileBrowserRegionSelect({})).toBe(false);
		expect(
			classicyFileBrowserRegionSelect({ fileBrowser: { regionSelect: false } }),
		).toBe(false);
		expect(
			classicyFileBrowserRegionSelect({ fileBrowser: { regionSelect: true } }),
		).toBe(true);
	});
});

describe("classicyIconRange", () => {
	it("runs either way, and falls back to the item when the anchor is gone", () => {
		expect(classicyIconRange(order, "c", "a")).toEqual(["a", "b", "c"]);
		expect(classicyIconRange(order, "x", "b")).toEqual(["b"]);
	});
});

describe("classicyIconTypeahead", () => {
	it("finds the first name alphabetically on the Mac, without case", () => {
		expect(classicyIconTypeahead("mac", places, "b", "d")).toBe("b");
		expect(classicyIconTypeahead("mac", places, "br", "d")).toBe("c");
		expect(classicyIconTypeahead("mac", places, "bb", "d")).toBeNull();
	});

	it("steps through a repeated letter in the view's order under Windows", () => {
		expect(classicyIconTypeahead("windows", places, "b", "a")).toBe("b");
		expect(classicyIconTypeahead("windows", places, "bb", "b")).toBe("c");
		expect(classicyIconTypeahead("windows", places, "bbb", "c")).toBe("b");
		expect(classicyIconTypeahead("windows", places, "be", "c")).toBe("b");
		expect(classicyIconTypeahead("windows", places, "b", undefined)).toBe("b");
	});
});

describe("classicyIconPage", () => {
	it("goes to the farthest row within a page, else the next row", () => {
		expect(classicyIconPage(places, "a", false, 150)).toBe("c");
		expect(classicyIconPage(places, "b", false, 0)).toBe("d");
		expect(classicyIconPage(places, "d", true, 150)).toBe("b");
		expect(classicyIconPage(places, "c", false, 150)).toBeNull();
	});
});

describe("classicyRectsIntersect", () => {
	it("is true only for an overlap", () => {
		const a = { left: 0, top: 0, right: 10, bottom: 10 };
		expect(
			classicyRectsIntersect(a, { left: 5, top: 5, right: 20, bottom: 20 }),
		).toBe(true);
		expect(
			classicyRectsIntersect(a, { left: 10, top: 0, right: 20, bottom: 10 }),
		).toBe(false);
	});
});

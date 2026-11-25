// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	classicyIconClickSelection,
	classicyIconPage,
	classicyIconRange,
	classicyIconTypeahead,
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
		expect(
			classicyIconClickSelection(
				"windows",
				order,
				{ selected: ["a", "b"], anchor: "c" },
				"d",
				{ ...none, shiftKey: true, ctrlKey: true },
			),
		).toEqual({ selected: ["a", "b", "c", "d"], anchor: "c" });
		expect(
			classicyIconClickSelection("windows", order, { selected: [] }, "c", {
				...none,
				shiftKey: true,
			}),
		).toEqual({ selected: ["c"], anchor: "c" });
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

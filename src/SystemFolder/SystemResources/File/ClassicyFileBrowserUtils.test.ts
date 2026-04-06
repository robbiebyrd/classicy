import { describe, expect, it } from "vitest";
import {
	capitalizeFirst,
	createGrid,
	getGridPosition,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";

describe("capitalizeFirst", () => {
	it("capitalizes the first letter of a lowercase string", () => {
		expect(capitalizeFirst("hello")).toBe("Hello");
	});

	it("leaves an already-capitalized string unchanged", () => {
		expect(capitalizeFirst("Hello")).toBe("Hello");
	});

	it("returns an empty string for empty input", () => {
		expect(capitalizeFirst("")).toBe("");
	});

	it("capitalizes a single character", () => {
		expect(capitalizeFirst("a")).toBe("A");
	});
});

describe("createGrid", () => {
	it("computes column and row counts for a standard container", () => {
		// iconSize=32, iconPadding=8 → cell = 32*2+8 = 72
		// cols = floor(720/72) = 10, rows = floor(480/72) = 6
		expect(createGrid(32, 8, [720, 480])).toEqual([10, 6]);
	});

	it("returns [0, 0] when the container is smaller than one cell", () => {
		// iconSize=32, iconPadding=8 → cell = 72; container=[50,50]
		// floor(50/72) = 0 in both dimensions
		expect(createGrid(32, 8, [50, 50])).toEqual([0, 0]);
	});
});

describe("getGridPosition", () => {
	it("maps index 0 to the first cell [0, 0]", () => {
		expect(getGridPosition(0, [10, 6])).toEqual([0, 0]);
	});

	it("maps index 5 to the sixth column in the first row", () => {
		expect(getGridPosition(5, [10, 6])).toEqual([5, 0]);
	});

	it("maps index 10 to the first column in the second row", () => {
		expect(getGridPosition(10, [10, 6])).toEqual([0, 1]);
	});

	it("maps index 15 to the sixth column in the second row", () => {
		expect(getGridPosition(15, [10, 6])).toEqual([5, 1]);
	});
});

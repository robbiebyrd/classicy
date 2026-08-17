import { describe, expect, it } from "vitest";
import { snapToGrid } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";

describe("snapToGrid", () => {
	it("rounds to the nearest cell", () => {
		expect(snapToGrid([37, 61], [24, 24])).toEqual([48, 72]);
	});

	it("rounds down below the halfway point", () => {
		expect(snapToGrid([10, 10], [24, 24])).toEqual([0, 0]);
	});

	it("leaves an already-aligned position alone", () => {
		expect(snapToGrid([48, 24], [24, 24])).toEqual([48, 24]);
	});

	it("supports a non-square pitch", () => {
		expect(snapToGrid([30, 30], [20, 40])).toEqual([40, 40]);
	});
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ClassicyWindowRect,
	computeClassicyWindowResize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";
import { CLASSICY_WINDOW_RESIZE_FUDGE } from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize.internal";

// Each corner's pointer is that corner of the rect plus (10, 10).
const rect: ClassicyWindowRect = {
	left: 100,
	top: 100,
	right: 300,
	bottom: 250,
};
const chrome: [number, number] = [10, 30];

describe("computeClassicyWindowResize", () => {
	it("bottom-right keeps today's numbers", () =>
		expect(
			computeClassicyWindowResize("bottom-right", rect, [310, 260], chrome),
		).toEqual({ size: [215, 165], position: [100, 100] }));
	it("bottom-left anchors the top-right corner", () =>
		expect(
			computeClassicyWindowResize("bottom-left", rect, [110, 260], chrome),
		).toEqual({ size: [195, 165], position: [95, 100] }));
	it("top-right anchors the bottom-left corner", () =>
		expect(
			computeClassicyWindowResize("top-right", rect, [310, 110], chrome),
		).toEqual({ size: [215, 145], position: [100, 75] }));
	it("top-left anchors the bottom-right corner", () =>
		expect(
			computeClassicyWindowResize("top-left", rect, [110, 110], chrome),
		).toEqual({ size: [195, 145], position: [95, 75] }));
	it("the fudge is 5 until Part G measures it", () =>
		expect(CLASSICY_WINDOW_RESIZE_FUDGE).toBe(5));
	// The fudge is internal: the library barrel exports the function and its
	// types, never the constant, so a measured value can replace it.
	it("keeps the fudge out of the library barrel", () => {
		const barrel = readFileSync("src/index.ts", "utf8");
		expect(barrel).toContain(
			'export * from "./SystemFolder/SystemResources/Window/ClassicyWindowResize";',
		);
		expect(barrel).not.toContain("ClassicyWindowResize.internal");
	});
	it("defaults the fudge to the internal constant", () =>
		expect(
			computeClassicyWindowResize("bottom-right", rect, [310, 260], chrome),
		).toEqual(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[310, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
			),
		));

	// F 4.1 review: CSS draws at least the minimum size, so a flipped axis
	// positions from the drawn size; the returned size stays raw.
	it("a flipped axis positions from the minimum size", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-left",
				rect,
				[290, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[150, 0],
			),
		).toEqual({ size: [15, 165], position: [140, 100] }));
	it("a top grip stops at the viewport floor", () =>
		expect(
			computeClassicyWindowResize(
				"top-right",
				rect,
				[310, 20],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 30],
			),
		).toEqual({ size: [215, 190], position: [100, 30] }));
	it("a left grip stops at the viewport floor", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-left",
				rect,
				[2, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 30],
			),
		).toEqual({ size: [290, 165], position: [0, 100] }));
	// Unreachable from a real press: both limits bind only when a window drawn
	// at least its minimum starts with its edge past the floor (this rect's
	// content is 190 under a 400 minimum), and the release clamp forbids that
	// press rect. Were it reached, the clamp would still move the window onto
	// the floor after the release.
	it("the minimum wins when it and the floor both bind", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-left",
				rect,
				[2, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[400, 0],
				[0, 30],
			),
		).toEqual({ size: [290, 165], position: [-110, 100] }));
	it("bottom-right ignores the minimum and the floor", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[50, 20],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[300, 0],
				[0, 30],
			),
		).toEqual({ size: [55, 85], position: [100, 100] }));
});

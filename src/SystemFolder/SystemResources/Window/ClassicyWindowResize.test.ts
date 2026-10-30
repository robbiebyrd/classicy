import { describe, expect, it } from "vitest";
import {
	CLASSICY_WINDOW_RESIZE_FUDGE,
	type ClassicyWindowRect,
	computeClassicyWindowResize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";

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
});

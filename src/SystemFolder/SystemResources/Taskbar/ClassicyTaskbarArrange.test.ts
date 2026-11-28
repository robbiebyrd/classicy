import { describe, expect, it } from "vitest";
import {
	type ClassicyArrangeWindow,
	classicyArrangeMetrics,
	classicyCascadeRects,
	classicyTileGrid,
	classicyTileRects,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarArrange.internal";

// Plan 0020-w98 E1: Cascade Windows and Tile Windows, as Windows' own
// `CascadeWindows` and `TileWindows` lay them out (ReactOS
// `win32ss/user/user32/windows/mdi.c`), on a 1024 x 768 desktop less a
// 28 px taskbar.

const AREA = { left: 0, top: 0, right: 1024, bottom: 740 };
// Windows 98's caption metrics: SM_CXSIZE 18, SM_CXFRAME 4, one border.
const { step: STEP, minimum: MINIMUM } = classicyArrangeMetrics({
	titleBarHeight: 18,
	frame: 4,
	border: 1,
});

const window = (
	width: number,
	height: number,
	overrides: Partial<ClassicyArrangeWindow> = {},
): ClassicyArrangeWindow => ({
	rect: { left: 300, top: 200, width, height },
	sizable: true,
	minimum: [112, 27],
	...overrides,
});

describe("classicyArrangeMetrics", () => {
	it("is SM_CXSIZEFRAME plus SM_CXSIZE a step, and SM_CXMIN by SM_CYMIN the least window, Windows 98's 112 by 27", () => {
		expect(STEP).toEqual([22, 22]);
		expect(MINIMUM).toEqual([112, 27]);
	});

	it("rounds a theme's fractional lengths to whole pixels", () => {
		expect(
			classicyArrangeMetrics({ titleBarHeight: 19.8, frame: 4, border: 1 }),
		).toEqual({ step: [24, 24], minimum: [119, 29] });
	});

	it("follows the caption's metrics", () => {
		expect(
			classicyArrangeMetrics({ titleBarHeight: 24, frame: 5, border: 1 }),
		).toEqual({
			step: [29, 29],
			minimum: [4 * 24 + 4 * 7 + 2 * 5 + 4, 24 + 1 + 2 * 5],
		});
	});
});

describe("classicyCascadeRects", () => {
	it("cascades from the back window at the area's top-left, a step down and right each, the front one last", () => {
		const rects = classicyCascadeRects(
			[window(400, 300), window(400, 300), window(400, 300)],
			AREA,
			STEP,
		);
		// 4/7 of the area at least: 585 x 422.
		expect(rects).toEqual([
			{ left: 44, top: 44, width: 585, height: 422 },
			{ left: 22, top: 22, width: 585, height: 422 },
			{ left: 0, top: 0, width: 585, height: 422 },
		]);
	});

	it("holds a sizable window between 4/7 and 5/7 of the area, at its minimum, and leaves the others' sizes", () => {
		const rects = classicyCascadeRects(
			[
				window(1000, 700),
				window(100, 100, { minimum: [600, 27] }),
				window(100, 100, { sizable: false }),
			],
			AREA,
			STEP,
		);
		expect(rects[0]).toMatchObject({ width: 731, height: 528 });
		expect(rects[1]).toMatchObject({ width: 600, height: 422 });
		expect(rects[2]).toMatchObject({ width: 100, height: 100 });
	});

	it("leaves a lone window's size and moves it to the area's top-left", () => {
		expect(classicyCascadeRects([window(400, 300)], AREA, STEP)).toEqual([
			{ left: 0, top: 0, width: 400, height: 300 },
		]);
	});

	it("starts again from the area's left or top when a window would cross its edge", () => {
		const fixed = (height: number) => window(300, height, { sizable: false });
		const rects = classicyCascadeRects(
			[fixed(370), fixed(370), fixed(370)],
			{ left: 0, top: 20, right: 500, bottom: 420 },
			STEP,
		);
		expect(rects.map((r) => [r.left, r.top])).toEqual([
			[44, 20],
			[22, 42],
			[0, 20],
		]);
	});
});

describe("classicyTileGrid", () => {
	it("tiles horizontally in one column while each row stays three SM_CYMIN tall", () => {
		expect(classicyTileGrid(3, AREA, MINIMUM, "horizontally")).toEqual({
			rows: 3,
			columns: 1,
			cell: [1024, 246],
		});
		// Ten rows would be 74 tall: two columns of five.
		expect(classicyTileGrid(10, AREA, MINIMUM, "horizontally")).toEqual({
			rows: 5,
			columns: 2,
			cell: [512, 148],
		});
	});

	it("tiles vertically in one row while each column stays two SM_CXMIN wide", () => {
		expect(classicyTileGrid(3, AREA, MINIMUM, "vertically")).toEqual({
			rows: 1,
			columns: 3,
			cell: [341, 740],
		});
		// Five columns would be 204 wide: two rows of three.
		expect(classicyTileGrid(5, AREA, MINIMUM, "vertically")).toEqual({
			rows: 2,
			columns: 3,
			cell: [341, 370],
		});
	});
});

describe("classicyTileRects", () => {
	it("stacks the windows from the back, the front one in the last cell, horizontally", () => {
		const rects = classicyTileRects(
			[window(400, 300), window(400, 300), window(400, 300)],
			AREA,
			MINIMUM,
			"horizontally",
		);
		expect(rects).toEqual([
			{ left: 0, top: 492, width: 1024, height: 246 },
			{ left: 0, top: 246, width: 1024, height: 246 },
			{ left: 0, top: 0, width: 1024, height: 246 },
		]);
	});

	it("sets them side by side, filling each row, vertically", () => {
		const rects = classicyTileRects(
			[
				window(400, 300),
				window(400, 300),
				window(400, 300),
				window(400, 300),
				window(400, 300),
			],
			AREA,
			MINIMUM,
			"vertically",
		);
		expect(rects.map((r) => [r.left, r.top])).toEqual([
			[341, 370],
			[0, 370],
			[682, 0],
			[341, 0],
			[0, 0],
		]);
	});

	it("keeps a window that does not size at its size, and a sizable one at its minimum", () => {
		const rects = classicyTileRects(
			[
				window(100, 80, { sizable: false }),
				window(100, 80, { minimum: [900, 27] }),
			],
			AREA,
			MINIMUM,
			"vertically",
		);
		expect(rects).toEqual([
			{ left: 512, top: 0, width: 100, height: 80 },
			{ left: 0, top: 0, width: 900, height: 740 },
		]);
	});
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ClassicyWindowRect,
	type ClassicyWindowSizingEdges,
	computeClassicyWindowEdgeResize,
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

// Plan 0020-w98 §2 "Sizing": the largest right/bottom a moving far edge may
// reach, measured as the release clamp measures (left or top plus the
// content size). ClassicyWindow passes the taskbar's top while one is
// mounted, so a grow-box drag into the taskbar stops at its top.
describe("computeClassicyWindowResize's ceiling", () => {
	const corners = [
		"bottom-right",
		"bottom-left",
		"top-right",
		"top-left",
	] as const;

	// Every case above passes no ceiling; the default sets no limit, so it
	// gives the same numbers as one that is not passed.
	it.each(corners)("an unlimited ceiling changes nothing (%s)", (corner) => {
		for (const pointer of [
			[310, 260],
			[110, 110],
			[2, 900],
			[5000, 5000],
		] as [number, number][]) {
			expect(
				computeClassicyWindowResize(
					corner,
					rect,
					pointer,
					chrome,
					CLASSICY_WINDOW_RESIZE_FUDGE,
					[0, 0],
					[0, 30],
					[Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
				),
			).toEqual(
				computeClassicyWindowResize(
					corner,
					rect,
					pointer,
					chrome,
					CLASSICY_WINDOW_RESIZE_FUDGE,
					[0, 0],
					[0, 30],
				),
			);
		}
	});

	it("stops the bottom edge at the ceiling", () =>
		// A drag to y 900 into a 28 px taskbar at the bottom of 768: the top
		// (100) plus the size reaches 740, the taskbar's top, and no further.
		expect(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[310, 900],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[Number.POSITIVE_INFINITY, 740],
			),
		).toEqual({ size: [215, 640], position: [100, 100] }));

	it("stops the right edge at the ceiling", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[900, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[600, Number.POSITIVE_INFINITY],
			),
		).toEqual({ size: [500, 165], position: [100, 100] }));

	it("leaves a drag that stays inside it alone", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[310, 260],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[Number.POSITIVE_INFINITY, 740],
			),
		).toEqual({ size: [215, 165], position: [100, 100] }));

	it("stops only the far edge an axis moves (bottom-left)", () =>
		// The bottom edge moves and stops at 740; across, the left edge
		// moves, so the right edge's ceiling of 200 does not apply.
		expect(
			computeClassicyWindowResize(
				"bottom-left",
				rect,
				[110, 900],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[200, 740],
			),
		).toEqual({ size: [195, 640], position: [95, 100] }));

	it("a top grip ignores the ceiling (the bottom edge is the anchor)", () =>
		expect(
			computeClassicyWindowResize(
				"top-left",
				rect,
				[110, 110],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[0, 0],
			),
		).toEqual({ size: [195, 145], position: [95, 75] }));

	it("never gives a negative size for a press already past the ceiling", () =>
		expect(
			computeClassicyWindowResize(
				"bottom-right",
				rect,
				[310, 900],
				chrome,
				CLASSICY_WINDOW_RESIZE_FUDGE,
				[0, 0],
				[0, 0],
				[Number.POSITIVE_INFINITY, 80],
			),
		).toEqual({ size: [215, 0], position: [100, 100] }));
});

// Plan 0020-w98 §5 "Frame-edge sizing" (`layout.window.frameEdges:
// "resize"`; WIG Ch.6 "Sizing Borders", p.83): the named edges move by the
// pointer's travel since the press, the others stay. The same rect as above:
// its content is 190 x 120 (the rect less the chrome).
describe("computeClassicyWindowEdgeResize", () => {
	const INF = Number.POSITIVE_INFINITY;
	const edge = (
		edges: ClassicyWindowSizingEdges,
		from: [number, number],
		to: [number, number],
		minimum?: [number, number],
		floor?: [number, number],
		ceiling?: [number, number],
		maximum?: [number, number],
	) =>
		computeClassicyWindowEdgeResize(
			edges,
			rect,
			from,
			to,
			chrome,
			minimum,
			floor,
			ceiling,
			maximum,
		);

	// Each edge alone: the opposite edge and the other axis stay put, and a
	// left or top edge follows the pointer exactly (pressed on the frame's
	// outer pixel, the window's outer left or top lands under it).
	it.each<
		[
			ClassicyWindowSizingEdges,
			[number, number],
			[number, number],
			{ size: [number, number]; position: [number, number] },
		]
	>([
		[
			"right",
			[300, 175],
			[340, 200],
			{ size: [230, 120], position: [100, 100] },
		],
		["left", [100, 175], [60, 150], { size: [230, 120], position: [60, 100] }],
		[
			"bottom",
			[200, 250],
			[230, 300],
			{ size: [190, 170], position: [100, 100] },
		],
		["top", [200, 100], [170, 70], { size: [190, 150], position: [100, 70] }],
	])("the %s edge moves alone", (edges, from, to, expected) =>
		expect(edge(edges, from, to)).toEqual(expected));

	// Each corner moves both of its edges; the opposite corner stays.
	it.each<
		[
			ClassicyWindowSizingEdges,
			[number, number],
			[number, number],
			{ size: [number, number]; position: [number, number] },
		]
	>([
		[
			"top-left",
			[100, 100],
			[80, 90],
			{ size: [210, 130], position: [80, 90] },
		],
		[
			"top-right",
			[300, 100],
			[320, 90],
			{ size: [210, 130], position: [100, 90] },
		],
		[
			"bottom-left",
			[100, 250],
			[80, 260],
			{ size: [210, 130], position: [80, 100] },
		],
		[
			"bottom-right",
			[300, 250],
			[320, 260],
			{ size: [210, 130], position: [100, 100] },
		],
	])("the %s corner moves both its edges", (edges, from, to, expected) =>
		expect(edge(edges, from, to)).toEqual(expected));

	it("a press that never moves keeps the rect", () => {
		for (const edges of [
			"top",
			"right",
			"bottom",
			"left",
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right",
		] as const)
			expect(edge(edges, [150, 150], [150, 150])).toEqual({
				size: [190, 120],
				position: [100, 100],
			});
	});

	it("moves by whole pixels", () => {
		expect(edge("right", [300, 175], [310.4, 175]).size).toEqual([200, 120]);
		expect(edge("left", [100, 175], [89.4, 175])).toEqual({
			size: [201, 120],
			position: [89, 100],
		});
	});

	describe("the minimum", () => {
		it("stops a left edge where the content reaches it, the right edge kept", () =>
			expect(edge("left", [100, 175], [200, 175], [150, 0])).toEqual({
				size: [150, 120],
				position: [140, 100],
			}));
		it("stops a right edge", () =>
			expect(edge("right", [300, 175], [150, 175], [150, 0])).toEqual({
				size: [150, 120],
				position: [100, 100],
			}));
		it("stops a top edge, the bottom edge kept", () =>
			expect(edge("top", [200, 100], [200, 200], [0, 100])).toEqual({
				size: [190, 100],
				position: [100, 120],
			}));
		it("stops a bottom edge", () =>
			expect(edge("bottom", [200, 250], [200, 120], [0, 100])).toEqual({
				size: [190, 100],
				position: [100, 100],
			}));
		it("never gives a negative size with no minimum", () => {
			expect(edge("right", [300, 175], [0, 175])).toEqual({
				size: [0, 120],
				position: [100, 100],
			});
			expect(edge("top", [200, 100], [200, 600])).toEqual({
				size: [190, 0],
				position: [100, 220],
			});
		});
	});

	describe("the floor", () => {
		it("stops a top edge at the menu bar's underside", () =>
			expect(edge("top", [200, 100], [200, 10], [0, 0], [0, 30])).toEqual({
				size: [190, 190],
				position: [100, 30],
			}));
		it("stops a left edge at the screen's left", () =>
			expect(edge("left", [100, 175], [-50, 175], [0, 0], [0, 30])).toEqual({
				size: [290, 120],
				position: [0, 100],
			}));
		it("leaves a right or bottom edge alone", () =>
			expect(
				edge("bottom-right", [300, 250], [320, 260], [0, 0], [500, 500]),
			).toEqual({ size: [210, 130], position: [100, 100] }));
		// Reached only by a window stored below its minimum: the release
		// clamp keeps every stored rect above the floor.
		it("gives way to the minimum", () =>
			expect(edge("left", [100, 175], [2, 175], [400, 0], [0, 30])).toEqual({
				size: [400, 120],
				position: [-110, 100],
			}));
	});

	// Measured as the release clamp measures (the left or top plus the
	// content size), so the clamp never moves the window after the release.
	describe("the ceiling", () => {
		it("stops a bottom edge at the taskbar's top", () =>
			expect(
				edge("bottom", [200, 250], [200, 900], [0, 0], [0, 0], [INF, 740]),
			).toEqual({ size: [190, 640], position: [100, 100] }));
		it("stops a right edge at the work area's right", () =>
			expect(
				edge("right", [300, 175], [900, 175], [0, 0], [0, 0], [600, INF]),
			).toEqual({ size: [500, 120], position: [100, 100] }));
		it("leaves a left or top edge alone", () =>
			expect(
				edge("top-left", [100, 100], [80, 90], [0, 0], [0, 0], [0, 0]),
			).toEqual({ size: [210, 130], position: [80, 90] }));
		it("never gives a negative size for a press already past it", () =>
			expect(
				edge("bottom", [200, 250], [200, 900], [0, 0], [0, 0], [INF, 80]),
			).toEqual({ size: [190, 0], position: [100, 100] }));
		it("gives way to the minimum", () =>
			expect(
				edge("right", [300, 175], [900, 175], [150, 0], [0, 0], [200, INF]),
			).toEqual({ size: [150, 120], position: [100, 100] }));
		it("an unlimited ceiling changes nothing", () =>
			expect(
				edge(
					"bottom-right",
					[300, 250],
					[5000, 5000],
					[0, 0],
					[0, 0],
					[INF, INF],
				),
			).toEqual(edge("bottom-right", [300, 250], [5000, 5000])));
	});

	// The content size CSS draws at most: past it the drawn window would stop
	// and a fixed edge move, so the moving edge stops instead.
	describe("the maximum", () => {
		it("stops a bottom edge", () =>
			expect(
				edge(
					"bottom",
					[200, 250],
					[200, 400],
					[0, 0],
					[0, 0],
					[INF, INF],
					[INF, 200],
				),
			).toEqual({ size: [190, 200], position: [100, 100] }));
		it("stops a top edge with the bottom edge kept", () =>
			expect(
				edge(
					"top",
					[200, 100],
					[200, 0],
					[0, 0],
					[0, 0],
					[INF, INF],
					[INF, 200],
				),
			).toEqual({ size: [190, 200], position: [100, 20] }));
		it("gives way to the minimum, as CSS's min-height beats max-height", () =>
			expect(
				edge(
					"bottom",
					[200, 250],
					[200, 400],
					[0, 300],
					[0, 0],
					[INF, INF],
					[INF, 200],
				),
			).toEqual({ size: [190, 300], position: [100, 100] }));
	});

	it("never reads a negative start size off a rect smaller than its chrome", () =>
		expect(
			computeClassicyWindowEdgeResize(
				"right",
				{ left: 0, top: 0, right: 5, bottom: 5 },
				[5, 2],
				[25, 2],
				[10, 30],
			),
		).toEqual({ size: [20, 0], position: [0, 0] }));
});

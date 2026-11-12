import { describe, expect, it } from "vitest";
import {
	type ClassicyScrollBarsInput,
	classicyScrollAxisFits,
	classicyScrollPositionForThumb,
	computeClassicyScrollBars,
	computeClassicyScrollThumb,
} from "./ClassicyScrollAreaMetrics";

describe("computeClassicyScrollThumb (Chromium's thumb rules)", () => {
	it("is as long as the visible share of the track, rounded", () => {
		// 200 of 1000 visible in a 166 px track: 33.2 → 33.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: 0 },
				166,
				0,
			),
		).toEqual({ length: 33, offset: 0 });
		// 33.5 rounds up.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 335, position: 0 },
				100,
				0,
			).length,
		).toBe(34);
	});

	it("is never shorter than its minimum, nor longer than the track", () => {
		expect(
			computeClassicyScrollThumb(
				{ total: 100000, visible: 100, position: 0 },
				166,
				12,
			).length,
		).toBe(12);
		expect(
			computeClassicyScrollThumb(
				{ total: 101, visible: 100, position: 0 },
				10,
				12,
			).length,
		).toBe(10);
	});

	// A package's fixed box (System 7's 16 px scroll box): a maximum as long
	// as the minimum, whatever share of the content is visible. As in CSS,
	// the minimum wins over a smaller maximum.
	it("is never longer than its maximum, which the minimum overrides", () => {
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 800, position: 0 },
				166,
				16,
				16,
			).length,
		).toBe(16);
		expect(
			computeClassicyScrollThumb(
				{ total: 100000, visible: 100, position: 0 },
				166,
				16,
				16,
			).length,
		).toBe(16);
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 800, position: 0 },
				166,
				20,
				16,
			).length,
		).toBe(20);
		// No maximum: the visible share.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 800, position: 0 },
				166,
				16,
			).length,
		).toBe(133);
	});

	it("travels the whole track with a fixed box", () => {
		// travel 150 over a range of 200: 100 → 75; at the end, 150.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 800, position: 100 },
				166,
				16,
				16,
			).offset,
		).toBe(75);
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 800, position: 200 },
				166,
				16,
				16,
			),
		).toEqual({ length: 16, offset: 150 });
	});

	it("moves with the scroll position, truncated to whole pixels", () => {
		// travel 133 over a range of 800: 400 → 66.5 → 66.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: 400 },
				166,
				0,
			).offset,
		).toBe(66);
		// At the end it touches the track's end.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: 800 },
				166,
				0,
			),
		).toEqual({ length: 33, offset: 133 });
	});

	it("leaves the start as soon as the content has scrolled at all", () => {
		// 1 px of 800 is 0.17 px of travel: drawn 1 px in, never at 0.
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: 1 },
				166,
				0,
			).offset,
		).toBe(1);
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: 0 },
				166,
				0,
			).offset,
		).toBe(0);
	});

	it("draws no thumb when the content fits", () => {
		expect(
			computeClassicyScrollThumb(
				{ total: 200, visible: 200, position: 0 },
				166,
				12,
			),
		).toEqual({ length: 0, offset: 0 });
		expect(
			classicyScrollAxisFits({ total: 200, visible: 200, position: 0 }),
		).toBe(true);
		expect(
			classicyScrollAxisFits({ total: 201, visible: 200, position: 0 }),
		).toBe(false);
	});

	it("ignores a negative (elastic) scroll position", () => {
		expect(
			computeClassicyScrollThumb(
				{ total: 1000, visible: 200, position: -30 },
				166,
				0,
			).offset,
		).toBe(0);
	});
});

describe("classicyScrollPositionForThumb", () => {
	it("maps a thumb offset back to a scroll position, clamped", () => {
		const axis = { total: 1000, visible: 200 };
		expect(classicyScrollPositionForThumb(axis, 166, 33, 66.5)).toBe(400);
		expect(classicyScrollPositionForThumb(axis, 166, 33, -10)).toBe(0);
		expect(classicyScrollPositionForThumb(axis, 166, 33, 500)).toBe(800);
		expect(
			classicyScrollPositionForThumb({ total: 200, visible: 200 }, 166, 0, 50),
		).toBe(0);
	});
});

describe("computeClassicyScrollBars", () => {
	const base: ClassicyScrollBarsInput = {
		vertical: "auto",
		horizontal: "auto",
		paired: false,
		shown: { vertical: false, horizontal: false },
		size: { vertical: 17, horizontal: 17 },
		scrollWidth: 300,
		scrollHeight: 200,
		clientWidth: 300,
		clientHeight: 200,
	};

	it("draws no bar while the content fits", () => {
		expect(computeClassicyScrollBars(base)).toEqual({
			vertical: false,
			horizontal: false,
		});
	});

	it("draws the bar of the axis that overflows", () => {
		expect(
			computeClassicyScrollBars({
				...base,
				scrollHeight: 201,
				scrollWidth: 250,
			}),
		).toEqual({
			vertical: true,
			horizontal: false,
		});
		expect(
			computeClassicyScrollBars({
				...base,
				scrollWidth: 301,
				scrollHeight: 150,
			}),
		).toEqual({
			vertical: false,
			horizontal: true,
		});
	});

	it("draws the other bar too when one bar narrows the box below its content", () => {
		// 290 wide fits 300, but not 300 - 17 once the vertical bar is drawn.
		expect(
			computeClassicyScrollBars({
				...base,
				scrollHeight: 400,
				scrollWidth: 290,
			}),
		).toEqual({ vertical: true, horizontal: true });
		expect(
			computeClassicyScrollBars({
				...base,
				scrollHeight: 400,
				scrollWidth: 280,
			}),
		).toEqual({ vertical: true, horizontal: false });
	});

	it("draws the vertical bar when the horizontal one leaves the content too short a box", () => {
		// 190 high fits 200, but not 200 - 17 under the horizontal bar.
		expect(
			computeClassicyScrollBars({
				...base,
				scrollWidth: 400,
				scrollHeight: 190,
			}),
		).toEqual({ vertical: true, horizontal: true });
		expect(
			computeClassicyScrollBars({
				...base,
				scrollWidth: 400,
				scrollHeight: 180,
			}),
		).toEqual({ vertical: false, horizontal: true });
	});

	it("measures against the whole box: a drawn bar's room is given back", () => {
		// Measured with the vertical bar drawn (client 283 wide, 200 high):
		// 200 of content fits the box's 200, so the bar goes.
		expect(
			computeClassicyScrollBars({
				...base,
				shown: { vertical: true, horizontal: false },
				clientWidth: 283,
				scrollWidth: 283,
			}),
		).toEqual({ vertical: false, horizontal: false });
		// Measured with both drawn (client 283x183), content 290x190 fits the
		// 300x200 box.
		expect(
			computeClassicyScrollBars({
				...base,
				shown: { vertical: true, horizontal: true },
				clientWidth: 283,
				clientHeight: 183,
				scrollWidth: 290,
				scrollHeight: 190,
			}),
		).toEqual({ vertical: false, horizontal: false });
	});

	it("pairs the bars: either overflowing draws both", () => {
		expect(
			computeClassicyScrollBars({ ...base, paired: true, scrollHeight: 400 }),
		).toEqual({ vertical: true, horizontal: true });
		expect(computeClassicyScrollBars({ ...base, paired: true })).toEqual({
			vertical: false,
			horizontal: false,
		});
	});

	it("follows always and never whatever the content", () => {
		expect(
			computeClassicyScrollBars({
				...base,
				vertical: "always",
				horizontal: "never",
				scrollWidth: 900,
			}),
		).toEqual({ vertical: true, horizontal: false });
		expect(
			computeClassicyScrollBars({
				...base,
				vertical: "never",
				paired: true,
				scrollWidth: 900,
			}),
		).toEqual({ vertical: false, horizontal: true });
	});
});

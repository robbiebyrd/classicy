import { describe, expect, it } from "vitest";
import { classicyBevelPopupPlacement } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";

// A 32 x 32 button at (100, 100) in an 800 x 600 viewport.
const button = { top: 100, bottom: 132, left: 100, right: 132 };
const viewport = { width: 800, height: 600 };
const menu = { width: 160, height: 120 };

describe("classicyBevelPopupPlacement (HIGOS8 p.32)", () => {
	it("opens directly below the button, left edges aligned", () => {
		expect(
			classicyBevelPopupPlacement(button, menu, viewport, "below"),
		).toEqual({ left: 100, top: 132 });
	});

	it("opens to the right of the button, top edges aligned", () => {
		expect(
			classicyBevelPopupPlacement(button, menu, viewport, "right"),
		).toEqual({ left: 132, top: 100 });
	});

	it("centres on the button when aligned to the centre, rounding right", () => {
		const slider = { width: 21, height: 77 };
		expect(
			classicyBevelPopupPlacement(button, slider, viewport, "below", "center"),
		).toEqual({ left: 106, top: 132 });
		expect(
			classicyBevelPopupPlacement(button, slider, viewport, "right", "center"),
		).toEqual({ left: 132, top: 78 });
	});

	it("flips above when there is no room below (Figure 2-16)", () => {
		const low = { top: 560, bottom: 592, left: 100, right: 132 };
		expect(classicyBevelPopupPlacement(low, menu, viewport, "below")).toEqual({
			left: 100,
			top: 440,
		});
	});

	it("flips left when there is no room to the right", () => {
		const right = { top: 100, bottom: 132, left: 700, right: 732 };
		expect(classicyBevelPopupPlacement(right, menu, viewport, "right")).toEqual(
			{ left: 540, top: 100 },
		);
	});

	it("clamps onto the screen when neither side fits", () => {
		const tall = { width: 160, height: 590 };
		const { top } = classicyBevelPopupPlacement(
			button,
			tall,
			viewport,
			"below",
		);
		expect(top).toBe(10);
		const nearRightEdge = { top: 100, bottom: 132, left: 760, right: 792 };
		expect(
			classicyBevelPopupPlacement(nearRightEdge, menu, viewport, "below").left,
		).toBe(640);
	});
});

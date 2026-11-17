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

	it("centers on the button when aligned to the center, rounding right", () => {
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

	// Across, a popup keeps to its desktop's span with its frame's shadow,
	// by the menu bar's rule (ClassicyMenuPlacement): below with no room on
	// the right, its right side under the button's right side, then pinned.
	describe("given the desktop's span across", () => {
		// A 640 px desktop at 20, in the 800 px viewport; a 1 px shadow.
		const across = { left: 20, right: 660, inkRight: 1 };
		const at = (left: number, right: number) => ({
			top: 100,
			bottom: 132,
			left,
			right,
		});

		it("keeps a popup below under the button's left side where it fits", () =>
			expect(
				classicyBevelPopupPlacement(
					at(400, 432),
					menu,
					viewport,
					"below",
					"start",
					across,
				),
			).toEqual({ left: 400, top: 132 }));

		it("hangs a popup below with its right side under the button's when it would pass the desktop's edge, shadow included", () => {
			// 500 + 160 fits the frame exactly; its shadow does not.
			expect(
				classicyBevelPopupPlacement(
					at(500, 532),
					menu,
					viewport,
					"below",
					"start",
					across,
				).left,
			).toBe(372);
		});

		it("pins a popup too wide for the room left of the button's right side", () => {
			const wide = { width: 600, height: 120 };
			expect(
				classicyBevelPopupPlacement(
					at(500, 532),
					wide,
					viewport,
					"below",
					"start",
					across,
				).left,
			).toBe(20);
		});

		it("flips a popup to the right to the button's left side at the desktop's edge", () =>
			expect(
				classicyBevelPopupPlacement(
					at(480, 512),
					menu,
					viewport,
					"right",
					"start",
					across,
				).left,
			).toBe(320));

		it("pins a centered popup inside the desktop", () =>
			expect(
				classicyBevelPopupPlacement(
					at(630, 662),
					menu,
					viewport,
					"below",
					"center",
					across,
				).left,
			).toBe(499));
	});
});

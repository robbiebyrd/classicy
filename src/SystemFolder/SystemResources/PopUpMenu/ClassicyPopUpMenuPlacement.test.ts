import { describe, expect, it } from "vitest";
import {
	classicyPopUpMenuPlacement,
	POPUP_MENU_MAX_HEIGHT,
	POPUP_MENU_VIEWPORT_MARGIN,
} from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement";

// The anchor is the pop-up button's viewport rect. A menu placed *below* grows
// downward from the button's top edge (the historical Platinum look, where the
// menu covers its button); a menu placed *above* grows upward from the button's
// bottom edge. So each side is measured from a different edge.
const anchor = (top: number, height = 20) => ({ top, bottom: top + height });

describe("classicyPopUpMenuPlacement", () => {
	it("stays below when the whole menu fits below", () => {
		const placement = classicyPopUpMenuPlacement(anchor(100), 200, 800);
		expect(placement.above).toBe(false);
		// Short content needs no clamping: the cap matches the content height.
		expect(placement.maxHeight).toBe(200);
	});

	it("flips above when the menu does not fit below and there is more room above", () => {
		// Button near the bottom of the viewport: 96px below, 716px above.
		const placement = classicyPopUpMenuPlacement(anchor(700), 400, 800);
		expect(placement.above).toBe(true);
		// Room above exceeds the design cap, so the cap is what applies.
		expect(placement.maxHeight).toBe(POPUP_MENU_MAX_HEIGHT);
	});

	it("stays below when it fits below even though above is roomier", () => {
		// 200px of content, 396px below, 416px above -> below still wins because
		// it fits. Direction only changes when it has to.
		const placement = classicyPopUpMenuPlacement(anchor(400), 200, 800);
		expect(placement.above).toBe(false);
	});

	it("does not flip a long list that is already capped and fits below", () => {
		// 40 items (~900px of content) but the menu renders at the 300px cap, and
		// 396px is available below -> it fits, so it must not flip.
		const placement = classicyPopUpMenuPlacement(anchor(100), 900, 500);
		expect(placement.above).toBe(false);
		expect(placement.maxHeight).toBe(POPUP_MENU_MAX_HEIGHT);
	});

	it("picks the roomier side and clamps when the capped menu fits neither", () => {
		// Tall content, tight viewport, button low -> 196px below, 316px above.
		const placement = classicyPopUpMenuPlacement(anchor(300), 900, 500);
		expect(placement.above).toBe(true);
		expect(placement.maxHeight).toBe(POPUP_MENU_MAX_HEIGHT);
	});

	it("clamps to the space available when even the roomier side is short", () => {
		// 150px below, 250px above, viewport 400 -> above wins, clamped under cap.
		const placement = classicyPopUpMenuPlacement(anchor(250), 900, 400);
		expect(placement.above).toBe(true);
		expect(placement.maxHeight).toBe(270 - POPUP_MENU_VIEWPORT_MARGIN);
		expect(placement.maxHeight).toBeLessThan(POPUP_MENU_MAX_HEIGHT);
	});

	it("never returns a negative or unusably small max height", () => {
		// Anchor scrolled entirely out of view below the fold.
		const placement = classicyPopUpMenuPlacement(anchor(2000), 400, 100);
		expect(placement.maxHeight).toBeGreaterThan(0);
	});
});

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

	it("grows (top is null) when there is no selection to align", () => {
		const placement = classicyPopUpMenuPlacement(anchor(100), 200, 800);
		expect(placement.top).toBeNull();
		expect(placement.scrollTop).toBe(0);
	});
});

describe("classicyPopUpMenuPlacement — aligned (selected item over the button)", () => {
	it("opens the selected item centred on the button", () => {
		// Button centre 110; selected row centre 50 -> menu top 60 lines them up.
		const placement = classicyPopUpMenuPlacement(anchor(100), 200, 800, {
			offsetTop: 40,
			height: 20,
		});
		expect(placement.top).toBe(60);
		expect(placement.maxHeight).toBe(200);
		expect(placement.scrollTop).toBe(0);
	});

	it("clamps to the viewport top and scrolls when the selection is near the end", () => {
		// Long list, selection deep: can't lift the menu that far, so pin it to the
		// top margin and scroll as far as the content allows.
		const placement = classicyPopUpMenuPlacement(anchor(100), 800, 800, {
			offsetTop: 760,
			height: 20,
		});
		expect(placement.top).toBe(POPUP_MENU_VIEWPORT_MARGIN);
		expect(placement.maxHeight).toBe(POPUP_MENU_MAX_HEIGHT);
		// Scrolled to the bottom of the scrollable range (contentHeight - maxHeight).
		expect(placement.scrollTop).toBe(800 - POPUP_MENU_MAX_HEIGHT);
	});

	it("scrolls a long list so the selection still lands on the button", () => {
		// Button centre 410; selection centre 510; capped menu pinned to the top
		// (top=4) then scrolled 104px so 510 appears at 410.
		const placement = classicyPopUpMenuPlacement(anchor(400), 900, 800, {
			offsetTop: 500,
			height: 20,
		});
		expect(placement.top).toBe(POPUP_MENU_VIEWPORT_MARGIN);
		expect(placement.scrollTop).toBe(104);
		// The selection lands exactly on the button centre.
		expect((placement.top ?? 0) + 510 - placement.scrollTop).toBe(410);
	});

	it("keeps the whole menu on screen when the selection is at the very top", () => {
		// First item selected, button high: menu grows down from the button, no
		// scroll needed.
		const placement = classicyPopUpMenuPlacement(anchor(100), 150, 800, {
			offsetTop: 0,
			height: 20,
		});
		expect(placement.top).toBe(100); // button centre 110 - selection centre 10
		expect(placement.scrollTop).toBe(0);
		expect((placement.top ?? 0) + placement.maxHeight).toBeLessThanOrEqual(800);
	});
});

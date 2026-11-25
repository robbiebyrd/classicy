import { describe, expect, it } from "vitest";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import {
	CLASSICY_MOUSE_DRAG_THRESHOLD,
	classicyContextMenuOpensOnRelease,
	classicyIconDragThreshold,
	classicySecondaryButtonSelects,
	classicyTabSelectsOnPress,
	classicyTraveledPast,
	isClassicyGestureButton,
} from "./ClassicyMousePolicy";

// The press discipline, read from a layout: Mac OS 8's (the default layout,
// which declares none of the keys) and Windows 98's, as its package
// declares it (WIG Ch.4 "Mouse Actions", pp.24-25; Ch.5 "Selection with
// the Mouse", pp.37-38).
const mac = CLASSICY_DEFAULT_APPEARANCE_LAYOUT;
const windows = windows98.layout as ClassicyAppearanceLayout;

describe("isClassicyGestureButton", () => {
	it("lets every button start a gesture without `mouse` (today's rule)", () => {
		for (const button of [0, 1, 2, 3, 4])
			expect(isClassicyGestureButton({ button }, mac)).toBe(true);
		expect(isClassicyGestureButton({ button: 1 }, { mouse: "mac" })).toBe(true);
	});

	it('lets button 1 alone start one under `mouse` "windows"', () => {
		expect(isClassicyGestureButton({ button: 0 }, windows)).toBe(true);
		for (const button of [1, 2, 3, 4])
			expect(isClassicyGestureButton({ button }, windows)).toBe(false);
	});
});

describe("the icon drag threshold", () => {
	it('is Windows\' 4 px drag rectangle under `mouse` "windows", none otherwise', () => {
		expect(CLASSICY_MOUSE_DRAG_THRESHOLD).toBe(4);
		expect(classicyIconDragThreshold(windows)).toBe(4);
		expect(classicyIconDragThreshold(mac)).toBe(0);
		expect(classicyIconDragThreshold({ mouse: "mac" })).toBe(0);
	});

	it("measures the distance from the press as the crow flies", () => {
		expect(classicyTraveledPast([10, 10], [13, 10], 4)).toBe(false);
		expect(classicyTraveledPast([10, 10], [14, 10], 4)).toBe(true);
		// 3 px across and 3 down is 4.24 px away: past it, as Math.hypot has it.
		expect(classicyTraveledPast([10, 10], [13, 13], 4)).toBe(true);
		expect(classicyTraveledPast([10, 10], [12, 12], 4)).toBe(false);
		// No threshold: the first move is past it, even one that stays put.
		expect(classicyTraveledPast([10, 10], [10, 10], 0)).toBe(true);
	});
});

describe("the layout's other mouse rules", () => {
	it('selects a tab at the press under `mouse` "windows" only', () => {
		expect(classicyTabSelectsOnPress(windows)).toBe(true);
		expect(classicyTabSelectsOnPress(mac)).toBe(false);
	});

	it('lets button 2 select under `selection.secondaryButton` "select" only', () => {
		expect(classicySecondaryButtonSelects(windows)).toBe(true);
		expect(classicySecondaryButtonSelects(mac)).toBe(false);
		expect(
			classicySecondaryButtonSelects({
				selection: { secondaryButton: "menu" },
			}),
		).toBe(false);
	});

	it('holds a menu for the release under `contextMenu.openOn` "release" only', () => {
		expect(classicyContextMenuOpensOnRelease(windows)).toBe(true);
		expect(classicyContextMenuOpensOnRelease(mac)).toBe(false);
		expect(
			classicyContextMenuOpensOnRelease({ contextMenu: { openOn: "event" } }),
		).toBe(false);
	});
});

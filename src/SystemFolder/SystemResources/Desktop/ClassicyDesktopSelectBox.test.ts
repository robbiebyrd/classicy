import { describe, expect, it } from "vitest";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import { classicyDesktopSelectPress } from "./ClassicyDesktopSelectBox.internal";

// What a press on the desktop's empty area does: today's rule without the
// keys (Mac OS 8), Windows 98's with them (WIG Ch.4 "Mouse Actions",
// pp.24-25; Ch.5 "Selection with the Mouse", pp.37-38; App. A Table A.1,
// p.349), and each key alone.
const press = (button: number) => ({
	button,
	shiftKey: false,
	ctrlKey: false,
	metaKey: false,
});
const mac = CLASSICY_DEFAULT_APPEARANCE_LAYOUT;
const windows = windows98.layout as ClassicyAppearanceLayout;
const select = {
	action: "select",
	clearIcons: true,
	deferMenu: false,
	keep: "none",
};
const menu = {
	action: "menu",
	clearIcons: false,
	deferMenu: false,
	keep: "none",
};
const ignore = {
	action: "ignore",
	clearIcons: false,
	deferMenu: false,
	keep: "none",
};

describe("classicyDesktopSelectPress", () => {
	it("keeps today's rule without the keys: buttons 1 and the middle select, the others open the menu at the press", () => {
		expect(classicyDesktopSelectPress(press(0), mac)).toEqual(select);
		expect(classicyDesktopSelectPress(press(1), mac)).toEqual(select);
		for (const button of [2, 3, 4])
			expect(classicyDesktopSelectPress(press(button), mac)).toEqual(menu);
	});

	it("selects with button 2 as with button 1 under Windows 98, the menu left to the release", () => {
		expect(classicyDesktopSelectPress(press(0), windows)).toEqual(select);
		expect(classicyDesktopSelectPress(press(2), windows)).toEqual({
			...select,
			deferMenu: true,
		});
	});

	it("ignores the middle button and the others under Windows 98", () => {
		for (const button of [1, 3, 4])
			expect(classicyDesktopSelectPress(press(button), windows)).toEqual(
				ignore,
			);
	});

	it("follows each key alone", () => {
		// Button 2 selects, the menu at the event (no openOn).
		expect(
			classicyDesktopSelectPress(press(2), {
				selection: { secondaryButton: "select" },
			}),
		).toEqual(select);
		// The menu deferred to the release, button 2 still the menu's.
		expect(
			classicyDesktopSelectPress(press(2), {
				contextMenu: { openOn: "release" },
			}),
		).toEqual({ ...menu, deferMenu: true });
		// Windows' buttons alone: button 2 opens the menu at the press.
		expect(classicyDesktopSelectPress(press(2), { mouse: "windows" })).toEqual(
			menu,
		);
		expect(classicyDesktopSelectPress(press(1), { mouse: "windows" })).toEqual(
			ignore,
		);
	});

	it("never keeps the selection under a modifier (no rule tells Shift and Ctrl apart)", () => {
		expect(
			classicyDesktopSelectPress(
				{ button: 0, shiftKey: true, ctrlKey: true, metaKey: true },
				windows,
			).keep,
		).toBe("none");
	});
});

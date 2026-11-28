import { describe, expect, it } from "vitest";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import {
	classicyDesktopBoxSelection,
	classicyDesktopIconSelectMode,
	classicyDesktopSelectPress,
} from "./ClassicyDesktopSelectBox.internal";

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

	// A Shift or Control rectangle keeps the selection it starts from (WIG
	// Ch.5 "Region Selection", p.42; App. A Table A.2, p.351, Table A.3,
	// pp.354-355; the audit's 5.11 / A.7), either button.
	it("keeps the selection under Shift (a union) and Control or ⌘ (a toggle) under Windows 98", () => {
		const mods = (
			button: number,
			m: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
		) => ({ ...press(button), ...m });
		for (const button of [0, 2]) {
			const deferMenu = button === 2;
			expect(
				classicyDesktopSelectPress(mods(button, { shiftKey: true }), windows),
			).toEqual({ ...select, clearIcons: false, deferMenu, keep: "union" });
			for (const m of [
				{ ctrlKey: true },
				{ metaKey: true },
				{ ctrlKey: true, shiftKey: true },
				{ metaKey: true, shiftKey: true },
			])
				expect(classicyDesktopSelectPress(mods(button, m), windows)).toEqual({
					...select,
					clearIcons: false,
					deferMenu,
					keep: "toggle",
				});
		}
		// The ignored buttons stay ignored, modified or not.
		expect(
			classicyDesktopSelectPress(mods(1, { shiftKey: true }), windows),
		).toEqual(ignore);
	});

	it("never keeps the selection without the modifiers key", () => {
		const modified = {
			button: 0,
			shiftKey: true,
			ctrlKey: true,
			metaKey: true,
		};
		expect(classicyDesktopSelectPress(modified, mac)).toEqual(select);
		expect(
			classicyDesktopSelectPress(
				{ ...modified, ctrlKey: false, metaKey: false },
				mac,
			),
		).toEqual(select);
		// The other Windows keys alone keep nothing either.
		expect(
			classicyDesktopSelectPress(modified, {
				...windows,
				selection: { ...windows.selection, modifiers: "mac" },
			}),
		).toEqual(select);
	});
});

describe("classicyDesktopBoxSelection", () => {
	const base = ["A", "B", "C"];

	it("replaces the selection with what the rectangle covers under keep none", () => {
		expect(classicyDesktopBoxSelection(base, ["C", "D"], "none")).toEqual([
			"C",
			"D",
		]);
		expect(classicyDesktopBoxSelection(base, [], "none")).toEqual([]);
	});

	it("adds what it covers to the selection under a union (Shift)", () => {
		expect(classicyDesktopBoxSelection(base, ["C", "D", "E"], "union")).toEqual(
			["A", "B", "C", "D", "E"],
		);
		// What the rectangle leaves goes back to the press's selection.
		expect(classicyDesktopBoxSelection(base, [], "union")).toEqual(base);
	});

	it("toggles each covered icon without the first covered icon's state (Control)", () => {
		expect(classicyDesktopBoxSelection(base, ["B", "D"], "toggle")).toEqual([
			"A",
			"C",
			"D",
		]);
		expect(classicyDesktopBoxSelection(base, [], "toggle")).toEqual(base);
	});

	it("sets every covered icon to the first covered icon's toggled state (App. A note 4)", () => {
		// The first covered icon was selected: the rectangle deselects all
		// it covers, D (unselected) staying so.
		expect(
			classicyDesktopBoxSelection(base, ["B", "D"], "toggle", true),
		).toEqual(["A", "C"]);
		// It was not: the rectangle selects all it covers, B staying so.
		expect(
			classicyDesktopBoxSelection(base, ["D", "B"], "toggle", false),
		).toEqual(["A", "B", "C", "D"]);
	});
});

describe("classicyDesktopIconSelectMode", () => {
	const click = (m: {
		button?: number;
		shiftKey?: boolean;
		ctrlKey?: boolean;
		metaKey?: boolean;
	}) => ({ ...press(m.button ?? 0), ...m });

	it("maps Control or ⌘ to toggle, Shift to range, both to addRange under Windows 98", () => {
		expect(
			classicyDesktopIconSelectMode(click({ ctrlKey: true }), windows),
		).toBe("toggle");
		expect(
			classicyDesktopIconSelectMode(click({ metaKey: true }), windows),
		).toBe("toggle");
		expect(
			classicyDesktopIconSelectMode(click({ shiftKey: true }), windows),
		).toBe("range");
		expect(
			classicyDesktopIconSelectMode(
				click({ ctrlKey: true, shiftKey: true }),
				windows,
			),
		).toBe("addRange");
		expect(
			classicyDesktopIconSelectMode(
				click({ metaKey: true, shiftKey: true }),
				windows,
			),
		).toBe("addRange");
	});

	it("gives no mode for a plain press, another button, or without the key", () => {
		expect(classicyDesktopIconSelectMode(click({}), windows)).toBeNull();
		expect(
			classicyDesktopIconSelectMode(
				click({ button: 2, ctrlKey: true }),
				windows,
			),
		).toBeNull();
		for (const m of [
			{ ctrlKey: true },
			{ shiftKey: true },
			{ ctrlKey: true, shiftKey: true },
		])
			expect(classicyDesktopIconSelectMode(click(m), mac)).toBeNull();
	});
});

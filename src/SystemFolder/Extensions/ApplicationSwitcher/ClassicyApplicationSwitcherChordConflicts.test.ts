import { describe, expect, it } from "vitest";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { checkKeyboardEquivalent } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";
import {
	classicyAppMenuEquivalentsInUse,
	classicyAppSwitcherChordConflicts,
} from "./ClassicyApplicationSwitcherChordConflicts";

const app = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: "",
	windows: {},
	open: true,
	data: {},
	...extra,
});
const menu = (title: string, keyboardShortcut: string) => [
	{
		id: "m",
		title: "File",
		menuChildren: [{ id: title, title, keyboardShortcut }],
	},
];
const withWindow = (items: ReturnType<typeof menu>, closed = false) => ({
	main: {
		id: "main",
		closed,
		size: [10, 10] as [number, number],
		position: [0, 0] as [number, number],
		minimumSize: [0, 0] as [number, number],
		menuBar: items,
	},
});

describe("the chords a switching chord may not be", () => {
	it("gathers every open application's menu equivalents, named with the application", () => {
		const found = classicyAppMenuEquivalentsInUse({
			apps: {
				"Calc.app": app("Calc.app", {
					windows: withWindow(menu("Quit", "⌥Q")),
				}),
				// A closed window's menus come back with it.
				"Text.app": app("Text.app", {
					windows: withWindow(menu("Save", "⌘S"), true),
				}),
				"Gone.app": app("Gone.app", {
					open: false,
					windows: withWindow(menu("Print", "⌘P")),
				}),
				"Writer.app": app("Writer.app"),
			},
			frontAppId: "Calc.app",
			frontMenu: menu("Clear", "⌥K"),
			appChords: {
				"Writer.app": ["control+n", "option+q"],
				"Gone.app": ["control+z"],
			},
			overrides: { "Calc.app": { name: "Calculator" } },
		});
		expect(found).toEqual([
			{ shortcut: "⌥K", name: "Clear in Calculator" },
			{ shortcut: "⌥Q", name: "Quit in Calculator" },
			{ shortcut: "⌘S", name: "Save in Text" },
			// Only what no menu above names; a closed application is out.
			{ shortcut: "control+n", name: "a menu command of Writer" },
		]);
	});

	it("names the desktop when no application is in front", () => {
		expect(
			classicyAppMenuEquivalentsInUse({
				apps: {},
				frontMenu: menu("Empty Trash", "⌃⌫"),
			}),
		).toEqual([{ shortcut: "⌃⌫", name: "Empty Trash in the desktop" }]);
	});

	it("counts Control and Command as one, and an equivalent with Shift against the chord without it", () => {
		const conflicts = classicyAppSwitcherChordConflicts([
			{ shortcut: "⌘N", name: "New" },
			{ shortcut: "⇧⌘S", name: "Save As" },
			{ shortcut: "⌥Q", name: "Quit" },
			{ shortcut: "⌃⌥⌫", name: "Erase" },
		]);
		const refuses = (chord: string) =>
			checkKeyboardEquivalent(chord, {
				inUse: conflicts,
				requireCommandKey: false,
			})?.label;
		expect(refuses("⌃N")).toMatch(/“New”/);
		expect(refuses("⌘N")).toMatch(/“New”/);
		expect(refuses("⌃⌘N")).toMatch(/“New”/);
		expect(refuses("⌃S")).toMatch(/“Save As, with Shift”/);
		expect(refuses("⌥Q")).toMatch(/“Quit”/);
		expect(refuses("⌃⌥⌫")).toMatch(/“Erase”/);
		expect(refuses("⌘⌥⌫")).toMatch(/“Erase”/);
		// Other modifiers, other keys: free.
		expect(refuses("⌥N")).toBeUndefined();
		expect(refuses("⌃Q")).toBeUndefined();
		expect(refuses("⌃⌫")).toBeUndefined();
	});
});

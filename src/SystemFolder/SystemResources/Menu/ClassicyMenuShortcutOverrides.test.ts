import { describe, expect, it } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	collectMenuChords,
	findMenuItemByShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	classicyEditableShortcuts,
	classicyShortcutFromChord,
	classicyShortcutOverrideChord,
	isClassicyShortcutOverrideId,
	resolveClassicyMenuItemShortcut,
	validClassicyShortcutOverrides,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuShortcutOverrides";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The user's own shortcuts for the bundled apps (the remaining chapters'
// audit's 4.15; WIG Ch.4 "Shortcut Keys", p.27).
describe("ClassicyMenuShortcutOverrides", () => {
	it("is on only under keyboard.editableShortcuts (Windows 98), off by default", () => {
		expect(classicyEditableShortcuts(windows98.layout as never)).toBe(true);
		expect(classicyEditableShortcuts(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(
			classicyEditableShortcuts({ keyboard: { editableShortcuts: false } }),
		).toBe(false);
	});

	it("stores a chord with Command, Control, Option or a function key in canonical form, and nothing else", () => {
		expect(classicyShortcutOverrideChord("⌘K")).toBe("command+k");
		expect(classicyShortcutOverrideChord("Ctrl+Shift+S")).toBe(
			"control+shift+s",
		);
		expect(classicyShortcutOverrideChord("⌥W")).toBe("option+w");
		expect(classicyShortcutOverrideChord("F5")).toBe("f5");
		expect(classicyShortcutOverrideChord("⇧F5")).toBe("shift+f5");
		for (const refused of ["K", "⇧K", "⌘", "", 42, null]) {
			expect(classicyShortcutOverrideChord(refused)).toBe("");
		}
	});

	it("takes ids of 1 to 128 characters, never a prototype name", () => {
		expect(isClassicyShortcutOverrideId("finder_file_open")).toBe(true);
		expect(isClassicyShortcutOverrideId("x".repeat(128))).toBe(true);
		for (const id of [
			"",
			"x".repeat(129),
			"__proto__",
			"constructor",
			"prototype",
			3,
		]) {
			expect(isClassicyShortcutOverrideId(id)).toBe(false);
		}
	});

	it("writes a stored chord as a menu item does", () => {
		expect(classicyShortcutFromChord("control+o")).toBe("⌃O");
		expect(classicyShortcutFromChord("shift+command+s")).toBe("⇧⌘S");
		expect(classicyShortcutFromChord("control+backspace")).toBe("⌃⌫");
		expect(classicyShortcutFromChord("f5")).toBe("F5");
		expect(classicyShortcutFromChord("command+space")).toBe("⌘Space");
		expect(classicyShortcutFromChord("command+")).toBe("");
	});

	it("keeps a valid map as it is, and cleans an invalid one", () => {
		const valid = { finder_file_open: "command+k" };
		expect(validClassicyShortcutOverrides(valid)).toBe(valid);
		expect(
			validClassicyShortcutOverrides({
				finder_file_open: "⌘K",
				constructor: "command+j",
				bad: "K",
				number: 5,
			}),
		).toEqual({ finder_file_open: "command+k" });
		for (const none of [undefined, null, "x", [], {}, { a: "K" }]) {
			expect(validClassicyShortcutOverrides(none)).toBeUndefined();
		}
	});

	it("resolves an item's chord from the map, else its own", () => {
		const overrides = { finder_file_open: "control+command+o" };
		expect(
			resolveClassicyMenuItemShortcut(overrides, "finder_file_open", "⌘O"),
		).toBe("⌃⌘O");
		expect(
			resolveClassicyMenuItemShortcut(
				overrides,
				"finder_edit_select_all",
				"⌘A",
			),
		).toBe("⌘A");
		expect(
			resolveClassicyMenuItemShortcut(undefined, "finder_file_open", "⌘O"),
		).toBe("⌘O");
		expect(
			resolveClassicyMenuItemShortcut(
				{ finder_file_open: "command+" },
				"finder_file_open",
				"⌘O",
			),
		).toBe("⌘O");
		// No prototype read.
		expect(resolveClassicyMenuItemShortcut({}, "toString", "⌘T")).toBe("⌘T");
	});

	it("makes the claims and the shortcut dispatcher's lookup follow the resolved chord", () => {
		const overrides = { finder_file_open: "command+k" };
		const menu: ClassicyMenuItem[] = [
			{
				id: "file",
				title: "File",
				menuChildren: [
					{
						id: "Finder.app_Documents_file_open",
						title: "Open",
						keyboardShortcut: resolveClassicyMenuItemShortcut(
							overrides,
							"finder_file_open",
							"⌘O",
						),
					},
				],
			},
		];
		expect(collectMenuChords(menu)).toEqual(["command+k"]);
		const press = (key: string) =>
			new KeyboardEvent("keydown", {
				key,
				code: `Key${key.toUpperCase()}`,
				metaKey: true,
			});
		expect(findMenuItemByShortcut(menu, press("k"))?.title).toBe("Open");
		expect(findMenuItemByShortcut(menu, press("o"))).toBeUndefined();
	});
});

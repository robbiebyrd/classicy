import { describe, expect, it } from "vitest";
import {
	checkKeyboardEquivalent,
	keyboardEquivalentsInUse,
	spellKeyboardEquivalent,
} from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";

describe("spellKeyboardEquivalent (HIGOS8 Figure 6-8)", () => {
	it("joins the glyphs and key with plus signs", () => {
		expect(spellKeyboardEquivalent("⌃⌘S")).toBe("⌃ + ⌘ + S");
		expect(spellKeyboardEquivalent("Cmd+K")).toBe("⌘ + K");
	});

	it("is empty when there is no equivalent", () => {
		expect(spellKeyboardEquivalent("")).toBe("");
		expect(spellKeyboardEquivalent(undefined)).toBe("");
	});
});

describe("checkKeyboardEquivalent (HIGOS8 p.121)", () => {
	it("accepts a combination with the command key", () => {
		expect(checkKeyboardEquivalent("⌘K")).toBeNull();
		expect(checkKeyboardEquivalent("⌃⌥⌘S")).toBeNull();
	});

	it("accepts a function key without the command key", () => {
		expect(checkKeyboardEquivalent("F5")).toBeNull();
		expect(checkKeyboardEquivalent("⇧F12")).toBeNull();
	});

	it("refuses a combination with neither a command key nor a function key", () => {
		const problem = checkKeyboardEquivalent("⌃S");
		expect(problem?.label).toBe(
			"The keyboard equivalent must include the command key.",
		);
		expect(problem?.message).toBe("Please select another combination.");
		expect(checkKeyboardEquivalent("S")).not.toBeNull();
	});

	it("lets the command-key rule be turned off for Option-based web shortcuts", () => {
		expect(
			checkKeyboardEquivalent("⌥W", { requireCommandKey: false }),
		).toBeNull();
	});

	it("refuses a combination another item uses, naming that item", () => {
		const problem = checkKeyboardEquivalent("⌘N", {
			inUse: [
				{ shortcut: "Cmd+O", name: "Open…" },
				{ shortcut: "Cmd+N", name: "New Folder" },
			],
		});
		expect(problem?.label).toBe(
			"The keyboard equivalent ⌘ + N is already used by “New Folder”.",
		);
	});

	it("does not count the item's own current equivalent as a conflict", () => {
		expect(
			checkKeyboardEquivalent("⌘K", {
				inUse: [{ shortcut: "⌘K", name: "Custom Settings" }],
				current: "Cmd+K",
			}),
		).toBeNull();
	});

	it("applies an extra rule after the HIG ones", () => {
		const problem = checkKeyboardEquivalent("⌘W", {
			validate: (s) =>
				s === "⌘W" ? "The browser reserves this keyboard equivalent." : null,
		});
		expect(problem?.label).toBe(
			"The browser reserves this keyboard equivalent.",
		);
		expect(checkKeyboardEquivalent("⌘K", { validate: () => null })).toBeNull();
	});
});

describe("keyboardEquivalentsInUse", () => {
	it("collects every titled shortcut in a menu tree, decoding the titles", () => {
		expect(
			keyboardEquivalentsInUse([
				{ id: "new", title: "New Folder", keyboardShortcut: "⌘N" },
				{ id: "untitled", keyboardShortcut: "⌘U" },
				{
					id: "view",
					title: "View",
					menuChildren: [
						{ id: "clean", title: "Clean &amp; Tidy", keyboardShortcut: "⌘T" },
						{ id: "plain", title: "Plain" },
					],
				},
			]),
		).toEqual([
			{ shortcut: "⌘N", name: "New Folder" },
			{ shortcut: "⌘T", name: "Clean & Tidy" },
		]);
	});
});

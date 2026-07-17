import { describe, expect, it, vi } from "vitest";
import {
	findMenuItemByShortcut,
	formatKeyboardShortcut,
	parseKeyboardShortcut,
	runMenuItemAction,
	shortcutMatchesEvent,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const makeKeyEvent = (init: Partial<KeyboardEvent>): KeyboardEvent =>
	({
		key: "",
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		...init,
	}) as KeyboardEvent;

describe("parseKeyboardShortcut", () => {
	it("parses glyph form ⌘S", () => {
		expect(parseKeyboardShortcut("⌘S")).toMatchObject({
			command: true,
			key: "S",
		});
	});

	it("parses textual + separated modifiers (Cmd+Shift+S)", () => {
		expect(parseKeyboardShortcut("Cmd+Shift+S")).toMatchObject({
			command: true,
			shift: true,
			option: false,
			control: false,
			key: "S",
		});
	});

	it("parses hyphen-separated word modifiers (Command-Option-D)", () => {
		expect(parseKeyboardShortcut("Command-Option-D")).toMatchObject({
			command: true,
			option: true,
			key: "D",
		});
	});

	it("decodes HTML entities (&#8984;S)", () => {
		expect(parseKeyboardShortcut("&#8984;S")).toMatchObject({
			command: true,
			key: "S",
		});
	});

	it("keeps a non-modifier key with no modifiers (F1)", () => {
		expect(parseKeyboardShortcut("F1")).toMatchObject({
			command: false,
			key: "F1",
		});
	});

	it("returns empty key for undefined/empty input", () => {
		expect(parseKeyboardShortcut(undefined).key).toBe("");
		expect(parseKeyboardShortcut("").key).toBe("");
	});
});

describe("formatKeyboardShortcut", () => {
	it("renders modifiers as glyphs in canonical order", () => {
		expect(formatKeyboardShortcut("Ctrl+Option+Shift+Cmd+K")).toBe("⌃⌥⇧⌘K");
	});

	it("is idempotent on already-glyph input", () => {
		expect(formatKeyboardShortcut("⌘N")).toBe("⌘N");
	});

	it("orders Shift before Command (⇧⌘S)", () => {
		expect(formatKeyboardShortcut("Cmd+Shift+S")).toBe("⇧⌘S");
	});

	it("renders a bare Option equivalent as a hint (⌥H)", () => {
		expect(formatKeyboardShortcut("Option-H")).toBe("⌥H");
		expect(formatKeyboardShortcut("⌥H")).toBe("⌥H");
	});

	it("renders a bare Control equivalent as a hint (⌃D)", () => {
		expect(formatKeyboardShortcut("Control-D")).toBe("⌃D");
	});
});

describe("shortcutMatchesEvent", () => {
	it("matches a command-key event", () => {
		expect(
			shortcutMatchesEvent("⌘S", makeKeyEvent({ metaKey: true, key: "s" })),
		).toBe(true);
	});

	it("matches command via ctrl (cross-platform)", () => {
		expect(
			shortcutMatchesEvent("⌘S", makeKeyEvent({ ctrlKey: true, key: "s" })),
		).toBe(true);
	});

	it("requires the shift modifier when specified", () => {
		expect(
			shortcutMatchesEvent("⌘⇧S", makeKeyEvent({ metaKey: true, key: "s" })),
		).toBe(false);
		expect(
			shortcutMatchesEvent(
				"⌘⇧S",
				makeKeyEvent({ metaKey: true, shiftKey: true, key: "s" }),
			),
		).toBe(true);
	});

	it("does not match a plain key press with no command modifier", () => {
		expect(shortcutMatchesEvent("⌘S", makeKeyEvent({ key: "s" }))).toBe(false);
	});

	it("matches a Control equivalent (⌃D)", () => {
		expect(
			shortcutMatchesEvent("⌃D", makeKeyEvent({ ctrlKey: true, key: "d" })),
		).toBe(true);
	});

	it("matches an Option equivalent by physical code despite a remapped key", () => {
		// macOS remaps Option+X's `key` to a composed character; `code` stays KeyX.
		expect(
			shortcutMatchesEvent(
				"⌥X",
				makeKeyEvent({ altKey: true, key: "≈", code: "KeyX" }),
			),
		).toBe(true);
	});

	it("matches an Option equivalent by key when not remapped", () => {
		expect(
			shortcutMatchesEvent("⌥X", makeKeyEvent({ altKey: true, key: "x" })),
		).toBe(true);
	});

	it("does not fire an Option equivalent when Command is also held", () => {
		expect(
			shortcutMatchesEvent(
				"⌥X",
				makeKeyEvent({ altKey: true, metaKey: true, key: "≈", code: "KeyX" }),
			),
		).toBe(false);
	});

	it("does not match an Option equivalent without Alt", () => {
		expect(
			shortcutMatchesEvent("⌥X", makeKeyEvent({ key: "x", code: "KeyX" })),
		).toBe(false);
	});
});

describe("findMenuItemByShortcut", () => {
	const items: ClassicyMenuItem[] = [
		{ id: "new", title: "New", keyboardShortcut: "⌘N" },
		{
			id: "export",
			title: "Export",
			menuChildren: [
				{ id: "pdf", title: "PDF", keyboardShortcut: "⌘⇧P" },
				{ id: "off", title: "Off", keyboardShortcut: "⌘O", disabled: true },
			],
		},
	];

	it("finds a top-level match", () => {
		const found = findMenuItemByShortcut(
			items,
			makeKeyEvent({ metaKey: true, key: "n" }),
		);
		expect(found?.id).toBe("new");
	});

	it("descends into submenus", () => {
		const found = findMenuItemByShortcut(
			items,
			makeKeyEvent({ metaKey: true, shiftKey: true, key: "p" }),
		);
		expect(found?.id).toBe("pdf");
	});

	it("ignores disabled items", () => {
		const found = findMenuItemByShortcut(
			items,
			makeKeyEvent({ metaKey: true, key: "o" }),
		);
		expect(found).toBeUndefined();
	});

	it("skips nativeShortcut items so the browser handles the keystroke", () => {
		const nativeItems = [
			{
				id: "undo",
				title: "Undo",
				keyboardShortcut: "⌘Z",
				nativeShortcut: true,
			},
		];
		const found = findMenuItemByShortcut(
			nativeItems,
			makeKeyEvent({ metaKey: true, key: "z" }),
		);
		expect(found).toBeUndefined();
	});
});

describe("runMenuItemAction", () => {
	it("calls onClickFunc when present", () => {
		const onClickFunc = vi.fn();
		const dispatch = vi.fn();
		runMenuItemAction({ id: "a", onClickFunc }, dispatch);
		expect(onClickFunc).toHaveBeenCalledOnce();
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("dispatches event + eventData when there is no onClickFunc", () => {
		const dispatch = vi.fn();
		runMenuItemAction(
			{ id: "a", event: "SomeEvent", eventData: { foo: 1 } },
			dispatch,
		);
		expect(dispatch).toHaveBeenCalledWith({ type: "SomeEvent", foo: 1 });
	});

	it("is a no-op for disabled items", () => {
		const onClickFunc = vi.fn();
		runMenuItemAction({ id: "a", disabled: true, onClickFunc }, vi.fn());
		expect(onClickFunc).not.toHaveBeenCalled();
	});
});

// The command-rule package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	CLASSICY_MODIFIER_GLYPHS,
	CLASSICY_MODIFIER_KEY_NAMES,
	CLASSICY_MODIFIER_ORDER,
	canonicalChord,
	canonicalChordsFromEvent,
	classicyCommandIsCtrl,
	classicyCommandKeyHeld,
	classicyCommandSpelledCtrl,
	classicyKeycapName,
	classicyShortcutModifierNames,
	collectMenuChords,
	findMenuItemByShortcut,
	formatKeyboardShortcut,
	formatKeyboardShortcutNames,
	isFunctionKey,
	keyboardShortcutFromEvent,
	keyboardShortcutModifiers,
	keyboardShortcutParts,
	parseKeyboardShortcut,
	runMenuItemAction,
	shortcutMatchesEvent,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// Platinum (registered above) is the default layout, Command answering to
// Command or Control; `windows-command` carries the Windows 98 package's
// layout (`keyboard.command` "ctrl"). The store is not mounted: stand in for
// its connection of the active package id.
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-command",
	name: "Windows command rule",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-command-default",
		package: "windows-command",
	},
	layout: windows98.layout as never,
});

afterEach(() => {
	activePackage.id = "platinum";
});

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

	it("matches a declared Space shortcut against a spacebar event", () => {
		// e.key for a spacebar keydown is a literal " "; keyMatchesEvent must
		// normalize it to the "space" token the same way canonicalChordsFromEvent
		// does, so a declared "…+Space" shortcut resolves.
		expect(
			shortcutMatchesEvent(
				"⌃Space",
				makeKeyEvent({ ctrlKey: true, key: " ", code: "Space" }),
			),
		).toBe(true);
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

describe("canonicalChord", () => {
	it("normalizes spelling/spacing/glyphs to one canonical form", () => {
		expect(canonicalChord("Cmd+Shift+S")).toBe("shift+command+s");
		expect(canonicalChord("⇧⌘S")).toBe("shift+command+s");
		expect(canonicalChord("command shift s")).toBe("shift+command+s");
	});
	it("orders modifiers control, option, shift, command", () => {
		expect(canonicalChord("Ctrl+Option+Shift+Cmd+K")).toBe(
			"control+option+shift+command+k",
		);
		expect(canonicalChord("⌥H")).toBe("option+h");
		expect(canonicalChord("⌃S")).toBe("control+s");
	});
	it("returns '' for a modifier-only or empty chord", () => {
		expect(canonicalChord("Cmd")).toBe("");
		expect(canonicalChord("")).toBe("");
		expect(canonicalChord(undefined)).toBe("");
	});
});

describe("canonicalChordsFromEvent", () => {
	const ev = (init: Partial<KeyboardEventInit> & { key: string }) =>
		new KeyboardEvent("keydown", init);

	it("meta+S yields the command candidate only", () => {
		expect(canonicalChordsFromEvent(ev({ key: "s", metaKey: true }))).toEqual([
			"command+s",
		]);
	});
	it("ctrl+S yields BOTH command and control candidates (meta-or-ctrl)", () => {
		const out = canonicalChordsFromEvent(ev({ key: "s", ctrlKey: true }));
		expect(out).toContain("command+s");
		expect(out).toContain("control+s");
	});
	it("alt+H (no meta/ctrl) yields the option candidate", () => {
		expect(canonicalChordsFromEvent(ev({ key: "h", altKey: true }))).toEqual([
			"option+h",
		]);
	});
	it("returns [] when no chord modifier is present", () => {
		expect(canonicalChordsFromEvent(ev({ key: "a" }))).toEqual([]);
	});
	it("derives the key from code when key is a dead/composed char (⌥ physical key)", () => {
		const out = canonicalChordsFromEvent(
			ev({ key: "≈", code: "KeyX", altKey: true }),
		);
		expect(out).toEqual(["option+x"]);
	});
});

describe("collectMenuChords", () => {
	it("collects canonical chords from nested menus, skipping native and empty", () => {
		const menu: ClassicyMenuItem[] = [
			{ id: "a", title: "Save", keyboardShortcut: "Cmd+S" },
			{
				id: "b",
				title: "Undo",
				keyboardShortcut: "Cmd+Z",
				nativeShortcut: true,
			},
			{ id: "c", title: "No shortcut" },
			{
				id: "sub",
				title: "More",
				menuChildren: [{ id: "d", title: "Find", keyboardShortcut: "⌘F" }],
			},
		];
		const out = collectMenuChords(menu);
		expect(out).toContain("command+s");
		expect(out).toContain("command+f");
		expect(out).not.toContain("command+z"); // native excluded
		expect(out).toHaveLength(2);
	});
});

describe("keyboardShortcutFromEvent (recording a keyboard equivalent)", () => {
	const ev = (init: KeyboardEventInit & { key: string }) =>
		new KeyboardEvent("keydown", init);

	it("records Command as the Meta key, letters upper-cased", () => {
		expect(
			keyboardShortcutFromEvent(ev({ key: "k", code: "KeyK", metaKey: true }), {
				mac: true,
			}),
		).toBe("⌘K");
	});

	it("records Control separately on a Mac, in HIG modifier order", () => {
		expect(
			keyboardShortcutFromEvent(
				ev({ key: "s", code: "KeyS", metaKey: true, ctrlKey: true }),
				{ mac: true },
			),
		).toBe("⌃⌘S");
	});

	it("records Ctrl as Command off a Mac, where ⌘ shortcuts answer to Ctrl", () => {
		expect(
			keyboardShortcutFromEvent(ev({ key: "s", code: "KeyS", ctrlKey: true }), {
				mac: false,
			}),
		).toBe("⌘S");
	});

	it("reads the physical key when Option composes a character", () => {
		expect(
			keyboardShortcutFromEvent(
				ev({ key: "ß", code: "KeyS", altKey: true, shiftKey: true }),
				{ mac: true },
			),
		).toBe("⌥⇧S");
	});

	it("records function keys and named keys", () => {
		expect(keyboardShortcutFromEvent(ev({ key: "F5", code: "F5" }))).toBe("F5");
		expect(
			keyboardShortcutFromEvent(ev({ key: " ", code: "Space", metaKey: true })),
		).toBe("⌘Space");
		expect(
			keyboardShortcutFromEvent(
				ev({ key: "ArrowUp", code: "ArrowUp", metaKey: true }),
			),
		).toBe("⌘ArrowUp");
	});

	it("returns nothing while only modifiers are down", () => {
		expect(
			keyboardShortcutFromEvent(
				ev({ key: "Meta", code: "MetaLeft", metaKey: true }),
			),
		).toBe("");
	});

	it("round-trips: the recorded shortcut matches the event that made it", () => {
		const e = ev({ key: "s", code: "KeyS", metaKey: true, shiftKey: true });
		expect(shortcutMatchesEvent(keyboardShortcutFromEvent(e), e)).toBe(true);
	});
});

describe("the shared modifier table", () => {
	it("names each modifier's glyph once", () => {
		expect(CLASSICY_MODIFIER_GLYPHS.command).toBe("⌘");
		expect(CLASSICY_MODIFIER_GLYPHS).toEqual({
			control: "⌃",
			option: "⌥",
			shift: "⇧",
			command: "⌘",
		});
		expect(CLASSICY_MODIFIER_ORDER).toEqual([
			"control",
			"option",
			"shift",
			"command",
		]);
	});

	it("keyboardShortcutModifiers lists the set modifiers in canonical order", () => {
		expect(keyboardShortcutModifiers("Ctrl+Cmd+S")).toEqual([
			"control",
			"command",
		]);
		expect(keyboardShortcutModifiers("Cmd+Shift+Opt+Ctrl+K")).toEqual([
			"control",
			"option",
			"shift",
			"command",
		]);
		expect(keyboardShortcutModifiers("F1")).toEqual([]);
		expect(keyboardShortcutModifiers(undefined)).toEqual([]);
	});

	it("keyboardShortcutModifiers takes an already-parsed shortcut too", () => {
		expect(
			keyboardShortcutModifiers(parseKeyboardShortcut("Ctrl+Cmd+S")),
		).toEqual(["control", "command"]);
		expect(keyboardShortcutModifiers(parseKeyboardShortcut("F1"))).toEqual([]);
	});
});

describe("keyboardShortcutParts", () => {
	it("splits a shortcut into glyphs and key in HIG order", () => {
		expect(keyboardShortcutParts("Cmd+Ctrl+S")).toEqual(["⌃", "⌘", "S"]);
		expect(keyboardShortcutParts("⇧⌘?")).toEqual(["⇧", "⌘", "?"]);
	});

	it("is empty for a modifier-only or missing shortcut", () => {
		expect(keyboardShortcutParts("⌘")).toEqual([]);
		expect(keyboardShortcutParts(undefined)).toEqual([]);
	});
});

describe("isFunctionKey", () => {
	it("accepts F1 to F24 only", () => {
		expect(isFunctionKey("F1")).toBe(true);
		expect(isFunctionKey("f12")).toBe(true);
		expect(isFunctionKey("F24")).toBe(true);
		expect(isFunctionKey("F25")).toBe(false);
		expect(isFunctionKey("F")).toBe(false);
		expect(isFunctionKey("S")).toBe(false);
	});
});

describe("the Delete key glyph (⌃⌫, Move To Trash)", () => {
	const backspace = makeKeyEvent({
		ctrlKey: true,
		key: "Backspace",
		code: "Backspace",
	});

	it("matches the Backspace key", () => {
		expect(shortcutMatchesEvent("⌃⌫", backspace)).toBe(true);
		expect(
			shortcutMatchesEvent(
				"⌃⌫",
				makeKeyEvent({ ctrlKey: true, key: "Delete", code: "Delete" }),
			),
		).toBe(false);
		// Control, not Command: the browser keeps ⌘.
		expect(
			shortcutMatchesEvent(
				"⌃⌫",
				makeKeyEvent({ metaKey: true, key: "Backspace", code: "Backspace" }),
			),
		).toBe(false);
	});

	it("is the same chord the dispatcher derives from the event", () => {
		expect(canonicalChord("⌃⌫")).toBe("control+backspace");
		expect(canonicalChordsFromEvent(backspace)).toContain(canonicalChord("⌃⌫"));
	});

	it("displays as the glyph", () => {
		expect(formatKeyboardShortcut("⌃⌫")).toBe("⌃⌫");
	});
});

// The audit's 7.15: Windows' spelling (WIG Ch.7 "Shortcut Keys in Menu
// Items", p.110).
describe("formatKeyboardShortcutNames / classicyKeycapName", () => {
	it("names the modifiers Ctrl, Alt, Shift and Win, in canonical order, joined by +", () => {
		expect(formatKeyboardShortcutNames("Ctrl+Shift+S")).toBe("Ctrl+Shift+S");
		expect(formatKeyboardShortcutNames("⌃⌥⇧⌘K")).toBe("Ctrl+Alt+Shift+Win+K");
		expect(formatKeyboardShortcutNames("Cmd+Shift+S")).toBe("Shift+Win+S");
		expect(formatKeyboardShortcutNames("F5")).toBe("F5");
		expect(formatKeyboardShortcutNames("")).toBe("");
		expect(CLASSICY_MODIFIER_KEY_NAMES).toEqual({
			control: "Ctrl",
			option: "Alt",
			shift: "Shift",
			command: "Win",
		});
	});

	it("names the keys as their keycaps do", () => {
		expect(
			[
				"⌫",
				"⌦",
				"Delete",
				"↑",
				"ArrowDown",
				"←",
				"→",
				"Escape",
				"⎋",
				"Return",
				"Tab",
				"Space",
				"PageUp",
				"⇟",
				"Home",
				"End",
				"Insert",
				"f12",
				"s",
				"-",
			].map(classicyKeycapName),
		).toEqual([
			"Backspace",
			"Del",
			"Del",
			"Up",
			"Down",
			"Left",
			"Right",
			"Esc",
			"Esc",
			"Enter",
			"Tab",
			"Space",
			"PgUp",
			"PgDn",
			"Home",
			"End",
			"Ins",
			"F12",
			"S",
			"-",
		]);
	});
});

// The remaining chapters' audit's 4.19 (WIG Ch.4 "Shortcut Keys", p.28;
// Appendix B Table B.3, p.359: the Windows keys are for the system's own
// functions): under `layout.keyboard.command` "ctrl" a Command equivalent
// answers to Control alone, and the Windows key (`metaKey`) runs nothing.
describe("layout.keyboard.command", () => {
	const ctrlS = makeKeyEvent({ key: "s", code: "KeyS", ctrlKey: true });
	const winS = makeKeyEvent({ key: "s", code: "KeyS", metaKey: true });
	const winCtrlS = makeKeyEvent({
		key: "s",
		code: "KeyS",
		metaKey: true,
		ctrlKey: true,
	});
	const winAltW = makeKeyEvent({
		key: "w",
		code: "KeyW",
		metaKey: true,
		altKey: true,
	});

	it("reads the rule from the active package, or the layout given", () => {
		expect(classicyCommandIsCtrl()).toBe(false);
		activePackage.id = "windows-command";
		expect(classicyCommandIsCtrl()).toBe(true);
		expect(classicyCommandIsCtrl({ keyboard: { command: "metaOrCtrl" } })).toBe(
			false,
		);
		expect(classicyCommandIsCtrl({})).toBe(false);
	});

	it("matches ⌘ to Command or Control by default (Platinum)", () => {
		expect(shortcutMatchesEvent("⌘S", ctrlS)).toBe(true);
		expect(shortcutMatchesEvent("⌘S", winS)).toBe(true);
		expect(shortcutMatchesEvent("⌘S", winCtrlS)).toBe(true);
		expect(canonicalChordsFromEvent(winS)).toEqual(["command+s"]);
		expect(classicyCommandKeyHeld(winS)).toBe(true);
		expect(classicyCommandKeyHeld(ctrlS)).toBe(true);
	});

	it("matches ⌘ to Control alone under ctrl, and nothing while the Windows key is held", () => {
		activePackage.id = "windows-command";
		expect(shortcutMatchesEvent("⌘S", ctrlS)).toBe(true);
		expect(shortcutMatchesEvent("⌃S", ctrlS)).toBe(true);
		expect(shortcutMatchesEvent("⌘S", winS)).toBe(false);
		expect(shortcutMatchesEvent("⌘S", winCtrlS)).toBe(false);
		expect(shortcutMatchesEvent("⌃S", winCtrlS)).toBe(false);
		// An Option chord pressed with the Windows key is no Option chord.
		expect(shortcutMatchesEvent("⌥W", winAltW)).toBe(false);
		expect(
			shortcutMatchesEvent(
				"⌥W",
				makeKeyEvent({ key: "w", code: "KeyW", altKey: true }),
			),
		).toBe(true);
		expect(canonicalChordsFromEvent(ctrlS)).toEqual(["command+s", "control+s"]);
		expect(canonicalChordsFromEvent(winS)).toEqual([]);
		expect(canonicalChordsFromEvent(winCtrlS)).toEqual([]);
		expect(canonicalChordsFromEvent(winAltW)).toEqual([]);
		expect(classicyCommandKeyHeld(winS)).toBe(false);
		expect(classicyCommandKeyHeld(winCtrlS)).toBe(false);
		expect(classicyCommandKeyHeld(ctrlS)).toBe(true);
		// A layout passed wins over the active package's.
		expect(classicyCommandKeyHeld(winS, {})).toBe(true);
	});

	it("finds no menu item for a Windows-key chord under ctrl", () => {
		const items: ClassicyMenuItem[] = [
			{ id: "save", title: "Save", keyboardShortcut: "⌘S" },
		];
		expect(findMenuItemByShortcut(items, winS)?.id).toBe("save");
		activePackage.id = "windows-command";
		expect(findMenuItemByShortcut(items, winS)).toBeUndefined();
		expect(findMenuItemByShortcut(items, ctrlS)?.id).toBe("save");
	});

	it("records Control as ⌘ on any host and the Windows key as nothing under ctrl", () => {
		const ev = (init: KeyboardEventInit & { key: string }) =>
			new KeyboardEvent("keydown", init);
		activePackage.id = "windows-command";
		const ctrl = ev({ key: "s", code: "KeyS", ctrlKey: true });
		expect(keyboardShortcutFromEvent(ctrl, { mac: true })).toBe("⌘S");
		expect(keyboardShortcutFromEvent(ctrl, { mac: false })).toBe("⌘S");
		expect(
			keyboardShortcutFromEvent(ev({ key: "s", code: "KeyS", metaKey: true }), {
				mac: true,
			}),
		).toBe("");
		expect(
			keyboardShortcutFromEvent(
				ev({ key: "s", code: "KeyS", ctrlKey: true, altKey: true }),
				{ mac: true },
			),
		).toBe("⌥⌘S");
		// Round-trips: the recorded ⌘ answers to the Control that made it.
		expect(shortcutMatchesEvent(keyboardShortcutFromEvent(ctrl), ctrl)).toBe(
			true,
		);
		// The option overrides the package.
		activePackage.id = "platinum";
		expect(
			keyboardShortcutFromEvent(ctrl, { mac: true, commandIsCtrl: true }),
		).toBe("⌘S");
		expect(keyboardShortcutFromEvent(ctrl, { mac: true })).toBe("⌃S");
	});
});

// The remaining chapters' audit's 1.12 and 5.30: the names spelling writes
// ⌘ as Ctrl where Command is Control (WIG Ch.4 "Shortcut Keys", p.27; Ch.5
// "Shortcut Keys for Transfer Operations", pp.67-68).
describe("formatKeyboardShortcutNames with commandIsCtrl / classicyCommandSpelledCtrl", () => {
	it("spells ⌘ Ctrl, a Control held too counting once", () => {
		expect(formatKeyboardShortcutNames("⌘S", { commandIsCtrl: true })).toBe(
			"Ctrl+S",
		);
		expect(formatKeyboardShortcutNames("⇧⌘Z", { commandIsCtrl: true })).toBe(
			"Ctrl+Shift+Z",
		);
		expect(formatKeyboardShortcutNames("⌥⇧⌘K", { commandIsCtrl: true })).toBe(
			"Ctrl+Alt+Shift+K",
		);
		expect(formatKeyboardShortcutNames("⌃⌘S", { commandIsCtrl: true })).toBe(
			"Ctrl+S",
		);
		expect(formatKeyboardShortcutNames("⌃⌥⌫", { commandIsCtrl: true })).toBe(
			"Ctrl+Alt+Backspace",
		);
		expect(formatKeyboardShortcutNames("⌘S", { commandIsCtrl: false })).toBe(
			"Win+S",
		);
		expect(
			classicyShortcutModifierNames("⌃⇧⌘S", { commandIsCtrl: true }),
		).toEqual([
			{ modifier: "control", name: "Ctrl" },
			{ modifier: "shift", name: "Shift" },
		]);
		expect(
			classicyShortcutModifierNames("⇧⌘S", { commandIsCtrl: true }),
		).toEqual([
			{ modifier: "command", name: "Ctrl" },
			{ modifier: "shift", name: "Shift" },
		]);
		expect(classicyShortcutModifierNames("⇧⌘S")).toEqual([
			{ modifier: "shift", name: "Shift" },
			{ modifier: "command", name: "Win" },
		]);
	});

	it("spells ⌘ Ctrl under the command rule, and a native chord's off a Mac whatever the rule", () => {
		const ctrl = { keyboard: { command: "ctrl" as const } };
		expect(classicyCommandSpelledCtrl({ layout: ctrl, mac: true })).toBe(true);
		expect(classicyCommandSpelledCtrl({ layout: {}, mac: false })).toBe(false);
		expect(
			classicyCommandSpelledCtrl({
				layout: {},
				nativeShortcut: true,
				mac: false,
			}),
		).toBe(true);
		expect(
			classicyCommandSpelledCtrl({
				layout: {},
				nativeShortcut: true,
				mac: true,
			}),
		).toBe(false);
		// The active package's rule by default.
		expect(classicyCommandSpelledCtrl({ mac: true })).toBe(false);
		activePackage.id = "windows-command";
		expect(classicyCommandSpelledCtrl({ mac: true })).toBe(true);
	});
});

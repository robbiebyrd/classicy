import he from "he";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Mac OS 8 HIG keyboard-equivalent parsing/formatting for menu items
 * (HIG Ch. 4 "Menus" — command-key equivalents render as modifier glyphs).
 *
 * A `keyboardShortcut` string on a menu item is free-form ("Cmd+Shift+S",
 * "Command-O", "⌘N", "&#8984;S", "F1"). These helpers normalize it into the
 * canonical platinum display form (glyphs in Control ⌃, Option ⌥, Shift ⇧,
 * Command ⌘ order followed by the key) and let a keydown event be matched
 * against it so a command-key press can fire the item's action.
 */

export interface ParsedKeyboardShortcut {
	control: boolean;
	option: boolean;
	shift: boolean;
	command: boolean;
	/** The non-modifier key (e.g. "S", "F1", ","). Empty when only modifiers. */
	key: string;
}

/**
 * The one table of modifier glyphs (HIGOS8 Ch. 4): every place that draws a
 * shortcut — `formatKeyboardShortcut`, `keyboardShortcutParts`,
 * `keyboardShortcutFromEvent` and `ClassicyKbd` — reads it.
 */
export const CLASSICY_MODIFIER_GLYPHS = {
	control: "⌃",
	option: "⌥",
	shift: "⇧",
	command: "⌘",
} as const;

/** A modifier key's name: `control`, `option`, `shift` or `command`. */
export type ClassicyModifierName = keyof typeof CLASSICY_MODIFIER_GLYPHS;

/** The canonical HIG display order of the modifiers: ⌃ ⌥ ⇧ ⌘. */
export const CLASSICY_MODIFIER_ORDER: readonly ClassicyModifierName[] = [
	"control",
	"option",
	"shift",
	"command",
];

// Each modifier's recognized textual/glyph spellings, in canonical order.
const MODIFIER_PATTERNS: ReadonlyArray<{
	flag: ClassicyModifierName;
	re: RegExp;
}> = [
	{ flag: "control", re: /⌃|\bcontrol\b|\bctrl\b/gi },
	{ flag: "option", re: /⌥|\boption\b|\bopt\b|\balt\b/gi },
	{ flag: "shift", re: /⇧|\bshift\b/gi },
	{ flag: "command", re: /⌘|\bcommand\b|\bcmd\b/gi },
];

export const parseKeyboardShortcut = (
	raw: string | undefined,
): ParsedKeyboardShortcut => {
	const result: ParsedKeyboardShortcut = {
		control: false,
		option: false,
		shift: false,
		command: false,
		key: "",
	};
	if (!raw) return result;

	let rest = he.decode(raw);
	for (const { flag, re } of MODIFIER_PATTERNS) {
		const replaced = rest.replace(re, " ");
		if (replaced !== rest) {
			result[flag] = true;
			rest = replaced;
		}
	}

	// Whatever remains is the key. Separators between tokens are "+", "-" or
	// whitespace; split on them and take the remaining token(s). A bare "-" key
	// (e.g. "⌘-") is preserved as a special case since "-" is also a separator.
	const normalized = rest.replace(/\+/g, " ");
	const tokens = normalized.split(/[\s-]+/).filter(Boolean);
	let key = tokens.join(" ");
	if (!key && /^-+$/.test(normalized.replace(/\s+/g, ""))) {
		key = "-";
	}
	result.key = key;
	return result;
};

// The modifiers a parsed shortcut (or a held-key record) sets, in order.
const setModifiers = (
	held: Readonly<Record<ClassicyModifierName, boolean>>,
): ClassicyModifierName[] =>
	CLASSICY_MODIFIER_ORDER.filter((name) => held[name]);

// A run of modifier glyphs, in canonical order: ["shift", "command"] -> "⇧⌘".
const modifierGlyphs = (names: readonly ClassicyModifierName[]): string =>
	names.map((name) => CLASSICY_MODIFIER_GLYPHS[name]).join("");

/**
 * The modifiers a shortcut sets, in canonical order:
 * "Ctrl+Cmd+S" -> ["control", "command"], "F1" -> []. Takes the shortcut
 * string, or the result of `parseKeyboardShortcut` when the caller already
 * parsed it (so it is not parsed twice).
 */
export const keyboardShortcutModifiers = (
	shortcut: string | ParsedKeyboardShortcut | undefined,
): ClassicyModifierName[] =>
	setModifiers(
		typeof shortcut === "object" ? shortcut : parseKeyboardShortcut(shortcut),
	);

/**
 * Normalize a shortcut string to its platinum display form, e.g.
 * "Cmd+Shift+S" -> "⇧⌘S", "⌘N" -> "⌘N", "F1" -> "F1". Idempotent.
 */
export const formatKeyboardShortcut = (raw: string | undefined): string => {
	const p = parseKeyboardShortcut(raw);
	return modifierGlyphs(setModifiers(p)) + p.key;
};

/**
 * Match a shortcut's key against a keydown event by BOTH the logical key
 * (`e.key`) and the physical key (`e.code`). The physical fallback is essential
 * for Option/Alt equivalents: on macOS, Option+&lt;letter&gt; remaps `e.key` to a
 * composed/dead-key character (Option+E → "Dead"/"´"), but `e.code` stays
 * `KeyE`, so only a code match survives.
 */
// Key glyphs a shortcut may be written with, and the `KeyboardEvent.key` each
// stands for: Mac OS's Delete (⌫, "Move To Trash ⌃⌫") is the Backspace key.
const KEY_GLYPH_NAMES: Readonly<Record<string, string>> = {
	"⌫": "backspace",
	"⌦": "delete",
};

const keyMatchesEvent = (key: string, e: KeyboardEvent): boolean => {
	if (!key) return false;
	const k = KEY_GLYPH_NAMES[key] ?? key.toLowerCase();
	if (e.key.toLowerCase() === k) return true;
	if (k === "space" && (e.code === "Space" || e.key === " ")) return true;
	if (/^[a-z]$/.test(k) && e.code === `Key${k.toUpperCase()}`) return true;
	if (/^[0-9]$/.test(k) && e.code === `Digit${k}`) return true;
	return false;
};

/**
 * Does a Command (⌘) equivalent answer to Control alone? The active
 * package's `layout.keyboard.command` `"ctrl"` (Windows; WIG Ch.4 "Shortcut
 * Keys" (p.28), Appendix B Table B.3 (p.359): the Windows keys are for the
 * system's own functions), read store-free at call time, so the dispatcher
 * and the dialogs that call the matchers below need no change. Absent, or
 * `"metaOrCtrl"` (Mac OS), Command answers to Command or Control.
 */
export const classicyCommandIsCtrl = (
	layout: Pick<
		ClassicyAppearanceLayout,
		"keyboard"
	> = getClassicyAppearanceLayout(),
): boolean => layout.keyboard?.command === "ctrl";

/**
 * Is Command held, as the active package matches it: Command or Control
 * (`metaKey || ctrlKey`, Mac OS); under `layout.keyboard.command` `"ctrl"`,
 * Control without the Windows key (`metaKey`), which runs no command there.
 * For code matching a ⌘ chord by hand (Command-period, an editor's ⌘Z).
 */
export const classicyCommandKeyHeld = (
	e: { metaKey: boolean; ctrlKey: boolean },
	layout?: Pick<ClassicyAppearanceLayout, "keyboard">,
): boolean =>
	classicyCommandIsCtrl(layout)
		? e.ctrlKey && !e.metaKey
		: e.metaKey || e.ctrlKey;

/**
 * Does a keydown event satisfy this shortcut? Command is matched against
 * meta-or-ctrl (mirrors `useKeyboardEquivalents`) so it works on any platform;
 * under the active package's `layout.keyboard.command` `"ctrl"` (Windows 98)
 * against Control alone, and an event with the Windows key (`metaKey`) held
 * satisfies no shortcut (Win+letter runs no command).
 * Control and Option are matched against `e.ctrlKey` / `e.altKey`, so menu items
 * can register `⌃`/`⌥` equivalents (which the browser is far less likely to
 * reserve than `⌘`/Ctrl+letter).
 */
export const shortcutMatchesEvent = (
	raw: string | undefined,
	e: KeyboardEvent,
): boolean => {
	const p = parseKeyboardShortcut(raw);
	if (!p.key) return false;
	// The Windows key is the system's: with it held, nothing matches, and
	// Command is then Control alone (cmdOrCtrl below is e.ctrlKey).
	if (e.metaKey && classicyCommandIsCtrl()) return false;

	const cmdOrCtrl = e.metaKey || e.ctrlKey;
	if (p.command) {
		if (!cmdOrCtrl) return false;
	} else if (p.control) {
		if (!e.ctrlKey) return false;
	} else if (p.option) {
		// Option-only equivalent: require Alt and no command/control key so a
		// ⌘/Ctrl press can't accidentally trigger it.
		if (!e.altKey || cmdOrCtrl) return false;
	} else if (cmdOrCtrl) {
		// A shortcut with no command/control/option modifier shouldn't match a
		// command-key press.
		return false;
	}
	if (p.shift !== e.shiftKey) return false;
	if (p.option !== e.altKey) return false;

	return keyMatchesEvent(p.key, e);
};

/**
 * Depth-first search for the (enabled) menu item whose keyboard shortcut the
 * event satisfies, descending through submenus.
 */
export const findMenuItemByShortcut = (
	items: ClassicyMenuItem[],
	e: KeyboardEvent,
): ClassicyMenuItem | undefined => {
	for (const item of items) {
		if (
			!item.disabled &&
			!item.nativeShortcut &&
			item.keyboardShortcut &&
			shortcutMatchesEvent(item.keyboardShortcut, e)
		) {
			return item;
		}
		if (item.menuChildren && item.menuChildren.length > 0) {
			const found = findMenuItemByShortcut(item.menuChildren, e);
			if (found) return found;
		}
	}
	return undefined;
};

/**
 * Execute a menu item's action (custom handler first, then a dispatched event).
 * No-op for disabled items or items with neither.
 */
export const runMenuItemAction = (
	item: ClassicyMenuItem,
	dispatch: (action: { type: string } & Record<string, unknown>) => void,
): void => {
	if (item.disabled) return;
	if (item.onClickFunc) {
		item.onClickFunc();
		return;
	}
	if (item.event && item.eventData) {
		dispatch({ type: item.event, ...item.eventData });
	}
};

// Fixed HIG-ish canonical order for building a stable key from modifier flags.
const buildChord = (
	flags: {
		control?: boolean;
		option?: boolean;
		shift?: boolean;
		command?: boolean;
	},
	key: string,
): string => {
	const mods: string[] = [];
	if (flags.control) mods.push("control");
	if (flags.option) mods.push("option");
	if (flags.shift) mods.push("shift");
	if (flags.command) mods.push("command");
	return [...mods, key].join("+");
};

/**
 * Canonical string form of a declared shortcut, used as a registry key and for
 * conflict detection. `"Cmd+Shift+S"` → `"shift+command+s"`, `"⌥H"` → `"option+h"`.
 * Returns `""` for a modifier-only or empty chord (never a usable shortcut).
 */
export const canonicalChord = (raw: string | undefined): string => {
	const p = parseKeyboardShortcut(raw);
	if (!p.key) return "";
	return buildChord(p, KEY_GLYPH_NAMES[p.key] ?? p.key.toLowerCase());
};

const keyFromEvent = (e: KeyboardEvent): string => {
	// The spacebar's logical `key` is a literal " " character; normalize it to
	// the word "space" so it matches `canonicalChord("Ctrl+Space")` ("control+space").
	if (e.key === " ") return "space";
	// Option remaps a letter's logical `key` to a composed/dead-key character
	// (Option+X -> "≈"); fall back to the physical `code` in that case so the
	// derived key is still the pressed letter, not the composed glyph.
	if (e.altKey && e.code && !/^[a-z0-9]$/i.test(e.key)) {
		if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
		if (e.code.startsWith("Digit")) return e.code.slice(5);
	}
	if (e.key && e.key.length === 1) return e.key.toLowerCase();
	if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
	if (e.code.startsWith("Digit")) return e.code.slice(5);
	const k = (e.key || "").toLowerCase();
	return k === "meta" || k === "control" || k === "shift" || k === "alt"
		? ""
		: k;
};

/**
 * Canonical chord candidates an event could satisfy, mirroring
 * `shortcutMatchesEvent`: Command matches meta-OR-ctrl, so a physical Ctrl press
 * yields both a `command+…` and a `control+…` candidate. The `option`/`shift`
 * flags of each candidate always equal the event's `altKey`/`shiftKey` (a
 * declared shortcut only matches when those agree). Returns `[]` when no chord
 * modifier is down or no usable key is present, and, under the active
 * package's `layout.keyboard.command` `"ctrl"` (Windows 98), when the Windows
 * key (`metaKey`) is held: Command is Control alone there.
 */
export const canonicalChordsFromEvent = (e: KeyboardEvent): string[] => {
	const key = keyFromEvent(e);
	if (!key) return [];
	if (e.metaKey && classicyCommandIsCtrl()) return [];
	const option = e.altKey;
	const shift = e.shiftKey;
	const out: string[] = [];
	if (e.metaKey || e.ctrlKey) {
		out.push(buildChord({ command: true, option, shift }, key));
	}
	if (e.ctrlKey) {
		out.push(buildChord({ control: true, option, shift }, key));
	}
	if (option && !e.metaKey && !e.ctrlKey) {
		out.push(buildChord({ option: true, shift }, key));
	}
	return [...new Set(out)];
};

/**
 * All canonical chords declared by a menu tree, skipping `nativeShortcut` items
 * (handled by the browser) and modifier-only/empty chords. Recurses submenus.
 */
export const collectMenuChords = (items: ClassicyMenuItem[]): string[] => {
	const acc = new Set<string>();
	const walk = (list: ClassicyMenuItem[]) => {
		for (const item of list) {
			if (item.keyboardShortcut && !item.nativeShortcut) {
				const c = canonicalChord(item.keyboardShortcut);
				if (c) acc.add(c);
			}
			if (item.menuChildren?.length) walk(item.menuChildren);
		}
	};
	walk(items);
	return [...acc];
};

/** F1–F24. HIG: a keyboard equivalent needs a command key or a function key. */
export const isFunctionKey = (key: string): boolean =>
	/^f([1-9]|1\d|2[0-4])$/i.test(key);

/**
 * The modifiers' names as Windows' keycaps and menus write them (WIG Ch.7
 * "Shortcut Keys in Menu Items", p.110: "Display CTRL and SHIFT key
 * combinations as Ctrl+key ... and Shift+key"): Control is Ctrl, Option the
 * Alt key it is on a PC keyboard, Shift Shift, and Command, which has no
 * Windows name, the Windows key it is matched against (`metaKey`).
 */
export const CLASSICY_MODIFIER_KEY_NAMES = {
	control: "Ctrl",
	option: "Alt",
	shift: "Shift",
	command: "Win",
} as const satisfies Record<ClassicyModifierName, string>;

// A key's glyph or name, lower-cased, and the name its keycap carries.
const KEYCAP_NAMES: Readonly<Record<string, string>> = {
	"⌫": "Backspace",
	backspace: "Backspace",
	"⌦": "Del",
	delete: "Del",
	del: "Del",
	"↑": "Up",
	arrowup: "Up",
	up: "Up",
	"↓": "Down",
	arrowdown: "Down",
	down: "Down",
	"←": "Left",
	arrowleft: "Left",
	left: "Left",
	"→": "Right",
	arrowright: "Right",
	right: "Right",
	"⎋": "Esc",
	escape: "Esc",
	esc: "Esc",
	"↩": "Enter",
	"⏎": "Enter",
	"⌤": "Enter",
	return: "Enter",
	enter: "Enter",
	"⇥": "Tab",
	tab: "Tab",
	"␣": "Space",
	space: "Space",
	"⇞": "PgUp",
	pageup: "PgUp",
	pgup: "PgUp",
	"⇟": "PgDn",
	pagedown: "PgDn",
	pgdn: "PgDn",
	"↖": "Home",
	home: "Home",
	"↘": "End",
	end: "End",
	insert: "Ins",
	ins: "Ins",
};

/**
 * A shortcut's key as its keycap names it, for the names spelling: ⌫
 * Backspace, ⌦ Del, the arrows Up, Down, Left and Right, Escape Esc, Return
 * Enter, a function key as it is (F1), a single character upper-cased;
 * anything else unchanged.
 */
export const classicyKeycapName = (key: string): string => {
	const named = KEYCAP_NAMES[key.toLowerCase()];
	if (named) return named;
	if (isFunctionKey(key) || Array.from(key).length === 1)
		return key.toUpperCase();
	return key;
};

/** How the names spelling writes Command (`formatKeyboardShortcutNames`, `ClassicyKbd`). */
export type ClassicyShortcutNameOptions = {
	/**
	 * Command (⌘) is the Control key, spelled `Ctrl` (a Control and a
	 * Command both held are then one `Ctrl`); else the Windows key it is
	 * matched against, `Win`. `classicyCommandSpelledCtrl` decides it.
	 */
	commandIsCtrl?: boolean;
};

/**
 * Is a chord's Command spelled `Ctrl` by the names spelling? While the
 * package's `layout.keyboard.command` is `"ctrl"` (Command answers to Control
 * alone there, `classicyCommandIsCtrl`), and, for a `nativeShortcut` chord
 * (the browser's own editing keys: Cut, Copy, Paste, Undo, Select All) off a
 * Mac, whatever it says, since the browser answers Ctrl there (WIG Ch.5
 * "Shortcut Keys for Transfer Operations", pp.67-68: CTRL+X, CTRL+C,
 * CTRL+V). Else `Win`, the key it is matched against.
 */
export const classicyCommandSpelledCtrl = ({
	layout,
	nativeShortcut = false,
	mac = isClassicyMacPlatform(),
}: {
	layout?: Pick<ClassicyAppearanceLayout, "keyboard">;
	nativeShortcut?: boolean;
	mac?: boolean;
} = {}): boolean => classicyCommandIsCtrl(layout) || (nativeShortcut && !mac);

/**
 * A shortcut's modifiers as the names spelling writes them, in canonical
 * order (Ctrl, Alt, Shift, Win): each one's name
 * (`CLASSICY_MODIFIER_KEY_NAMES`). Under `commandIsCtrl` Command is the
 * Control key, named `Ctrl` in Control's place, first ("⇧⌘Z" ->
 * Ctrl, Shift, as Windows writes Ctrl+Shift+Z), and a chord holding
 * Control too names it once (Control's).
 */
export const classicyShortcutModifierNames = (
	shortcut: string | ParsedKeyboardShortcut | undefined,
	{ commandIsCtrl = false }: ClassicyShortcutNameOptions = {},
): { modifier: ClassicyModifierName; name: string }[] => {
	const p =
		typeof shortcut === "object" ? shortcut : parseKeyboardShortcut(shortcut);
	const modifiers = setModifiers(p);
	if (commandIsCtrl && p.command) {
		const rest = modifiers.filter(
			(modifier) => modifier !== "command" && modifier !== "control",
		);
		return [
			{
				modifier: p.control ? "control" : "command",
				name: CLASSICY_MODIFIER_KEY_NAMES.control,
			},
			...rest.map((modifier) => ({
				modifier,
				name: CLASSICY_MODIFIER_KEY_NAMES[modifier],
			})),
		];
	}
	return modifiers.map((modifier) => ({
		modifier,
		name: CLASSICY_MODIFIER_KEY_NAMES[modifier],
	}));
};

/**
 * A shortcut spelled as Windows' menus write it: the modifiers' names in
 * canonical order (Ctrl, Alt, Shift, Win), then the key's
 * (`classicyKeycapName`), joined by `+` with no spaces: "Cmd+Shift+S" ->
 * "Shift+Win+S", "⌃⌫" -> "Ctrl+Backspace", "F1" -> "F1". With
 * `commandIsCtrl` Command is `Ctrl` (`classicyCommandSpelledCtrl`): "⌘S" ->
 * "Ctrl+S", "⌃⌘S" -> "Ctrl+S". `formatKeyboardShortcut` is the glyph
 * spelling.
 */
export const formatKeyboardShortcutNames = (
	raw: string | undefined,
	options: ClassicyShortcutNameOptions = {},
): string => {
	const p = parseKeyboardShortcut(raw);
	const names: string[] = classicyShortcutModifierNames(p, options).map(
		({ name }) => name,
	);
	if (p.key) names.push(classicyKeycapName(p.key));
	return names.join("+");
};

/**
 * A shortcut broken into its displayed parts in HIG order, modifier glyphs
 * then the key: "Ctrl+Cmd+S" -> ["⌃", "⌘", "S"]. Joined with " + " this is the
 * spelled-out form a keyboard-equivalent field shows ("⌃ + ⌘ + S", HIGOS8
 * Figure 6-8), where a menu shows the compact "⌃⌘S".
 */
export const keyboardShortcutParts = (raw: string | undefined): string[] => {
	const p = parseKeyboardShortcut(raw);
	if (!p.key) return [];
	return [
		...setModifiers(p).map((name) => CLASSICY_MODIFIER_GLYPHS[name]),
		p.key,
	];
};

/** Is the host a Mac? See `keyboardShortcutFromEvent` for why it matters. */
export const isClassicyMacPlatform = (): boolean => {
	if (typeof navigator === "undefined") return false;
	const nav = navigator as Navigator & {
		userAgentData?: { platform?: string };
	};
	const platform =
		nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
	return /mac/i.test(platform);
};

/**
 * Record a keydown as a shortcut in display form ("⌃⌘S", "⇧⌘?", "F5"), or ""
 * while only modifiers are down. The result round-trips through
 * `shortcutMatchesEvent`, so it can go straight into a menu item's
 * `keyboardShortcut`.
 *
 * Command is the Meta key. Off a Mac, Classicy's ⌘ shortcuts already answer to
 * Ctrl (see `shortcutMatchesEvent`), so a physical Ctrl press records as ⌘
 * there; on a Mac it records as Control (⌃). Under the active package's
 * `layout.keyboard.command` `"ctrl"` (`commandIsCtrl`; Windows 98), where
 * ⌘ answers to Control alone, Control records as ⌘ on any host and a key
 * pressed with the Windows key (Meta) records nothing, as it runs nothing.
 */
export const keyboardShortcutFromEvent = (
	e: KeyboardEvent,
	{
		mac = isClassicyMacPlatform(),
		commandIsCtrl = classicyCommandIsCtrl(),
	}: { mac?: boolean; commandIsCtrl?: boolean } = {},
): string => {
	const key = keyFromEvent(e);
	if (!key) return "";
	if (commandIsCtrl && e.metaKey) return "";
	const ctrlIsCommand = !mac || commandIsCtrl;
	let display: string;
	if (key === "space") display = "Space";
	else if (key.length === 1 || isFunctionKey(key)) display = key.toUpperCase();
	else display = e.key;
	const held: Record<ClassicyModifierName, boolean> = {
		control: !ctrlIsCommand && e.ctrlKey,
		option: e.altKey,
		shift: e.shiftKey,
		command: e.metaKey || (ctrlIsCommand && e.ctrlKey),
	};
	return modifierGlyphs(setModifiers(held)) + display;
};

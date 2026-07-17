import he from "he";
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

const MODIFIER_GLYPHS = {
	control: "⌃",
	option: "⌥",
	shift: "⇧",
	command: "⌘",
} as const;

// Each modifier's recognized textual/glyph spellings. Order here is also the
// canonical HIG display order (Control, Option, Shift, Command).
const MODIFIER_PATTERNS: ReadonlyArray<{
	flag: keyof typeof MODIFIER_GLYPHS;
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

/**
 * Normalize a shortcut string to its platinum display form, e.g.
 * "Cmd+Shift+S" -> "⇧⌘S", "⌘N" -> "⌘N", "F1" -> "F1". Idempotent.
 */
export const formatKeyboardShortcut = (raw: string | undefined): string => {
	const p = parseKeyboardShortcut(raw);
	const glyphs =
		(p.control ? MODIFIER_GLYPHS.control : "") +
		(p.option ? MODIFIER_GLYPHS.option : "") +
		(p.shift ? MODIFIER_GLYPHS.shift : "") +
		(p.command ? MODIFIER_GLYPHS.command : "");
	return glyphs + p.key;
};

/**
 * Match a shortcut's key against a keydown event by BOTH the logical key
 * (`e.key`) and the physical key (`e.code`). The physical fallback is essential
 * for Option/Alt equivalents: on macOS, Option+&lt;letter&gt; remaps `e.key` to a
 * composed/dead-key character (Option+E → "Dead"/"´"), but `e.code` stays
 * `KeyE`, so only a code match survives.
 */
const keyMatchesEvent = (key: string, e: KeyboardEvent): boolean => {
	if (!key) return false;
	const k = key.toLowerCase();
	if (e.key.toLowerCase() === k) return true;
	if (/^[a-z]$/.test(k) && e.code === `Key${k.toUpperCase()}`) return true;
	if (/^[0-9]$/.test(k) && e.code === `Digit${k}`) return true;
	return false;
};

/**
 * Does a keydown event satisfy this shortcut? Command is matched against
 * meta-or-ctrl (mirrors `useKeyboardEquivalents`) so it works on any platform.
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

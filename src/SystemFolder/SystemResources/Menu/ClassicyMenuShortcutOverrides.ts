import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	canonicalChord,
	isFunctionKey,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

/**
 * The user's own keyboard shortcuts for the bundled apps' menu items (WIG
 * Ch.4 "Shortcut Keys" (p.27): "let the user change shortcut assignments
 * where possible"), stored as `System.Manager.Desktop.shortcutOverrides`:
 * a menu item's shortcut id to a canonical chord (`canonicalChord`,
 * `"control+o"`). Store-free: the reducer, the load migration and the
 * menu builders' hook (`useClassicyMenuItemShortcut`) all read these.
 */
export type ClassicyShortcutOverrides = Readonly<Record<string, string>>;

/** The longest shortcut id the store keeps. */
export const CLASSICY_SHORTCUT_OVERRIDE_ID_MAX = 128;

// Names a plain object would read through its prototype.
const RESERVED_IDS: ReadonlySet<string> = new Set([
	"__proto__",
	"constructor",
	"prototype",
]);

/**
 * Whether the package lets the user edit the bundled apps' shortcuts
 * (`layout.keyboard.editableShortcuts`, Windows 98). `layout` defaults to
 * the active package's, read at call time; a reducer passes its draft's
 * package's (`getClassicyAppearanceLayout(packageId)`).
 */
export const classicyEditableShortcuts = (
	layout: Pick<
		ClassicyAppearanceLayout,
		"keyboard"
	> = getClassicyAppearanceLayout(),
): boolean => layout.keyboard?.editableShortcuts === true;

/** A usable shortcut id: 1-128 characters, never a prototype name. */
export const isClassicyShortcutOverrideId = (id: unknown): id is string =>
	typeof id === "string" &&
	id.length > 0 &&
	id.length <= CLASSICY_SHORTCUT_OVERRIDE_ID_MAX &&
	!RESERVED_IDS.has(id);

/**
 * The stored form of a shortcut (`canonicalChord`), or `""` when it is not
 * one a menu could carry: no key, or neither Command, Control, Option
 * nor a function key (a bare or shifted letter is typing, never a command).
 */
export const classicyShortcutOverrideChord = (shortcut: unknown): string => {
	if (typeof shortcut !== "string") return "";
	const chord = canonicalChord(shortcut);
	if (!chord) return "";
	const parsed = parseKeyboardShortcut(shortcut);
	// Shift alone with a letter is typing a capital.
	const modified = parsed.command || parsed.control || parsed.option;
	return modified || isFunctionKey(parsed.key) ? chord : "";
};

// The key a canonical chord ends with, as a menu writes it: a letter in
// capitals, F1 to F24 so, Backspace and Delete as Mac OS's ⌫ and ⌦.
const KEY_DISPLAY: Readonly<Record<string, string>> = {
	backspace: "⌫",
	delete: "⌦",
};
const displayKey = (key: string): string => {
	if (Object.hasOwn(KEY_DISPLAY, key)) return KEY_DISPLAY[key];
	if (key.length === 1 || /^f\d{1,2}$/.test(key)) return key.toUpperCase();
	return key.charAt(0).toUpperCase() + key.slice(1);
};

/**
 * A stored canonical chord in a menu item's form: `"control+o"` -> `"⌃O"`,
 * `"shift+command+s"` -> `"⇧⌘S"`. `""` for a chord with no key.
 */
export const classicyShortcutFromChord = (chord: string): string => {
	const parsed = parseKeyboardShortcut(chord);
	if (!parsed.key) return "";
	return `${parsed.control ? "⌃" : ""}${parsed.option ? "⌥" : ""}${
		parsed.shift ? "⇧" : ""
	}${parsed.command ? "⌘" : ""}${displayKey(parsed.key.toLowerCase())}`;
};

/**
 * A stored map made safe to read: only usable ids holding a usable chord,
 * each in its canonical form. Returns the same object when it already is
 * (so the load migration is idempotent), `undefined` for anything that is
 * not a map or keeps no entry.
 */
export const validClassicyShortcutOverrides = (
	value: unknown,
): ClassicyShortcutOverrides | undefined => {
	if (!value || typeof value !== "object" || Array.isArray(value))
		return undefined;
	const entries = Object.entries(value as Record<string, unknown>);
	const kept: Record<string, string> = {};
	let changed = Object.getPrototypeOf(value) !== Object.prototype;
	for (const [id, shortcut] of entries) {
		const chord = classicyShortcutOverrideChord(shortcut);
		if (!isClassicyShortcutOverrideId(id) || !chord) {
			changed = true;
			continue;
		}
		if (chord !== shortcut) changed = true;
		kept[id] = chord;
	}
	if (Object.keys(kept).length === 0) return undefined;
	return changed ? kept : (value as ClassicyShortcutOverrides);
};

/**
 * The chord a bundled menu item carries: the user's override for
 * `itemId`, in a menu item's form, when `overrides` (given only while
 * `classicyEditableShortcuts`) holds one, else the app's own `chord`.
 */
export const resolveClassicyMenuItemShortcut = (
	overrides: ClassicyShortcutOverrides | undefined,
	itemId: string,
	chord: string,
): string => {
	if (!overrides || !Object.hasOwn(overrides, itemId)) return chord;
	return classicyShortcutFromChord(overrides[itemId]) || chord;
};

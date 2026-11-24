import {
	formatKeyboardShortcut,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

/**
 * The default chord for switching to the next application: Control-` (the
 * key above Tab), with Shift for the previous one. Mac OS 8.5 used
 * Command-Tab and Command-Shift-Tab (Mac OS Help, "Switching between open
 * programs"); in a browser Command-Tab and Alt-Tab belong to the operating
 * system, Control-Tab to the browser's tabs, and Command stays the
 * browser's, so Classicy moves the chord to Control, as its other keyboard
 * equivalents, and to the key beside Tab. Real keystrokes reach a page with
 * it in Chromium and Firefox (X11, the report of story 0231-8c6), where
 * Control-Tab and Control-Shift-Tab do not.
 */
export const CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT = "⌃`";

/** The chord with Shift added: the previous application ("⌃⇧`"). */
export const classicyAppSwitcherReverseShortcut = (shortcut: string): string =>
	formatKeyboardShortcut(`⇧${shortcut}`);

/**
 * A chord the switcher can use: a key and at least one of Control, Option
 * and Command, and no Shift (Shift reverses the direction), as Mac OS 8.5's
 * shortcut script asked for one modifier (Command, Control or Option) and
 * any single key.
 */
export const isClassicyAppSwitcherShortcut = (shortcut: string): boolean => {
	const p = parseKeyboardShortcut(shortcut);
	return p.key !== "" && !p.shift && (p.control || p.option || p.command);
};

/**
 * Why a recorded chord cannot switch applications, as the keyboard
 * equivalent dialog's alert heading, or `null` when it can.
 */
export const classicyAppSwitcherShortcutProblem = (
	shortcut: string,
): string | null => {
	const p = parseKeyboardShortcut(shortcut);
	if (p.shift)
		return "The keyboard equivalent cannot include the Shift key: Shift switches to the previous application.";
	if (!(p.control || p.option || p.command))
		return "The keyboard equivalent must include the Control, Option or Command key.";
	return null;
};

// The unshifted character of a punctuation key on the US layout, by its
// physical code, so a chord recorded on that key matches with Shift held
// (Shift-` types "~") and on a layout that types another character there.
const PUNCTUATION_BY_CODE: Readonly<Record<string, string>> = {
	Backquote: "`",
	Minus: "-",
	Equal: "=",
	BracketLeft: "[",
	BracketRight: "]",
	Backslash: "\\",
	Semicolon: ";",
	Quote: "'",
	Comma: ",",
	Period: ".",
	Slash: "/",
};

const physicalKey = (code: string): string | undefined => {
	if (code.startsWith("Key")) return code.slice(3).toLowerCase();
	if (code.startsWith("Digit")) return code.slice(5);
	return PUNCTUATION_BY_CODE[code];
};

/**
 * Which way a keydown switches applications with `shortcut`: `1` for the
 * next application, `-1` for the previous one (the same chord with Shift),
 * `0` for neither. The modifiers follow `shortcutMatchesEvent`'s rules
 * (Command is Meta or Control; Option-only needs no Control or Meta), and
 * the key matches by the character typed or by the physical key.
 */
export const classicyAppSwitcherChordDirection = (
	shortcut: string,
	e: Pick<
		KeyboardEvent,
		"key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
	>,
): 1 | -1 | 0 => {
	if (!isClassicyAppSwitcherShortcut(shortcut)) return 0;
	const p = parseKeyboardShortcut(shortcut);
	const cmdOrCtrl = e.metaKey || e.ctrlKey;
	if (p.command) {
		if (!cmdOrCtrl) return 0;
	} else if (p.control) {
		if (!e.ctrlKey || e.metaKey) return 0;
	} else if (!e.altKey || cmdOrCtrl) {
		return 0;
	}
	if (p.option !== e.altKey) return 0;
	const want = p.key.toLowerCase();
	const typed = (e.key ?? "").toLowerCase();
	if (typed !== want && physicalKey(e.code ?? "") !== want) return 0;
	return e.shiftKey ? -1 : 1;
};

/**
 * The application after (`1`) or before (`-1`) `frontId` in `ids` (the
 * Application menu's order), wrapping around, as Command-Tab and
 * Command-Shift-Tab went through Mac OS 8.5's list. A front application not
 * in the list starts from the list's first (or last) one. `undefined` when
 * there is no other application to switch to.
 */
export const nextClassicyAppSwitcherAppId = (
	ids: readonly string[],
	frontId: string | undefined,
	direction: 1 | -1,
): string | undefined => {
	if (ids.length === 0) return undefined;
	const at = frontId === undefined ? -1 : ids.indexOf(frontId);
	if (at < 0) return direction === 1 ? ids[0] : ids[ids.length - 1];
	if (ids.length < 2) return undefined;
	return ids[(at + direction + ids.length) % ids.length];
};

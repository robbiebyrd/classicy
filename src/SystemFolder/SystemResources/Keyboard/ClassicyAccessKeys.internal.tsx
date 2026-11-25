import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	isClassicyMacPlatform,
	shortcutMatchesEvent,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Access keys (mnemonics): one character of a menu title, a menu item or a
 * control's label that, typed, reaches it (WIG Ch.4 "Access Keys" (p.27);
 * Ch.7 "Menu Titles" (p.106), "Menu Item Labels" (p.109); Ch.8 "Navigation
 * in Secondary Windows" (pp.148-149)). The menus (`ClassicyMenu`) and the
 * labels (`ClassicyControlLabel`) share what is here: the pick, the
 * underlined part, the typed character, and the menu bars' claims a label
 * defers to.
 * @internal
 */

/** A resolved access key: the character typed, and where the title shows it. */
export type ClassicyAccessKey = {
	/** The character, lower-cased. */
	readonly key: string;
	/** Its index in the title (UTF-16 units); -1 when the title lacks it. */
	readonly index: number;
};

/**
 * How access keys are assigned (`layout.menu.accessKeys`); `undefined`, the
 * package declaring none, gives no entry a key, an explicit one included.
 */
export type ClassicyAccessKeyMode = "explicit" | "auto";

// A letter or a digit: what an access key may be (WIG Ch.4 "Access Keys",
// p.27: "an alphanumeric key").
const ALNUM = /^[\p{L}\p{N}]$/u;
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

const lower = (s: string) => s.toLowerCase();

/**
 * An `accessKey` as given, normalized: its one character lower-cased, `""`
 * for an explicit "none" (an empty string), `undefined` for none given. A
 * value longer than one character keeps its first (code point).
 */
export const normalizeClassicyAccessKey = (
	raw: string | undefined,
): string | undefined => {
	if (raw === undefined) return undefined;
	const first = Array.from(raw)[0];
	return first === undefined ? "" : lower(first);
};

/**
 * Where `key` shows in `text`: its first match in the key's own case, else
 * its first case-insensitive match, so `"a"` on "Favorites" is its second
 * letter and `"A"` on "Save As" the start of "As". -1 when absent.
 */
export const classicyAccessKeyIndex = (text: string, key: string): number => {
	if (!key) return -1;
	const exact = text.indexOf(key);
	if (exact >= 0) return exact;
	return lower(text).indexOf(lower(key));
};

// `text`'s characters with their indices, code point by code point.
const charsOf = (text: string): { ch: string; index: number }[] => {
	const out: { ch: string; index: number }[] = [];
	let index = 0;
	for (const ch of text) {
		out.push({ ch, index });
		index += ch.length;
	}
	return out;
};

/**
 * The character of `text` an automatic access key takes, as its index, or
 * -1 when every candidate is `taken` (lower-cased keys). In WIG Ch.4's order
 * of choice ("Access Keys", p.27): the label's first letter; then the first
 * letter of each later word (a better mnemonic association: Save As's "A");
 * then a consonant; then a vowel, each from the left. Letters and digits
 * only.
 */
export const classicyAutoAccessKeyIndex = (
	text: string,
	taken: ReadonlySet<string>,
): number => {
	const chars = charsOf(text);
	const candidates = chars.filter(({ ch }) => ALNUM.test(ch));
	const free = ({ ch }: { ch: string }) => !taken.has(lower(ch));
	const first = candidates[0];
	if (first && free(first)) return first.index;
	const wordStarts = chars.filter(
		(c, i) => ALNUM.test(c.ch) && i > 0 && !ALNUM.test(chars[i - 1].ch),
	);
	const consonants = candidates.filter((c) => !VOWELS.has(lower(c.ch)));
	const vowels = candidates.filter((c) => VOWELS.has(lower(c.ch)));
	for (const group of [wordStarts, consonants, vowels]) {
		const hit = group.find(free);
		if (hit) return hit.index;
	}
	return -1;
};

/** One sibling as the assignment sees it. */
export type ClassicyAccessKeyEntry = {
	/** Its text (a menu item's decoded title); empty for none. */
	text: string;
	/** Its `accessKey` as given (`""`: none, even under `"auto"`). */
	accessKey?: string;
};

/**
 * The access keys of a set of siblings (one menu's items, a menu bar's
 * titles, a window's labels), aligned with `entries`: null where an entry
 * has none. An explicit `accessKey` is always its entry's, and is reserved
 * before any automatic pick, so `"auto"` never takes a letter an explicit
 * sibling holds (Windows 98's Start menu: Favorites "a", Find "F"). Under
 * `"auto"`, every other entry with text takes the first free character
 * `classicyAutoAccessKeyIndex` finds, in order; one with none free has none.
 * Explicit siblings may share a key (typing it then moves between them).
 * With no `mode` (a package that declares no `layout.menu.accessKeys`: Mac
 * OS 8 and System 7, which had no access keys) no entry has one.
 */
export const resolveClassicyAccessKeys = (
	entries: readonly ClassicyAccessKeyEntry[],
	mode: ClassicyAccessKeyMode | undefined,
): (ClassicyAccessKey | null)[] => {
	if (mode === undefined) return entries.map(() => null);
	const taken = new Set<string>();
	const out: (ClassicyAccessKey | null)[] = entries.map((entry) => {
		const key = normalizeClassicyAccessKey(entry.accessKey);
		if (!key) return null;
		taken.add(key);
		// Placed in the case it was given: "S" on "Settings" is its first letter.
		const given = Array.from(entry.accessKey ?? "")[0] ?? key;
		return { key, index: classicyAccessKeyIndex(entry.text, given) };
	});
	if (mode !== "auto") return out;
	entries.forEach((entry, i) => {
		if (entry.accessKey !== undefined || !entry.text) return;
		const index = classicyAutoAccessKeyIndex(entry.text, taken);
		if (index < 0) return;
		const key = lower(String.fromCodePoint(entry.text.codePointAt(index) ?? 0));
		taken.add(key);
		out[i] = { key, index };
	});
	return out;
};

const accessKeyPart = (ch: string, key?: string) => (
	<span key={key} {...{ [CLASSICY_PART_ATTRIBUTE.part]: "access-key" }}>
		{ch}
	</span>
);

/**
 * `text` with its access key's character wrapped in
 * `<span data-classicy-part="access-key">`, which a package underlines; the
 * whole in one `<span>`, so a flex container (a menu item's title) lays it
 * out as one run and keeps its spaces. `text` itself when there is nothing
 * to show.
 */
export const renderClassicyAccessKeyText = (
	text: string,
	accessKey: ClassicyAccessKey | null | undefined,
): ReactNode => {
	const index = accessKey?.index ?? -1;
	if (index < 0 || index >= text.length) return text;
	const ch = String.fromCodePoint(text.codePointAt(index) ?? 0);
	return (
		<span>
			{text.slice(0, index)}
			{accessKeyPart(ch)}
			{text.slice(index + ch.length)}
		</span>
	);
};

/**
 * The text a label shows, for the automatic pick: its strings and numbers,
 * through the `children` of the elements in it, in order (an element's own
 * rendering is not seen, so a component's inner text never counts).
 */
export const classicyNodeText = (node: ReactNode): string => {
	if (node === null || node === undefined || typeof node === "boolean")
		return "";
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(classicyNodeText).join("");
	if (isValidElement(node))
		return classicyNodeText((node.props as { children?: ReactNode }).children);
	return "";
};

/**
 * `node` (a label's content) with the character at `index` of its
 * `classicyNodeText` wrapped in the access-key part, inside the element that
 * holds it (so `<em>Name</em>` underlines inside the `<em>`). `node` itself
 * when there is nothing to show.
 */
export const renderClassicyAccessKeyNode = (
	node: ReactNode,
	accessKey: ClassicyAccessKey | null | undefined,
): ReactNode => {
	const index = accessKey?.index ?? -1;
	if (index < 0) return node;
	let offset = 0;
	let done = false;
	const walk = (n: ReactNode, key?: string): ReactNode => {
		if (done || n === null || n === undefined || typeof n === "boolean")
			return n;
		if (typeof n === "string" || typeof n === "number") {
			const s = String(n);
			const at = index - offset;
			offset += s.length;
			if (at < 0 || at >= s.length) return n;
			done = true;
			const ch = String.fromCodePoint(s.codePointAt(at) ?? 0);
			return (
				<span key={key}>
					{s.slice(0, at)}
					{accessKeyPart(ch)}
					{s.slice(at + ch.length)}
				</span>
			);
		}
		if (Array.isArray(n))
			return Children.map(n, (child, i) => walk(child, String(i)));
		if (isValidElement(n)) {
			const el = n as ReactElement<{ children?: ReactNode }>;
			if (el.props.children === undefined) return n;
			const wasDone = done;
			const children = walk(el.props.children);
			return !wasDone && done ? cloneElement(el, undefined, children) : n;
		}
		return n;
	};
	return walk(node);
};

// The letter or digit a physical key is (`KeyF` → "f", `Digit1` → "1").
const charOfCode = (code: string | undefined): string | null => {
	if (!code) return null;
	if (/^Key[A-Z]$/.test(code)) return lower(code.slice(3));
	if (/^Digit[0-9]$/.test(code)) return code.slice(5);
	return null;
};

/**
 * The access-key character a keydown types, lower-cased, or null: the key
 * itself when it is one letter or digit, else its physical key's. With
 * Option on a Mac, the physical key's alone, since Option composes another
 * character there (Option+F types "ƒ", itself a letter).
 */
export const classicyAccessKeyFromEvent = (
	e: { key: string; code?: string; altKey?: boolean },
	{ mac = isClassicyMacPlatform() }: { mac?: boolean } = {},
): string | null => {
	if (e.altKey && mac) return charOfCode(e.code);
	const chars = Array.from(e.key ?? "");
	if (chars.length === 1 && ALNUM.test(chars[0])) return lower(chars[0]);
	return e.altKey ? charOfCode(e.code) : null;
};

/** Is `el` a text entry (a text field, a text area, editable content)? */
export const isClassicyTextEntry = (el: Element | null): boolean => {
	if (!(el instanceof HTMLElement)) return false;
	if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
	if (el.tagName !== "INPUT") return false;
	const type = (el as HTMLInputElement).type;
	return !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(
		type,
	);
};

/** The element the access keys of `el` are unique within: its window, else the document. */
export const classicyAccessKeyScopeOf = (el: Element): Element =>
	el.closest(".classicyWindow") ?? el.ownerDocument.documentElement;

/**
 * The scope the keyboard is in: the window holding focus; with focus on the
 * page itself, the front window (a modal first, else the active window with
 * the highest `z-index`); else the document.
 */
export const classicyFocusedAccessKeyScope = (doc: Document): Element => {
	const active = doc.activeElement;
	if (active && active !== doc.body && active !== doc.documentElement)
		return classicyAccessKeyScopeOf(active);
	const modals = doc.querySelectorAll(".classicyWindow.classicyWindowModal");
	if (modals.length > 0) return modals[modals.length - 1];
	let front: Element | null = null;
	let frontZ = Number.NEGATIVE_INFINITY;
	for (const win of Array.from(
		doc.querySelectorAll(".classicyWindow.active"),
	)) {
		const z = Number.parseInt((win as HTMLElement).style.zIndex, 10);
		const at = Number.isNaN(z) ? 0 : z;
		if (at >= frontZ) {
			front = win;
			frontZ = at;
		}
	}
	return front ?? doc.documentElement;
};

/** Is `scope` a modal window (a dialog, which no menu bar reaches into)? */
export const isClassicyModalAccessKeyScope = (scope: Element): boolean =>
	scope.classList.contains("classicyWindowModal");

/** Does any item of `items`, its submenus included, take `e` as its keyboard equivalent? */
export const classicyMenuItemsHaveChord = (
	items: readonly ClassicyMenuItem[] | undefined,
	e: KeyboardEvent,
): boolean =>
	(items ?? []).some(
		(item) =>
			(item.keyboardShortcut !== undefined &&
				shortcutMatchesEvent(item.keyboardShortcut, e)) ||
			classicyMenuItemsHaveChord(item.menuChildren, e),
	);

/** A menu bar, as the labels' access keys see it. */
export type ClassicyAccessKeyMenuBar = {
	/** It takes Alt+`key` now (it is the active bar, and a title has the key). */
	claims: (key: string) => boolean;
	/** One of its items has `e` as its keyboard equivalent (an Option chord). */
	hasChord: (e: KeyboardEvent) => boolean;
};

const menuBars = new Set<ClassicyAccessKeyMenuBar>();

/** Registers a menu bar's claims; returns its removal. */
export const registerClassicyAccessKeyMenuBar = (
	bar: ClassicyAccessKeyMenuBar,
): (() => void) => {
	menuBars.add(bar);
	return () => {
		menuBars.delete(bar);
	};
};

/**
 * Does a menu bar take Alt+`key`? In a primary window the bar receives an
 * access key its titles share with the window's controls (WIG Ch.7
 * "Interaction with Controls in Toolbars and Status Bars", p.143).
 */
export const classicyMenuBarClaimsAccessKey = (key: string): boolean =>
	Array.from(menuBars).some((bar) => bar.claims(key));

/** Is `e` a keyboard equivalent of a menu bar's item? Classicy's Option chords win over access keys. */
export const classicyMenuBarHasChord = (e: KeyboardEvent): boolean =>
	Array.from(menuBars).some((bar) => bar.hasChord(e));

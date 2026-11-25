import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	type ClassicyAccessKey,
	classicyAccessKeyFromEvent,
	classicyAccessKeyScopeOf,
	classicyFocusedAccessKeyScope,
	classicyMenuBarClaimsAccessKey,
	classicyMenuBarHasChord,
	isClassicyModalAccessKeyScope,
	isClassicyTextEntry,
	normalizeClassicyAccessKey,
	resolveClassicyAccessKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { isClassicyMacPlatform } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

/**
 * The control labels' access keys (`ClassicyControlLabel`'s `accessKey`, or
 * the automatic pick under the package's `layout.menu.accessKeys` `"auto"`):
 * one register for the page, its labels grouped by scope (their window,
 * else the document: WIG Ch.4 "Access Keys" (p.27), unique "within the scope
 * of its interaction") and resolved there in document order, and one window
 * `keydown` listener while any label has a key (WIG Ch.8 "Navigation in
 * Secondary Windows", pp.148-149):
 *
 * - Alt and a label's key, in the window holding focus, moves focus to its
 *   control and activates it as a click would where the control is a check
 *   box, an option button or a button (Wine's `IsDialogMessage`: a button
 *   is clicked, another control focused, an edit field's text selected).
 *   Several labels sharing the key are moved between, none activated. Left
 *   to its owner: a key a handler took (`defaultPrevented`), Control or
 *   Command held, a menu item's keyboard equivalent (Classicy's Option
 *   chords win), a key a menu bar's title holds outside a modal window (the
 *   bar receives it: WIG Ch.7, p.143), focus in a menu, and, on a Mac, focus
 *   in a text entry (where Option types a character).
 * - The key alone does the same while focus is on a check box, an option
 *   button or a button, whose keyboard takes no letters ("if the keyboard is
 *   not being used as input for another control").
 * @internal
 */

type LabelEntry = {
	label: HTMLElement;
	holder: HTMLElement | null;
	text: string;
	/** As given: a character, `""` for none, undefined for none given. */
	accessKey: string | undefined;
	/** The package's `"auto"`: a label of a focusable control takes a key. */
	auto: boolean;
	labelFor: string | undefined;
};

const entries = new Map<symbol, LabelEntry>();
// Each entry's resolved key, as "<key>:<index>".
let assigned = new Map<symbol, string>();
const listeners = new Set<() => void>();

// The controls a key may move focus to (a tab stop or a form control).
const FOCUSABLE =
	'input:not([type="hidden"]), select, textarea, button, [contenteditable=""], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
// The controls a key activates as a click does, and whose own keyboard takes
// no letters.
const BUTTON_LIKE =
	'button, input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="checkbox"], [role="radio"], [role="switch"]';

/** The control `entry` labels: `labelFor`'s element, else the row's own (a clickable row, a control inside it). */
const controlOf = (entry: LabelEntry): HTMLElement | null => {
	if (entry.labelFor) {
		const el = entry.label.ownerDocument.getElementById(entry.labelFor);
		return el instanceof HTMLElement ? el : null;
	}
	const holder = entry.holder;
	if (!holder) return null;
	if (holder.matches(FOCUSABLE)) return holder;
	for (const el of Array.from(holder.querySelectorAll<HTMLElement>(FOCUSABLE)))
		if (!entry.label.contains(el)) return el;
	return null;
};

const isFocusable = (el: HTMLElement | null): el is HTMLElement =>
	el?.matches(FOCUSABLE) === true;

const isUsable = (el: HTMLElement): boolean => {
	if ((el as HTMLInputElement).disabled === true) return false;
	if (el.getAttribute("aria-disabled") === "true") return false;
	if (!el.isConnected) return false;
	// Hidden (a tab's page not shown): where the browser can tell.
	const visible = (el as HTMLElement & { checkVisibility?: () => boolean })
		.checkVisibility;
	return typeof visible === "function" ? visible.call(el) : true;
};

const byDocumentOrder = (a: Node, b: Node) =>
	a === b
		? 0
		: a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
			? -1
			: 1;

/** Resolves every scope's keys again and tells the labels whose key changed. */
const recompute = () => {
	const scopes = new Map<Element, symbol[]>();
	for (const [id, entry] of entries) {
		if (!entry.label.isConnected) continue;
		const scope = classicyAccessKeyScopeOf(entry.label);
		const ids = scopes.get(scope) ?? [];
		ids.push(id);
		scopes.set(scope, ids);
	}
	const next = new Map<symbol, string>();
	for (const ids of scopes.values()) {
		ids.sort((a, b) =>
			byDocumentOrder(
				(entries.get(a) as LabelEntry).label,
				(entries.get(b) as LabelEntry).label,
			),
		);
		const resolved = resolveClassicyAccessKeys(
			ids.map((id) => {
				const entry = entries.get(id) as LabelEntry;
				// A label given none takes one only under "auto", and only for a
				// focusable control: static text names nothing a key can reach.
				const autoable = entry.auto && isFocusable(controlOf(entry));
				return {
					text: entry.text,
					accessKey: entry.accessKey ?? (autoable ? undefined : ""),
				};
			}),
			"auto",
		);
		ids.forEach((id, i) => {
			const key = resolved[i];
			if (key) next.set(id, `${key.key}:${key.index}`);
		});
	}
	const changed =
		next.size !== assigned.size ||
		Array.from(next).some(([id, value]) => assigned.get(id) !== value);
	assigned = next;
	if (changed) for (const listener of Array.from(listeners)) listener();
};

const parse = (value: string | undefined): ClassicyAccessKey | null => {
	if (!value) return null;
	const at = value.lastIndexOf(":");
	return { key: value.slice(0, at), index: Number(value.slice(at + 1)) };
};

const onKeyDown = (e: KeyboardEvent) => {
	if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.isComposing) return;
	const char = classicyAccessKeyFromEvent(e);
	if (char === null) return;
	const doc =
		e.target instanceof Node ? (e.target.ownerDocument ?? document) : document;
	const active = doc.activeElement;
	// A menu takes its own keys (ClassicyMenu).
	if (active?.closest(".classicyMenuWrapper")) return;
	if (e.altKey) {
		if (isClassicyMacPlatform() && isClassicyTextEntry(active)) return;
		if (classicyMenuBarHasChord(e)) return;
	} else if (!(active instanceof HTMLElement && active.matches(BUTTON_LIKE))) {
		return;
	}
	const scope = classicyFocusedAccessKeyScope(doc);
	if (
		e.altKey &&
		!isClassicyModalAccessKeyScope(scope) &&
		classicyMenuBarClaimsAccessKey(char)
	)
		return;
	const matches: HTMLElement[] = [];
	const labels: HTMLElement[] = [];
	for (const [id, entry] of entries) {
		if (parse(assigned.get(id))?.key !== char) continue;
		if (!entry.label.isConnected) continue;
		if (classicyAccessKeyScopeOf(entry.label) !== scope) continue;
		const control = controlOf(entry);
		if (!control || !isUsable(control)) continue;
		labels.push(entry.label);
		matches.push(control);
	}
	if (matches.length === 0) return;
	const order = labels
		.map((label, i) => ({ label, control: matches[i] }))
		.sort((a, b) => byDocumentOrder(a.label, b.label))
		.map(({ control }) => control);
	e.preventDefault();
	if (order.length > 1) {
		const current = order.findIndex(
			(control) => control === active || control.contains(active),
		);
		order[(current + 1) % order.length].focus();
		return;
	}
	const [control] = order;
	control.focus();
	if (control.matches(BUTTON_LIKE)) control.click();
	else if (control instanceof HTMLInputElement && isClassicyTextEntry(control))
		control.select();
};

let listening = false;
const listen = (on: boolean) => {
	if (typeof window === "undefined" || on === listening) return;
	listening = on;
	if (on) window.addEventListener("keydown", onKeyDown);
	else window.removeEventListener("keydown", onKeyDown);
};

/**
 * The access key a `ClassicyControlLabel` shows: its own `accessKey`, else,
 * under the package's `layout.menu.accessKeys` `"auto"`, the automatic pick
 * for a label of a focusable control (unique among its window's labels, an
 * explicit key reserved first). Null for none, and nothing registered: a
 * label with no key under `"explicit"` (Platinum, System 7) adds nothing.
 * @internal
 */
export const useClassicyLabelAccessKey = ({
	labelRef,
	holderRef,
	text,
	accessKey,
	labelFor,
}: {
	labelRef: RefObject<HTMLElement | null>;
	holderRef: RefObject<HTMLElement | null>;
	/** The label's text (`classicyNodeText`). */
	text: string;
	accessKey: string | undefined;
	labelFor: string | undefined;
}): ClassicyAccessKey | null => {
	const auto = useClassicyAppearanceLayout().menu?.accessKeys === "auto";
	const given = normalizeClassicyAccessKey(accessKey);
	const takesPart = text !== "" && (given !== undefined ? given !== "" : auto);
	const idRef = useRef<symbol | null>(null);
	if (idRef.current === null) idRef.current = Symbol("ClassicyControlLabel");
	const [value, setValue] = useState<string | undefined>(undefined);
	useLayoutEffect(() => {
		const id = idRef.current as symbol;
		const label = labelRef.current;
		if (!takesPart || !label) {
			setValue(undefined);
			return;
		}
		const listener = () => setValue(assigned.get(id));
		listeners.add(listener);
		entries.set(id, {
			label,
			holder: holderRef.current,
			text,
			accessKey,
			auto,
			labelFor: labelFor || undefined,
		});
		listen(true);
		recompute();
		// Its own value, set before paint whether or not the pick changed.
		setValue(assigned.get(id));
		return () => {
			listeners.delete(listener);
			entries.delete(id);
			recompute();
			if (entries.size === 0) listen(false);
		};
	}, [takesPart, text, accessKey, auto, labelFor, labelRef, holderRef]);
	return takesPart ? parse(value) : null;
};

/** Clears the register between tests. @internal */
export const resetClassicyLabelAccessKeysForTests = (): void => {
	entries.clear();
	assigned = new Map();
	listeners.clear();
	listen(false);
};

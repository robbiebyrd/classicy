/**
 * Edit-menu commands (Undo / Cut / Copy / Paste / Clear / Select All) that act
 * on the text field the user was last editing.
 *
 * Clicking a menu item moves focus off the field, so we track the last-focused
 * editable element and restore focus to it before running the command. The
 * commands themselves use the browser's native editing (`execCommand` for
 * undo/cut/copy/insert, the Clipboard API for paste) so they integrate with the
 * field's own undo stack and selection.
 *
 * Keyboard equivalents for these commands are handled NATIVELY by the browser
 * while a field is focused (the menu items are flagged `nativeShortcut`), so
 * these functions are only invoked from a menu click.
 *
 * Under a package whose layout says `edit.scope: "window"` (Windows 98; WIG
 * Ch.5 "Operations for a Multiple Selection", p.44) the last field is the
 * target only while its window is an active one, so a command chosen in
 * another window never edits it (`resolveTarget`).
 */

import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const isEditable = (el: EventTarget | null): el is EditableElement => {
	if (!(el instanceof HTMLElement)) return false;
	return (
		el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
	);
};

let lastEditable: EditableElement | null = null;
let trackerInstalled = false;

// --- Undo-state tracking (HIG 4.6: context-aware "Undo <action>" / "Can't Undo").
//
// The browser exposes no reliable API for "is there anything to undo?" or "what
// was the last edit?", so we approximate from input events: each
// content-changing input deepens a field's undo stack; a `historyUndo` shallows
// it and a `historyRedo` deepens it again. Depth + the last action's label are
// tracked per element (WeakMap, so detached fields are collected), and a coarse
// snapshot (canUndo + label) is published for the focused/last field. The
// snapshot's identity changes only when canUndo or the label actually changes —
// never on every keystroke — so a `useSyncExternalStore` consumer re-renders
// just when the menu wording would differ.
type UndoInfo = { depth: number; label?: string };
const undoByElement = new WeakMap<EditableElement, UndoInfo>();

export type ClassicyUndoState = { canUndo: boolean; label?: string };
let undoSnapshot: ClassicyUndoState = { canUndo: false };
const undoListeners = new Set<() => void>();

/** Map an InputEvent `inputType` to a human action name for the Undo label. */
const inputTypeLabel = (inputType: string): string | undefined => {
	if (inputType.startsWith("insertFromPaste")) return "Paste";
	if (inputType === "deleteByCut") return "Cut";
	if (inputType.startsWith("insert")) return "Typing";
	if (inputType.startsWith("delete")) return "Delete";
	if (inputType.startsWith("format")) return "Formatting";
	return undefined;
};

const recomputeUndoSnapshot = (): void => {
	const el = resolveTarget();
	const info = el ? undoByElement.get(el) : undefined;
	const canUndo = !!info && info.depth > 0;
	const label = canUndo ? info?.label : undefined;
	if (canUndo !== undoSnapshot.canUndo || label !== undoSnapshot.label) {
		undoSnapshot = { canUndo, label };
		for (const cb of undoListeners) cb();
	}
};

const recordInput = (el: EditableElement, inputType: string): void => {
	const info = undoByElement.get(el) ?? { depth: 0 };
	if (inputType === "historyUndo") {
		info.depth = Math.max(0, info.depth - 1);
	} else if (inputType === "historyRedo") {
		info.depth += 1;
	} else {
		info.depth += 1;
		info.label = inputTypeLabel(inputType) ?? info.label ?? "Typing";
	}
	undoByElement.set(el, info);
	recomputeUndoSnapshot();
};

/**
 * Whether the target follows the active window (`edit.scope: "window"`),
 * read from the active package's layout at call time.
 */
const scopedToWindow = (): boolean =>
	getClassicyAppearanceLayout().edit?.scope === "window";

/**
 * Whether a press or a focus change may have changed the target without a
 * field taking the focus: a window's activation moves the scope's target,
 * and a target-state subscriber (Windows' Edit menu) follows it too.
 */
const followsActivation = (): boolean =>
	scopedToWindow() || targetListeners.size > 0;

/** Begin remembering the last-focused text field. Idempotent; safe on the server. */
export const ensureEditTracker = (): void => {
	if (trackerInstalled || typeof document === "undefined") return;
	trackerInstalled = true;
	document.addEventListener("focusin", (e) => {
		if (isEditable(e.target)) {
			lastEditable = e.target as EditableElement;
			recomputeUndoSnapshot();
			recomputeTargetSnapshot();
		} else if (followsActivation()) {
			recomputeUndoSnapshot();
			recomputeTargetSnapshot();
		}
	});
	document.addEventListener("input", (e) => {
		if (!isEditable(e.target)) return;
		// `inputType` is empty on engines without InputEvent; treat as a generic edit.
		const inputType = (e as InputEvent).inputType ?? "";
		recordInput(e.target as EditableElement, inputType);
		recomputeTargetSnapshot();
	});
	// A press or its release activates its window in the store (a window's
	// frame on the press, its content on the release), whose class lands on
	// the window's root once React has committed it, after the event's own
	// handlers: read again once they have all run.
	const readAfterActivation = () => {
		if (!followsActivation()) return;
		setTimeout(() => {
			recomputeUndoSnapshot();
			recomputeTargetSnapshot();
		}, 0);
	};
	document.addEventListener("mousedown", readAfterActivation, true);
	document.addEventListener("mouseup", readAfterActivation, true);
};

/** Subscribe to undo-state changes (for useSyncExternalStore). Installs the tracker. */
export const subscribeUndoState = (cb: () => void): (() => void) => {
	ensureEditTracker();
	undoListeners.add(cb);
	return () => {
		undoListeners.delete(cb);
	};
};

/** Current coarse undo state for the focused/last-edited field. Stable identity between changes. */
export const getUndoStateSnapshot = (): ClassicyUndoState => undoSnapshot;

/** Server render has no editable field and no history. */
export const getUndoStateServerSnapshot = (): ClassicyUndoState => ({
	canUndo: false,
});

/** Test-only: forget all tracked undo state. */
export const __resetUndoTrackingForTests = (): void => {
	undoSnapshot = { canUndo: false };
	undoListeners.clear();
	targetSnapshot = NO_TARGET;
	for (const cb of [...targetListeners]) targetListeners.delete(cb);
	uninstallTargetWatch();
	lastEditable = null;
};

/**
 * Whether `el` sits in an active window: its `.classicyWindow` root carries
 * `active` (the focused window, a modal, a utility palette).
 */
const inActiveWindow = (el: Element): boolean =>
	el.closest(".classicyWindow")?.classList.contains("active") === true;

/**
 * The field to act on: the active element if editable, else the last one,
 * which under `edit.scope: "window"` counts only while its window is active.
 */
const resolveTarget = (): EditableElement | null => {
	if (typeof document === "undefined") return null;
	const active = document.activeElement;
	if (isEditable(active)) return active;
	if (lastEditable && document.contains(lastEditable)) {
		if (scopedToWindow() && !inActiveWindow(lastEditable)) return null;
		return lastEditable;
	}
	return null;
};

const exec = (command: string, value?: string): boolean => {
	if (typeof document === "undefined" || !document.execCommand) return false;
	return document.execCommand(command, false, value);
};

/** One of the Edit commands (`classicyEditCommands`'s keys). */
export type ClassicyEditCommand =
	| "undo"
	| "cut"
	| "copy"
	| "clear"
	| "selectAll"
	| "paste";

/**
 * The Edit commands, each acting on the field `target()` names at the time.
 * With no field, a command still runs on whatever the browser has (today's
 * rule), except under `edit.scope: "window"`, where it does nothing.
 */
const editCommandsOn = (target: () => EditableElement | null) => {
	// The field, focused; `undefined` when the command must not run.
	const focusTarget = (): EditableElement | null | undefined => {
		const el = target();
		if (!el && scopedToWindow()) return undefined;
		el?.focus();
		return el;
	};
	return {
		undo: (): void => {
			if (focusTarget() === undefined) return;
			exec("undo");
		},
		cut: (): void => {
			if (focusTarget() === undefined) return;
			exec("cut");
		},
		copy: (): void => {
			if (focusTarget() === undefined) return;
			exec("copy");
		},
		clear: (): void => {
			if (focusTarget() === undefined) return;
			exec("delete");
		},
		selectAll: (): void => {
			const el = focusTarget();
			if (el === undefined) return;
			if (el && "select" in el && typeof el.select === "function") {
				(el as HTMLInputElement).select();
			} else {
				exec("selectAll");
			}
		},
		paste: async (): Promise<void> => {
			if (focusTarget() === undefined) return;
			try {
				const text = await navigator.clipboard.readText();
				// insertText respects the caret/selection and the field's undo stack.
				if (!exec("insertText", text)) {
					const el = target();
					if (
						el &&
						(el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
						"setRangeText" in el
					) {
						const field = el as HTMLInputElement | HTMLTextAreaElement;
						const start = field.selectionStart ?? field.value.length;
						const end = field.selectionEnd ?? field.value.length;
						field.setRangeText(text, start, end, "end");
						field.dispatchEvent(new Event("input", { bubbles: true }));
					}
				}
			} catch {
				// Clipboard read denied / unavailable — nothing to paste.
			}
		},
	} satisfies Record<ClassicyEditCommand, () => void | Promise<void>>;
};

export const classicyEditCommands = editCommandsOn(resolveTarget);

/**
 * The Edit commands bound to one field, whatever has the focus when they
 * run: a text field's own contextual menu (`textField.contextMenu`), which
 * acts on the field it was opened on.
 */
export const classicyEditCommandsFor = (
	field: HTMLElement,
): typeof classicyEditCommands => editCommandsOn(() => field);

/** Whether `field` has an edit to undo, as the undo tracker counts them. */
export const classicyEditCanUndo = (field: HTMLElement): boolean =>
	(undoByElement.get(field)?.depth ?? 0) > 0;

/** What a text field's selection holds, for the Edit commands' dimming. */
export type ClassicyEditFieldState = {
	/**
	 * Whether the selection holds text: `null` where the field's selection
	 * cannot be read (a number field, whose `selectionStart` is `null`).
	 */
	selection: boolean | null;
	/** Whether every character is selected (`false` where it cannot be read). */
	allSelected: boolean;
	/** Whether the field holds any text. */
	text: boolean;
	/** Whether the field cannot be edited (`readOnly`, a non-editable root). */
	readOnly: boolean;
	/** Whether the field masks its text (`type="password"`). */
	password: boolean;
};

/** The selection and editability of `field` (an input, a textarea or a content editable). */
export const classicyEditFieldState = (
	field: HTMLElement,
): ClassicyEditFieldState => {
	if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
		const control = field as HTMLInputElement | HTMLTextAreaElement;
		const length = control.value.length;
		let start: number | null = null;
		let end: number | null = null;
		try {
			start = control.selectionStart;
			end = control.selectionEnd;
		} catch {
			// A type with no selection API throws on some engines.
		}
		const known = start !== null && end !== null;
		return {
			selection: known ? start !== end : null,
			allSelected: known && length > 0 && start === 0 && end === length,
			text: length > 0,
			readOnly: control.readOnly,
			password:
				control instanceof HTMLInputElement && control.type === "password",
		};
	}
	const text = field.textContent ?? "";
	const selection = field.ownerDocument.getSelection();
	const inField =
		!!selection &&
		selection.rangeCount > 0 &&
		!!selection.anchorNode &&
		!!selection.focusNode &&
		field.contains(selection.anchorNode) &&
		field.contains(selection.focusNode);
	const selected = inField ? selection.toString() : "";
	return {
		selection: inField && !selection.isCollapsed,
		allSelected: text.length > 0 && selected.length >= text.length,
		text: text.length > 0,
		readOnly: !field.isContentEditable,
		password: false,
	};
};

// --- Target state (Windows' Edit menu, `edit.menu: "windows"`): whether
// there is a field to act on, and what its selection holds, so the menu can
// dim Cut, Copy and Delete while nothing is selected, as Notepad's does.
// Published coarsely, as the undo snapshot is: its identity changes only
// when one of its flags does. Its watchers (the selection's changes) are
// installed only while something subscribes.

/** What the Edit commands' target holds (`subscribeEditTargetState`). */
export type ClassicyEditTargetState = {
	/** Whether there is a field the commands act on. */
	target: boolean;
	/** Whether its selection holds text (a field whose selection cannot be read: whether it holds text). */
	selection: boolean;
	/** Whether it holds any text. */
	text: boolean;
	/** Whether it cannot be edited. */
	readOnly: boolean;
	/** Whether it masks its text. */
	password: boolean;
};

const NO_TARGET: ClassicyEditTargetState = {
	target: false,
	selection: false,
	text: false,
	readOnly: false,
	password: false,
};
let targetSnapshot: ClassicyEditTargetState = NO_TARGET;
const targetListeners = new Set<() => void>();
let uninstallTargetWatch: () => void = () => {};

const recomputeTargetSnapshot = (): void => {
	if (targetListeners.size === 0) return;
	const el = resolveTarget();
	let next = NO_TARGET;
	if (el) {
		const field = classicyEditFieldState(el);
		next = {
			target: true,
			selection: field.selection ?? field.text,
			text: field.text,
			readOnly: field.readOnly,
			password: field.password,
		};
	}
	const prev = targetSnapshot;
	if (
		next.target === prev.target &&
		next.selection === prev.selection &&
		next.text === prev.text &&
		next.readOnly === prev.readOnly &&
		next.password === prev.password
	)
		return;
	targetSnapshot = next;
	for (const cb of targetListeners) cb();
};

/**
 * Subscribe to the target state's changes (for `useSyncExternalStore`).
 * Installs the tracker, and, while anything subscribes, watches the
 * selection (`selectionchange`, `select`) and a key's release.
 */
export const subscribeEditTargetState = (cb: () => void): (() => void) => {
	ensureEditTracker();
	if (targetListeners.size === 0 && typeof document !== "undefined") {
		const read = () => recomputeTargetSnapshot();
		document.addEventListener("selectionchange", read);
		document.addEventListener("select", read, true);
		document.addEventListener("keyup", read, true);
		uninstallTargetWatch = () => {
			document.removeEventListener("selectionchange", read);
			document.removeEventListener("select", read, true);
			document.removeEventListener("keyup", read, true);
			uninstallTargetWatch = () => {};
		};
	}
	targetListeners.add(cb);
	recomputeTargetSnapshot();
	return () => {
		targetListeners.delete(cb);
		if (targetListeners.size === 0) {
			uninstallTargetWatch();
			targetSnapshot = NO_TARGET;
		}
	};
};

/** The current target state. Stable identity between changes. */
export const getEditTargetStateSnapshot = (): ClassicyEditTargetState =>
	targetSnapshot;

/** Server render has no field. */
export const getEditTargetStateServerSnapshot = (): ClassicyEditTargetState =>
	NO_TARGET;

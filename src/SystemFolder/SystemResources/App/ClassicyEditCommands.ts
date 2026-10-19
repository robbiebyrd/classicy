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
 */

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

/** Begin remembering the last-focused text field. Idempotent; safe on the server. */
export const ensureEditTracker = (): void => {
	if (trackerInstalled || typeof document === "undefined") return;
	trackerInstalled = true;
	document.addEventListener("focusin", (e) => {
		if (isEditable(e.target)) {
			lastEditable = e.target as EditableElement;
			recomputeUndoSnapshot();
		}
	});
	document.addEventListener("input", (e) => {
		if (!isEditable(e.target)) return;
		// `inputType` is empty on engines without InputEvent; treat as a generic edit.
		const inputType = (e as InputEvent).inputType ?? "";
		recordInput(e.target as EditableElement, inputType);
	});
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
	lastEditable = null;
};

/** The field to act on: the active element if editable, else the last one. */
const resolveTarget = (): EditableElement | null => {
	if (typeof document === "undefined") return null;
	const active = document.activeElement;
	if (isEditable(active)) return active;
	if (lastEditable && document.contains(lastEditable)) return lastEditable;
	return null;
};

const focusTarget = (): EditableElement | null => {
	const el = resolveTarget();
	el?.focus();
	return el;
};

const exec = (command: string, value?: string): boolean => {
	if (typeof document === "undefined" || !document.execCommand) return false;
	return document.execCommand(command, false, value);
};

export const classicyEditCommands = {
	undo: (): void => {
		focusTarget();
		exec("undo");
	},
	cut: (): void => {
		focusTarget();
		exec("cut");
	},
	copy: (): void => {
		focusTarget();
		exec("copy");
	},
	clear: (): void => {
		focusTarget();
		exec("delete");
	},
	selectAll: (): void => {
		const el = focusTarget();
		if (el && "select" in el && typeof el.select === "function") {
			(el as HTMLInputElement).select();
		} else {
			exec("selectAll");
		}
	},
	paste: async (): Promise<void> => {
		focusTarget();
		try {
			const text = await navigator.clipboard.readText();
			// insertText respects the caret/selection and the field's undo stack.
			if (!exec("insertText", text)) {
				const el = resolveTarget();
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
};

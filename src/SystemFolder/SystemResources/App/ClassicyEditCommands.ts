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

/** Begin remembering the last-focused text field. Idempotent; safe on the server. */
export const ensureEditTracker = (): void => {
	if (trackerInstalled || typeof document === "undefined") return;
	trackerInstalled = true;
	document.addEventListener("focusin", (e) => {
		if (isEditable(e.target)) lastEditable = e.target as EditableElement;
	});
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

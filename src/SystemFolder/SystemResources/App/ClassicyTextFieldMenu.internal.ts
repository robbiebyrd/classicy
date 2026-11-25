import {
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	classicyEditCanUndo,
	classicyEditCommandsFor,
	classicyEditFieldState,
	ensureEditTracker,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
import { classicyContextMenuKeyPoint } from "@/SystemFolder/SystemResources/ContextualMenu/useClassicyContextMenuKey.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Whether a text field shows its own contextual menu (the package's
 * `layout.textField.contextMenu` `"edit"`, Windows).
 * @internal
 */
export const classicyTextFieldHasMenu = (
	layout: Pick<ClassicyAppearanceLayout, "textField">,
): boolean => layout.textField?.contextMenu === "edit";

/** An element the Edit commands can act on. */
const isTextField = (el: Element | null): el is HTMLElement =>
	el instanceof HTMLElement &&
	(el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

/** Whether `el` is a form control that cannot take input now. */
const isDisabledField = (el: HTMLElement): boolean =>
	(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
	el.disabled;

/** Where the field's selection was when its menu opened, to put it back. */
type SavedSelection =
	| {
			kind: "control";
			start: number;
			end: number;
			direction: "forward" | "backward" | "none";
	  }
	| { kind: "range"; range: Range }
	| null;

const saveSelection = (field: HTMLElement): SavedSelection => {
	if (
		field instanceof HTMLInputElement ||
		field instanceof HTMLTextAreaElement
	) {
		try {
			const { selectionStart, selectionEnd, selectionDirection } = field;
			if (selectionStart === null || selectionEnd === null) return null;
			return {
				kind: "control",
				start: selectionStart,
				end: selectionEnd,
				direction: selectionDirection ?? "none",
			};
		} catch {
			return null;
		}
	}
	const selection = field.ownerDocument.getSelection();
	if (!selection || selection.rangeCount === 0) return null;
	const range = selection.getRangeAt(0);
	if (!field.contains(range.commonAncestorContainer)) return null;
	return { kind: "range", range: range.cloneRange() };
};

const restoreSelection = (field: HTMLElement, saved: SavedSelection): void => {
	if (!saved) return;
	if (saved.kind === "control") {
		try {
			(field as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
				saved.start,
				saved.end,
				saved.direction,
			);
		} catch {
			// A type with no selection API: its selection is the browser's.
		}
		return;
	}
	const selection = field.ownerDocument.getSelection();
	if (!selection) return;
	selection.removeAllRanges();
	selection.addRange(saved.range);
};

/**
 * Windows 98's edit-control pop-up menu for `field`: Undo, a divider, Cut,
 * Copy, Paste, Delete, a divider and Select All (user.exe's menu, its
 * letters "&Undo", "Cu&t", "&Copy", "&Paste", "&Delete", "Select &All",
 * through `ak`, no shortcuts drawn), each running the Edit command on
 * `field` with the selection it had when the menu opened put back first;
 * dimmed as user32's edit control dims them (Wine's `EDIT_WM_ContextMenu`):
 * Undo with nothing to undo or in a read-only field, Cut with an empty
 * selection or in a password or read-only field, Copy with an empty
 * selection or in a password field, Paste in a read-only field (a page
 * cannot read whether the clipboard holds text), Delete with an empty
 * selection or in a read-only field, Select All while everything is
 * selected (an empty field's nothing included). A field whose selection cannot be read (a number field) counts
 * as selected while it holds text.
 * @internal
 */
export const classicyTextFieldMenuItems = (
	field: HTMLElement,
	ak: (key: string) => string | undefined,
): ClassicyMenuItem[] => {
	const state = classicyEditFieldState(field);
	const saved = saveSelection(field);
	const selection = state.selection ?? state.text;
	const commands = classicyEditCommandsFor(field);
	const run = (command: () => void | Promise<void>) => () => {
		field.focus({ preventScroll: true });
		restoreSelection(field, saved);
		void command();
	};
	return [
		{
			id: "classicy-text-field-undo",
			title: "Undo",
			accessKey: ak("u"),
			disabled: !classicyEditCanUndo(field) || state.readOnly,
			onClickFunc: run(commands.undo),
		},
		{ id: "spacer" },
		{
			id: "classicy-text-field-cut",
			title: "Cut",
			accessKey: ak("t"),
			disabled: !selection || state.password || state.readOnly,
			onClickFunc: run(commands.cut),
		},
		{
			id: "classicy-text-field-copy",
			title: "Copy",
			accessKey: ak("c"),
			disabled: !selection || state.password,
			onClickFunc: run(commands.copy),
		},
		{
			id: "classicy-text-field-paste",
			title: "Paste",
			accessKey: ak("p"),
			disabled: state.readOnly,
			onClickFunc: run(commands.paste),
		},
		{
			id: "classicy-text-field-delete",
			title: "Delete",
			accessKey: ak("d"),
			disabled: !selection || state.readOnly,
			onClickFunc: run(commands.clear),
		},
		{ id: "spacer" },
		{
			id: "classicy-text-field-select-all",
			title: "Select All",
			accessKey: ak("A"),
			disabled: !state.text || state.allSelected,
			onClickFunc: run(commands.selectAll),
		},
	];
};

/** The handlers a text field spreads on the element that takes the right-click. */
export interface ClassicyTextFieldMenuHandlers {
	/** Keeps the field's selection through a button-2 press. */
	onMouseDown: (e: ReactMouseEvent<HTMLElement>) => void;
	/** Opens the field's own menu. */
	onContextMenu: (e: ReactMouseEvent<HTMLElement>) => void;
}

/**
 * A text field's own contextual menu (`layout.textField.contextMenu`
 * `"edit"`, Windows; WIG Ch.5 "Command Method", p.59): the handlers to put
 * on the field, or `undefined` under any other layout, so the field keeps no
 * handler and its right-click goes on to the window's or the app's menu as
 * before. `fieldOf` (keep it stable: a module-level function) finds the
 * field from the event's target (default: the element the handlers are
 * on); a target it finds no enabled field for is left alone.
 *
 * A button-2 press keeps the selection (its default is prevented, as
 * Windows' edit control moves no caret on a right-click), and the
 * `contextmenu` then focuses the field without scrolling, takes the event
 * (`preventDefault`, `stopPropagation`; a `contextmenu` another handler
 * already took is left alone) and opens `classicyTextFieldMenuItems` at the
 * pointer, with no Help item (user.exe's menu has none). A `contextmenu`
 * that carries no position (`0, 0`), as a keyboard's may, opens at the
 * field's center, where Shift+F10 and the Application key put it
 * (`keyboard.contextMenuKey`), as Windows places an edit control's keyboard
 * menu (Wine's `EDIT_WM_ContextMenu`).
 * @internal
 */
export const useClassicyTextFieldContextMenu = (
	fieldOf?: (target: EventTarget, currentTarget: HTMLElement) => Element | null,
): ClassicyTextFieldMenuHandlers | undefined => {
	const enabled = classicyTextFieldHasMenu(useClassicyAppearanceLayout());
	// The field's edits are counted from its first one, so its Undo knows.
	useEffect(() => {
		if (enabled) ensureEditTracker();
	}, [enabled]);
	const { showContextMenu } = useClassicyContextualMenu();
	const ak = useClassicyBundledAccessKeys();
	const findField = useCallback(
		(e: ReactMouseEvent<HTMLElement>): HTMLElement | null => {
			const found = fieldOf
				? fieldOf(e.target, e.currentTarget)
				: e.currentTarget;
			return isTextField(found) && !isDisabledField(found) ? found : null;
		},
		[fieldOf],
	);
	const onMouseDown = useCallback(
		(e: ReactMouseEvent<HTMLElement>) => {
			if (e.button !== 2 || !findField(e)) return;
			e.preventDefault();
		},
		[findField],
	);
	const onContextMenu = useCallback(
		(e: ReactMouseEvent<HTMLElement>) => {
			if (e.defaultPrevented) return;
			const field = findField(e);
			if (!field) return;
			e.preventDefault();
			e.stopPropagation();
			ensureEditTracker();
			// Read before the focus, which may move a content editable's
			// selection; each command puts it back.
			const items = classicyTextFieldMenuItems(field, ak);
			if (field.ownerDocument.activeElement !== field)
				field.focus({ preventScroll: true });
			const at: [number, number] =
				e.clientX === 0 && e.clientY === 0
					? classicyContextMenuKeyPoint(field)
					: [e.clientX, e.clientY];
			showContextMenu(items, at, { helpItem: false });
		},
		[findField, showContextMenu, ak],
	);
	return useMemo(
		() => (enabled ? { onMouseDown, onContextMenu } : undefined),
		[enabled, onMouseDown, onContextMenu],
	);
};

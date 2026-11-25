import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	__resetUndoTrackingForTests,
	ensureEditTracker,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";
import {
	classicyTextFieldHasMenu,
	classicyTextFieldMenuItems,
	useClassicyTextFieldContextMenu,
} from "@/SystemFolder/SystemResources/App/ClassicyTextFieldMenu.internal";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const MENU_IDS = [
	"classicy-text-field-undo",
	"classicy-text-field-cut",
	"classicy-text-field-copy",
	"classicy-text-field-paste",
	"classicy-text-field-delete",
	"classicy-text-field-select-all",
];

const noKeys = () => undefined;

/** The ids, titles and dimming of `items`' commands. */
const summary = (items: ReturnType<typeof classicyTextFieldMenuItems>) =>
	items.map((item) =>
		item.id === "spacer"
			? "—"
			: `${item.title}${item.disabled ? " (dimmed)" : ""}`,
	);

const fieldWith = (value: string, start: number, end = start) => {
	const input = document.createElement("input");
	input.value = value;
	document.body.appendChild(input);
	input.setSelectionRange(start, end);
	return input;
};

// The remaining chapters' audit's 5.29 (WIG Ch.5 "Command Method", p.59):
// user.exe's edit-control pop-up menu, "&Undo", "Cu&t", "&Copy", "&Paste",
// "&Delete", "Select &All" (the Windows 98 SE CD's user.exe), dimmed as
// Wine's EDIT_WM_ContextMenu dims them.
describe("classicyTextFieldMenuItems", () => {
	beforeEach(() => {
		ensureEditTracker();
		__resetUndoTrackingForTests();
	});
	afterEach(() => {
		document.body.innerHTML = "";
		__resetUndoTrackingForTests();
	});

	it("lists Undo, Cut, Copy, Paste, Delete and Select All with two dividers and user.exe's letters", () => {
		const items = classicyTextFieldMenuItems(
			fieldWith("hello", 0, 2),
			(k) => k,
		);
		expect(items.map((item) => item.id)).toEqual([
			MENU_IDS[0],
			"spacer",
			...MENU_IDS.slice(1, 5),
			"spacer",
			MENU_IDS[5],
		]);
		expect(
			items.filter((i) => i.id !== "spacer").map((i) => i.accessKey),
		).toEqual(["u", "t", "c", "p", "d", "A"]);
		expect(items.some((item) => item.keyboardShortcut)).toBe(false);
	});

	it("dims Undo with nothing to undo, and Cut, Copy and Delete with no selection", () => {
		expect(
			summary(classicyTextFieldMenuItems(fieldWith("hello", 2), noKeys)),
		).toEqual([
			"Undo (dimmed)",
			"—",
			"Cut (dimmed)",
			"Copy (dimmed)",
			"Paste",
			"Delete (dimmed)",
			"—",
			"Select All",
		]);
	});

	it("lights Undo after an edit and the selection's commands with a selection", () => {
		const input = fieldWith("hello", 0, 3);
		input.focus();
		input.dispatchEvent(
			new InputEvent("input", { inputType: "insertText", bubbles: true }),
		);
		expect(summary(classicyTextFieldMenuItems(input, noKeys))).toEqual([
			"Undo",
			"—",
			"Cut",
			"Copy",
			"Paste",
			"Delete",
			"—",
			"Select All",
		]);
	});

	it("dims Select All while everything is selected, and in an empty field", () => {
		const all = summary(
			classicyTextFieldMenuItems(fieldWith("hello", 0, 5), noKeys),
		);
		expect(all.at(-1)).toBe("Select All (dimmed)");
		const empty = summary(classicyTextFieldMenuItems(fieldWith("", 0), noKeys));
		expect(empty.at(-1)).toBe("Select All (dimmed)");
	});

	it("dims Undo, Cut, Paste and Delete in a read-only field, Cut and Copy in a password one", () => {
		const readOnly = fieldWith("hello", 0, 3);
		readOnly.readOnly = true;
		expect(summary(classicyTextFieldMenuItems(readOnly, noKeys))).toEqual([
			"Undo (dimmed)",
			"—",
			"Cut (dimmed)",
			"Copy",
			"Paste (dimmed)",
			"Delete (dimmed)",
			"—",
			"Select All",
		]);
		const password = fieldWith("secret", 0, 3);
		password.type = "password";
		expect(summary(classicyTextFieldMenuItems(password, noKeys))).toEqual([
			"Undo (dimmed)",
			"—",
			"Cut (dimmed)",
			"Copy (dimmed)",
			"Paste",
			"Delete",
			"—",
			"Select All",
		]);
	});

	it("counts a number field's text as its selection, which it cannot read", () => {
		const number = document.createElement("input");
		number.type = "number";
		number.value = "42";
		document.body.appendChild(number);
		expect(summary(classicyTextFieldMenuItems(number, noKeys))).toEqual([
			"Undo (dimmed)",
			"—",
			"Cut",
			"Copy",
			"Paste",
			"Delete",
			"—",
			"Select All",
		]);
	});
});

describe("classicyTextFieldHasMenu", () => {
	it("is Windows 98's, not the default layout's", () => {
		expect(classicyTextFieldHasMenu(windows98.layout as never)).toBe(true);
		expect(classicyTextFieldHasMenu(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(
			classicyTextFieldHasMenu({ textField: { contextMenu: "none" } }),
		).toBe(false);
	});
});

const Field = ({ readOnly = false }: { readOnly?: boolean }) => {
	const menu = useClassicyTextFieldContextMenu();
	return (
		<div data-testid="window">
			<input
				data-testid="field"
				defaultValue="hello world"
				readOnly={readOnly}
				onMouseDown={menu?.onMouseDown}
				onContextMenu={menu?.onContextMenu}
			/>
			<input data-testid="other" defaultValue="other" />
		</div>
	);
};

describe("useClassicyTextFieldContextMenu", () => {
	let restore: (() => void) | undefined;
	let execCommand: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		__resetUndoTrackingForTests();
		execCommand = vi.fn(() => true);
		(document as unknown as { execCommand: unknown }).execCommand = execCommand;
	});
	afterEach(() => {
		restore?.();
		restore = undefined;
		__resetUndoTrackingForTests();
		vi.restoreAllMocks();
	});

	const renderField = () =>
		render(
			<ClassicyContextualMenuProvider>
				<Field />
			</ClassicyContextualMenuProvider>,
		);
	const menuItem = (id: string) => document.getElementById(id);

	it("opens the field's own menu at the pointer, with no Help item, focusing the field and keeping its selection", () => {
		restore = activateTestWindowsKeysPackage({
			textField: { contextMenu: "edit" },
		});
		const { getByTestId } = renderField();
		const field = getByTestId("field") as HTMLInputElement;
		const other = getByTestId("other");
		field.setSelectionRange(0, 5);
		other.focus();
		const press = fireEvent.mouseDown(field, { button: 2 });
		expect(press).toBe(false);
		const opened = fireEvent.contextMenu(field, { clientX: 40, clientY: 30 });
		expect(opened).toBe(false);
		expect(document.activeElement).toBe(field);
		expect([field.selectionStart, field.selectionEnd]).toEqual([0, 5]);
		for (const id of MENU_IDS) expect(menuItem(id), id).not.toBeNull();
		expect(document.getElementById("contextual-help")).toBeNull();
	});

	it("runs a command on the field it was opened on, its selection put back", async () => {
		restore = activateTestWindowsKeysPackage({
			textField: { contextMenu: "edit" },
		});
		const { getByTestId } = renderField();
		const field = getByTestId("field") as HTMLInputElement;
		const other = getByTestId("other");
		field.setSelectionRange(6, 11);
		fireEvent.contextMenu(field, { clientX: 40, clientY: 30 });
		// The menu took the focus and the field lost its selection meanwhile.
		act(() => {
			other.focus();
			field.setSelectionRange(0, 0);
		});
		const remove = menuItem("classicy-text-field-delete") as HTMLElement;
		fireEvent.click(remove);
		dispatchAnimationEnd(remove);
		// The menu runs its item's action a frame after it closes.
		await act(async () => {
			await new Promise((resolve) => requestAnimationFrame(resolve));
		});
		expect(document.activeElement).toBe(field);
		expect([field.selectionStart, field.selectionEnd]).toEqual([6, 11]);
		expect(execCommand).toHaveBeenCalledWith("delete", false, undefined);
	});

	it("leaves a right-click another handler took, and a button-1 press, alone", () => {
		restore = activateTestWindowsKeysPackage({
			textField: { contextMenu: "edit" },
		});
		const { getByTestId } = renderField();
		const field = getByTestId("field");
		expect(fireEvent.mouseDown(field, { button: 0 })).toBe(true);
		const taken = new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
		});
		taken.preventDefault();
		act(() => {
			field.dispatchEvent(taken);
		});
		expect(menuItem(MENU_IDS[0])).toBeNull();
	});

	it("opens a position-less (keyboard) menu at the field's center", () => {
		restore = activateTestWindowsKeysPackage({
			textField: { contextMenu: "edit" },
		});
		const { getByTestId } = renderField();
		const field = getByTestId("field");
		field.getBoundingClientRect = () =>
			({ left: 10, top: 20, right: 110, bottom: 40 }) as DOMRect;
		fireEvent.contextMenu(field, { clientX: 0, clientY: 0 });
		const menu = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement | null;
		expect(menu).not.toBeNull();
		// 1 px below and right of the field's center (60, 30).
		expect(menu?.style.left).toBe("61px");
		expect(menu?.style.top).toBe("31px");
	});

	it("keeps no handler without the key (Platinum): the right-click goes on", () => {
		const { getByTestId } = renderField();
		const field = getByTestId("field");
		expect(fireEvent.mouseDown(field, { button: 2 })).toBe(true);
		expect(fireEvent.contextMenu(field, { clientX: 4, clientY: 4 })).toBe(true);
		expect(menuItem(MENU_IDS[0])).toBeNull();
	});
});

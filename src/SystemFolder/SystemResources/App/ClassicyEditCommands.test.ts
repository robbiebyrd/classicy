import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	__resetUndoTrackingForTests,
	classicyEditCanUndo,
	classicyEditCommands,
	classicyEditCommandsFor,
	classicyEditFieldState,
	ensureEditTracker,
	getEditTargetStateSnapshot,
	getUndoStateSnapshot,
	subscribeEditTargetState,
	subscribeUndoState,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";

/** Dispatch a bubbling InputEvent the document-level tracker will see. */
const fireInput = (el: HTMLElement, inputType: string): void => {
	el.dispatchEvent(new InputEvent("input", { inputType, bubbles: true }));
};

describe("classicyEditCommands", () => {
	let input: HTMLInputElement;
	let execCommand: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		ensureEditTracker();
		input = document.createElement("input");
		input.value = "hello world";
		document.body.appendChild(input);
		execCommand = vi.fn(() => true);
		(document as unknown as { execCommand: unknown }).execCommand = execCommand;
	});

	afterEach(() => {
		input.remove();
		vi.restoreAllMocks();
	});

	it("copy focuses the field and runs the copy command", () => {
		input.focus();
		input.setSelectionRange(0, 5);
		classicyEditCommands.copy();
		expect(document.activeElement).toBe(input);
		expect(execCommand).toHaveBeenCalledWith("copy", false, undefined);
	});

	it("cut and undo run their commands", () => {
		input.focus();
		classicyEditCommands.cut();
		classicyEditCommands.undo();
		expect(execCommand).toHaveBeenCalledWith("cut", false, undefined);
		expect(execCommand).toHaveBeenCalledWith("undo", false, undefined);
	});

	it("selectAll selects the whole field", () => {
		input.focus();
		const select = vi.spyOn(input, "select");
		classicyEditCommands.selectAll();
		expect(select).toHaveBeenCalled();
	});

	it("acts on the LAST-focused field even after focus moves to a menu button", () => {
		input.focus(); // tracked as last editable
		const button = document.createElement("button");
		document.body.appendChild(button);
		button.focus(); // focus leaves the field (as a menu click would)
		expect(document.activeElement).toBe(button);
		classicyEditCommands.copy();
		// The command restored focus to the remembered field before copying.
		expect(document.activeElement).toBe(input);
		expect(execCommand).toHaveBeenCalledWith("copy", false, undefined);
		button.remove();
	});

	it("paste inserts clipboard text at the caret", async () => {
		input.focus();
		execCommand.mockReturnValue(false); // force the setRangeText fallback
		Object.defineProperty(navigator, "clipboard", {
			value: { readText: vi.fn().mockResolvedValue("!!!") },
			configurable: true,
		});
		input.setSelectionRange(5, 5);
		await classicyEditCommands.paste();
		expect(input.value).toBe("hello!!! world");
	});

	it("paste is a no-op when the clipboard is unavailable", async () => {
		input.focus();
		Object.defineProperty(navigator, "clipboard", {
			value: { readText: vi.fn().mockRejectedValue(new Error("denied")) },
			configurable: true,
		});
		await expect(classicyEditCommands.paste()).resolves.toBeUndefined();
		expect(input.value).toBe("hello world");
	});
});

describe("undo-state tracking (HIG 4.6)", () => {
	let input: HTMLInputElement;

	beforeEach(() => {
		ensureEditTracker();
		__resetUndoTrackingForTests();
		input = document.createElement("input");
		document.body.appendChild(input);
	});

	afterEach(() => {
		input.remove();
		__resetUndoTrackingForTests();
	});

	it("reports nothing to undo for a field with no edits", () => {
		input.focus();
		expect(getUndoStateSnapshot().canUndo).toBe(false);
	});

	it("names the last action after an edit", () => {
		input.focus();
		fireInput(input, "insertText");
		expect(getUndoStateSnapshot()).toEqual({ canUndo: true, label: "Typing" });

		fireInput(input, "insertFromPaste");
		expect(getUndoStateSnapshot().label).toBe("Paste");
	});

	it("drops back to Can't Undo once history is exhausted", () => {
		input.focus();
		fireInput(input, "insertText");
		expect(getUndoStateSnapshot().canUndo).toBe(true);
		fireInput(input, "historyUndo");
		expect(getUndoStateSnapshot().canUndo).toBe(false);
	});

	it("notifies subscribers only when the wording changes", () => {
		input.focus();
		const cb = vi.fn();
		const unsubscribe = subscribeUndoState(cb);

		fireInput(input, "insertText"); // Can't Undo -> Undo Typing
		expect(cb).toHaveBeenCalledTimes(1);

		fireInput(input, "insertText"); // still Undo Typing — no change
		expect(cb).toHaveBeenCalledTimes(1);

		fireInput(input, "deleteContentBackward"); // Undo Typing -> Undo Delete
		expect(cb).toHaveBeenCalledTimes(2);

		unsubscribe();
		fireInput(input, "insertText");
		expect(cb).toHaveBeenCalledTimes(2);
	});
});

/** A window root holding a text field, as ClassicyWindow draws one. */
const windowWithField = (active: boolean, value = "hello world") => {
	const win = document.createElement("div");
	win.className = `classicyWindow ${active ? "active" : "inactive"}`;
	const field = document.createElement("input");
	field.value = value;
	win.appendChild(field);
	document.body.appendChild(win);
	return { win, field };
};

const setActive = (win: HTMLElement, active: boolean) => {
	win.classList.toggle("active", active);
	win.classList.toggle("inactive", !active);
};

/**
 * A press (or its release, which activates a window's content), then the
 * tick after it, when the tracker reads the windows again.
 */
const pressAndSettle = async (type: "mousedown" | "mouseup" = "mousedown") => {
	document.body.dispatchEvent(new MouseEvent(type, { bubbles: true }));
	await new Promise((resolve) => setTimeout(resolve, 0));
};

// The remaining chapters' audit's 5.21 (WIG Ch.5 "Operations for a Multiple
// Selection", p.44): under `edit.scope: "window"` the last field is the
// target only while its window is active.
describe("edit.scope", () => {
	let restore: (() => void) | undefined;
	let execCommand: ReturnType<typeof vi.fn>;
	let button: HTMLButtonElement;

	beforeEach(() => {
		ensureEditTracker();
		__resetUndoTrackingForTests();
		execCommand = vi.fn(() => true);
		(document as unknown as { execCommand: unknown }).execCommand = execCommand;
		button = document.createElement("button");
		document.body.appendChild(button);
	});

	afterEach(() => {
		restore?.();
		restore = undefined;
		document.body.innerHTML = "";
		__resetUndoTrackingForTests();
		vi.restoreAllMocks();
	});

	it('leaves another window\'s field alone under "window": every command does nothing and Undo has nothing', async () => {
		restore = activateTestWindowsKeysPackage({ edit: { scope: "window" } });
		const a = windowWithField(true);
		a.field.focus();
		fireInput(a.field, "insertText");
		expect(getUndoStateSnapshot().canUndo).toBe(true);
		// A click in another window: the focus leaves the field, and the
		// other window becomes the active one.
		button.focus();
		setActive(a.win, false);
		windowWithField(true, "");
		await pressAndSettle();
		expect(getUndoStateSnapshot()).toEqual({ canUndo: false });
		classicyEditCommands.clear();
		classicyEditCommands.cut();
		classicyEditCommands.copy();
		classicyEditCommands.undo();
		classicyEditCommands.selectAll();
		const readText = vi.fn().mockResolvedValue("!!!");
		Object.defineProperty(navigator, "clipboard", {
			value: { readText },
			configurable: true,
		});
		await classicyEditCommands.paste();
		expect(execCommand).not.toHaveBeenCalled();
		expect(readText).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(button);
		expect(a.field.value).toBe("hello world");
	});

	it("acts on the last field again once its window is active again", async () => {
		restore = activateTestWindowsKeysPackage({ edit: { scope: "window" } });
		const a = windowWithField(true);
		a.field.focus();
		fireInput(a.field, "insertText");
		button.focus();
		setActive(a.win, false);
		await pressAndSettle();
		expect(getUndoStateSnapshot().canUndo).toBe(false);
		setActive(a.win, true);
		await pressAndSettle("mouseup");
		expect(getUndoStateSnapshot()).toEqual({ canUndo: true, label: "Typing" });
		classicyEditCommands.copy();
		expect(document.activeElement).toBe(a.field);
		expect(execCommand).toHaveBeenCalledWith("copy", false, undefined);
	});

	it('never targets a field outside every window under "window", but a focused one always', () => {
		restore = activateTestWindowsKeysPackage({ edit: { scope: "window" } });
		const loose = document.createElement("input");
		document.body.appendChild(loose);
		loose.focus();
		classicyEditCommands.copy();
		expect(execCommand).toHaveBeenCalledTimes(1);
		button.focus();
		classicyEditCommands.copy();
		expect(execCommand).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(button);
	});

	it("acts on the last field wherever it is by default (Platinum)", async () => {
		const a = windowWithField(true);
		a.field.focus();
		fireInput(a.field, "insertText");
		button.focus();
		setActive(a.win, false);
		await pressAndSettle();
		expect(getUndoStateSnapshot().canUndo).toBe(true);
		classicyEditCommands.clear();
		expect(document.activeElement).toBe(a.field);
		expect(execCommand).toHaveBeenCalledWith("delete", false, undefined);
	});

	it("runs a command with no field by default, as before", () => {
		classicyEditCommands.copy();
		expect(execCommand).toHaveBeenCalledWith("copy", false, undefined);
	});
});

describe("classicyEditCommandsFor", () => {
	let execCommand: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		ensureEditTracker();
		__resetUndoTrackingForTests();
		execCommand = vi.fn(() => true);
		(document as unknown as { execCommand: unknown }).execCommand = execCommand;
	});

	afterEach(() => {
		document.body.innerHTML = "";
		__resetUndoTrackingForTests();
		vi.restoreAllMocks();
	});

	it("acts on its own field, whichever field has the focus", () => {
		const own = document.createElement("input");
		const other = document.createElement("input");
		document.body.append(own, other);
		other.focus();
		classicyEditCommandsFor(own).clear();
		expect(document.activeElement).toBe(own);
		expect(execCommand).toHaveBeenCalledWith("delete", false, undefined);
		const select = vi.spyOn(own, "select");
		other.focus();
		classicyEditCommandsFor(own).selectAll();
		expect(select).toHaveBeenCalled();
	});

	it("counts each field's own edits", () => {
		const own = document.createElement("input");
		const other = document.createElement("input");
		document.body.append(own, other);
		other.focus();
		fireInput(other, "insertText");
		expect(classicyEditCanUndo(own)).toBe(false);
		expect(classicyEditCanUndo(other)).toBe(true);
	});
});

describe("classicyEditFieldState", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("reads a text field's selection, text and state", () => {
		const input = document.createElement("input");
		input.value = "hello";
		document.body.appendChild(input);
		input.setSelectionRange(1, 3);
		expect(classicyEditFieldState(input)).toEqual({
			selection: true,
			allSelected: false,
			text: true,
			readOnly: false,
			password: false,
		});
		input.setSelectionRange(0, 5);
		expect(classicyEditFieldState(input).allSelected).toBe(true);
		input.setSelectionRange(2, 2);
		expect(classicyEditFieldState(input).selection).toBe(false);
		input.readOnly = true;
		input.type = "password";
		expect(classicyEditFieldState(input)).toMatchObject({
			readOnly: true,
			password: true,
		});
	});

	it("reports an empty field and a textarea", () => {
		const area = document.createElement("textarea");
		document.body.appendChild(area);
		expect(classicyEditFieldState(area)).toEqual({
			selection: false,
			allSelected: false,
			text: false,
			readOnly: false,
			password: false,
		});
	});

	it("cannot read a number field's selection", () => {
		const number = document.createElement("input");
		number.type = "number";
		number.value = "12";
		document.body.appendChild(number);
		expect(classicyEditFieldState(number)).toMatchObject({
			selection: null,
			allSelected: false,
			text: true,
		});
	});

	it("reads a content editable's selection from the document's", () => {
		const editable = document.createElement("div");
		editable.setAttribute("contenteditable", "true");
		editable.textContent = "hello world";
		const outside = document.createElement("p");
		outside.textContent = "elsewhere";
		document.body.append(editable, outside);
		const text = editable.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);
		const selection = document.getSelection() as Selection;
		selection.removeAllRanges();
		selection.addRange(range);
		expect(classicyEditFieldState(editable)).toMatchObject({
			selection: true,
			allSelected: false,
			text: true,
		});
		range.setEnd(text, 11);
		selection.removeAllRanges();
		selection.addRange(range);
		expect(classicyEditFieldState(editable).allSelected).toBe(true);
		selection.selectAllChildren(outside);
		expect(classicyEditFieldState(editable).selection).toBe(false);
	});
});

// The Edit menu's Windows form (`edit.menu: "windows"`) dims its items from
// the target's state, published by `subscribeEditTargetState`.
describe("subscribeEditTargetState", () => {
	beforeEach(() => {
		ensureEditTracker();
		__resetUndoTrackingForTests();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		__resetUndoTrackingForTests();
	});

	it("publishes the target's selection while subscribed, and nothing once not", () => {
		const input = document.createElement("input");
		input.value = "hello";
		document.body.appendChild(input);
		const cb = vi.fn();
		const unsubscribe = subscribeEditTargetState(cb);
		expect(getEditTargetStateSnapshot().target).toBe(false);
		input.focus();
		expect(getEditTargetStateSnapshot()).toEqual({
			target: true,
			selection: false,
			text: true,
			readOnly: false,
			password: false,
		});
		const before = getEditTargetStateSnapshot();
		input.setSelectionRange(0, 2);
		document.dispatchEvent(new Event("selectionchange"));
		expect(getEditTargetStateSnapshot().selection).toBe(true);
		expect(getEditTargetStateSnapshot()).not.toBe(before);
		// A change that keeps every flag keeps the snapshot.
		const calls = cb.mock.calls.length;
		input.setSelectionRange(0, 3);
		document.dispatchEvent(new Event("selectionchange"));
		expect(cb).toHaveBeenCalledTimes(calls);
		unsubscribe();
		expect(getEditTargetStateSnapshot().target).toBe(false);
		input.setSelectionRange(1, 1);
		document.dispatchEvent(new Event("selectionchange"));
		expect(cb).toHaveBeenCalledTimes(calls);
	});
});

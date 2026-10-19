import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	__resetUndoTrackingForTests,
	classicyEditCommands,
	ensureEditTracker,
	getUndoStateSnapshot,
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

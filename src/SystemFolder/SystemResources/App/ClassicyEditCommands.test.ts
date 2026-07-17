import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	classicyEditCommands,
	ensureEditTracker,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";

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

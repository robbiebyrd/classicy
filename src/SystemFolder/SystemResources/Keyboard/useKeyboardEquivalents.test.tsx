import { describe, expect, it, vi } from "vitest";
import { fireEvent, renderHook } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { useKeyboardEquivalents } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";

describe("useKeyboardEquivalents", () => {
	it("fires onDefault for Enter", () => {
		const onDefault = vi.fn();
		renderHook(() => useKeyboardEquivalents({ onDefault }));
		fireEvent.keyDown(document, { key: "Enter" });
		expect(onDefault).toHaveBeenCalledTimes(1);
	});

	it("fires onCancel for Escape", () => {
		const onCancel = vi.fn();
		renderHook(() => useKeyboardEquivalents({ onCancel }));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("fires onCancel for Command-period", () => {
		const onCancel = vi.fn();
		renderHook(() => useKeyboardEquivalents({ onCancel }));
		fireEvent.keyDown(document, { key: ".", metaKey: true });
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("fires onCancel for Control-period too by default (Platinum)", () => {
		const onCancel = vi.fn();
		renderHook(() => useKeyboardEquivalents({ onCancel }));
		fireEvent.keyDown(document, { key: ".", ctrlKey: true });
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	// The remaining chapters' audit's 4.19 (WIG Ch.4 "Shortcut Keys", p.28;
	// App. B Table B.3): Win+period cancels nothing under Windows' rule.
	it("takes Control-period alone under layout.keyboard.command ctrl", () => {
		const restore = activateTestWindowsKeysPackage({
			keyboard: { contextMenuKey: true, command: "ctrl" },
		});
		try {
			const onCancel = vi.fn();
			renderHook(() => useKeyboardEquivalents({ onCancel }));
			fireEvent.keyDown(document, { key: ".", metaKey: true });
			fireEvent.keyDown(document, { key: ".", metaKey: true, ctrlKey: true });
			expect(onCancel).not.toHaveBeenCalled();
			fireEvent.keyDown(document, { key: ".", ctrlKey: true });
			expect(onCancel).toHaveBeenCalledTimes(1);
			fireEvent.keyDown(document, { key: "Escape" });
			expect(onCancel).toHaveBeenCalledTimes(2);
		} finally {
			restore();
		}
	});

	// The remaining chapters' audit's 10.20 (WIG Ch.10 "Message
	// Notification", p.212): under `layout.dialog.flushInput` a dialog takes
	// no key pressed before it showed. A keydown that went down before the
	// hook mounted (stamped earlier than any event since) and every
	// auto-repeat are ignored, until a key comes up or a new key goes down.
	const enterBeforeMount = () => {
		const e = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
		Object.defineProperty(e, "timeStamp", { value: -1 });
		return e;
	};

	it("ignores a held Return from before the dialog under layout.dialog.flushInput, until a key comes up", () => {
		const restore = activateTestWindowsKeysPackage({
			dialog: { flushInput: true },
		});
		try {
			const onDefault = vi.fn();
			renderHook(() => useKeyboardEquivalents({ onDefault }));
			document.dispatchEvent(enterBeforeMount());
			fireEvent.keyDown(document, { key: "Enter", repeat: true });
			fireEvent.keyDown(document, { key: "Enter", repeat: true });
			expect(onDefault).not.toHaveBeenCalled();
			fireEvent.keyUp(document, { key: "Enter" });
			// Armed: a fresh press counts, its repeats never do.
			fireEvent.keyDown(document, { key: "Enter" });
			expect(onDefault).toHaveBeenCalledTimes(1);
			fireEvent.keyDown(document, { key: "Enter", repeat: true });
			expect(onDefault).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	it("takes a new press after the dialog mounted at once under layout.dialog.flushInput", () => {
		const restore = activateTestWindowsKeysPackage({
			dialog: { flushInput: true },
		});
		try {
			const onCancel = vi.fn();
			renderHook(() => useKeyboardEquivalents({ onCancel }));
			fireEvent.keyDown(document, { key: "Escape" });
			expect(onCancel).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	it("takes every Return, repeats and earlier presses included, without the flag", () => {
		const onDefault = vi.fn();
		renderHook(() => useKeyboardEquivalents({ onDefault }));
		document.dispatchEvent(enterBeforeMount());
		fireEvent.keyDown(document, { key: "Enter", repeat: true });
		expect(onDefault).toHaveBeenCalledTimes(2);
	});

	it("does not fire onDefault when a button has focus", () => {
		const onDefault = vi.fn();
		const button = document.createElement("button");
		document.body.appendChild(button);
		button.focus();
		renderHook(() => useKeyboardEquivalents({ onDefault }));
		fireEvent.keyDown(button, { key: "Enter" });
		expect(onDefault).not.toHaveBeenCalled();
		button.remove();
	});

	it("does not fire when disabled", () => {
		const onDefault = vi.fn();
		const onCancel = vi.fn();
		renderHook(() =>
			useKeyboardEquivalents({ onDefault, onCancel, enabled: false }),
		);
		fireEvent.keyDown(document, { key: "Enter" });
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onDefault).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});
});

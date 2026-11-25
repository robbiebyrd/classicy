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

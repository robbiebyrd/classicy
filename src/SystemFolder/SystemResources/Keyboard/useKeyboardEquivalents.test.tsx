import { describe, expect, it, vi } from "vitest";
import { fireEvent, renderHook } from "@/__tests__/test-utils";
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

import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import {
	resetClassicyAppearanceInputForTests,
	uninstallClassicyAppearanceInputForTests,
	withClassicyAppearanceInput,
} from "@/Appearance/useClassicyAppearanceInput.internal";

const TRACKED = ["pointerdown", "mousedown", "pointerup", "mouseup", "keydown"];

/** A control wired like the real ones: it calls only useClassicyAppearance. */
const Control = ({ seen }: { seen?: unknown[] }) => {
	useClassicyAppearance("Button", {});
	return (
		<button
			type="button"
			onKeyDown={() => seen?.push(withClassicyAppearanceInput())}
			onMouseDown={() => seen?.push(withClassicyAppearanceInput())}
		>
			x
		</button>
	);
};

beforeEach(() => {
	// No tracker yet: as if no control had ever mounted in this realm.
	uninstallClassicyAppearanceInputForTests();
});

afterEach(() => {
	vi.restoreAllMocks();
	resetClassicyAppearanceInputForTests();
});

describe("useClassicyAppearanceInput", () => {
	it("is installed by useClassicyAppearance alone", () => {
		const seen: unknown[] = [];
		const { getByRole } = render(<Control seen={seen} />);
		fireEvent.keyDown(getByRole("button"), { key: "Enter" });
		fireEvent.mouseDown(getByRole("button"));
		expect(seen).toEqual([{ input: "keyboard" }, { input: "pointer" }]);
	});

	it("reports the modality of the latest press anywhere in the document", () => {
		render(<Control />);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
		fireEvent.keyDown(document.body, { key: "Escape" });
		expect(withClassicyAppearanceInput()).toEqual({ input: "keyboard" });
		fireEvent.pointerDown(document.body);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
	});

	it("merges the modality into an existing detail", () => {
		render(<Control />);
		fireEvent.keyDown(document.body, { key: "ArrowRight" });
		expect(withClassicyAppearanceInput({ tabId: 1 })).toEqual({
			tabId: 1,
			input: "keyboard",
		});
	});

	it("reads a release made after a key press as pointer input", () => {
		render(<Control />);
		fireEvent.mouseDown(document.body);
		fireEvent.keyDown(document.body, { key: "a" });
		expect(withClassicyAppearanceInput()).toEqual({ input: "keyboard" });
		fireEvent.mouseUp(document.body);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
		fireEvent.keyDown(document.body, { key: "a" });
		fireEvent.pointerUp(document.body);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
	});

	it("ignores bare modifier keys", () => {
		render(<Control />);
		fireEvent.mouseDown(document.body);
		for (const key of ["Shift", "Control", "Alt", "Meta", "CapsLock"]) {
			fireEvent.keyDown(document.body, { key });
			expect(withClassicyAppearanceInput(), key).toEqual({ input: "pointer" });
		}
		fireEvent.mouseUp(document.body);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
		// A modified key is still a key press.
		fireEvent.keyDown(document.body, { key: "a", metaKey: true });
		expect(withClassicyAppearanceInput()).toEqual({ input: "keyboard" });
	});

	it("adds its five listeners exactly once, however often controls mount", () => {
		const add = vi.spyOn(document, "addEventListener");
		const first = render(<Control />);
		render(<Control />);
		first.unmount();
		render(<Control />);
		render(
			<StrictMode>
				<Control />
			</StrictMode>,
		);
		const tracked = add.mock.calls.filter(([type]) =>
			TRACKED.includes(type as string),
		);
		expect(tracked.map(([type, , options]) => [type, options])).toEqual([
			["pointerdown", { capture: true, passive: true }],
			["mousedown", { capture: true, passive: true }],
			["pointerup", { capture: true, passive: true }],
			["mouseup", { capture: true, passive: true }],
			["keydown", { capture: true, passive: true }],
		]);
	});
});

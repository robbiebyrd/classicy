import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	resetClassicyAppearanceInputForTests,
	useClassicyAppearanceInput,
	withClassicyAppearanceInput,
} from "@/Appearance/useClassicyAppearanceInput.internal";

const Probe = () => {
	useClassicyAppearanceInput();
	return <button type="button">x</button>;
};

afterEach(() => {
	resetClassicyAppearanceInputForTests();
});

describe("useClassicyAppearanceInput", () => {
	it("reports the modality of the latest press", () => {
		const { getByRole } = render(<Probe />);
		const button = getByRole("button");
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
		fireEvent.keyDown(button, { key: "Enter" });
		expect(withClassicyAppearanceInput()).toEqual({ input: "keyboard" });
		fireEvent.mouseDown(button);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
		fireEvent.keyDown(document.body, { key: "Escape" });
		fireEvent.pointerDown(document.body);
		expect(withClassicyAppearanceInput()).toEqual({ input: "pointer" });
	});

	it("merges the modality into an existing detail", () => {
		render(<Probe />);
		fireEvent.keyDown(document.body, { key: "ArrowRight" });
		expect(withClassicyAppearanceInput({ tabId: 1 })).toEqual({
			tabId: 1,
			input: "keyboard",
		});
	});

	it("hands every caller the same function", () => {
		const seen: unknown[] = [];
		const Spy = () => {
			seen.push(useClassicyAppearanceInput());
			return null;
		};
		const { rerender } = render(<Spy />);
		rerender(<Spy />);
		expect(seen[0]).toBe(seen[1]);
		expect(seen[0]).toBe(withClassicyAppearanceInput);
	});
});

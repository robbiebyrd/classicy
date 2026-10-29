import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import {
	resetClassicyAppearanceInputForTests,
	uninstallClassicyAppearanceInputForTests,
	withClassicyAppearanceInput,
} from "@/Appearance/useClassicyAppearanceInput.internal";

const TRACKED = ["pointerdown", "mousedown", "keydown"];

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

	it("adds its three listeners exactly once, however often controls mount", () => {
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
			["keydown", { capture: true, passive: true }],
		]);
	});
});

import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import type { ClassicySoundState } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

const dispatch = vi.fn();

// Spread the real module and override only the dispatch double — any other
// export a rendered field/control starts calling later (ClassicyPopUpMenu,
// ClassicyButton, ClassicyInput currently call none of them) still gets a
// working real implementation instead of "X is not a function".
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
		>()),
		useAppManagerDispatch: () => dispatch,
	}),
);
// NOT spread from the real module here (unlike the mock above): this test's
// whole point is dictating exactly what useSound() returns (a fixed 2-label
// fixture, asserted on below), and the real module's `initialPlayer`
// construction plus the full `soundLabels` registry would both defeat that —
// the "General — Click" / "System — Beep" fixture would compete with 41 real
// labels. Keep it narrow and hand-written.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		// Explicit return type breaks a circular-inference TS7018 ("implicitly
		// has an any type") that vi.mock's generic factory typing otherwise hits
		// on the soundPlayer/disabled properties.
		useSound: (): ClassicySoundState => ({
			soundPlayer: null,
			disabled: [],
			labels: [
				{ id: "ClassicyBeep", group: "System", label: "Beep", description: "" },
				{
					id: "ClassicyClick",
					group: "General",
					label: "Click",
					description: "",
				},
			],
		}),
		// ClassicyButton (rendered by the add-action row) also calls this hook,
		// so the mock needs it even though this test only exercises useSound().
		useSoundDispatch: () => vi.fn(),
	}),
);

import { HyperCardScriptBuilder } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";
import type { HCEventHandlers } from "@/SystemFolder/HyperCard/HyperCardModel";

const target = { kind: "card", cardId: "c1" } as never;

function renderPlay(sound?: string) {
	// An unregistered sound (last test case) is still a valid HCAction — a
	// stack author or plugin can name any sprite id — so the cast below just
	// works around the conditional-spread's inferred optional `sound`.
	const handlers = {
		onMouseUp: [{ do: "play", ...(sound ? { sound } : {}) }],
	} as unknown as HCEventHandlers;
	return render(
		<HyperCardScriptBuilder
			target={target}
			handlers={handlers}
			stackId="demo"
		/>,
	);
}

describe("script builder sound field", () => {
	it("renders the play sound parameter as a pop-up menu, not a text box", () => {
		const { container } = renderPlay("ClassicyBeep");
		expect(container.querySelector(".classicyPopUpMenu")).toBeInTheDocument();
	});

	it("shows the group-prefixed label for the current sound", () => {
		const { container } = renderPlay("ClassicyBeep");
		expect(
			container.querySelector(".classicyPopUpMenuValue")?.textContent,
		).toBe("System — Beep");
	});

	it("lists registered sounds sorted by group once opened, with a leading clear option", () => {
		const { container } = renderPlay("ClassicyBeep");
		const combobox = container.querySelector(
			'[role="combobox"]',
		) as HTMLElement;
		fireEvent.click(combobox);
		// Scoped to the popup's own listbox: getAllByRole("option") on the whole
		// document also picks up the native add-action <select>'s <option>s,
		// which carry an implicit ARIA "option" role.
		const listbox = screen.getByRole("listbox");
		const options = within(listbox)
			.getAllByRole("option")
			.map((o) => o.textContent);
		// The current selection ("ClassicyBeep" -> "System — Beep") is rendered
		// with a leading HIG checkmark inside the open menu. "None" is the clear
		// affordance (parity with the old text field's empty-string clear).
		expect(options).toEqual(["None", "General — Click", "✓System — Beep"]);
	});

	it("keeps an unregistered sound as the selected option", () => {
		const { container } = renderPlay("myPluginSound");
		expect(
			container.querySelector(".classicyPopUpMenuValue")?.textContent,
		).toBe("myPluginSound");
	});

	it("clears the sound by picking 'None', dropping the sound key entirely", () => {
		const { container } = renderPlay("ClassicyBeep");
		const combobox = container.querySelector(
			'[role="combobox"]',
		) as HTMLElement;
		fireEvent.click(combobox);
		fireEvent.click(screen.getByRole("option", { name: "None" }));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyAppHCEditSetScript",
				handlers: { onMouseUp: [{ do: "play" }] },
			}),
		);
	});
});

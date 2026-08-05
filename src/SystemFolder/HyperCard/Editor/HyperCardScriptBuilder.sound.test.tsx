import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import type { ClassicySoundState } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

const dispatch = vi.fn();

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({ useAppManagerDispatch: () => dispatch }),
);
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

	it("lists registered sounds sorted by group once opened", () => {
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
		// with a leading HIG checkmark inside the open menu.
		expect(options).toEqual(["General — Click", "✓System — Beep"]);
	});

	it("keeps an unregistered sound as the selected option", () => {
		const { container } = renderPlay("myPluginSound");
		expect(
			container.querySelector(".classicyPopUpMenuValue")?.textContent,
		).toBe("myPluginSound");
	});
});

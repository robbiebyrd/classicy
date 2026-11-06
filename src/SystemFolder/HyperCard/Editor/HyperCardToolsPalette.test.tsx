import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardToolsPalette } from "@/SystemFolder/HyperCard/Editor/HyperCardToolsPalette";
import { registerHyperCardPartEditorMeta } from "@/SystemFolder/HyperCard/HyperCardPlugins";

const dispatch = vi.fn();
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign((sel: (s: unknown) => unknown) => sel({}), {
			getState: () => ({}),
		}),
	}),
);

afterEach(cleanup);
beforeEach(() => dispatch.mockClear());

function makeEdit(): HCEditState {
	return {
		draft: { name: "Demo", cards: [{ id: "c1" }] },
		currentCardId: "c1",
		layer: "card",
		tool: "pointer",
		undo: [],
		redo: [],
		dirty: false,
	};
}

describe("HyperCardToolsPalette", () => {
	it("lists all ten built-in part types as draggable entries", () => {
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		const entries = container.querySelectorAll(
			".classicyHyperCardPaletteEntry",
		);
		expect(entries).toHaveLength(10);
		const setData = vi.fn();
		fireEvent.dragStart(entries[0], { dataTransfer: { setData } });
		expect(setData).toHaveBeenCalledWith(
			"application/x-hypercard-part-type",
			"button",
		);
	});

	it("arms click-to-place on entry click", () => {
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		fireEvent.click(
			container.querySelector(
				'.classicyHyperCardPaletteEntry[data-part-type="slider"]',
			) as HTMLElement,
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetPlacing",
			stackId: "demo",
			partType: "slider",
		});
	});

	it("switches tools via the Browse button", () => {
		render(<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />);
		fireEvent.click(screen.getByText("Browse"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetTool",
			stackId: "demo",
			tool: "browse",
		});
	});

	it("lists registered plugin part types after the built-ins", () => {
		registerHyperCardPartEditorMeta("paletteTest", { label: "Palette Test" });
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		const entry = container.querySelector(
			'.classicyHyperCardPaletteEntry[data-part-type="paletteTest"]',
		);
		expect(entry?.textContent).toContain("Palette Test");
	});

	// The armed entry's ✓ is package CSS (::after on an aria-hidden mark), so
	// the state reaches assistive technology through aria-pressed instead.
	it("exposes the armed entry as a pressed button with a selected state", () => {
		render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		const armed = screen.getByRole("button", { name: "Slider" });
		expect(armed).toHaveAttribute("aria-pressed", "true");
		expect(armed).toHaveClass("classicyHyperCardPaletteEntry", "selected");
		expect(armed.textContent).not.toContain("✓");
		const mark = armed.querySelector(".classicyHyperCardPaletteEntryMark");
		expect(mark).toHaveAttribute("aria-hidden", "true");
		expect(mark?.textContent).toBe("");

		const idle = screen.getByRole("button", { name: "Button" });
		expect(idle).toHaveAttribute("aria-pressed", "false");
		expect(idle).not.toHaveClass("selected");
	});

	// Arming is a one-shot, optional mode (nothing armed is the normal state),
	// so the entry is a toggle: pressing the armed entry again disarms it and
	// aria-pressed turns false, by click and by Enter or Space.
	it("disarms the armed entry when it is pressed again", () => {
		const { rerender } = render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		const armed = screen.getByRole("button", { name: "Slider" });
		fireEvent.click(armed);
		fireEvent.keyDown(armed, { key: "Enter" });
		fireEvent.keyDown(armed, { key: " " });
		expect(dispatch.mock.calls).toEqual(
			Array.from({ length: 3 }, () => [
				{
					type: "ClassicyAppHCEditSetPlacing",
					stackId: "demo",
					partType: undefined,
				},
			]),
		);

		rerender(<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />);
		expect(screen.getByRole("button", { name: "Slider" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});

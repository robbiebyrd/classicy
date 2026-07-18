import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardToolsPalette } from "@/SystemFolder/HyperCard/Editor/HyperCardToolsPalette";

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
});

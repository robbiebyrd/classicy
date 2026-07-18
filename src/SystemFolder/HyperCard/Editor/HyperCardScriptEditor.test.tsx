import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardScriptEditor } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptEditor";

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

function makeEdit(overrides: Partial<HCEditState> = {}): HCEditState {
	return {
		draft: {
			name: "Demo",
			cards: [
				{
					id: "c1",
					parts: [
						{
							id: "b1",
							type: "button",
							script: {
								onMouseUp: [{ do: "beep" }, { do: "go", to: "next" }],
							},
						},
					],
				},
			],
		},
		currentCardId: "c1",
		layer: "card",
		tool: "pointer",
		undo: [],
		redo: [],
		dirty: false,
		script: { target: { kind: "part", partId: "b1" } },
		...overrides,
	};
}

describe("HyperCardScriptEditor", () => {
	it("builder lists existing actions per event", () => {
		render(<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />);
		expect(screen.getByText("onMouseUp")).toBeTruthy();
		expect(screen.getByText("beep")).toBeTruthy();
		expect(screen.getByText("go")).toBeTruthy();
	});

	it("deleting an action dispatches the full remaining handlers", () => {
		render(<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />);
		const deleteButtons = screen.getAllByText("Delete");
		fireEvent.click(deleteButtons[0]);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: { onMouseUp: [{ do: "go", to: "next" }] },
		});
	});

	it("reordering swaps neighbors", () => {
		render(<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />);
		fireEvent.click(screen.getAllByText("↓")[0]);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: { onMouseUp: [{ do: "go", to: "next" }, { do: "beep" }] },
		});
	});

	it("adding an action via the popup appends it with defaults", () => {
		const { container } = render(
			<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />,
		);
		const addPopup = container.querySelector(
			'select[id^="add:onMouseUp"]',
		) as HTMLSelectElement;
		fireEvent.change(addPopup, { target: { value: "wait" } });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: {
				onMouseUp: [
					{ do: "beep" },
					{ do: "go", to: "next" },
					{ do: "wait", ms: 0 },
				],
			},
		});
	});

	it("JSON tab applies a valid script and surfaces validation errors", () => {
		const { container } = render(
			<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />,
		);
		fireEvent.click(screen.getByText("JSON"));
		const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
		fireEvent.change(textarea, {
			target: { value: '{"onMouseUp": [{"to": "x"}]}' },
		});
		fireEvent.click(screen.getByText("Apply"));
		expect(screen.getByText(/missing a string "do"/)).toBeTruthy();
		fireEvent.change(textarea, {
			target: { value: '{"onMouseUp": [{"do": "beep"}]}' },
		});
		fireEvent.click(screen.getByText("Apply"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: { onMouseUp: [{ do: "beep" }] },
		});
	});

	it("Close dispatches HideScript", () => {
		render(<HyperCardScriptEditor stackId={"demo"} edit={makeEdit()} />);
		fireEvent.click(screen.getByText("Close"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditHideScript",
			stackId: "demo",
		});
	});
});

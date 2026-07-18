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

	function makeScriptlessEdit(script: Record<string, unknown>): HCEditState {
		return {
			draft: {
				name: "Demo",
				cards: [
					{
						id: "c1",
						parts: [{ id: "b1", type: "button", script }],
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
		};
	}

	it("the Add-handler popup attaches a first script to a scriptless target, and the newly-shown section can add an action", () => {
		const { rerender } = render(
			<HyperCardScriptEditor stackId={"demo"} edit={makeScriptlessEdit({})} />,
		);

		// No handlers yet: no event sections, and the add-handler popup lists
		// every event as a candidate. ClassicyPopUpMenu has no hidden native
		// <select> — open it via its trigger button, then click the option.
		expect(screen.queryByText("onMouseUp")).toBeNull();
		const addHandlerButton = document.getElementById(
			"add:handler",
		) as HTMLButtonElement;
		expect(addHandlerButton).toBeTruthy();
		fireEvent.click(addHandlerButton);
		fireEvent.click(screen.getByRole("option", { name: "onMouseUp" }));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: { onMouseUp: [] },
		});

		// Rerender as the reducer would after that dispatch: handlers now carry
		// the empty onMouseUp event.
		rerender(
			<HyperCardScriptEditor
				stackId={"demo"}
				edit={makeScriptlessEdit({ onMouseUp: [] })}
			/>,
		);

		expect(screen.getByText("onMouseUp")).toBeTruthy();
		const addAction = document.querySelector(
			'select[id^="add:onMouseUp"]',
		) as HTMLSelectElement;
		expect(addAction).toBeTruthy();
		fireEvent.change(addAction, { target: { value: "beep" } });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
			handlers: { onMouseUp: [{ do: "beep" }] },
		});
	});

	it("JSON tab drops stale text when the target switches", () => {
		const editA: HCEditState = {
			draft: {
				name: "Demo",
				cards: [
					{
						id: "c1",
						parts: [
							{
								id: "b1",
								type: "button",
								script: { onMouseUp: [{ do: "beep" }] },
							},
							{
								id: "b2",
								type: "button",
								script: { onMouseUp: [{ do: "go", to: "next" }] },
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
		};
		const editB: HCEditState = {
			...editA,
			script: { target: { kind: "part", partId: "b2" } },
		};

		const { container, rerender } = render(
			<HyperCardScriptEditor stackId={"demo"} edit={editA} />,
		);
		fireEvent.click(screen.getByText("JSON"));
		const textareaA = container.querySelector(
			"textarea",
		) as HTMLTextAreaElement;
		expect(textareaA.value).toContain('"beep"');
		// Edit the text without applying — this is the stale draft that must not
		// survive a target switch.
		fireEvent.change(textareaA, {
			target: { value: '{"onMouseUp": [{"do": "wait", "ms": 5}]}' },
		});

		// Switch targets (e.g. selecting a different part) while the JSON tab
		// stays open.
		rerender(<HyperCardScriptEditor stackId={"demo"} edit={editB} />);

		const textareaB = container.querySelector(
			"textarea",
		) as HTMLTextAreaElement;
		expect(textareaB.value).toContain('"go"');
		expect(textareaB.value).not.toContain('"wait"');

		// Applying immediately must write B's (unedited) handlers, never A's
		// stale edited text.
		fireEvent.click(screen.getByText("Apply"));
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({
				target: { kind: "part", partId: "b1" },
			}),
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetScript",
			stackId: "demo",
			target: { kind: "part", partId: "b2" },
			handlers: { onMouseUp: [{ do: "go", to: "next" }] },
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

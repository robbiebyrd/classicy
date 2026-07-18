import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardInspector } from "@/SystemFolder/HyperCard/Editor/HyperCardInspector";

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
			backgrounds: [{ id: "bg1", name: "Frame" }],
			variables: { score: 3 },
			cards: [
				{
					id: "c1",
					name: "One",
					background: "bg1",
					parts: [
						{
							id: "slider1",
							type: "slider",
							rect: [10, 10, 160, 24],
							options: { min: 0, max: 100, step: 1, custom: "x" },
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
		...overrides,
	};
}

describe("HyperCardInspector", () => {
	it("shows part identity + geometry and commits a rename on Enter", () => {
		render(
			<HyperCardInspector
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "slider1" })}
			/>,
		);
		const idInput = screen.getByDisplayValue("slider1") as HTMLInputElement;
		fireEvent.change(idInput, { target: { value: "volume" } });
		fireEvent.keyDown(idInput, { key: "Enter" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetPartProps",
			stackId: "demo",
			partId: "slider1",
			props: { id: "volume" },
		});
	});

	it("commits geometry through SetRect", () => {
		render(
			<HyperCardInspector
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "slider1" })}
			/>,
		);
		// rect is [10, 10, 160, 24] — X and Y both display "10"; X renders first.
		const xInput = screen.getAllByDisplayValue("10")[0] as HTMLInputElement;
		fireEvent.change(xInput, { target: { value: "40" } });
		fireEvent.keyDown(xInput, { key: "Enter" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "slider1",
			rect: [40, 10, 160, 24],
		});
	});

	it("renders schema fields for the part's options and commits a number edit", () => {
		render(
			<HyperCardInspector
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "slider1" })}
			/>,
		);
		const maxInput = screen.getByDisplayValue("100") as HTMLInputElement;
		fireEvent.change(maxInput, { target: { value: "10" } });
		fireEvent.keyDown(maxInput, { key: "Enter" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetPartOption",
			stackId: "demo",
			partId: "slider1",
			key: "max",
			value: 10,
		});
	});

	it("renders a raw JSON row for option keys outside the schema", () => {
		render(
			<HyperCardInspector
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "slider1" })}
			/>,
		);
		expect(screen.getByDisplayValue('"x"')).toBeTruthy();
	});

	it("opens the part script editor", () => {
		render(
			<HyperCardInspector
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "slider1" })}
			/>,
		);
		fireEvent.click(screen.getByText("Script…"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditShowScript",
			stackId: "demo",
			target: { kind: "part", partId: "slider1" },
		});
	});

	it("with no selection shows card/stack sections and edits a variable", () => {
		render(<HyperCardInspector stackId={"demo"} edit={makeEdit()} />);
		expect(screen.getByDisplayValue("One")).toBeTruthy();
		expect(screen.getByDisplayValue("Demo")).toBeTruthy();
		const varValue = screen.getByDisplayValue("3") as HTMLInputElement;
		fireEvent.change(varValue, { target: { value: "5" } });
		fireEvent.keyDown(varValue, { key: "Enter" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetStackVariable",
			stackId: "demo",
			name: "score",
			value: 5,
		});
	});
});

import {
	cleanup,
	createEvent,
	fireEvent,
	render,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HyperCardEditorCanvas } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorCanvas";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";

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
					parts: [{ id: "button1", type: "button", rect: [10, 10, 100, 24] }],
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

describe("HyperCardEditorCanvas", () => {
	it("renders the inert card plus one hit region per active-layer part", () => {
		const { container } = render(
			<HyperCardEditorCanvas stackId={"demo"} edit={makeEdit()} />,
		);
		expect(
			container.querySelector(".classicyHyperCardPartInert"),
		).not.toBeNull();
		expect(
			container.querySelectorAll(".classicyHyperCardEditorHit"),
		).toHaveLength(1);
	});

	it("selects a part on pointer-down over its hit region", () => {
		const { container } = render(
			<HyperCardEditorCanvas stackId={"demo"} edit={makeEdit()} />,
		);
		const hit = container.querySelector(
			'.classicyHyperCardEditorHit[data-part-id="button1"]',
		) as HTMLElement;
		fireEvent.pointerDown(hit, { clientX: 20, clientY: 20, pointerId: 1 });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSelect",
			stackId: "demo",
			partId: "button1",
		});
	});

	it("commits a single SetRect after drag-move on the selected part", () => {
		const { container } = render(
			<HyperCardEditorCanvas
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "button1" })}
			/>,
		);
		const hit = container.querySelector(
			'.classicyHyperCardEditorHit[data-part-id="button1"]',
		) as HTMLElement;
		fireEvent.pointerDown(hit, { clientX: 20, clientY: 20, pointerId: 1 });
		fireEvent.pointerMove(hit, { clientX: 45, clientY: 32, pointerId: 1 });
		fireEvent.pointerUp(hit, { clientX: 45, clientY: 32, pointerId: 1 });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [35, 22, 100, 24],
		});
	});

	it("shows 8 resize handles on the selected part and commits a resize", () => {
		const { container } = render(
			<HyperCardEditorCanvas
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "button1" })}
			/>,
		);
		const handles = container.querySelectorAll(
			".classicyHyperCardEditorHandle",
		);
		expect(handles).toHaveLength(8);
		const se = container.querySelector(
			'.classicyHyperCardEditorHandle[data-handle="se"]',
		) as HTMLElement;
		fireEvent.pointerDown(se, { clientX: 110, clientY: 34, pointerId: 1 });
		fireEvent.pointerMove(se, { clientX: 130, clientY: 44, pointerId: 1 });
		fireEvent.pointerUp(se, { clientX: 130, clientY: 44, pointerId: 1 });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [10, 10, 120, 34],
		});
	});

	it("nudges with arrows, deletes with Delete, undoes with Cmd+Z", () => {
		const { container } = render(
			<HyperCardEditorCanvas
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "button1" })}
			/>,
		);
		const surface = container.querySelector(
			".classicyHyperCardEditorOverlay",
		) as HTMLElement;
		fireEvent.keyDown(surface, { key: "ArrowRight", shiftKey: true });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [18, 10, 100, 24],
		});
		fireEvent.keyDown(surface, { key: "Delete" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditDeletePart",
			stackId: "demo",
			partId: "button1",
		});
		fireEvent.keyDown(surface, { key: "z", metaKey: true });
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditUndo",
			stackId: "demo",
		});
	});

	it("adds a part on drop from the palette payload", () => {
		const { container } = render(
			<HyperCardEditorCanvas stackId={"demo"} edit={makeEdit()} />,
		);
		const surface = container.querySelector(
			".classicyHyperCardEditorOverlay",
		) as HTMLElement;
		surface.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 512, height: 342 }) as DOMRect;
		const drop = createEvent.drop(surface);
		Object.defineProperty(drop, "clientX", { value: 60 });
		Object.defineProperty(drop, "clientY", { value: 80 });
		Object.defineProperty(drop, "dataTransfer", {
			value: {
				getData: (t: string) =>
					t === "application/x-hypercard-part-type" ? "slider" : "",
			},
		});
		fireEvent(surface, drop);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditAddPart",
			stackId: "demo",
			partType: "slider",
			at: [60, 80],
		});
	});

	it("click on empty canvas places the armed part type, else deselects", () => {
		const { container, rerender } = render(
			<HyperCardEditorCanvas
				stackId={"demo"}
				edit={makeEdit({ placing: "label" })}
			/>,
		);
		const surface = container.querySelector(
			".classicyHyperCardEditorOverlay",
		) as HTMLElement;
		surface.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 512, height: 342 }) as DOMRect;
		fireEvent.pointerDown(surface, {
			clientX: 200,
			clientY: 150,
			pointerId: 1,
		});
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditAddPart",
			stackId: "demo",
			partType: "label",
			at: [200, 150],
		});
		dispatch.mockClear();
		rerender(
			<HyperCardEditorCanvas
				stackId={"demo"}
				edit={makeEdit({ selectedPartId: "button1" })}
			/>,
		);
		const surface2 = container.querySelector(
			".classicyHyperCardEditorOverlay",
		) as HTMLElement;
		fireEvent.pointerDown(surface2, {
			clientX: 400,
			clientY: 300,
			pointerId: 1,
		});
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSelect",
			stackId: "demo",
			partId: undefined,
		});
	});
});

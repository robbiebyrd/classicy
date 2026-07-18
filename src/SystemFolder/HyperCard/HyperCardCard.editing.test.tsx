import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import type { HCOpenStack } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { makeInitialRuntime } from "@/SystemFolder/HyperCard/HyperCardUtils";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
		useAppManager: Object.assign((sel: (s: unknown) => unknown) => sel({}), {
			getState: () => ({}),
		}),
	}),
);

afterEach(cleanup);

function makeOpen(): HCOpenStack {
	return {
		stackSource: "demo",
		stack: {
			name: "Demo",
			cards: [
				{
					id: "c1",
					parts: [
						{ id: "b1", type: "button", rect: [10, 10, 100, 24] },
						{
							id: "hidden1",
							type: "label",
							rect: [10, 40, 100, 20],
							visible: false,
						},
					],
				},
			],
		},
		currentCardId: "c1",
		history: [],
		variables: {},
		fieldValues: {},
		partVisibility: {},
		fieldRev: {},
		runtime: makeInitialRuntime(),
	};
}

describe("HyperCardCard editing mode", () => {
	it("skips invisible parts when not editing", () => {
		const { container } = render(
			<HyperCardCard open={makeOpen()} stackId={"demo"} />,
		);
		expect(container.querySelectorAll(".classicyHyperCardPart")).toHaveLength(
			1,
		);
		expect(container.querySelector('[data-part-id="b1"]')).toBeNull();
	});

	it("renders all parts inert (with data-part-id) when editing, dimming hidden ones", () => {
		const { container } = render(
			<HyperCardCard open={makeOpen()} stackId={"demo"} editing />,
		);
		const parts = container.querySelectorAll(".classicyHyperCardPart");
		expect(parts).toHaveLength(2);
		expect(container.querySelector('[data-part-id="b1"]')).not.toBeNull();
		const hidden = container.querySelector('[data-part-id="hidden1"]');
		expect(hidden?.classList.contains("classicyHyperCardPartHidden")).toBe(
			true,
		);
		for (const el of Array.from(parts)) {
			expect(el.classList.contains("classicyHyperCardPartInert")).toBe(true);
		}
	});

	it("marks editing part wrappers inert so they cannot take focus", () => {
		const { container } = render(
			<HyperCardCard open={makeOpen()} stackId={"demo"} editing />,
		);
		const wrapper = container.querySelector('[data-part-id="b1"]');
		expect(wrapper?.hasAttribute("inert")).toBe(true);
	});
});

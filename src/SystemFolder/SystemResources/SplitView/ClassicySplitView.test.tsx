import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicySplitView,
	computeSplitViewSizes,
} from "@/SystemFolder/SystemResources/SplitView/ClassicySplitView";

vi.mock(
	"@/SystemFolder/SystemResources/SplitView/ClassicySplitView.scss",
	() => ({}),
);

/** Give the split view's root a real geometry; jsdom rects are all zeros. */
const mockRootRect = (container: HTMLElement, width = 400, height = 300) => {
	const root = container.querySelector(".classicySplitView") as HTMLElement;
	vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		width,
		height,
		toJSON: () => ({}),
	} as DOMRect);
	return root;
};

const paneGrows = (container: HTMLElement) =>
	[...container.querySelectorAll(".classicySplitViewPane")].map(
		(p) => (p as HTMLElement).style.flexGrow,
	);

afterEach(() => {
	vi.restoreAllMocks();
});

describe("computeSplitViewSizes", () => {
	it("moves size from the trailing pane to the leading pane on a positive delta", () => {
		expect(computeSplitViewSizes([50, 50], 0, 10, 5)).toEqual([60, 40]);
	});

	it("moves size from the leading pane to the trailing pane on a negative delta", () => {
		expect(computeSplitViewSizes([50, 50], 0, -10, 5)).toEqual([40, 60]);
	});

	it("clamps so the shrinking leading pane never drops below the minimum", () => {
		expect(computeSplitViewSizes([50, 50], 0, -48, 10)).toEqual([10, 90]);
	});

	it("clamps so the shrinking trailing pane never drops below the minimum", () => {
		expect(computeSplitViewSizes([50, 50], 0, 48, 10)).toEqual([90, 10]);
	});

	it("only redistributes between the two panes adjacent to the dragged divider", () => {
		expect(computeSplitViewSizes([30, 30, 40], 1, 5, 5)).toEqual([30, 35, 35]);
	});

	it("returns the sizes unchanged when both panes already sit at the minimum", () => {
		expect(computeSplitViewSizes([50, 50], 0, 25, 50)).toEqual([50, 50]);
	});
});

describe("ClassicySplitView", () => {
	it("renders one pane per child and a divider between each pair", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(container.querySelectorAll(".classicySplitViewPane")).toHaveLength(
			2,
		);
		expect(
			container.querySelectorAll(".classicySplitViewDivider"),
		).toHaveLength(1);
	});

	it("renders two dividers for three panes", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
				<div>Three</div>
			</ClassicySplitView>,
		);
		expect(container.querySelectorAll(".classicySplitViewPane")).toHaveLength(
			3,
		);
		expect(
			container.querySelectorAll(".classicySplitViewDivider"),
		).toHaveLength(2);
	});

	it("warns and renders only the first three children when given more", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { container, queryByText } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
				<div>Three</div>
				<div>Four</div>
			</ClassicySplitView>,
		);
		expect(warn).toHaveBeenCalled();
		expect(container.querySelectorAll(".classicySplitViewPane")).toHaveLength(
			3,
		);
		expect(queryByText("Four")).toBeNull();
	});

	it("lays panes side-by-side by default with a vertical divider line", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(container.querySelector(".classicySplitView")).toHaveClass(
			"classicySplitViewHorizontal",
		);
		expect(
			container.querySelector(".classicySplitViewDivider"),
		).toHaveAttribute("aria-orientation", "vertical");
	});

	it("stacks panes with a horizontal divider line when direction is vertical", () => {
		const { container } = render(
			<ClassicySplitView direction="vertical">
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(container.querySelector(".classicySplitView")).toHaveClass(
			"classicySplitViewVertical",
		);
		expect(
			container.querySelector(".classicySplitViewDivider"),
		).toHaveAttribute("aria-orientation", "horizontal");
	});

	it("splits equally when defaultSizes is not given", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(paneGrows(container)).toEqual(["50", "50"]);
	});

	it("applies defaultSizes as the initial split", () => {
		const { container } = render(
			<ClassicySplitView defaultSizes={[30, 70]}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(paneGrows(container)).toEqual(["30", "70"]);
	});

	it("ignores defaultSizes whose length does not match the pane count", () => {
		const { container } = render(
			<ClassicySplitView defaultSizes={[30, 30, 40]}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(paneGrows(container)).toEqual(["50", "50"]);
	});

	it("grows the leading pane when the divider is dragged toward the trailing side", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["62.5", "37.5"]);
	});

	it("grows the trailing pane when the divider is dragged toward the leading side", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 150 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["37.5", "62.5"]);
	});

	it("tracks the vertical axis when direction is vertical", () => {
		const { container } = render(
			<ClassicySplitView direction="vertical">
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400, 300);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientY: 150 });
		fireEvent.mouseMove(document, { clientY: 180 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["60", "40"]);
	});

	it("clamps a drag so no pane shrinks below minPaneSize", () => {
		const { container } = render(
			<ClassicySplitView minPaneSize={40}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 0 });
		fireEvent.mouseUp(document);
		// 40px of a 400px container is 10%.
		expect(paneGrows(container)).toEqual(["10", "90"]);
	});

	it("stops resizing once the mouse is released", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		fireEvent.mouseMove(document, { clientX: 350 });
		expect(paneGrows(container)).toEqual(["62.5", "37.5"]);
	});

	it("reports each new split through onResize", () => {
		const onResize = vi.fn();
		const { container } = render(
			<ClassicySplitView onResize={onResize}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		expect(onResize).toHaveBeenCalledWith([62.5, 37.5]);
	});

	it("commits the final sizes once when a drag gesture ends", () => {
		const onResize = vi.fn();
		const onResizeCommit = vi.fn();
		const { container } = render(
			<ClassicySplitView onResize={onResize} onResizeCommit={onResizeCommit}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 240 });
		expect(onResizeCommit).not.toHaveBeenCalled();
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		expect(onResize).toHaveBeenCalledTimes(2);
		expect(onResizeCommit).toHaveBeenCalledTimes(1);
		expect(onResizeCommit).toHaveBeenCalledWith([62.5, 37.5]);
	});

	it("does not commit when the divider is pressed and released without moving", () => {
		const onResizeCommit = vi.fn();
		const { container } = render(
			<ClassicySplitView onResizeCommit={onResizeCommit}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseUp(document);
		expect(onResizeCommit).not.toHaveBeenCalled();
	});

	it("commits after an arrow-key resize on key release", () => {
		const onResizeCommit = vi.fn();
		const { container } = render(
			<ClassicySplitView onResizeCommit={onResizeCommit}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.keyDown(divider, { key: "ArrowRight" });
		fireEvent.keyDown(divider, { key: "ArrowRight" });
		expect(onResizeCommit).not.toHaveBeenCalled();
		fireEvent.keyUp(divider, { key: "ArrowRight" });
		expect(onResizeCommit).toHaveBeenCalledTimes(1);
		expect(onResizeCommit).toHaveBeenCalledWith([52, 48]);
	});

	it("does not commit on releasing a cross-axis key", () => {
		const onResizeCommit = vi.fn();
		const { container } = render(
			<ClassicySplitView onResizeCommit={onResizeCommit}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.keyUp(divider, { key: "ArrowUp" });
		expect(onResizeCommit).not.toHaveBeenCalled();
	});

	it("gives each divider keyboard focus and reports the leading pane's size", () => {
		const { container } = render(
			<ClassicySplitView defaultSizes={[30, 70]}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		expect(divider).toHaveAttribute("tabindex", "0");
		expect(divider).toHaveAttribute("aria-valuenow", "30");
	});

	it("resizes with the horizontal arrow keys when a divider has focus", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.keyDown(divider, { key: "ArrowRight" });
		expect(paneGrows(container)).toEqual(["51", "49"]);
		fireEvent.keyDown(divider, { key: "ArrowLeft" });
		fireEvent.keyDown(divider, { key: "ArrowLeft" });
		expect(paneGrows(container)).toEqual(["49", "51"]);
	});

	it("resizes with the vertical arrow keys when direction is vertical", () => {
		const { container } = render(
			<ClassicySplitView direction="vertical">
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400, 300);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.keyDown(divider, { key: "ArrowDown" });
		expect(paneGrows(container)).toEqual(["51", "49"]);
		fireEvent.keyDown(divider, { key: "ArrowUp" });
		fireEvent.keyDown(divider, { key: "ArrowUp" });
		expect(paneGrows(container)).toEqual(["49", "51"]);
	});

	it("ignores the cross-axis arrow keys", () => {
		const { container } = render(
			<ClassicySplitView>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		fireEvent.keyDown(divider, { key: "ArrowUp" });
		fireEvent.keyDown(divider, { key: "ArrowDown" });
		expect(paneGrows(container)).toEqual(["50", "50"]);
	});

	it("merges a custom className onto the root element", () => {
		const { container } = render(
			<ClassicySplitView className="myCustomClass">
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		expect(container.querySelector(".classicySplitView")).toHaveClass(
			"myCustomClass",
		);
	});
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { render } from "@/__tests__/test-utils";
import {
	type ClassicyGestureEnd,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import "../../../../packages/appearance/platinum/src/assets/platinumAssets";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	ClassicySplitView,
	type ClassicySplitViewCommands,
	classicySplitViewClosingPane,
	computeSplitViewSizes,
} from "@/SystemFolder/SystemResources/SplitView/ClassicySplitView";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

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
		expect(onResizeCommit).toHaveBeenCalledWith([62.5, 37.5], { lost: false });
	});

	it("still takes a commit handler that reads only the sizes", () => {
		// Type-level: the trailing `{ lost }` is optional to read, so an
		// existing one-argument handler compiles unchanged...
		const saved: number[][] = [];
		const saveSizes = (sizes: number[]) => {
			saved.push(sizes);
		};
		const accepted: ComponentProps<typeof ClassicySplitView>["onResizeCommit"] =
			saveSizes;
		// ...while a handler that reads it must take it as `{ lost: boolean }`.
		const reads: ComponentProps<typeof ClassicySplitView>["onResizeCommit"] = (
			_sizes: number[],
			info: ClassicyGestureEnd,
		) => {
			expect(info.lost).toBeTypeOf("boolean");
		};
		expect(reads).toBeTypeOf("function");
		// @ts-expect-error: the trailing info's `lost` is a boolean
		const wrong: ComponentProps<typeof ClassicySplitView>["onResizeCommit"] = (
			_sizes: number[],
			_info: { lost: string },
		) => {};
		expect(accepted).toBe(saveSizes);
		expect(wrong).toBeTypeOf("function");

		const { container } = render(
			<ClassicySplitView onResizeCommit={saveSizes}>
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
		expect(saved).toEqual([[62.5, 37.5]]);
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
		// A key release is never a lost pointer stream.
		expect(onResizeCommit).toHaveBeenCalledWith([52, 48], { lost: false });
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

describe("ClassicySplitView drag cursors", () => {
	afterEach(() => {
		document.body.style.cursor = "";
	});

	const setup = (direction: "horizontal" | "vertical") => {
		const { container } = render(
			<ClassicySplitView direction={direction}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		const root = mockRootRect(container, 400, 300);
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		return { root, divider };
	};

	it("keeps the hover cursor until the pointer actually moves", () => {
		const { root, divider } = setup("horizontal");
		fireEvent.mouseDown(divider, { clientX: 200 });
		expect(root).not.toHaveAttribute("data-drag-direction");
		expect(document.body.style.cursor).toBe("");
		fireEvent.mouseUp(document);
	});

	it("tracks travel direction on a horizontal split, flipping mid-drag", () => {
		const { root, divider } = setup("horizontal");
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 240 });
		expect(root).toHaveAttribute("data-drag-direction", "r");
		expect(document.body.style.cursor).toContain("cursor-resize-r.png");
		// Still right of the start position, but now traveling left.
		fireEvent.mouseMove(document, { clientX: 220 });
		expect(root).toHaveAttribute("data-drag-direction", "l");
		expect(document.body.style.cursor).toContain("cursor-resize-l.png");
		fireEvent.mouseUp(document);
	});

	it("tracks travel direction on a vertical split", () => {
		const { root, divider } = setup("vertical");
		fireEvent.mouseDown(divider, { clientY: 150 });
		fireEvent.mouseMove(document, { clientY: 180 });
		expect(root).toHaveAttribute("data-drag-direction", "d");
		expect(document.body.style.cursor).toContain("cursor-resize-d.png");
		fireEvent.mouseMove(document, { clientY: 120 });
		expect(root).toHaveAttribute("data-drag-direction", "u");
		expect(document.body.style.cursor).toContain("cursor-resize-u.png");
		fireEvent.mouseUp(document);
	});

	it("clears the direction stamp and body cursor on release", () => {
		const { root, divider } = setup("horizontal");
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 260 });
		fireEvent.mouseUp(document);
		expect(root).not.toHaveAttribute("data-drag-direction");
		expect(document.body.style.cursor).toBe("");
	});
});

describe("ClassicySplitView when the pointer stream is lost", () => {
	afterEach(() => {
		document.body.style.cursor = "";
	});

	const renderSplit = () => {
		const onResize = vi.fn();
		const onResizeCommit = vi.fn();
		const view = render(
			<ClassicySplitView onResize={onResize} onResizeCommit={onResizeCommit}>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		const root = mockRootRect(view.container, 400);
		const divider = view.container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		return { ...view, root, divider, onResize, onResizeCommit };
	};

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a drag where it is, committing the sizes on screen, on a %s", (loss) => {
		const { container, root, divider, onResizeCommit } = renderSplit();
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		expect(root).toHaveAttribute("data-drag-direction", "r");

		losePointerStream(loss);
		// Committed as a release there would commit it, so a host that
		// persists on commit holds what the user sees.
		// The trailing info says the gesture was lost, not released.
		expect(onResizeCommit).toHaveBeenCalledOnce();
		expect(onResizeCommit).toHaveBeenCalledWith([62.5, 37.5], { lost: true });
		expect(paneGrows(container)).toEqual(["62.5", "37.5"]);
		// The drag cursor is put back.
		expect(root).not.toHaveAttribute("data-drag-direction");
		expect(document.body.style.cursor).toBe("");

		// The pointer coming back does not move the divider, and the
		// release that finally comes commits nothing more.
		fireEvent.mouseMove(document, { clientX: 350 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["62.5", "37.5"]);
		expect(onResizeCommit).toHaveBeenCalledOnce();
	});

	it("commits nothing when the stream is lost before the divider moved", () => {
		const { divider, onResizeCommit } = renderSplit();
		fireEvent.mouseDown(divider, { clientX: 200 });
		losePointerStream("blur");
		fireEvent.mouseMove(document, { clientX: 300 });
		expect(onResizeCommit).not.toHaveBeenCalled();
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("does nothing on a %s after unmounting mid-drag", (loss) => {
		const consoleError = vi.spyOn(console, "error");
		const { divider, onResize, onResizeCommit, unmount } = renderSplit();
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		onResize.mockClear();
		unmount();
		losePointerStream(loss);
		fireEvent.mouseMove(document, { clientX: 300 });
		fireEvent.mouseUp(document);
		expect(onResize).not.toHaveBeenCalled();
		expect(onResizeCommit).not.toHaveBeenCalled();
		expect(document.body.style.cursor).toBe("");
		expect(consoleError).not.toHaveBeenCalled();
	});

	it("leaves the body cursor alone when it unmounts after a drag ended", () => {
		const { divider, unmount } = renderSplit();
		fireEvent.mouseDown(divider, { clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		// Another gesture owns the cursor now.
		document.body.style.cursor = "wait";
		unmount();
		expect(document.body.style.cursor).toBe("wait");
	});

	it("removes a drag's document listeners when it unmounts mid-drag", () => {
		const live = trackPointerStreamListeners();
		const removed = vi.spyOn(document, "removeEventListener");
		const { divider, unmount } = renderSplit();
		fireEvent.mouseDown(divider, { clientX: 200 });
		expect(live.size).toBe(3);
		unmount();
		expect(live.size).toBe(0);
		const types = removed.mock.calls.map(([type]) => type);
		expect(types).toContain("mousemove");
		expect(types).toContain("mouseup");
	});

	it("watches the pointer stream only while a drag lasts", () => {
		const live = trackPointerStreamListeners();
		const { divider } = renderSplit();
		expect(live.size).toBe(0);
		fireEvent.mouseDown(divider, { clientX: 200 });
		expect(live.size).toBe(3);
		fireEvent.mouseMove(document, { clientX: 250 });
		fireEvent.mouseUp(document);
		expect(live.size).toBe(0);
		fireEvent.mouseDown(divider, { clientX: 200 });
		losePointerStream("pointercancel");
		expect(live.size).toBe(0);
	});
});

describe("classicySplitViewClosingPane", () => {
	it("closes the pane whose end the divider is dragged to, within the handle's thickness", () => {
		expect(classicySplitViewClosingPane(5, 300, 6)).toBe("leading");
		expect(classicySplitViewClosingPane(-40, 300, 6)).toBe("leading");
		expect(classicySplitViewClosingPane(6, 300, 6)).toBeNull();
		expect(classicySplitViewClosingPane(150, 300, 6)).toBeNull();
		expect(classicySplitViewClosingPane(293, 300, 6)).toBeNull();
		expect(classicySplitViewClosingPane(294, 300, 6)).toBe("trailing");
		expect(classicySplitViewClosingPane(500, 300, 6)).toBe("trailing");
	});
});

// A splittable view (WIG Ch.6 "Splitting Windows", pp.92-95; HIG7
// pp.170-172): stacked, 300 px tall, its handles 6 px thick.
describe("ClassicySplitView splittable", () => {
	afterEach(() => {
		document.body.style.cursor = "";
	});

	const thick = (el: Element, size = 6) =>
		vi
			.spyOn(el, "getBoundingClientRect")
			.mockReturnValue(
				DOMRect.fromRect({ x: 0, y: 0, width: 400, height: size }),
			);

	const renderSplittable = (
		props: Partial<ComponentProps<typeof ClassicySplitView>> = {},
	) => {
		const onResizeCommit = vi.fn();
		const onSplitChange = vi.fn();
		const commandsRef = {
			current: null as ClassicySplitViewCommands | null,
		};
		const view = render(
			<ClassicySplitView
				direction="vertical"
				splittable
				onResizeCommit={onResizeCommit}
				onSplitChange={onSplitChange}
				commandsRef={commandsRef}
				{...props}
			>
				<div>Top</div>
				<div>Bottom</div>
			</ClassicySplitView>,
		);
		const root = mockRootRect(view.container, 400, 300);
		const panes = () =>
			[...view.container.querySelectorAll(".classicySplitViewPane")].map(
				(p) => p as HTMLElement,
			);
		const divider = () =>
			view.container.querySelector(
				".classicySplitViewDivider",
			) as HTMLElement | null;
		const splitBox = () =>
			view.container.querySelector(
				".classicySplitViewSplitBox",
			) as HTMLElement | null;
		return {
			...view,
			root,
			panes,
			divider,
			splitBox,
			onResizeCommit,
			onSplitChange,
			commandsRef,
		};
	};

	it("closes the pane the divider is dragged to the end of, reopening it if the pointer leaves the end", () => {
		const {
			container,
			panes,
			divider,
			splitBox,
			onResizeCommit,
			onSplitChange,
		} = renderSplittable();
		thick(divider() as HTMLElement);
		fireEvent.mouseDown(divider() as HTMLElement, { clientY: 150 });
		// Past the minimum, the top pane stops at 48 px.
		fireEvent.mouseMove(document, { clientY: 20 });
		expect(paneGrows(container)).toEqual(["16", "84"]);
		expect(panes()[0]).not.toHaveClass("collapsed");
		// Within the divider's thickness of the top: the top pane closes.
		fireEvent.mouseMove(document, { clientY: 5 });
		expect(panes()[0]).toHaveClass("collapsed");
		expect(divider()).toBeNull();
		// The bottom pane keeps its vertical bar, the split box at its top.
		const box = splitBox() as HTMLElement;
		expect(
			box.closest('[data-classicy-part="scroll-accessory-start"]'),
		).not.toBeNull();
		expect(panes()[1].contains(box)).toBe(true);
		// Back out of the end, before the release: open again.
		fireEvent.mouseMove(document, { clientY: 100 });
		expect(panes()[0]).not.toHaveClass("collapsed");
		expect(splitBox()).toBeNull();
		fireEvent.mouseMove(document, { clientY: 2 });
		fireEvent.mouseUp(document);
		expect(onSplitChange).toHaveBeenCalledOnce();
		expect(onSplitChange).toHaveBeenCalledWith("leading");
		expect(onResizeCommit).not.toHaveBeenCalled();
		// The split keeps its location before the drag, for reopening.
		expect(paneGrows(container)).toEqual(["50", "50"]);
		// The closed pane stays mounted.
		expect(panes()[0].textContent).toBe("Top");
	});

	it("closes the trailing pane at the other end, the split box at the end of the leading pane's bar", () => {
		const { panes, divider, splitBox, onSplitChange } = renderSplittable();
		thick(divider() as HTMLElement);
		fireEvent.mouseDown(divider() as HTMLElement, { clientY: 150 });
		fireEvent.mouseMove(document, { clientY: 294 });
		fireEvent.mouseUp(document);
		expect(panes()[1]).toHaveClass("collapsed");
		expect(onSplitChange).toHaveBeenCalledWith("trailing");
		const box = splitBox() as HTMLElement;
		expect(panes()[0].contains(box)).toBe(true);
		expect(
			box.closest('[data-classicy-part="scroll-accessory-end"]'),
		).not.toBeNull();
	});

	it("opens a closed split by dragging its split box out", () => {
		const { container, panes, splitBox, onResizeCommit, onSplitChange } =
			renderSplittable({ defaultClosed: "leading" });
		expect(panes()[0]).toHaveClass("collapsed");
		// The remaining pane draws its bar (`always`) for the box.
		expect(
			container.querySelectorAll('[data-classicy-part="scrollbar"]'),
		).toHaveLength(1);
		const box = splitBox() as HTMLElement;
		thick(box);
		fireEvent.mouseDown(box, { clientY: 2 });
		// Still over the box: closed.
		fireEvent.mouseMove(document, { clientY: 7 });
		expect(panes()[0]).toHaveClass("collapsed");
		fireEvent.mouseMove(document, { clientY: 152 });
		expect(panes()[0]).not.toHaveClass("collapsed");
		expect(paneGrows(container)).toEqual(["50", "50"]);
		const divider = container.querySelector(".classicySplitViewDivider");
		// The moving divider carries `dragging` until the release.
		expect(divider).toHaveClass("dragging");
		fireEvent.mouseUp(document);
		expect(divider).not.toHaveClass("dragging");
		expect(onSplitChange).toHaveBeenCalledWith(null);
		expect(onResizeCommit).toHaveBeenCalledWith([50, 50], { lost: false });
	});

	it("opens at the minimum from the split box, never smaller", () => {
		const { container, splitBox } = renderSplittable({
			defaultClosed: "leading",
		});
		const box = splitBox() as HTMLElement;
		thick(box);
		fireEvent.mouseDown(box, { clientY: 2 });
		fireEvent.mouseMove(document, { clientY: 12 });
		expect(paneGrows(container)).toEqual(["16", "84"]);
		fireEvent.mouseUp(document);
	});

	it("reopens where the split last was on a double-click of the split box", () => {
		const { container, panes, splitBox, onSplitChange } = renderSplittable({
			defaultClosed: "leading",
			defaultSizes: [30, 70],
		});
		fireEvent.doubleClick(splitBox() as HTMLElement);
		expect(panes()[0]).not.toHaveClass("collapsed");
		expect(paneGrows(container)).toEqual(["30", "70"]);
		expect(onSplitChange).toHaveBeenCalledWith(null);
	});

	it("closes the smaller pane on a double-click of the divider", () => {
		const { panes, divider, onSplitChange, commandsRef } = renderSplittable({
			defaultSizes: [70, 30],
		});
		expect(commandsRef.current?.isSplit()).toBe(true);
		fireEvent.doubleClick(divider() as HTMLElement);
		expect(panes()[1]).toHaveClass("collapsed");
		expect(onSplitChange).toHaveBeenCalledWith("trailing");
		expect(commandsRef.current?.isSplit()).toBe(false);
	});

	it("removes the split from a command, the smaller pane closing", () => {
		const { panes, onSplitChange, commandsRef } = renderSplittable({
			defaultSizes: [40, 60],
		});
		act(() => commandsRef.current?.removeSplit());
		expect(panes()[0]).toHaveClass("collapsed");
		expect(onSplitChange).toHaveBeenCalledWith("leading");
		// Already closed: nothing more.
		act(() => commandsRef.current?.removeSplit());
		expect(onSplitChange).toHaveBeenCalledOnce();
	});

	it("needs exactly two panes: three stay split, with a warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { container } = render(
			<ClassicySplitView splittable defaultClosed="leading">
				<div>One</div>
				<div>Two</div>
				<div>Three</div>
			</ClassicySplitView>,
		);
		expect(warn).toHaveBeenCalled();
		expect(container.querySelector(".collapsed")).toBeNull();
		expect(
			container.querySelectorAll(".classicySplitViewDivider"),
		).toHaveLength(2);
	});

	it("ignores defaultClosed and the ends without splittable", () => {
		const onSplitChange = vi.fn();
		const { container } = render(
			<ClassicySplitView
				direction="vertical"
				defaultClosed="leading"
				onSplitChange={onSplitChange}
			>
				<div>Top</div>
				<div>Bottom</div>
			</ClassicySplitView>,
		);
		mockRootRect(container, 400, 300);
		expect(container.querySelector(".collapsed")).toBeNull();
		const divider = container.querySelector(
			".classicySplitViewDivider",
		) as HTMLElement;
		thick(divider);
		fireEvent.mouseDown(divider, { clientY: 150 });
		fireEvent.mouseMove(document, { clientY: -50 });
		fireEvent.doubleClick(divider);
		fireEvent.mouseUp(document);
		expect(container.querySelector(".collapsed")).toBeNull();
		expect(container.querySelector(".classicySplitViewSplitBox")).toBeNull();
		expect(paneGrows(container)).toEqual(["16", "84"]);
		expect(onSplitChange).not.toHaveBeenCalled();
	});
});

// The Split command (WIG Ch.6 "Splitting Windows", p.95): the arrow keys
// move the split, Enter sets it, Escape cancels.
describe("ClassicySplitView Split command", () => {
	const renderWithCommand = (
		props: Partial<ComponentProps<typeof ClassicySplitView>> = {},
	) => {
		const onResizeCommit = vi.fn();
		const onSplitChange = vi.fn();
		const commandsRef = {
			current: null as ClassicySplitViewCommands | null,
		};
		const view = render(
			<>
				<button type="button">Before</button>
				<ClassicySplitView
					direction="vertical"
					onResizeCommit={onResizeCommit}
					onSplitChange={onSplitChange}
					commandsRef={commandsRef}
					{...props}
				>
					<div>Top</div>
					<div>Bottom</div>
				</ClassicySplitView>
			</>,
		);
		mockRootRect(view.container, 400, 300);
		const button = view.getByText("Before");
		button.focus();
		const divider = () =>
			view.container.querySelector(
				".classicySplitViewDivider",
			) as HTMLElement | null;
		return {
			...view,
			button,
			divider,
			onResizeCommit,
			onSplitChange,
			commandsRef,
		};
	};

	it("splits a closed view in the middle and moves it from the keyboard until Enter", () => {
		const {
			container,
			button,
			divider,
			onResizeCommit,
			onSplitChange,
			commandsRef,
		} = renderWithCommand({ splittable: true, defaultClosed: "leading" });
		act(() => commandsRef.current?.split());
		expect(container.querySelector(".collapsed")).toBeNull();
		expect(paneGrows(container)).toEqual(["50", "50"]);
		const el = divider() as HTMLElement;
		expect(document.activeElement).toBe(el);
		expect(el).toHaveClass("dragging");
		fireEvent.keyDown(el, { key: "ArrowDown" });
		fireEvent.keyUp(el, { key: "ArrowDown" });
		fireEvent.keyDown(el, { key: "ArrowDown" });
		fireEvent.keyUp(el, { key: "ArrowDown" });
		expect(paneGrows(container)).toEqual(["52", "48"]);
		// Not set until Enter.
		expect(onResizeCommit).not.toHaveBeenCalled();
		expect(fireEvent.keyDown(el, { key: "Enter" })).toBe(false);
		expect(onResizeCommit).toHaveBeenCalledOnce();
		expect(onResizeCommit).toHaveBeenCalledWith([52, 48], { lost: false });
		expect(onSplitChange).toHaveBeenCalledWith(null);
		expect(el).not.toHaveClass("dragging");
		expect(document.activeElement).toBe(button);
		expect(commandsRef.current?.isSplit()).toBe(true);
	});

	it("puts the split back as it was on Escape, closed again", () => {
		const {
			container,
			button,
			divider,
			onResizeCommit,
			onSplitChange,
			commandsRef,
		} = renderWithCommand({
			splittable: true,
			defaultClosed: "trailing",
			defaultSizes: [30, 70],
		});
		act(() => commandsRef.current?.split());
		const el = divider() as HTMLElement;
		fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(fireEvent.keyDown(el, { key: "Escape" })).toBe(false);
		expect(
			(container.querySelectorAll(".classicySplitViewPane")[1] as HTMLElement)
				.classList,
		).toContain("collapsed");
		expect(paneGrows(container)).toEqual(["30", "70"]);
		expect(onResizeCommit).not.toHaveBeenCalled();
		expect(onSplitChange).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(button);
	});

	it("moves an open split where it is, in any split view", () => {
		const { container, divider, onResizeCommit, commandsRef } =
			renderWithCommand({ defaultSizes: [40, 60] });
		act(() => commandsRef.current?.split());
		expect(paneGrows(container)).toEqual(["40", "60"]);
		const el = divider() as HTMLElement;
		fireEvent.keyDown(el, { key: "ArrowUp" });
		fireEvent.keyDown(el, { key: "Enter" });
		expect(onResizeCommit).toHaveBeenCalledWith([39, 61], { lost: false });
		// Outside the command, Enter and Escape are the divider's no more.
		fireEvent.keyDown(el, { key: "Escape" });
		expect(paneGrows(container)).toEqual(["39", "61"]);
		expect(onResizeCommit).toHaveBeenCalledOnce();
	});

	it("sets the split where it is when focus leaves the divider", () => {
		const { container, divider, onResizeCommit, commandsRef } =
			renderWithCommand({ defaultSizes: [40, 60] });
		act(() => commandsRef.current?.split());
		const el = divider() as HTMLElement;
		fireEvent.keyDown(el, { key: "ArrowDown" });
		act(() => el.blur());
		expect(onResizeCommit).toHaveBeenCalledWith([41, 59], { lost: false });
		expect(el).not.toHaveClass("dragging");
		expect(paneGrows(container)).toEqual(["41", "59"]);
	});
});

// A divider under the Windows 98 layout, against the default (Mac OS 8):
// only button 1 drags it (`mouse` "windows", the audit's 4.10; WIG Ch.4
// "Mouse Actions", pp.24-25), and Escape puts the split back as the press
// found it, committing nothing (`input.escapeCancels`, 1.18 / 4.16; Ch.4
// "Shortcut Keys", p.27).
describe("ClassicySplitView — the mouse under the Windows layout", () => {
	afterEach(() => {
		document.body.style.cursor = "";
		resetClassicyAppearancePackagesForTests();
	});
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-split",
			name: "Windows split",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-split-default",
				package: "windows-split",
			},
			layout: windows98.layout as never,
		});
	const renderSplit = (
		props: Partial<ComponentProps<typeof ClassicySplitView>> = {},
	) => {
		const onResize = vi.fn();
		const onResizeCommit = vi.fn();
		const onSplitChange = vi.fn();
		const view = render(
			<ClassicySplitView
				onResize={onResize}
				onResizeCommit={onResizeCommit}
				onSplitChange={onSplitChange}
				{...props}
			>
				<div>One</div>
				<div>Two</div>
			</ClassicySplitView>,
		);
		const root = mockRootRect(view.container, 400);
		const divider = () =>
			view.container.querySelector(
				".classicySplitViewDivider",
			) as HTMLElement | null;
		return { ...view, root, divider, onResize, onResizeCommit, onSplitChange };
	};
	const pressEscape = () => {
		const event = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			document.body.dispatchEvent(event);
		});
		return event;
	};

	it("drags a divider with button 1 alone under the Windows layout", () => {
		useWindowsLayout();
		const { container, divider, onResizeCommit } = renderSplit();
		for (const button of [1, 2]) {
			fireEvent.mouseDown(divider() as HTMLElement, { button, clientX: 200 });
			fireEvent.mouseMove(document, { clientX: 300 });
			fireEvent.mouseUp(document);
		}
		expect(paneGrows(container)).toEqual(["50", "50"]);
		expect(onResizeCommit).not.toHaveBeenCalled();
		fireEvent.mouseDown(divider() as HTMLElement, { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 300 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["75", "25"]);
	});

	it("drags a divider with any button without the key", () => {
		const { container, divider } = renderSplit();
		fireEvent.mouseDown(divider() as HTMLElement, { button: 1, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 300 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["75", "25"]);
	});

	it("puts the split back on Escape under the Windows layout, committing nothing", () => {
		useWindowsLayout();
		const { container, root, divider, onResize, onResizeCommit } =
			renderSplit();
		fireEvent.mouseDown(divider() as HTMLElement, { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 300 });
		expect(paneGrows(container)).toEqual(["75", "25"]);
		expect(pressEscape().defaultPrevented).toBe(true);
		expect(paneGrows(container)).toEqual(["50", "50"]);
		expect(onResize).toHaveBeenLastCalledWith([50, 50]);
		expect(root).not.toHaveAttribute("data-drag-direction");
		expect(divider()).not.toHaveClass("dragging");
		expect(document.body.style.cursor).toBe("");
		// The drag is over: the pointer and the release that follow do nothing.
		fireEvent.mouseMove(document, { clientX: 350 });
		fireEvent.mouseUp(document);
		expect(paneGrows(container)).toEqual(["50", "50"]);
		expect(onResizeCommit).not.toHaveBeenCalled();
	});

	it("reopens a split a drag closed, on Escape under the Windows layout", () => {
		useWindowsLayout();
		const { container, divider, onSplitChange, onResizeCommit } = renderSplit({
			splittable: true,
		});
		vi.spyOn(divider() as HTMLElement, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 0, y: 0, width: 6, height: 300 }),
		);
		fireEvent.mouseDown(divider() as HTMLElement, { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 398 });
		expect(divider()).toBeNull();
		pressEscape();
		expect(divider()).not.toBeNull();
		expect(paneGrows(container)).toEqual(["50", "50"]);
		fireEvent.mouseUp(document);
		expect(onSplitChange).not.toHaveBeenCalled();
		expect(onResizeCommit).not.toHaveBeenCalled();
	});

	it("leaves Escape alone mid-drag without the key", () => {
		const { container, divider, onResizeCommit } = renderSplit();
		fireEvent.mouseDown(divider() as HTMLElement, { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 300 });
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(paneGrows(container)).toEqual(["75", "25"]);
		fireEvent.mouseUp(document);
		expect(onResizeCommit).toHaveBeenCalledWith([75, 25], { lost: false });
	});
});

describe("ClassicySplitView stylesheet", () => {
	const base = readFileSync(
		path.join(__dirname, "ClassicySplitView.scss"),
		"utf8",
	);

	it("keeps a closed pane mounted but not drawn", () => {
		expect(base).toMatch(
			/:where\(\.classicySplitViewPane\)\.collapsed \{\s*display: none;/,
		);
	});

	it("sizes the split box as the divider along its bar, with the divider's cursor", () => {
		expect(base).toMatch(
			/\.classicyScrollBarVertical \.classicySplitViewSplitBox \{\s*height: var\(--window-padding-size\);/,
		);
		expect(base).toMatch(
			/\.classicyScrollBarHorizontal \.classicySplitViewSplitBox \{\s*width: var\(--window-padding-size\);/,
		);
		expect(base).toMatch(
			/\.classicyScrollBarVertical \.classicySplitViewSplitBox \{\s*cursor:\s*var\(--classicy-cursor-resize-ud/,
		);
		expect(base).toMatch(
			/\.classicyScrollBarHorizontal \.classicySplitViewSplitBox \{\s*cursor:\s*var\(--classicy-cursor-resize-lr/,
		);
	});
});

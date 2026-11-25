import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
} from "@/__tests__/losePointerStream";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";
import {
	classicyListDragSelection,
	classicyRangeSetTo,
	classicySameSelection,
	startClassicyListRangeDrag,
} from "./ClassicyListPressSelection.internal";

// The selection math of a press dragged across a list's rows (WIG Ch.5
// "Selection Adjustment", pp.38-39), and the drag that follows the pointer.

describe("classicyRangeSetTo", () => {
	it("adds the range's new ids after the ones held, in the range's order", () => {
		expect(classicyRangeSetTo(["a", "d"], ["b", "c", "d"], true)).toEqual([
			"a",
			"d",
			"b",
			"c",
		]);
	});

	it("takes the range out when it is set unselected", () => {
		expect(classicyRangeSetTo(["a", "b", "d"], ["b", "c", "d"], false)).toEqual(
			["a"],
		);
	});

	it("changes neither input", () => {
		const base = ["a"];
		const range = ["b"];
		classicyRangeSetTo(base, range, true);
		expect(base).toEqual(["a"]);
		expect(range).toEqual(["b"]);
	});
});

describe("classicyListDragSelection", () => {
	const order = ["a", "b", "c", "d", "e"];

	it("selects the anchor's row to the row under the pointer, either way", () => {
		expect(classicyListDragSelection({ order, anchor: "b", row: "d" })).toEqual(
			["b", "c", "d"],
		);
		expect(classicyListDragSelection({ order, anchor: "d", row: "b" })).toEqual(
			["b", "c", "d"],
		);
		expect(classicyListDragSelection({ order, anchor: "c", row: "c" })).toEqual(
			["c"],
		);
	});

	it("sets the range to the anchor's state in the selection the press found", () => {
		expect(
			classicyListDragSelection({
				order,
				anchor: "b",
				row: "d",
				base: ["a", "e"],
				anchorState: true,
			}),
		).toEqual(["a", "e", "b", "c", "d"]);
		expect(
			classicyListDragSelection({
				order,
				anchor: "b",
				row: "d",
				base: ["a", "b", "c", "e"],
				anchorState: false,
			}),
		).toEqual(["a", "e"]);
	});

	it("changes nothing over a row that is not in the order (a dimmed one)", () => {
		expect(
			classicyListDragSelection({ order, anchor: "b", row: "x" }),
		).toBeNull();
		expect(
			classicyListDragSelection({ order, anchor: "x", row: "b" }),
		).toBeNull();
	});
});

describe("classicySameSelection", () => {
	it("compares the ids held, in any order", () => {
		expect(classicySameSelection(["a", "b"], ["b", "a"])).toBe(true);
		expect(classicySameSelection(["a"], ["a", "b"])).toBe(false);
		expect(classicySameSelection(["a", "c"], ["a", "b"])).toBe(false);
		expect(classicySameSelection([], [])).toBe(true);
	});
});

describe("startClassicyListRangeDrag", () => {
	// A list of five 20-px rows in a 60-px viewport at y 100: rows a, b and
	// c show; each row's element answers the hit test at its own y.
	let root: HTMLElement;
	let viewport: HTMLElement;
	let rows: HTMLElement[];
	let frames: FrameRequestCallback[];
	let unregister: () => void;
	const scrollBy = vi.fn();
	const rect = (top: number, height: number) =>
		({
			top,
			bottom: top + height,
			left: 0,
			right: 200,
			width: 200,
			height,
			x: 0,
			y: top,
			toJSON: () => ({}),
		}) as DOMRect;
	const rowTop = (i: number) => 100 + i * 20 - viewport.scrollTop;

	beforeEach(() => {
		root = document.createElement("div");
		viewport = document.createElement("div");
		root.append(viewport);
		rows = ["a", "b", "c", "d", "e"].map((id, i) => {
			const row = document.createElement("div");
			row.setAttribute("role", "option");
			row.dataset.id = id;
			row.getBoundingClientRect = () => rect(rowTop(i), 20);
			viewport.append(row);
			return row;
		});
		viewport.getBoundingClientRect = () => rect(100, 60);
		document.body.append(root);
		scrollBy.mockReset();
		scrollBy.mockImplementation((_dx: number, dy: number) => {
			viewport.scrollTop += dy;
		});
		unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => 20,
			scrollBy,
		});
		// The hit test: the row whose box holds y, else nothing.
		document.elementFromPoint = vi.fn(
			(_x: number, y: number) =>
				rows.find((row) => {
					const r = row.getBoundingClientRect();
					return y >= r.top && y < r.bottom && y >= 100 && y < 160;
				}) ?? null,
		);
		frames = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			frames[id - 1] = () => {};
		});
	});

	afterEach(() => {
		unregister();
		root.remove();
		vi.unstubAllGlobals();
		// biome-ignore lint/suspicious/noExplicitAny: jsdom has no elementFromPoint of its own
		delete (document as any).elementFromPoint;
	});

	const start = (onRow = vi.fn()) => {
		const stop = startClassicyListRangeDrag({
			root,
			rowSelector: '[role="option"]',
			rowIdOf: (el) => (el as HTMLElement).dataset.id ?? null,
			startId: "a",
			onRow,
		});
		return { stop, onRow };
	};
	const move = (y: number) =>
		document.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 50, clientY: y, bubbles: true }),
		);
	const runFrame = () => {
		const pending = frames;
		frames = [];
		for (const cb of pending) cb(0);
	};

	it("reports each new row under the pointer, and nothing within the pressed one", () => {
		const { onRow, stop } = start();
		move(105);
		expect(onRow).not.toHaveBeenCalled();
		move(125);
		move(130);
		move(145);
		expect(onRow.mock.calls).toEqual([["b"], ["c"]]);
		stop();
	});

	it("counts the last row shown below the list and scrolls toward the pointer a line step a frame", () => {
		const { onRow, stop } = start();
		move(200);
		expect(onRow.mock.calls).toEqual([["c"]]);
		expect(frames).toHaveLength(1);
		runFrame();
		expect(scrollBy).toHaveBeenLastCalledWith(0, 20);
		expect(onRow.mock.calls).toEqual([["c"], ["d"]]);
		runFrame();
		expect(onRow.mock.calls).toEqual([["c"], ["d"], ["e"]]);
		// Back inside, the scrolling stops.
		move(110);
		runFrame();
		expect(frames).toHaveLength(0);
		expect(scrollBy).toHaveBeenCalledTimes(2);
		stop();
	});

	it("counts the first row shown above the list and scrolls up", () => {
		viewport.scrollTop = 40;
		const { onRow, stop } = start();
		move(50);
		expect(onRow.mock.calls).toEqual([["c"]]);
		runFrame();
		expect(scrollBy).toHaveBeenLastCalledWith(0, -20);
		expect(onRow.mock.calls).toEqual([["c"], ["b"]]);
		stop();
	});

	it("falls back to the rows' boxes where the hit test finds no row", () => {
		document.elementFromPoint = vi.fn(() => null);
		const { onRow, stop } = start();
		move(130);
		expect(onRow.mock.calls).toEqual([["b"]]);
		stop();
	});

	it("ends at the release: later moves report nothing and no frame scrolls", () => {
		const { onRow } = start();
		move(200);
		document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
		runFrame();
		move(125);
		expect(onRow.mock.calls).toEqual([["c"]]);
		expect(scrollBy).not.toHaveBeenCalled();
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends when the pointer stream is lost (%s)", (loss) => {
		const { onRow } = start();
		losePointerStream(loss);
		move(125);
		expect(onRow).not.toHaveBeenCalled();
	});

	it("can be stopped early, and twice", () => {
		const { onRow, stop } = start();
		stop();
		stop();
		move(125);
		expect(onRow).not.toHaveBeenCalled();
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	addClassicyDragScrollSample,
	CLASSICY_DRAG_SCROLL_INTERVAL_MS,
	CLASSICY_DRAG_SCROLL_MAX_VELOCITY,
	CLASSICY_DRAG_SCROLL_SAMPLE_COUNT,
	CLASSICY_DRAG_SCROLL_SAMPLE_INTERVAL_MS,
	classicyDragScrollEdges,
	classicyDragScrollVelocity,
	createClassicyDragScrollData,
	findClassicyFileDragVelocityScroll,
	readClassicyDragScrollZone,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAutoScroll.internal";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

// The remaining chapters' audit's 5.35 (WIG Ch.5 "Scrolling When
// Transferring by Dragging", pp.64-65, Figure 5.14), with Windows 98 SE's
// figures from shell32.dll's DAD_AutoScroll.

describe("the velocity rule's figures", () => {
	it("are Windows 98 SE's: three samples, at most 20, every 250 ms; sampled every 100 ms", () => {
		expect(CLASSICY_DRAG_SCROLL_SAMPLE_COUNT).toBe(3);
		expect(CLASSICY_DRAG_SCROLL_MAX_VELOCITY).toBe(20);
		expect(CLASSICY_DRAG_SCROLL_INTERVAL_MS).toBe(250);
		expect(CLASSICY_DRAG_SCROLL_SAMPLE_INTERVAL_MS).toBe(100);
	});
});

describe("the sample ring and its velocity", () => {
	it("is full at the third sample and keeps the last three", () => {
		const data = createClassicyDragScrollData();
		expect(addClassicyDragScrollSample(data, { x: 0, y: 0, t: 0 })).toBe(false);
		expect(addClassicyDragScrollSample(data, { x: 1, y: 0, t: 1 })).toBe(false);
		expect(addClassicyDragScrollSample(data, { x: 2, y: 0, t: 2 })).toBe(true);
		expect(addClassicyDragScrollSample(data, { x: 3, y: 0, t: 3 })).toBe(true);
		expect(data.samples.map((s) => s.x).sort()).toEqual([1, 2, 3]);
	});

	it("sums |dx| + |dy| around the ring, times 1024, over one more than the times' sum", () => {
		const data = createClassicyDragScrollData();
		addClassicyDragScrollSample(data, { x: 0, y: 0, t: 0 });
		addClassicyDragScrollSample(data, { x: 10, y: 0, t: 100 });
		addClassicyDragScrollSample(data, { x: 10, y: 0, t: 200 });
		// Distances 10 + 0 + 10, times 100 + 100 + 200 (+1): 20480 / 401.
		expect(classicyDragScrollVelocity(data)).toBe(51);
		// A pointer that rests: no travel, velocity 0.
		const still = createClassicyDragScrollData();
		for (const t of [0, 100, 200])
			addClassicyDragScrollSample(still, { x: 5, y: 5, t });
		expect(classicyDragScrollVelocity(still)).toBe(0);
		// Diagonal travel counts both axes.
		const diagonal = createClassicyDragScrollData();
		addClassicyDragScrollSample(diagonal, { x: 0, y: 0, t: 0 });
		addClassicyDragScrollSample(diagonal, { x: 1, y: 1, t: 100 });
		addClassicyDragScrollSample(diagonal, { x: 1, y: 1, t: 200 });
		expect(classicyDragScrollVelocity(diagonal)).toBe(
			Math.floor((4 * 1024) / 401),
		);
		expect(classicyDragScrollVelocity(createClassicyDragScrollData())).toBe(0);
	});
});

describe("classicyDragScrollEdges", () => {
	const rect = { left: 0, top: 0, right: 300, bottom: 200 };
	const at = (x: number, y: number) =>
		classicyDragScrollEdges(rect, x, y, 32, 16);

	it("is null inside the inset rectangle and outside the outset one", () => {
		expect(at(150, 100)).toBeNull();
		expect(at(32, 32)).toBeNull();
		expect(at(150, 216)).toBeNull();
		expect(at(-17, 100)).toBeNull();
	});

	it("names the edges past the inset rectangle, inside or over the scroll bar", () => {
		expect(at(150, 180)).toEqual({
			left: false,
			right: false,
			up: false,
			down: true,
		});
		// Over the bar below the viewport, still in the zone.
		expect(at(150, 210)).toMatchObject({ down: true });
		expect(at(10, 10)).toEqual({
			left: true,
			right: false,
			up: true,
			down: false,
		});
		expect(at(290, 100)).toMatchObject({ right: true, left: false });
		expect(at(-16, 100)).toMatchObject({ left: true });
	});
});

describe("findClassicyFileDragVelocityScroll", () => {
	let unregister: (() => void) | null = null;
	afterEach(() => {
		unregister?.();
		unregister = null;
		document.body.innerHTML = "";
	});

	/**
	 * A scroll area 300 x 200 at the origin over `content` px, its viewport
	 * holding a folder unless `dropTarget` is false, a vertical bar beside it.
	 */
	const areaOf = ({
		content = [300, 1000],
		dropTarget = true,
		top = 0,
	}: {
		content?: [number, number];
		dropTarget?: boolean;
		top?: number;
	} = {}) => {
		document.body.innerHTML = `<div class="classicyScrollArea"><div class="classicyScrollAreaBody"><div class="classicyScrollAreaViewport" id="viewport"><div id="row" ${
			dropTarget ? `data-classicy-drop-folder="HD:Archive"` : ""
		}></div></div><div data-classicy-part="scrollbar"><div id="thumb" data-classicy-part="scroll-thumb"></div></div></div></div>`;
		const viewport = document.getElementById("viewport") as HTMLElement;
		for (const [key, value] of Object.entries({
			scrollWidth: content[0],
			scrollHeight: content[1],
			clientWidth: 300,
			clientHeight: 200,
			scrollLeft: 0,
			scrollTop: top,
		})) {
			Object.defineProperty(viewport, key, { value, configurable: true });
		}
		vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 200 }),
		);
		unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => 16,
			scrollBy: vi.fn(),
		});
		return {
			viewport,
			row: document.getElementById("row") as HTMLElement,
			thumb: document.getElementById("thumb") as HTMLElement,
		};
	};
	const zone = { inset: 32, outset: 16 };

	it("scrolls a line toward an edge the pointer rests by, in the viewport or over its bar", () => {
		const { viewport, row, thumb } = areaOf();
		const find = (x: number, y: number, hit: Element) =>
			findClassicyFileDragVelocityScroll(x, y, {
				elementsFromPoint: () => [hit],
				zone,
			});
		expect(find(150, 100, row)).toBeNull();
		expect(find(150, 180, row)).toEqual({ viewport, dx: 0, dy: 16 });
		// Over the scroll bar below the edge: the area's own viewport.
		expect(find(150, 210, thumb)).toEqual({ viewport, dx: 0, dy: 16 });
		// At the top, at the start of its travel: nothing.
		expect(find(150, 10, row)).toBeNull();
	});

	it("goes back toward the start once scrolled, and stops at the end", () => {
		const { row } = areaOf({ top: 800 });
		const find = (x: number, y: number) =>
			findClassicyFileDragVelocityScroll(x, y, {
				elementsFromPoint: () => [row],
				zone,
			});
		expect(find(150, 10)).toMatchObject({ dy: -16 });
		expect(find(150, 190)).toBeNull();
	});

	it("leaves an area holding no drop target, and a point over something else", () => {
		const { row } = areaOf({ dropTarget: false });
		expect(
			findClassicyFileDragVelocityScroll(150, 190, {
				elementsFromPoint: () => [row],
				zone,
			}),
		).toBeNull();
		areaOf();
		const elsewhere = document.createElement("div");
		document.body.append(elsewhere);
		expect(
			findClassicyFileDragVelocityScroll(150, 190, {
				elementsFromPoint: () => [elsewhere],
				zone,
			}),
		).toBeNull();
	});

	it("reads the zone from the theme: the icon size inside, the small icon size outside", () => {
		// Windows 98's themes: 32 px icons ("Shell Icon Size"), 16 px small.
		document.body.innerHTML = `<div id="classicyDesktop" style="--desktop-icon-size: 32px; --icon-small-size: 16px"></div>`;
		expect(readClassicyDragScrollZone()).toEqual({ inset: 32, outset: 16 });
		// Before a desktop mounts: the core theme's (its 48 px icons).
		document.body.innerHTML = "";
		expect(readClassicyDragScrollZone()).toEqual({ inset: 48, outset: 16 });
	});
});

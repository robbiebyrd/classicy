/**
 * A file drag's automatic scrolling by the pointer's velocity, under the
 * package's `layout.transfer.autoScroll` (WIG Ch.5 "Scrolling When
 * Transferring by Dragging", pp.64-65, Figure 5.14): "if the user is
 * dragging the object slowly at the edge of the scrollable area, you
 * scroll the area; if the object is being dragged quickly, do not
 * scroll".
 *
 * The WIG leaves the hot zone and the threshold velocity open ("XXX");
 * the figures here are Windows 98 SE's own, read from shell32.dll's
 * `DAD_AutoScroll` (ordinal 129), which Wine and ReactOS leave as stubs:
 *
 * - samples: a ring of three `{ x, y, t }` (shlobj.h's `AUTO_SCROLL_DATA`,
 *   `NUM_POINTS` 3); nothing scrolls until three are taken;
 * - velocity: over the three pairs of the ring, newest to oldest
 *   included, the sum of `|Δx| + |Δy|` shifted left by 10 (× 1024) and
 *   divided by one plus the sum of `|Δt|` in ms (the 1 keeps a division by
 *   zero off), rounded down;
 * - threshold: a scroll only while the velocity is at most 20;
 * - hot zone: inside the client area (less its scroll bars) inflated by
 *   the small icon size (16) and outside it deflated by the icon size
 *   (32, "Shell Icon Size"), so from the icon size inside an edge to the
 *   small icon size outside it, over the scroll bar; an axis scrolls only
 *   toward an end it can still reach (`GetScrollInfo`);
 * - rate: once per half the double-click time (`GetDoubleClickTime() /
 *   2`, 250 ms by default) since the last scroll, a line
 *   (`SB_LINEUP`/`SB_LINEDOWN`) on each axis whose edge the pointer is
 *   past.
 *
 * The sampling follows the WIG: at the drag's start, on each move and
 * every 100 ms ("every 100 milliseconds recommended").
 *
 * @internal
 */

import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	type ClassicyScrollAxisMetrics,
	classicyScrollAxisEnds,
} from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";
import {
	type ClassicyScrollViewportEntry,
	classicyScrollViewportOf,
} from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/** How many samples the ring holds (`AUTO_SCROLL_DATA`'s `NUM_POINTS`). */
export const CLASSICY_DRAG_SCROLL_SAMPLE_COUNT = 3;

/** How often a resting pointer is sampled, in ms (WIG p.64's figure). */
export const CLASSICY_DRAG_SCROLL_SAMPLE_INTERVAL_MS = 100;

/** The fastest velocity that still scrolls (shell32's `DAD_AutoScroll`). */
export const CLASSICY_DRAG_SCROLL_MAX_VELOCITY = 20;

/**
 * The time between two scrolls, in ms: half Windows 98's default
 * double-click time, 500 ms (`DAD_AutoScroll`'s `GetDoubleClickTime() / 2`).
 */
export const CLASSICY_DRAG_SCROLL_INTERVAL_MS = 250;

/** A sample of the pointer: client px and a time in ms. */
export type ClassicyDragScrollSample = { x: number; y: number; t: number };

/** The ring of samples and the time of the last scroll. */
export type ClassicyDragScrollData = {
	samples: ClassicyDragScrollSample[];
	/** Where the next sample goes. */
	next: number;
	/** Whether the ring has held three samples. */
	full: boolean;
	/** When the last scroll was, or null before the first. */
	lastScroll: number | null;
};

/** An empty ring (`AUTO_SCROLL_DATA` zeroed at the drag's start). */
export const createClassicyDragScrollData = (): ClassicyDragScrollData => ({
	samples: [],
	next: 0,
	full: false,
	lastScroll: null,
});

/**
 * Adds `sample` to the ring, over the oldest once it is full; returns
 * whether it is full (shell32's sample routine, which `DAD_AutoScroll`
 * calls first).
 */
export const addClassicyDragScrollSample = (
	data: ClassicyDragScrollData,
	sample: ClassicyDragScrollSample,
): boolean => {
	data.samples[data.next] = sample;
	data.next = (data.next + 1) % CLASSICY_DRAG_SCROLL_SAMPLE_COUNT;
	if (data.next === 0) data.full = true;
	return data.full;
};

/**
 * The pointer's velocity over the ring, as shell32 computes it: for each
 * pair of neighbours around the ring (the newest and oldest included),
 * the distance `|Δx| + |Δy|` and the time `|Δt|`; the distances' sum times
 * 1024, divided by one plus the times' sum, rounded down. 0 for fewer than
 * two samples.
 */
export const classicyDragScrollVelocity = (
	data: ClassicyDragScrollData,
): number => {
	const samples = data.samples;
	const count = samples.length;
	if (count < 2) return 0;
	let distance = 0;
	let time = 1;
	for (let i = 0; i < count; i++) {
		const a = samples[i];
		const b = samples[(i + 1) % count];
		distance += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
		time += Math.abs(a.t - b.t);
	}
	return Math.floor((distance * 1024) / time);
};

/** A viewport's rectangle, in client px. */
export type ClassicyDragScrollRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

/** Which edges of a hot zone a point is past. */
export type ClassicyDragScrollEdges = {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
};

const inRect = (r: ClassicyDragScrollRect, x: number, y: number) =>
	x >= r.left && x < r.right && y >= r.top && y < r.bottom;

/**
 * The edges of `rect`'s hot zone the point `x`, `y` is past, or null
 * outside the zone (shell32's region test): the zone runs from `inset`
 * inside the rectangle's edges to `outset` outside them; the point is past
 * the left edge when left of the inset rectangle, and so on.
 */
export const classicyDragScrollEdges = (
	rect: ClassicyDragScrollRect,
	x: number,
	y: number,
	inset: number,
	outset: number,
): ClassicyDragScrollEdges | null => {
	const inner = {
		left: rect.left + inset,
		top: rect.top + inset,
		right: rect.right - inset,
		bottom: rect.bottom - inset,
	};
	const outer = {
		left: rect.left - outset,
		top: rect.top - outset,
		right: rect.right + outset,
		bottom: rect.bottom + outset,
	};
	if (inRect(inner, x, y) || !inRect(outer, x, y)) return null;
	return {
		left: x < inner.left,
		right: x >= inner.left && x > inner.right,
		up: y < inner.top,
		down: y >= inner.top && y > inner.bottom,
	};
};

type ElementsFromPoint = (x: number, y: number) => Element[];

// A drop target folder (`CLASSICY_DROP_FOLDER_ATTRIBUTE` in
// ClassicyFileDrag.ts, which imports this module, so it is not imported
// back).
const DROP_FOLDER_SELECTOR = "[data-classicy-drop-folder]";

const defaultElementsFromPoint: ElementsFromPoint = (x, y) =>
	typeof document !== "undefined" && document.elementsFromPoint
		? document.elementsFromPoint(x, y)
		: [];

// The scroll area's viewport for an element in one of its bars or its
// corner (the hot zone reaches over them), else none.
const viewportOfBar = (
	element: Element | null,
): { element: HTMLElement; entry: ClassicyScrollViewportEntry } | null => {
	const bar = element?.closest(
		"[data-classicy-part='scrollbar'], [data-classicy-part='scroll-corner']",
	);
	const area = bar?.closest(".classicyScrollArea");
	const viewport = area?.querySelector(
		":scope > .classicyScrollAreaBody > .classicyScrollAreaViewport",
	);
	return viewport ? classicyScrollViewportOf(viewport) : null;
};

/** The hot zone's widths, in px (`classicyDragScrollEdges`'s `inset`, `outset`). */
export type ClassicyDragScrollZone = { inset: number; outset: number };

/**
 * The hot zone's widths now, from the theme: the icon size inside
 * (`--desktop-icon-size`, the Appearance Manager's icon size, Windows'
 * "Shell Icon Size") and the small icon size outside (`--icon-small-size`).
 * Read once per drag, never on a move.
 */
export const readClassicyDragScrollZone = (): ClassicyDragScrollZone => ({
	inset: readClassicyThemeVar("--desktop-icon-size"),
	outset: readClassicyThemeVar("--icon-small-size"),
});

/**
 * Where the scroll area under a file drag's pointer at `x`, `y` scrolls,
 * or null: the topmost element there (`exclude` aside) in a
 * `ClassicyScrollArea`'s viewport, or in its bars or corner, when the
 * viewport holds a drop target (or lies in one), the point in the
 * viewport's hot zone (`classicyDragScrollEdges`), toward edges the
 * viewport can still scroll to (within a pixel of an end counts as
 * there, as `classicyScrollAxisEnds` has it). `dx` and `dy` are the line
 * step's signed pixels, 0 on an axis with nothing to do.
 */
export function findClassicyFileDragVelocityScroll(
	x: number,
	y: number,
	{
		exclude,
		elementsFromPoint = defaultElementsFromPoint,
		zone,
	}: {
		exclude?: Element | null;
		elementsFromPoint?: ElementsFromPoint;
		zone: ClassicyDragScrollZone;
	},
): { viewport: HTMLElement; dx: number; dy: number } | null {
	const hit =
		elementsFromPoint(x, y).find((el) => !exclude?.contains(el)) ?? null;
	const found = classicyScrollViewportOf(hit) ?? viewportOfBar(hit);
	if (!found) return null;
	const { element: viewport, entry } = found;
	if (
		!viewport.closest(DROP_FOLDER_SELECTOR) &&
		!viewport.querySelector(DROP_FOLDER_SELECTOR)
	) {
		return null;
	}
	const r = viewport.getBoundingClientRect();
	const edges = classicyDragScrollEdges(
		{ left: r.left, top: r.top, right: r.right, bottom: r.bottom },
		x,
		y,
		zone.inset,
		zone.outset,
	);
	if (!edges) return null;
	const step = entry.lineStep();
	const along = (
		start: boolean,
		end: boolean,
		axis: ClassicyScrollAxisMetrics,
	) => {
		const ends = classicyScrollAxisEnds(axis);
		if (start && !ends.start) return -step;
		if (end && !ends.end) return step;
		return 0;
	};
	const dx = along(edges.left, edges.right, {
		total: viewport.scrollWidth,
		visible: viewport.clientWidth,
		position: viewport.scrollLeft,
	});
	const dy = along(edges.up, edges.down, {
		total: viewport.scrollHeight,
		visible: viewport.clientHeight,
		position: viewport.scrollTop,
	});
	return dx || dy ? { viewport, dx, dy } : null;
}

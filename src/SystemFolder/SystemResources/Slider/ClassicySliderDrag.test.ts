import { afterEach, describe, expect, it, vi } from "vitest";
import {
	classicySliderPosition,
	classicySliderSnap,
	classicySliderTrack,
	classicySliderValueAt,
} from "./ClassicySliderDrag.internal";

// The geometry a slider drags by (ClassicySliderDrag.internal.ts), against
// the layout both engines give a range input's thumb: its center travels
// the input's length less the thumb's box along it, from the left, or from
// the bottom of a vertical slider.

const input = (rect: DOMRect, thumb: { width: number; height: number }) => {
	const el = document.createElement("input");
	el.style.setProperty("--slider-thumb-width", `${thumb.width}px`);
	el.style.setProperty("--slider-thumb-height", `${thumb.height}px`);
	vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
	return el;
};

afterEach(() => vi.restoreAllMocks());

describe("classicySliderTrack", () => {
	it("runs a horizontal thumb's center from the left, its box's width in", () => {
		const el = input(
			DOMRect.fromRect({ x: 40, y: 10, width: 115, height: 19 }),
			{
				width: 15,
				height: 17,
			},
		);
		expect(classicySliderTrack(el, false)).toEqual({
			origin: 47.5,
			travel: 100,
			direction: 1,
			thumb: 15,
		});
	});

	it("runs a vertical thumb's center up from the bottom, its box's height in", () => {
		const el = input(
			DOMRect.fromRect({ x: 40, y: 10, width: 19, height: 117 }),
			{
				width: 15,
				height: 17,
			},
		);
		expect(classicySliderTrack(el, true)).toEqual({
			origin: 118.5,
			travel: 100,
			direction: -1,
			thumb: 17,
		});
	});

	// A package's box side may be a calc() (System 7's: its capsule and its
	// stop at each end), which an unregistered custom property keeps as
	// written: a probe's layout resolves it, and goes.
	it("resolves a box side written as a calc()", () => {
		const group = document.createElement("div");
		const el = input(
			DOMRect.fromRect({ x: 40, y: 10, width: 121, height: 23 }),
			{
				width: 0,
				height: 23,
			},
		);
		el.style.setProperty("--slider-thumb-width", "calc(11px + 5px + 5px)");
		group.append(el);
		document.body.append(group);
		const probed = vi
			.spyOn(HTMLSpanElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLSpanElement) {
				return DOMRect.fromRect({
					width:
						this.style.width === "var(--slider-thumb-width)" &&
						this.parentElement === group
							? 21
							: 0,
				});
			});
		expect(classicySliderTrack(el, false)).toMatchObject({
			origin: 50.5,
			travel: 100,
			thumb: 21,
		});
		expect(probed).toHaveBeenCalledOnce();
		expect(group.children).toHaveLength(1);
		group.remove();
	});

	// Under a scaled ancestor (a CSS `zoom` or `scale()`), the input's box
	// on screen is the scale times its layout size; a plain length is a
	// layout length and is scaled with it, as the probe's box is already.
	it("scales a plain box side by the input's scale on screen", () => {
		const el = input(
			DOMRect.fromRect({ x: 40, y: 10, width: 230, height: 38 }),
			{
				width: 15,
				height: 17,
			},
		);
		Object.defineProperty(el, "offsetWidth", { value: 115 });
		Object.defineProperty(el, "offsetHeight", { value: 19 });
		expect(classicySliderTrack(el, false)).toEqual({
			origin: 55,
			travel: 200,
			direction: 1,
			thumb: 30,
		});
		// A side read once (at a drag's start) is used as given.
		expect(classicySliderTrack(el, false, 30).thumb).toBe(30);
	});

	it("never travels a negative length", () => {
		const el = input(DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 }), {
			width: 15,
			height: 17,
		});
		expect(classicySliderTrack(el, false).travel).toBe(0);
	});
});

describe("classicySliderPosition and classicySliderValueAt", () => {
	const horizontal = {
		origin: 47.5,
		travel: 100,
		direction: 1,
		thumb: 15,
	} as const;
	const vertical = {
		origin: 118.5,
		travel: 100,
		direction: -1,
		thumb: 17,
	} as const;

	it("place a value's thumb center along the track", () => {
		expect(classicySliderPosition(horizontal, 25, 0, 100)).toBe(72.5);
		expect(classicySliderPosition(vertical, 25, 0, 100)).toBe(93.5);
		expect(classicySliderPosition(horizontal, 150, 0, 100)).toBe(147.5);
	});

	it("read the value at a position back, clamped to the range and on the step grid", () => {
		expect(classicySliderValueAt(horizontal, 72.5, 0, 100, 1)).toBe(25);
		expect(classicySliderValueAt(vertical, 93.5, 0, 100, 1)).toBe(25);
		expect(classicySliderValueAt(horizontal, 72.9, 0, 100, 5)).toBe(25);
		expect(classicySliderValueAt(horizontal, 0, 0, 100, 1)).toBe(0);
		expect(classicySliderValueAt(vertical, 0, 0, 100, 1)).toBe(100);
	});

	it("round-trip every value", () => {
		for (let value = 0; value <= 100; value++)
			expect(
				classicySliderValueAt(
					vertical,
					classicySliderPosition(vertical, value, 0, 100),
					0,
					100,
					1,
				),
			).toBe(value);
	});

	it("read the minimum on a track with no travel", () =>
		expect(
			classicySliderValueAt({ ...horizontal, travel: 0 }, 90, 10, 100, 1),
		).toBe(10));
});

describe("classicySliderSnap", () => {
	it("snaps to the nearest step from the minimum, the larger on a tie", () => {
		expect(classicySliderSnap(12, 0, 100, 5)).toBe(10);
		expect(classicySliderSnap(12.5, 0, 100, 5)).toBe(15);
		expect(classicySliderSnap(7, 2, 100, 5)).toBe(7);
		expect(classicySliderSnap(9.4, 2, 100, 5)).toBe(7);
	});

	it("never snaps past the maximum, nor below the minimum", () => {
		expect(classicySliderSnap(99, 0, 98, 5)).toBe(95);
		expect(classicySliderSnap(-4, 0, 100, 5)).toBe(0);
	});

	it("keeps fractional steps exact", () =>
		expect(classicySliderSnap(0.31, 0, 1, 0.1)).toBe(0.3));
});

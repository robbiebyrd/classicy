// Mystify Your Mind (ssmyst.scr), its WM_TIMER handler: two four-cornered
// polygons bounce around the screen, each drawn with a trail of its last
// Lines copies (one to fifteen) in one-pixel lines, the oldest copy erased in
// black as a new one is drawn. Each corner moves by its own speed, up to 12
// pixels a tick across and down; reaching an edge, it reflects off it and
// takes a new random speed away from it. A polygon's color fades over 255
// ticks from one color to the next: to a random color ("Multiple random
// colors"), or back and forth between its two colors ("Two colors"). Every
// copy keeps the color it was drawn in (on a high-color screen the palette
// animation the .scr ran changed only the lines drawn after it).
import type { Windows98Surface } from "../windows98SaverSurface";
import type { Windows98Random } from "../windows98SaverTimer";

/** A corner's fastest speed, in pixels a tick. */
const MAX_SPEED = 12;
/** Ticks a color fade takes. */
const FADE_TICKS = 255;

export type MystifyPolygonOptions = {
	/** Whether the polygon is drawn ("Active"). */
	active: boolean;
	/** The copies in its trail, 1 to 15 ("Lines"). */
	lines: number;
	/** Fade to random colors, or between the two colors. */
	randomColors: boolean;
	/** The first of the two colors, `0xRRGGBB`. */
	startColor: number;
	/** The second, `0xRRGGBB`. */
	endColor: number;
};

type Corner = { x: number; y: number; dx: number; dy: number };

type Polygon = {
	options: MystifyPolygonOptions;
	corners: Corner[];
	/** The copies on screen, newest first: each its corners' `[x, y, …]`. */
	trail: number[][];
	from: number;
	to: number;
	step: number;
	fade: number;
	color: number;
};

/** One channel's share of a fade: the .scr's integer arithmetic. */
const blend = (from: number, to: number, total: number, step: number) => {
	let out = 0;
	for (const shift of [0, 8, 16]) {
		const a = (from >>> shift) & 0xff;
		const b = (to >>> shift) & 0xff;
		const value =
			total === 0
				? a
				: Math.trunc((Math.trunc(((b - a) * 10) / total) * step) / 10) + a;
		out |= (value & 0xff) << shift;
	}
	return out;
};

/** Mystify's polygons, drawing on `surface`. */
export const mystify = (
	surface: Windows98Surface,
	random: Windows98Random,
	polygonOptions: readonly MystifyPolygonOptions[],
) => {
	const width = surface.width;
	const height = surface.height;
	const speed = () => {
		const d = (random() % (2 * MAX_SPEED)) + 1;
		return d <= MAX_SPEED ? d : MAX_SPEED - d;
	};
	const randomColor = () =>
		((random() & 0xff) << 16) | ((random() & 0xff) << 8) | (random() & 0xff);
	const polygons: Polygon[] = polygonOptions.map((options) => {
		const corners = Array.from({ length: 4 }, () => ({
			x: random() % width,
			y: random() % height,
			dx: speed(),
			dy: speed(),
		}));
		return {
			options,
			corners,
			trail: [],
			from: 0,
			to: options.randomColors ? randomColor() : options.startColor,
			step: 0,
			fade: 0,
			color: 0,
		};
	});
	const outline = (points: number[], rgb: number) => {
		for (let i = 0; i < 4; i++) {
			const j = (i + 1) % 4;
			surface.line(
				points[2 * i] ?? 0,
				points[2 * i + 1] ?? 0,
				points[2 * j] ?? 0,
				points[2 * j + 1] ?? 0,
				rgb,
			);
		}
	};
	const bounce = (corner: Corner, axis: "x" | "y", limit: number) => {
		const v = axis === "x" ? "dx" : "dy";
		if (corner[axis] >= limit) {
			corner[axis] = 2 * limit - 2 - corner[axis];
			corner[v] = -1 - (random() % MAX_SPEED);
		}
		if (corner[axis] < 0) {
			corner[axis] = -corner[axis];
			corner[v] = (random() % MAX_SPEED) + 1;
		}
	};
	return {
		polygons,
		tick(): void {
			for (const polygon of polygons) {
				if (!polygon.options.active) continue;
				if (polygon.step === polygon.fade) {
					polygon.step = 0;
					polygon.fade = FADE_TICKS;
					polygon.from = polygon.to;
					polygon.to = polygon.options.randomColors
						? randomColor()
						: polygon.from !== polygon.options.endColor
							? polygon.options.endColor
							: polygon.options.startColor;
				} else polygon.step++;
				polygon.color = blend(
					polygon.from,
					polygon.to,
					polygon.fade,
					polygon.step,
				);
			}
			for (const polygon of polygons) {
				if (!polygon.options.active) continue;
				const lines = Math.min(15, Math.max(1, polygon.options.lines));
				while (polygon.trail.length >= lines) {
					const oldest = polygon.trail.pop();
					if (oldest) outline(oldest, 0x000000);
				}
				for (const corner of polygon.corners) {
					corner.x += corner.dx;
					corner.y += corner.dy;
					bounce(corner, "x", width);
					bounce(corner, "y", height);
				}
				const copy = polygon.corners.flatMap(({ x, y }) => [x, y]);
				polygon.trail.unshift(copy);
				outline(copy, polygon.color);
			}
		},
		flush: () => surface.flush(),
	};
};

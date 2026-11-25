// Curves and Colors (bezier.scr), its WM_TIMER handler: a closed, smooth
// curve of Curves cubic Bezier pieces (PolyBezier, a one-pixel pen) bounces
// around the screen with a trail of its last Lines copies, the oldest erased in
// black as a new one is drawn. The curve is spun from 2 x Curves free points,
// each with its own speed (2 up to Density + 1 pixels a tick across and
// down, either way); each piece runs from the midpoint of two free points
// through the next two to the next midpoint, so the pieces meet smoothly and
// the curve closes on itself. A point reaching an edge reflects off it. With
// "Multiple random colors" each new copy steps one degree round the hue circle
// (full saturation, half lightness), else every copy is the One color.
import type { Windows98Surface } from "../windows98SaverSurface";
import type { Windows98Random } from "../windows98SaverTimer";

export type CurvesAndColorsOptions = {
	/** Copies in the trail, 1 to 80 ("Lines"). */
	lines: number;
	/** Bezier pieces in the curve, 2 to 10 ("Curves"). */
	curves: number;
	/** The speed range, 2 to 20: a point moves 2 to this + 1 pixels a tick. */
	density: number;
	/** Step through the hues, or draw every copy in `color`. */
	randomColors: boolean;
	/** The One color, `0xRRGGBB`. */
	color: number;
};

/** HLS to RGB, hue in degrees, lightness and saturation 0 to 1, as Windows' color tools computed it. */
export const curvesAndColorsHue = (hue: number): number => {
	const h = (((hue % 360) + 360) % 360) / 60;
	const x = Math.round(255 * (1 - Math.abs((h % 2) - 1)));
	const [r, g, b] =
		h < 1
			? [255, x, 0]
			: h < 2
				? [x, 255, 0]
				: h < 3
					? [0, 255, x]
					: h < 4
						? [0, x, 255]
						: h < 5
							? [x, 0, 255]
							: [255, 0, x];
	return (r << 16) | (g << 8) | b;
};

type Point = { x: number; y: number; dx: number; dy: number };

/** The curve's Bezier points (3 x pieces + 1) from its free points. */
export const curvesAndColorsBezier = (points: readonly Point[]): number[] => {
	const n = points.length;
	const mid = (a: Point | undefined, b: Point | undefined) => [
		Math.trunc(((a?.x ?? 0) + (b?.x ?? 0)) / 2),
		Math.trunc(((a?.y ?? 0) + (b?.y ?? 0)) / 2),
	];
	const out = mid(points[n - 1], points[0]);
	for (let i = 0; i < n; i += 2) {
		const c1 = points[i];
		const c2 = points[i + 1];
		out.push(c1?.x ?? 0, c1?.y ?? 0, c2?.x ?? 0, c2?.y ?? 0);
		out.push(...mid(c2, points[(i + 2) % n]));
	}
	return out;
};

/**
 * A cubic piece flattened to lines as GDI's PolyBezier did: halving until a
 * piece is within a pixel of its chord, at most 64 lines.
 */
const flatten = (
	out: number[],
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	depth: number,
) => {
	const flat =
		Math.abs(x0 + x2 - 2 * x1) +
			Math.abs(y0 + y2 - 2 * y1) +
			Math.abs(x1 + x3 - 2 * x2) +
			Math.abs(y1 + y3 - 2 * y2) <=
		2;
	if (flat || depth >= 6) {
		out.push(x3, y3);
		return;
	}
	const ax = (x0 + x1) / 2;
	const ay = (y0 + y1) / 2;
	const bx = (x1 + x2) / 2;
	const by = (y1 + y2) / 2;
	const cx = (x2 + x3) / 2;
	const cy = (y2 + y3) / 2;
	const dx = (ax + bx) / 2;
	const dy = (ay + by) / 2;
	const ex = (bx + cx) / 2;
	const ey = (by + cy) / 2;
	const mx = (dx + ex) / 2;
	const my = (dy + ey) / 2;
	flatten(out, x0, y0, ax, ay, dx, dy, mx, my, depth + 1);
	flatten(out, mx, my, ex, ey, cx, cy, x3, y3, depth + 1);
};

/** The polyline PolyBezier drew for `bezier` (3n + 1 points). */
export const curvesAndColorsPolyline = (
	bezier: readonly number[],
): number[] => {
	const out = [bezier[0] ?? 0, bezier[1] ?? 0];
	for (let i = 0; i + 7 < bezier.length; i += 6)
		flatten(
			out,
			bezier[i] ?? 0,
			bezier[i + 1] ?? 0,
			bezier[i + 2] ?? 0,
			bezier[i + 3] ?? 0,
			bezier[i + 4] ?? 0,
			bezier[i + 5] ?? 0,
			bezier[i + 6] ?? 0,
			bezier[i + 7] ?? 0,
			0,
		);
	return out.map(Math.round);
};

/** Curves and Colors' curve, drawing on `surface`. */
export const curvesAndColors = (
	surface: Windows98Surface,
	random: Windows98Random,
	{ lines, curves, density, randomColors, color }: CurvesAndColorsOptions,
) => {
	const width = surface.width;
	const height = surface.height;
	const speed = () => {
		random();
		const seed = random();
		return (seed & 0x10 ? 1 : -1) * ((seed % density) + 2);
	};
	const points: Point[] = Array.from({ length: 2 * curves }, () => ({
		x: random() % width,
		y: random() % height,
		dx: 0,
		dy: 0,
	}));
	for (const point of points) {
		point.dx = speed();
		point.dy = speed();
	}
	const trail: number[][] = [];
	let hue = 0;
	const reflect = (point: Point, axis: "x" | "y", limit: number) => {
		const v = axis === "x" ? "dx" : "dy";
		const next = point[axis] + point[v];
		if (next < 0) {
			point[axis] = -next;
			point[v] = -point[v];
		} else if (next > limit) {
			point[axis] = 2 * limit - next;
			point[v] = -point[v];
		} else point[axis] = next;
	};
	return {
		points,
		trail,
		tick(): void {
			while (trail.length >= lines) {
				const oldest = trail.pop();
				if (oldest) surface.polyline(oldest, 0x000000);
			}
			const copy = curvesAndColorsPolyline(curvesAndColorsBezier(points));
			let rgb = color;
			if (randomColors) {
				hue = (hue + 1) % 360;
				rgb = curvesAndColorsHue(hue);
			}
			trail.unshift(copy);
			surface.polyline(copy, rgb);
			for (const point of points) {
				reflect(point, "x", width);
				reflect(point, "y", height);
			}
		},
		flush: () => surface.flush(),
	};
};

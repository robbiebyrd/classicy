// Flying Windows (ssflywin.scr), its WM_TIMER handler: Windows logos fly out
// of the center of the screen toward the viewer, each Wingdings' 0xFF glyph
// (wingdingsFlag.ts) in one solid color, drawn with TextOut centered on its
// spot at its baseline, at a font height growing from 2 to 128 pixels as it
// nears, and erased each tick by drawing its last glyph in black. Every logo
// starts at depth 2560 at a random spot (x and y alike taken modulo the
// screen's width, as the .scr took them), in one of the default palette's
// colors 1 to 14 (maroon to lime: PALETTEINDEX(rand % 14 + 1)), and the warp
// speed accelerates from a standstill by one depth unit a tick up to ten times
// the Warp speed option.
import { WINDOWS98_DEFAULT_PALETTE } from "../windows98SaverColors";
import {
	type Windows98Spans,
	type Windows98Surface,
	windows98OutlineSpans,
} from "../windows98SaverSurface";
import type { Windows98Random } from "../windows98SaverTimer";
import { WINGDINGS_FLAG_METRICS, WINGDINGS_FLAG_PATH } from "./wingdingsFlag";

/** The depth a logo starts at. */
const FAR = 0xa00;

export type FlyingWindowsOptions = {
	/** Warp speed, 1 (Slow) to 20 (Fast). */
	warpSpeed: number;
	/** Number of windows, 5 to 75. */
	density: number;
};

type Contour = Array<[x: number, y: number, onCurve: boolean]>;

/** The outline's contours, in font units (y up), each point on or off the curve. */
const contours = ((): Contour[] => {
	const out: Contour[] = [];
	let current: Contour = [];
	const tokens = WINGDINGS_FLAG_PATH.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? [];
	for (let i = 0; i < tokens.length; ) {
		const command = tokens[i++];
		const number = () => Number(tokens[i++]);
		if (command === "M") current = [[number(), number(), true]];
		else if (command === "L") current.push([number(), number(), true]);
		else if (command === "Q")
			current.push([number(), number(), false], [number(), number(), true]);
		else if (command === "Z") out.push(current);
	}
	return out;
})();

const cache = new Map<number, Windows98Spans>();

/**
 * The glyph's pixels at a font height of `height` pixels (the cell, ascent and
 * descent: a TrueType font maps a positive lfHeight to usWinAscent plus
 * usWinDescent), as runs around the pen: centered on it across (TA_CENTER),
 * the baseline on it (TA_BASELINE). Cached by height, as GDI cached a font's
 * glyphs.
 */
export const flyingWindowsGlyph = (height: number): Windows98Spans => {
	const cached = cache.get(height);
	if (cached) return cached;
	const { winAscent, winDescent, advance } = WINGDINGS_FLAG_METRICS;
	const scale = height / (winAscent + winDescent);
	const at = (x: number, y: number): [number, number] => [
		(x - advance / 2) * scale,
		-y * scale,
	];
	const polygons = contours.map((contour) => {
		const points: number[] = [];
		let previous: [number, number] | undefined;
		for (let k = 0; k < contour.length; k++) {
			const [x, y, onCurve] = contour[k] ?? [0, 0, true];
			if (onCurve) {
				const point = at(x, y);
				points.push(...point);
				previous = point;
				continue;
			}
			// A quadratic piece to the next (on-curve) point, in 8 lines.
			const [ex, ey] = contour[k + 1] ?? [x, y, true];
			const control = at(x, y);
			const end = at(ex, ey);
			const start = previous ?? end;
			for (let step = 1; step <= 8; step++) {
				const t = step / 8;
				const u = 1 - t;
				points.push(
					u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
					u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
				);
			}
			previous = end;
			k++;
		}
		return points;
	});
	const spans = windows98OutlineSpans(polygons);
	cache.set(height, spans);
	return spans;
};

/**
 * The font height a logo's size asked for: the .scr cached one font per two
 * pixels of size (`size / 2`, at least 1, times 2), the size clamped to 1-255.
 */
export const flyingWindowsFontHeight = (size: number): number =>
	2 * Math.max(1, Math.trunc(Math.min(255, Math.max(1, size)) / 2));

type Logo = {
	x: number;
	y: number;
	z: number;
	color: number;
	/** Where it was last drawn, and how big (0: nowhere yet). */
	drawnX: number;
	drawnY: number;
	drawnHeight: number;
};

/** The flock of logos, drawing on `surface`. */
export const flyingWindows = (
	surface: Windows98Surface,
	random: Windows98Random,
	{ warpSpeed, density }: FlyingWindowsOptions,
) => {
	const width = surface.width;
	const height = surface.height;
	const cx = Math.trunc(width / 2);
	const cy = Math.trunc(height / 2);
	const target = warpSpeed * 10;
	let speed = 0;
	const spawn = (logo: Logo) => {
		logo.x = (random() % width) - cx;
		logo.y = (random() % width) - cy;
		logo.z = FAR;
		logo.color = WINDOWS98_DEFAULT_PALETTE[(random() % 14) + 1]?.[1] ?? 0;
	};
	const logos: Logo[] = Array.from({ length: density }, () => {
		const logo = {
			x: 0,
			y: 0,
			z: FAR,
			color: 0,
			drawnX: 0,
			drawnY: 0,
			drawnHeight: 0,
		};
		spawn(logo);
		return logo;
	});
	const sx = (logo: Logo) => cx + Math.trunc((logo.x * FAR) / logo.z);
	const sy = (logo: Logo) => cy + Math.trunc((logo.y * FAR) / logo.z);
	return {
		logos,
		get speed() {
			return speed;
		},
		tick(): void {
			if (speed < target) speed++;
			else if (speed > target) speed--;
			for (const logo of logos) {
				logo.z = Math.max(0, logo.z - speed);
				if (logo.z === 0) spawn(logo);
				let x = sx(logo);
				let y = sy(logo);
				if (x < 0 || y < 0 || x > width || y > height) {
					spawn(logo);
					x = sx(logo);
					y = sy(logo);
				}
				const fontHeight = flyingWindowsFontHeight(
					Math.trunc((FAR - logo.z) / 20) + 1,
				);
				if (logo.drawnHeight)
					surface.fillSpans(
						flyingWindowsGlyph(logo.drawnHeight),
						logo.drawnX,
						logo.drawnY,
						0x000000,
					);
				surface.fillSpans(flyingWindowsGlyph(fontHeight), x, y, logo.color);
				logo.drawnX = x;
				logo.drawnY = y;
				logo.drawnHeight = fontHeight;
			}
		},
		flush: () => surface.flush(),
	};
};

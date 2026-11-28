import { describe, expect, it, vi } from "vitest";
import {
	curvesAndColors,
	curvesAndColorsBezier,
	curvesAndColorsHue,
	curvesAndColorsPolyline,
} from "./CurvesAndColors/curvesAndColors";
import { flyingThroughSpace } from "./FlyingThroughSpace/flyingThroughSpace";
import {
	flyingWindows,
	flyingWindowsFontHeight,
	flyingWindowsGlyph,
} from "./FlyingWindows/flyingWindows";
import { WINGDINGS_FLAG_METRICS } from "./FlyingWindows/wingdingsFlag";
import { mystify } from "./Mystify/mystify";
import { scrollingMarquee } from "./ScrollingMarquee/scrollingMarquee";
import {
	WINDOWS98_DEFAULT_PALETTE,
	WINDOWS98_VGA_COLORS,
} from "./windows98SaverColors";
import {
	Windows98Surface,
	type Windows98SurfaceContext,
	windows98OutlineSpans,
} from "./windows98SaverSurface";
import {
	createWindows98CurvesRandom,
	createWindows98Random,
	windows98TimerPeriod,
} from "./windows98SaverTimer";

// The savers' WM_TIMER handlers, run on a software screen with a seeded
// random generator: what each draws, what it erases, and that what is left
// on the screen is exactly what is current, as erasing in black left it on
// Windows 98.

/** A 2D context with the two calls the surface makes, the puts recorded. */
const fakeContext = () => {
	const puts: number[][] = [];
	const context: Windows98SurfaceContext = {
		createImageData: ((w: number, h: number) => ({
			data: new Uint8ClampedArray(w * h * 4),
			width: w,
			height: h,
			colorSpace: "srgb",
		})) as unknown as CanvasRenderingContext2D["createImageData"],
		putImageData: ((_: ImageData, ...rest: number[]) => {
			puts.push(rest);
		}) as CanvasRenderingContext2D["putImageData"],
	};
	return { context, puts };
};

const surfaceOf = (width: number, height: number, fill: number | null = 0) =>
	new Windows98Surface(fakeContext().context, width, height, fill);

/** Every pixel's color, keyed `x,y`, skipping the given one (black, or clear). */
const painted = (surface: Windows98Surface, skip: number | null = 0) => {
	const out = new Map<string, number>();
	for (let y = 0; y < surface.height; y++)
		for (let x = 0; x < surface.width; x++) {
			const color = surface.colorAt(x, y);
			if (color !== skip && color !== null) out.set(`${x},${y}`, color);
		}
	return out;
};

describe("the timer and the random numbers", () => {
	it("fires on Windows 98's 55 ms tick", () => {
		expect(
			[0, 9, 10, 30, 50, 55, 56, 100, 110, 200].map(windows98TimerPeriod),
		).toEqual([55, 55, 55, 55, 55, 55, 110, 110, 110, 220]);
	});

	it("draws the C runtime's sequence, high 16 bits", () => {
		const random = createWindows98Random(1);
		expect(Array.from({ length: 4 }, () => random() & 0x7fff)).toEqual([
			41, 18467, 6334, 26500,
		]);
		const wide = createWindows98Random(1);
		for (let i = 0; i < 100; i++) expect(wide()).toBeLessThan(65536);
	});

	it("draws Curves and Colors' own generator, the whole seed", () => {
		const random = createWindows98CurvesRandom(0);
		expect([random(), random()]).toEqual([1, 69070]);
	});
});

describe("the screen", () => {
	it("draws GDI's lines: Bresenham, the last pixel left out", () => {
		const surface = surfaceOf(10, 10, null);
		surface.line(1, 1, 7, 3, 0xff0000);
		expect([...painted(surface, null).keys()].sort()).toEqual(
			["1,1", "2,1", "3,2", "4,2", "5,2", "6,3"].sort(),
		);
		// A closed outline leaves no gap: each corner starts a line.
		const square = surfaceOf(10, 10, null);
		square.polyline([2, 2, 6, 2, 6, 6, 2, 6, 2, 2], 0x00ff00);
		expect(painted(square, null).size).toBe(16);
	});

	it("clips rectangles and runs to the screen", () => {
		const surface = surfaceOf(4, 4, null);
		surface.fillRect(-2, -2, 4, 4, 0xffffff);
		expect(painted(surface, null).size).toBe(4);
		surface.fillSpans(Int32Array.from([0, -5, 50, 9, 0, 4]), 0, 3, 0x123456);
		expect(surface.colorAt(0, 3)).toBe(0x123456);
		expect(surface.colorAt(3, 3)).toBe(0x123456);
	});

	it("fills an outline by the nonzero rule at pixel centers", () => {
		// A 4 x 4 square with a 2 x 2 hole wound the other way.
		const spans = windows98OutlineSpans([
			[0, 0, 4, 0, 4, 4, 0, 4],
			[1, 1, 1, 3, 3, 3, 3, 1],
		]);
		const pixels = new Set<string>();
		for (let i = 0; i < spans.length; i += 3)
			for (let x = spans[i + 1] ?? 0; x < (spans[i + 2] ?? 0); x++)
				pixels.add(`${x},${spans[i]}`);
		expect(pixels.size).toBe(12);
		expect(pixels.has("1,1")).toBe(false);
		expect(pixels.has("0,0")).toBe(true);
	});

	it("puts only what changed onto the canvas", () => {
		const { context, puts } = fakeContext();
		const surface = new Windows98Surface(context, 20, 10, null);
		surface.flush();
		surface.fillRect(3, 4, 2, 2, 0xffffff);
		surface.flush();
		surface.flush();
		expect(puts).toEqual([
			[0, 0, 0, 0, 20, 10],
			[0, 0, 3, 4, 2, 2],
		]);
	});
});

describe("Flying Through Space", () => {
	it("accelerates by one a tick to ten times the warp speed", () => {
		const saver = flyingThroughSpace(
			surfaceOf(64, 48),
			createWindows98Random(7),
			{ warpSpeed: 3, density: 10 },
		);
		for (let i = 0; i < 25; i++) saver.tick();
		expect(saver.speed).toBe(25);
		for (let i = 0; i < 25; i++) saver.tick();
		expect(saver.speed).toBe(30);
		expect(saver.stars).toHaveLength(10);
	});

	it("leaves on the screen exactly its stars, white squares of one to four pixels", () => {
		const surface = surfaceOf(160, 120);
		const saver = flyingThroughSpace(surface, createWindows98Random(3), {
			warpSpeed: 10,
			density: 50,
		});
		for (let i = 0; i < 300; i++) saver.tick();
		const expected = new Set<string>();
		for (const star of saver.stars) {
			const x = 80 + Math.trunc((star.x * 2560) / star.z);
			const y = 60 + Math.trunc((star.y * 2560) / star.z);
			const side = Math.trunc((2560 - star.z) / 640) + 1;
			expect(side).toBeGreaterThanOrEqual(1);
			expect(side).toBeLessThanOrEqual(4);
			for (let dy = 0; dy < side; dy++)
				for (let dx = 0; dx < side; dx++)
					if (x + dx < 160 && y + dy < 120) expected.add(`${x + dx},${y + dy}`);
		}
		const white = painted(surface);
		expect([...white.values()].every((c) => c === 0xffffff)).toBe(true);
		expect([...white.keys()].sort()).toEqual([...expected].sort());
	});
});

describe("Flying Windows", () => {
	it("draws Wingdings' flag centered on its spot, at its baseline, at the font height", () => {
		const spans = flyingWindowsGlyph(128);
		const { winAscent, winDescent, advance } = WINGDINGS_FLAG_METRICS;
		const scale = 128 / (winAscent + winDescent);
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (let i = 0; i < spans.length; i += 3) {
			minY = Math.min(minY, spans[i] ?? 0);
			maxY = Math.max(maxY, spans[i] ?? 0);
			minX = Math.min(minX, spans[i + 1] ?? 0);
			maxX = Math.max(maxX, spans[i + 2] ?? 0);
		}
		// The glyph's box: 100 to 2018 across, 0 to 1536 up, in font units.
		expect(minX).toBe(Math.round((100 - advance / 2) * scale));
		expect(maxX).toBe(Math.round((2018 - advance / 2) * scale));
		expect(maxY).toBe(-1);
		expect(minY).toBe(-Math.round(1536 * scale));
		expect(flyingWindowsGlyph(128)).toBe(spans);
	});

	it("asks for a font one even height per two pixels of size", () => {
		expect([0, 1, 2, 3, 128, 129, 300].map(flyingWindowsFontHeight)).toEqual([
			2, 2, 2, 2, 128, 128, 254,
		]);
	});

	it("colors each logo with one of the default palette's colors 1 to 14", () => {
		const saver = flyingWindows(
			surfaceOf(200, 150),
			createWindows98Random(11),
			{ warpSpeed: 20, density: 75 },
		);
		for (let i = 0; i < 400; i++) saver.tick();
		const allowed = WINDOWS98_DEFAULT_PALETTE.slice(1, 15).map(
			([, rgb]) => rgb,
		);
		for (const logo of saver.logos) expect(allowed).toContain(logo.color);
		expect(new Set(saver.logos.map((l) => l.color)).size).toBeGreaterThan(5);
	});

	it("leaves nothing on the screen but its current logos", () => {
		const surface = surfaceOf(200, 150);
		const saver = flyingWindows(surface, createWindows98Random(5), {
			warpSpeed: 20,
			density: 25,
		});
		for (let i = 0; i < 260; i++) saver.tick();
		const current = new Set<string>();
		for (const logo of saver.logos) {
			const spans = flyingWindowsGlyph(logo.drawnHeight);
			for (let i = 0; i < spans.length; i += 3)
				for (let x = spans[i + 1] ?? 0; x < (spans[i + 2] ?? 0); x++)
					current.add(`${logo.drawnX + x},${logo.drawnY + (spans[i] ?? 0)}`);
		}
		const left = painted(surface);
		expect(left.size).toBeGreaterThan(0);
		for (const pixel of left.keys())
			expect(current.has(pixel), pixel).toBe(true);
	});
});

describe("Mystify Your Mind", () => {
	const polygon = {
		active: true,
		lines: 5,
		randomColors: true,
		startColor: 0x000000,
		endColor: 0xffffff,
	};

	it("keeps each trail to its Lines, its corners on the screen", () => {
		const saver = mystify(surfaceOf(120, 90), createWindows98Random(9), [
			polygon,
			{ ...polygon, lines: 15 },
		]);
		for (let i = 0; i < 500; i++) {
			saver.tick();
			for (const p of saver.polygons) {
				expect(p.trail.length).toBeLessThanOrEqual(p.options.lines);
				for (const corner of p.corners) {
					expect(corner.x).toBeGreaterThanOrEqual(0);
					expect(corner.x).toBeLessThan(120);
					expect(corner.y).toBeGreaterThanOrEqual(0);
					expect(corner.y).toBeLessThan(90);
					expect(Math.abs(corner.dx)).toBeLessThanOrEqual(12);
				}
			}
		}
		expect(saver.polygons.map((p) => p.trail.length)).toEqual([5, 15]);
	});

	it("leaves nothing on the screen but its trails' outlines", () => {
		const surface = surfaceOf(100, 80);
		const saver = mystify(surface, createWindows98Random(2), [
			polygon,
			{ ...polygon, active: false },
		]);
		for (let i = 0; i < 300; i++) saver.tick();
		const check = surfaceOf(100, 80);
		for (const copy of saver.polygons[0]?.trail ?? [])
			check.polyline([...copy, copy[0] ?? 0, copy[1] ?? 0], 0xffffff);
		const left = painted(surface);
		expect(left.size).toBeGreaterThan(0);
		for (const pixel of left.keys())
			expect(painted(check).has(pixel), pixel).toBe(true);
		// The second polygon was not active: it drew nothing.
		expect(saver.polygons[1]?.trail).toEqual([]);
	});

	it("fades between its two colors over 255 ticks, the .scr's arithmetic", () => {
		const saver = mystify(surfaceOf(50, 50), createWindows98Random(4), [
			{ ...polygon, randomColors: false },
		]);
		const colors: number[] = [];
		for (let i = 0; i < 520; i++) {
			saver.tick();
			colors.push(saver.polygons[0]?.color ?? -1);
		}
		// Black (the start color) to white, then back.
		expect(colors[0]).toBe(0x000000);
		expect(colors[127]).toBe(0x7f7f7f);
		expect(colors[255]).toBe(0xffffff);
		expect(colors[256]).toBe(0xffffff);
		expect(colors[511]).toBe(0x000000);
	});
});

describe("Curves and Colors", () => {
	const options = {
		lines: 4,
		curves: 3,
		density: 20,
		randomColors: true,
		color: 0xff0000,
	};

	it("closes a smooth curve of Curves pieces through midpoints", () => {
		const points = [
			{ x: 0, y: 0, dx: 0, dy: 0 },
			{ x: 10, y: 0, dx: 0, dy: 0 },
			{ x: 10, y: 10, dx: 0, dy: 0 },
			{ x: 0, y: 10, dx: 0, dy: 0 },
		];
		const bezier = curvesAndColorsBezier(points);
		expect(bezier).toHaveLength(2 * (3 * 2 + 1));
		expect(bezier.slice(0, 2)).toEqual([0, 5]);
		expect(bezier.slice(-2)).toEqual([0, 5]);
		const line = curvesAndColorsPolyline(bezier);
		expect(line.slice(0, 2)).toEqual(line.slice(-2));
	});

	it("steps one degree round the hue circle a copy, full saturation, half lightness", () => {
		expect([0, 60, 120, 180, 240, 300].map(curvesAndColorsHue)).toEqual([
			0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff,
		]);
		const surface = surfaceOf(100, 80);
		const saver = curvesAndColors(
			surface,
			createWindows98CurvesRandom(8),
			options,
		);
		saver.tick();
		saver.tick();
		const hues = new Set([...painted(surface).values()]);
		expect(hues).toEqual(
			new Set([curvesAndColorsHue(1), curvesAndColorsHue(2)]),
		);
	});

	it("keeps its trail to its Lines and its points on the screen, leaving only the trail", () => {
		const surface = surfaceOf(100, 80);
		const saver = curvesAndColors(surface, createWindows98CurvesRandom(6), {
			...options,
			randomColors: false,
		});
		for (let i = 0; i < 200; i++) {
			saver.tick();
			expect(saver.trail.length).toBeLessThanOrEqual(4);
			for (const p of saver.points) {
				expect(p.x).toBeGreaterThanOrEqual(0);
				expect(p.x).toBeLessThanOrEqual(100);
				expect(Math.abs(p.dx)).toBeGreaterThanOrEqual(2);
				expect(Math.abs(p.dx)).toBeLessThanOrEqual(21);
			}
		}
		const check = surfaceOf(100, 80);
		for (const copy of saver.trail) check.polyline(copy, 0xff0000);
		const left = painted(surface);
		expect([...new Set(left.values())]).toEqual([0xff0000]);
		for (const pixel of left.keys())
			expect(painted(check).has(pixel), pixel).toBe(true);
	});
});

describe("Scrolling Marquee", () => {
	const fake = () => {
		const calls: Array<[string, ...unknown[]]> = [];
		const context = {
			fillStyle: "",
			font: "",
			textBaseline: "alphabetic",
			textAlign: "left",
			fillRect: (...args: number[]) => calls.push(["fillRect", ...args]),
			fillText: (text: string, x: number, y: number) =>
				calls.push(["fillText", text, x, y]),
			measureText: () =>
				({
					width: 300,
					fontBoundingBoxAscent: 80,
					fontBoundingBoxDescent: 20,
				}) as TextMetrics,
		};
		return {
			context: context as unknown as Parameters<typeof scrollingMarquee>[0],
			calls,
		};
	};
	const options = {
		text: "Where do you want to go today?",
		font: 'bold 72pt "Arial", sans-serif',
		textColor: "#ff0000",
		backgroundColor: "#000000",
		underline: false,
		strikeout: false,
		random: false,
		speed: 60,
	};

	it("enters at the right and moves left by count / 3 + 1 once the count reaches 3", () => {
		const { context } = fake();
		const marquee = scrollingMarquee(
			context,
			800,
			600,
			createWindows98Random(1),
			{ ...options, speed: 2 },
		);
		expect([marquee.x, marquee.y]).toEqual([800, 250]);
		marquee.tick();
		expect(marquee.x).toBe(800);
		marquee.tick();
		expect(marquee.x).toBe(798);
		const fast = scrollingMarquee(
			context,
			800,
			600,
			createWindows98Random(1),
			options,
		);
		fast.tick();
		expect(fast.x).toBe(779);
	});

	it("starts over at the right past the left edge, at a random height when Random", () => {
		const { context } = fake();
		const marquee = scrollingMarquee(
			context,
			800,
			600,
			createWindows98Random(3),
			{ ...options, random: true },
		);
		const heights = new Set<number>();
		for (let i = 0; i < 400; i++) {
			marquee.tick();
			expect(marquee.x).toBeGreaterThanOrEqual(-321);
			expect(marquee.x).toBeLessThanOrEqual(800);
			expect(marquee.y).toBeGreaterThanOrEqual(0);
			expect(marquee.y).toBeLessThan(500);
			heights.add(marquee.y);
		}
		expect(heights.size).toBeGreaterThan(2);
	});

	it("draws its text over the background, with 60 pixels of background after it", () => {
		const { context, calls } = fake();
		const marquee = scrollingMarquee(
			context,
			800,
			600,
			createWindows98Random(1),
			options,
		);
		calls.length = 0;
		marquee.tick();
		expect(calls).toEqual([
			["fillRect", 800, 250, 360, 100],
			["fillText", options.text, 800, 330],
		]);
		calls.length = 0;
		marquee.still();
		expect(calls[1]).toEqual(["fillText", options.text, 250, 330]);
	});
});

describe("the colors", () => {
	it("are the VGA sixteen and the default palette's twenty", () => {
		expect(Object.keys(WINDOWS98_VGA_COLORS)).toHaveLength(16);
		expect(WINDOWS98_DEFAULT_PALETTE).toHaveLength(20);
		expect(WINDOWS98_DEFAULT_PALETTE[8]).toEqual(["Money Green", 0xc0dcc0]);
	});

	it("are used without the browser", () => {
		const spy = vi.spyOn(Math, "random");
		flyingWindows(surfaceOf(10, 10), createWindows98Random(1), {
			warpSpeed: 1,
			density: 5,
		}).tick();
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});

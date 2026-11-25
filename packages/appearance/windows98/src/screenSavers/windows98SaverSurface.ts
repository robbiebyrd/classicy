// The screen the savers draw on: a software frame buffer that draws as GDI did
// on a Windows 98 display, whole pixels with no smoothing (PatBlt's
// rectangles, LineTo's one-pixel Bresenham lines, PolyBezier's flattened
// curves, a TrueType glyph's filled outline), so a saver erases what it drew
// by drawing it again in black, exactly, as each .scr did. One canvas pixel is
// one CSS pixel, and the canvas is shown with `image-rendering: pixelated`.

/** A pixel run: `[y, x0, x1]` triples, x1 exclusive, relative to an origin. */
export type Windows98Spans = Int32Array;

/** The 2D context calls the surface needs (a test may pass its own). */
export type Windows98SurfaceContext = Pick<
	CanvasRenderingContext2D,
	"createImageData" | "putImageData"
>;

/** `0xRRGGBB` as an opaque pixel of the canvas's RGBA bytes, read as one word. */
const pixel = (rgb: number): number =>
	(0xff000000 |
		((rgb & 0xff) << 16) |
		(rgb & 0xff00) |
		((rgb >>> 16) & 0xff)) >>>
	0;

export class Windows98Surface {
	readonly width: number;
	readonly height: number;
	readonly pixels: Uint32Array;
	private readonly image: ImageData;
	private readonly context: Windows98SurfaceContext;
	private dirtyX0 = Number.POSITIVE_INFINITY;
	private dirtyY0 = Number.POSITIVE_INFINITY;
	private dirtyX1 = Number.NEGATIVE_INFINITY;
	private dirtyY1 = Number.NEGATIVE_INFINITY;

	/**
	 * A surface over `context`'s canvas, `width` by `height`, clear (every
	 * pixel transparent, so whatever is under the canvas shows) or filled with
	 * `fill` (`0xRRGGBB`).
	 */
	constructor(
		context: Windows98SurfaceContext,
		width: number,
		height: number,
		fill: number | null,
	) {
		this.width = Math.max(1, Math.floor(width));
		this.height = Math.max(1, Math.floor(height));
		this.context = context;
		this.image = context.createImageData(this.width, this.height);
		this.pixels = new Uint32Array(
			this.image.data.buffer,
			this.image.data.byteOffset,
			this.width * this.height,
		);
		if (fill !== null) this.fillRect(0, 0, this.width, this.height, fill);
		else this.markDirty(0, 0, this.width, this.height);
	}

	private markDirty(x0: number, y0: number, x1: number, y1: number): void {
		if (x0 < this.dirtyX0) this.dirtyX0 = x0;
		if (y0 < this.dirtyY0) this.dirtyY0 = y0;
		if (x1 > this.dirtyX1) this.dirtyX1 = x1;
		if (y1 > this.dirtyY1) this.dirtyY1 = y1;
	}

	/** The color at (x, y), `0xRRGGBB`, or `null` where nothing was drawn. */
	colorAt(x: number, y: number): number | null {
		const value = this.pixels[y * this.width + x] ?? 0;
		if (value >>> 24 === 0) return null;
		return ((value & 0xff) << 16) | (value & 0xff00) | ((value >>> 16) & 0xff);
	}

	/** PatBlt: a rectangle, clipped to the screen. */
	fillRect(x: number, y: number, w: number, h: number, rgb: number): void {
		const x0 = Math.max(0, Math.trunc(x));
		const y0 = Math.max(0, Math.trunc(y));
		const x1 = Math.min(this.width, Math.trunc(x) + Math.trunc(w));
		const y1 = Math.min(this.height, Math.trunc(y) + Math.trunc(h));
		if (x0 >= x1 || y0 >= y1) return;
		const value = pixel(rgb);
		for (let row = y0; row < y1; row++)
			this.pixels.fill(value, row * this.width + x0, row * this.width + x1);
		this.markDirty(x0, y0, x1, y1);
	}

	private plot(x: number, y: number, value: number): void {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.pixels[y * this.width + x] = value;
		this.markDirty(x, y, x + 1, y + 1);
	}

	/**
	 * LineTo from (x0, y0) to (x1, y1) with a one-pixel pen: the Bresenham
	 * line, its last pixel left out, as GDI draws it.
	 */
	line(x0: number, y0: number, x1: number, y1: number, rgb: number): void {
		const value = pixel(rgb);
		let x = Math.round(x0);
		let y = Math.round(y0);
		const ex = Math.round(x1);
		const ey = Math.round(y1);
		const dx = Math.abs(ex - x);
		const dy = -Math.abs(ey - y);
		const sx = x < ex ? 1 : -1;
		const sy = y < ey ? 1 : -1;
		let error = dx + dy;
		while (x !== ex || y !== ey) {
			this.plot(x, y, value);
			const e2 = 2 * error;
			if (e2 >= dy) {
				error += dy;
				x += sx;
			}
			if (e2 <= dx) {
				error += dx;
				y += sy;
			}
		}
	}

	/** Polyline: LineTo through `points` (`[x0, y0, x1, y1, …]`). */
	polyline(points: ArrayLike<number>, rgb: number): void {
		for (let i = 2; i + 1 < points.length; i += 2)
			this.line(
				points[i - 2] ?? 0,
				points[i - 1] ?? 0,
				points[i] ?? 0,
				points[i + 1] ?? 0,
				rgb,
			);
	}

	/** Fill `spans` (a glyph's runs) with their origin at (x, y). */
	fillSpans(spans: Windows98Spans, x: number, y: number, rgb: number): void {
		const value = pixel(rgb);
		for (let i = 0; i + 2 < spans.length; i += 3) {
			const row = y + (spans[i] ?? 0);
			if (row < 0 || row >= this.height) continue;
			const x0 = Math.max(0, x + (spans[i + 1] ?? 0));
			const x1 = Math.min(this.width, x + (spans[i + 2] ?? 0));
			if (x0 >= x1) continue;
			this.pixels.fill(value, row * this.width + x0, row * this.width + x1);
			this.markDirty(x0, row, x1, row + 1);
		}
	}

	/** Paint what changed since the last flush onto the canvas. */
	flush(): void {
		if (this.dirtyX1 <= this.dirtyX0 || this.dirtyY1 <= this.dirtyY0) return;
		this.context.putImageData(
			this.image,
			0,
			0,
			this.dirtyX0,
			this.dirtyY0,
			this.dirtyX1 - this.dirtyX0,
			this.dirtyY1 - this.dirtyY0,
		);
		this.dirtyX0 = Number.POSITIVE_INFINITY;
		this.dirtyY0 = Number.POSITIVE_INFINITY;
		this.dirtyX1 = Number.NEGATIVE_INFINITY;
		this.dirtyY1 = Number.NEGATIVE_INFINITY;
	}
}

/**
 * Fill a closed outline: `contours` of `[x, y, …]` points in pixels (y down),
 * by the nonzero rule, sampling each pixel at its center, as runs.
 */
export const windows98OutlineSpans = (
	contours: ReadonlyArray<ArrayLike<number>>,
): Windows98Spans => {
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const contour of contours)
		for (let i = 1; i < contour.length; i += 2) {
			const y = contour[i] ?? 0;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	const runs: number[] = [];
	const crossings: Array<[number, number]> = [];
	for (let row = Math.floor(minY); row <= Math.ceil(maxY); row++) {
		const sy = row + 0.5;
		crossings.length = 0;
		for (const contour of contours) {
			const n = Math.floor(contour.length / 2);
			for (let i = 0; i < n; i++) {
				const ax = contour[2 * i] ?? 0;
				const ay = contour[2 * i + 1] ?? 0;
				const j = (i + 1) % n;
				const bx = contour[2 * j] ?? 0;
				const by = contour[2 * j + 1] ?? 0;
				if (ay <= sy === by <= sy) continue;
				crossings.push([
					ax + ((sy - ay) * (bx - ax)) / (by - ay),
					by > ay ? 1 : -1,
				]);
			}
		}
		crossings.sort((a, b) => a[0] - b[0]);
		// A run from where the winding leaves zero to where it comes back.
		let winding = 0;
		let from = 0;
		for (const [x, direction] of crossings) {
			if (winding === 0) from = x;
			winding += direction;
			if (winding !== 0) continue;
			const x0 = Math.ceil(from - 0.5);
			const x1 = Math.ceil(x - 0.5);
			if (x1 > x0) runs.push(row, x0, x1);
		}
	}
	return Int32Array.from(runs);
};

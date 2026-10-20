/**
 * The Finder's drag outline (Mac OS 8): a dotted, one-pixel line around the
 * union of each dragged item's icon — its opaque pixels, not its bounding box —
 * and the rectangle of its label. Nothing inside the line is drawn, so the
 * windows and desktop below stay visible as the outline moves.
 */

/** One dragged item's visible parts, as they sit on screen when the drag starts. */
export type ClassicyFileDragOutlinePart = {
	image?: HTMLImageElement | null;
	label?: Element | null;
};

/** Alpha above which an icon pixel counts as part of its shape. */
const OPAQUE_ALPHA = 127;

// Neighbours in walking order: straight steps before diagonal ones, so the
// walk follows the edge rather than cutting its corners.
const STEPS: [number, number][] = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
	[1, 1],
	[-1, 1],
	[-1, -1],
	[1, -1],
];

/**
 * Trace a filled mask's edge as a dotted line. The edge is every filled pixel
 * with an unfilled (or out-of-bounds) 4-neighbour; it is walked pixel by pixel
 * and every other pixel kept, so dots are evenly spaced along straight and
 * slanted edges alike (a parity rule like `(x + y) % 2` would draw a 45° edge
 * solid or not at all). `mask` is row-major, 1 = filled; so is the result.
 */
export function traceClassicyDragOutline(
	mask: Uint8Array,
	width: number,
	height: number,
): Uint8Array {
	const filled = (x: number, y: number) =>
		x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
	const edge = new Uint8Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (
				filled(x, y) &&
				(!filled(x - 1, y) ||
					!filled(x + 1, y) ||
					!filled(x, y - 1) ||
					!filled(x, y + 1))
			) {
				edge[y * width + x] = 1;
			}
		}
	}

	const outline = new Uint8Array(width * height);
	const visited = new Uint8Array(width * height);
	for (let start = 0; start < edge.length; start++) {
		if (!edge[start] || visited[start]) continue;
		let current = start;
		let on = true;
		while (current !== -1) {
			visited[current] = 1;
			if (on) outline[current] = 1;
			on = !on;
			const x = current % width;
			const y = (current - x) / width;
			let next = -1;
			for (const [dx, dy] of STEPS) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
				const n = ny * width + nx;
				if (edge[n] && !visited[n]) {
					next = n;
					break;
				}
			}
			current = next;
		}
	}
	return outline;
}

type Box = { left: number; top: number; width: number; height: number };

const boxOf = (el: Element): Box | null => {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0
		? { left: r.left, top: r.top, width: r.width, height: r.height }
		: null;
};

/**
 * Draw the outline for `parts` onto a canvas the size of their combined bounds.
 * Returns the canvas and its top-left in client coordinates (so it can be held
 * at the same offset from the pointer as the items were), or null when there
 * is nothing measurable or no 2D canvas (jsdom).
 */
export function drawClassicyDragOutline(
	parts: ClassicyFileDragOutlinePart[],
): { canvas: HTMLCanvasElement; left: number; top: number } | null {
	const pieces = parts.map((part) => ({
		image: part.image ?? null,
		imageBox: part.image ? boxOf(part.image) : null,
		labelBox: part.label ? boxOf(part.label) : null,
	}));
	const boxes = pieces.flatMap((p) =>
		[p.imageBox, p.labelBox].filter((b): b is Box => b !== null),
	);
	if (boxes.length === 0) return null;

	const left = Math.floor(Math.min(...boxes.map((b) => b.left)));
	const top = Math.floor(Math.min(...boxes.map((b) => b.top)));
	const right = Math.ceil(Math.max(...boxes.map((b) => b.left + b.width)));
	const bottom = Math.ceil(Math.max(...boxes.map((b) => b.top + b.height)));
	const width = right - left;
	const height = bottom - top;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;

	// Draw every icon at its on-screen size, then read back its alpha.
	ctx.imageSmoothingEnabled = false;
	for (const { image, imageBox } of pieces) {
		if (!image || !imageBox) continue;
		ctx.drawImage(
			image,
			Math.round(imageBox.left - left),
			Math.round(imageBox.top - top),
			Math.round(imageBox.width),
			Math.round(imageBox.height),
		);
	}
	const mask = new Uint8Array(width * height);
	try {
		const { data } = ctx.getImageData(0, 0, width, height);
		for (let i = 0; i < mask.length; i++) {
			if (data[i * 4 + 3] > OPAQUE_ALPHA) mask[i] = 1;
		}
	} catch {
		// A cross-origin icon taints the canvas: fall back to its bounding box.
		for (const { imageBox } of pieces)
			if (imageBox) fillBox(mask, width, imageBox, left, top);
	}
	for (const { labelBox } of pieces) {
		if (labelBox) fillBox(mask, width, labelBox, left, top);
	}

	const outline = traceClassicyDragOutline(mask, width, height);
	ctx.clearRect(0, 0, width, height);
	const pixels = ctx.createImageData(width, height);
	for (let i = 0; i < outline.length; i++) {
		if (outline[i] === 1) pixels.data[i * 4 + 3] = 255; // opaque black
	}
	ctx.putImageData(pixels, 0, 0);
	return { canvas, left, top };
}

function fillBox(
	mask: Uint8Array,
	width: number,
	box: Box,
	left: number,
	top: number,
) {
	const x0 = Math.max(0, Math.round(box.left - left));
	const y0 = Math.max(0, Math.round(box.top - top));
	const x1 = Math.min(width, Math.round(box.left - left + box.width));
	const y1 = Math.min(
		mask.length / width,
		Math.round(box.top - top + box.height),
	);
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) mask[y * width + x] = 1;
	}
}

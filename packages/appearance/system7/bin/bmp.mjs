// A minimal BMP reader for the System 7 asset export (bin/export-assets.mjs,
// bin/export-pixel-art.mjs): the 24- and 32-bit files resource_dasm writes
// when it decodes a picture, icon or pattern.

import { readFileSync } from "node:fs";

/**
 * A BMP's pixels as `{ width, height, pixels }`, RGBA bytes row by row, top
 * row first: resource_dasm's 32-bit output (bitfields ff, ff00, ff0000,
 * ff000000: R, G, B, A) or its 24-bit output (B, G, R, opaque).
 */
export const readBmp = (file) => {
	const b = readFileSync(file);
	const offset = b.readUInt32LE(10);
	const width = b.readInt32LE(18);
	const h = b.readInt32LE(22);
	const bpp = b.readUInt16LE(28);
	if (bpp !== 24 && bpp !== 32)
		throw new Error(`${file}: ${bpp}-bit BMP (only 24 and 32 are read)`);
	const height = Math.abs(h);
	const stride = Math.ceil((width * bpp) / 32) * 4;
	const pixels = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const o = offset + (h > 0 ? height - 1 - y : y) * stride + (x * bpp) / 8;
			const rgb =
				bpp === 32 ? [b[o], b[o + 1], b[o + 2]] : [b[o + 2], b[o + 1], b[o]];
			pixels.set([...rgb, bpp === 32 ? b[o + 3] : 255], (y * width + x) * 4);
		}
	return { width, height, pixels };
};

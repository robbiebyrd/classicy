// A minimal PNG writer and reader for the System 7 asset export
// (bin/export-assets.mjs, bin/selectedIcons.mjs). The writer:
// 8-bit RGBA, no filtering choice beyond "none", and no ancillary chunks at
// all, so no iCCP, gAMA, cHRM or sRGB chunk ever tells a browser to correct
// the exact System colors (docs/system7-asset-inventory.md, PNG rules). The
// output is deterministic: the same pixels always give the same bytes.

import { readFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

const crc32 = (bytes) => {
	let c = 0xffffffff;
	for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(data.length, 0);
	head.write(type, 4, "latin1");
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
	return Buffer.concat([head, data, crc]);
};

/** `{ width, height, pixels }` (RGBA bytes, row by row) as PNG bytes. */
export const encodePng = ({ width, height, pixels }) => {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 6; // RGBA
	const raw = Buffer.alloc(height * (width * 4 + 1));
	for (let y = 0; y < height; y++)
		pixels.copy(
			raw,
			y * (width * 4 + 1) + 1,
			y * width * 4,
			(y + 1) * width * 4,
		);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
};

/**
 * A PNG's pixels: 8-bit, non-interlaced RGB or RGBA (the screenshots) or
 * gray or gray with alpha (Platinum's resize cursors).
 */
export const readPng = (file) => {
	const bytes = readFileSync(file);
	let at = 8;
	let width = 0;
	let height = 0;
	let channels = 0;
	let colorType = 0;
	const idat = [];
	while (at < bytes.length) {
		const length = bytes.readUInt32BE(at);
		const type = bytes.toString("latin1", at + 4, at + 8);
		const data = bytes.subarray(at + 8, at + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8 || data[12] !== 0)
				throw new Error(`${file}: not 8-bit, non-interlaced`);
			colorType = data[9];
			channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
			if (!channels) throw new Error(`${file}: not gray, RGB or their alpha`);
		} else if (type === "IDAT") idat.push(data);
		at += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const rows = Buffer.alloc(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		for (let x = 0; x < stride; x++) {
			const value = raw[y * (stride + 1) + 1 + x];
			const a = x >= channels ? rows[y * stride + x - channels] : 0;
			const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
			const c =
				x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0;
			const p = a + b - c;
			const predictor = [
				0,
				a,
				b,
				(a + b) >> 1,
				Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
					? a
					: Math.abs(p - b) <= Math.abs(p - c)
						? b
						: c,
			][filter];
			rows[y * stride + x] = (value + predictor) & 0xff;
		}
	}
	const img = { width, height, pixels: Buffer.alloc(width * height * 4) };
	for (let i = 0; i < width * height; i++) {
		const at = i * channels;
		const gray = colorType === 0 || colorType === 4;
		img.pixels.set(
			[
				rows[at],
				rows[gray ? at : at + 1],
				rows[gray ? at : at + 2],
				colorType === 4 ? rows[at + 1] : colorType === 6 ? rows[at + 3] : 255,
			],
			i * 4,
		);
		// A transparent pixel is 0,0,0,0 whatever color it stored, as in
		// every file the export decodes.
		if (img.pixels[i * 4 + 3] === 0) img.pixels.fill(0, i * 4, i * 4 + 4);
	}
	return img;
};

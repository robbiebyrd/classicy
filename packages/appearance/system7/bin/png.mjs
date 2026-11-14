// A minimal PNG writer for the System 7 asset export (bin/export-assets.mjs):
// 8-bit RGBA, no filtering choice beyond "none", and no ancillary chunks at
// all, so no iCCP, gAMA, cHRM or sRGB chunk ever tells a browser to correct
// the exact System colors (docs/system7-asset-inventory.md, PNG rules). The
// output is deterministic: the same pixels always give the same bytes.

import { deflateSync } from "node:zlib";

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

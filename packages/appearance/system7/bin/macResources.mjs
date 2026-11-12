// Decodes the classic Mac OS resources the System 7 asset export needs (plan
// 0018-dbd §4.1). A dev tool, not shipped: bin/export-assets.mjs runs it.
//
// The input is resource_dasm's raw export of a System 7.5.5 install
// (`--skip-decode --save-raw=yes --filename-format=txdirs`): one folder per
// file, one per type, one `<id>[_<name>].bin` per resource, decompressed
// (System 7.5's System file and applications hold compressed resources,
// which resource_dasm expands). The formats follow Inside Macintosh: More
// Macintosh Toolbox (1993), "Finder Interface" (BNDL, FREF, the icon
// families) and Imaging With QuickDraw (1994) (CURS, cicn, clut).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every resource of one file in a raw export, as `{ type, id, name, data }`:
 * `dir` is the file's folder (`<export>/System Folder/System.rsrc`).
 */
export const readResources = (dir) => {
	if (!existsSync(dir)) throw new Error(`${dir}: no such resource folder`);
	const out = [];
	for (const type of readdirSync(dir))
		for (const file of readdirSync(join(dir, type))) {
			const match = /^(-?\d+)(?:_(.*))?\.bin$/.exec(file);
			if (!match) continue;
			out.push({
				type,
				id: Number(match[1]),
				name: match[2] ?? "",
				data: readFileSync(join(dir, type, file)),
			});
		}
	return out;
};

/** A resource of a fork's list by type and id, or undefined. */
export const findResource = (resources, type, id) =>
	resources.find((r) => r.type === type && r.id === id);

/** Bit `i` of a big-endian bit row (QuickDraw bitmaps: bit 7 of byte 0 is x 0). */
const bit = (data, rowBytes, x, y) =>
	(data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;

/**
 * An image: `{ width, height, pixels }`, `pixels` RGBA bytes. Transparent
 * pixels are 0,0,0,0.
 */
const image = (width, height) => ({
	width,
	height,
	pixels: Buffer.alloc(width * height * 4),
});

const put = (img, x, y, [r, g, b, a]) => {
	const at = (y * img.width + x) * 4;
	img.pixels[at] = r;
	img.pixels[at + 1] = g;
	img.pixels[at + 2] = b;
	img.pixels[at + 3] = a;
};

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

/**
 * A 1-bit image with a mask (`ICN#`, `ics#`, `CURS`): mask 1 is opaque,
 * image 1 black and 0 white; mask 0 is transparent. With `inverting`, image 1
 * under mask 0 (a cursor's screen-inverting pixels) is black instead, since a
 * PNG cannot invert; an icon's stray image bits outside its mask stay
 * transparent, as the Finder draws them.
 */
export const decodeMaskedBitmap = (bits, mask, size, inverting = false) => {
	const rowBytes = size / 8;
	const img = image(size, size);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			const on = bit(bits, rowBytes, x, y);
			const opaque = bit(mask, rowBytes, x, y);
			if (opaque) put(img, x, y, on ? BLACK : WHITE);
			else put(img, x, y, on && inverting ? BLACK : CLEAR);
		}
	return img;
};

/** `ICN#` (32 px) or `ics#` (16 px): the image, then the mask. */
export const decodeIconList = (data, size) => {
	const bytes = (size * size) / 8;
	return decodeMaskedBitmap(
		data.subarray(0, bytes),
		data.subarray(bytes, bytes * 2),
		size,
	);
};

/** `ICON`: a 32 px 1-bit image with no mask; white is opaque white. */
export const decodeIcon = (data) => {
	const img = image(32, 32);
	for (let y = 0; y < 32; y++)
		for (let x = 0; x < 32; x++)
			put(img, x, y, bit(data, 4, x, y) ? BLACK : WHITE);
	return img;
};

/**
 * `icl8` (32 px) or `ics8` (16 px): one byte per pixel, an index into the
 * System's 8-bit color table (`clut` 8), masked by the family's `ICN#` or
 * `ics#` mask.
 */
export const decodeIcon8 = (data, maskList, clut, size) => {
	const bytes = (size * size) / 8;
	const mask = maskList.subarray(bytes, bytes * 2);
	const img = image(size, size);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			if (!bit(mask, size / 8, x, y)) continue;
			put(img, x, y, [...clut[data[y * size + x]], 255]);
		}
	return img;
};

/** A `clut` resource: index → [r, g, b], the high byte of each channel. */
export const decodeClut = (data) => {
	const count = data.readInt16BE(6) + 1;
	const table = [];
	for (let i = 0; i < count; i++) {
		const at = 8 + i * 8;
		table[data.readUInt16BE(at)] = [
			data.readUInt16BE(at + 2) >> 8,
			data.readUInt16BE(at + 4) >> 8,
			data.readUInt16BE(at + 6) >> 8,
		];
	}
	return table;
};

/** `CURS`: 16 px image and mask, then the hotspot as v, h. */
export const decodeCursor = (data) => ({
	image: decodeMaskedBitmap(
		data.subarray(0, 32),
		data.subarray(32, 64),
		16,
		true,
	),
	hotspot: { x: data.readInt16BE(66), y: data.readInt16BE(64) },
});

/**
 * `cicn`: a color icon (a PixMap, a mask BitMap, an icon BitMap, the color
 * table, then the mask, icon and pixel data). Only 1-, 2-, 4- and 8-bit
 * indexed pixel maps, which is every `cicn` System 7.5 holds.
 */
export const decodeColorIcon = (data) => {
	// PixMap: baseAddr 4, rowBytes 2, bounds 8, version 2, packType 2,
	// packSize 4, hRes 4, vRes 4, pixelType 2, pixelSize 2, cmpCount 2,
	// cmpSize 2, planeBytes 4, pmTable 4, pmReserved 4 (50 bytes).
	const pmRowBytes = data.readUInt16BE(4) & 0x3fff;
	const top = data.readInt16BE(6);
	const left = data.readInt16BE(8);
	const bottom = data.readInt16BE(10);
	const right = data.readInt16BE(12);
	const pixelSize = data.readUInt16BE(32);
	const width = right - left;
	const height = bottom - top;
	// Mask BitMap (14 bytes) and icon BitMap (14), then iconData handle (4).
	const maskRowBytes = data.readUInt16BE(50 + 4);
	const iconRowBytes = data.readUInt16BE(64 + 4);
	let at = 82;
	const mask = data.subarray(at, at + maskRowBytes * height);
	at += maskRowBytes * height;
	at += iconRowBytes * height;
	// ColorTable: ctSeed 4, ctFlags 2, ctSize 2, then (value, r, g, b) × n.
	const ctSize = data.readInt16BE(at + 6) + 1;
	const colors = [];
	for (let i = 0; i < ctSize; i++) {
		const e = at + 8 + i * 8;
		colors[data.readUInt16BE(e)] = [
			data.readUInt16BE(e + 2) >> 8,
			data.readUInt16BE(e + 4) >> 8,
			data.readUInt16BE(e + 6) >> 8,
		];
	}
	at += 8 + ctSize * 8;
	const pixels = data.subarray(at, at + pmRowBytes * height);
	const img = image(width, height);
	const perByte = 8 / pixelSize;
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			if (!bit(mask, maskRowBytes, x, y)) continue;
			const byte = pixels[y * pmRowBytes + Math.floor(x / perByte)];
			const shift = 8 - pixelSize * ((x % perByte) + 1);
			const index = (byte >> shift) & ((1 << pixelSize) - 1);
			put(img, x, y, [...(colors[index] ?? [0, 0, 0]), 255]);
		}
	return img;
};

/**
 * `BNDL`: the owner's signature and, per resource type it binds (`ICN#`,
 * `FREF`), local id → resource id.
 */
export const decodeBundle = (data) => {
	const signature = data.subarray(0, 4).toString("latin1");
	const typeCount = data.readInt16BE(6) + 1;
	const maps = {};
	let at = 8;
	for (let t = 0; t < typeCount; t++) {
		const type = data.subarray(at, at + 4).toString("latin1");
		const count = data.readInt16BE(at + 4) + 1;
		at += 6;
		const pairs = {};
		for (let i = 0; i < count; i++) {
			pairs[data.readInt16BE(at)] = data.readInt16BE(at + 2);
			at += 4;
		}
		maps[type] = pairs;
	}
	return { signature, maps };
};

/** `FREF`: a file type and the local id of its icon. */
export const decodeFileReference = (data) => ({
	fileType: data.subarray(0, 4).toString("latin1"),
	localId: data.readInt16BE(4),
});

/**
 * Every file type a fork's bundle gives an icon: `[{ fileType, iconId }]`,
 * `iconId` the `ICN#` (and `icl8`, `ics#`, `ics8`) resource id.
 */
export const bundleIcons = (resources) => {
	const out = [];
	for (const bndl of resources.filter((r) => r.type === "BNDL")) {
		const { maps } = decodeBundle(bndl.data);
		for (const [localFref, frefId] of Object.entries(maps.FREF ?? {})) {
			const fref = findResource(resources, "FREF", frefId);
			if (!fref) continue;
			const { fileType, localId } = decodeFileReference(fref.data);
			out.push({
				fileType,
				iconId: maps["ICN#"]?.[localId],
				fref: frefId,
				localFref: Number(localFref),
			});
		}
	}
	return out;
};

/**
 * The standard 8-bit color table (`clut` 8, in ROM, so in no System file):
 * the 6×6×6 cube from white, without black (0–214), ten-step ramps of red,
 * green, blue and gray (215–254), then black (255). Imaging With QuickDraw,
 * "Color QuickDraw", the default color tables.
 */
export const standardClut8 = () => {
	const cube = [0xff, 0xcc, 0x99, 0x66, 0x33, 0x00];
	const ramp = [0xee, 0xdd, 0xbb, 0xaa, 0x88, 0x77, 0x55, 0x44, 0x22, 0x11];
	const table = [];
	for (const r of cube)
		for (const g of cube) for (const b of cube) table.push([r, g, b]);
	table.pop();
	for (const v of ramp) table.push([v, 0, 0]);
	for (const v of ramp) table.push([0, v, 0]);
	for (const v of ramp) table.push([0, 0, v]);
	for (const v of ramp) table.push([v, v, v]);
	table.push([0, 0, 0]);
	return table;
};

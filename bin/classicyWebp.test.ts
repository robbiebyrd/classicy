// @vitest-environment node
// (The converter is a build tool: Node's own Buffer, zlib and WebAssembly.)
import { createHash } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { encode as encodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import {
	type ClassicyRgbaImage,
	classicyPixelsEqual,
	classicyPsnr,
	decodeClassicySourceImage,
	decodeClassicyWebp,
	encodeClassicyWebp,
} from "./classicyWebp.ts";

// The deterministic WebP converter (plan 0019-fb7 §6.1): pngjs and jpeg-js
// decode a source to 8-bit RGBA, a pinned WebAssembly libwebp encodes it, and
// the comparisons say whether a conversion kept every pixel. Every fixture is
// built here, none is committed.

function rgba(width: number, height: number, pixels: number[][]) {
	return { width, height, data: Uint8Array.from(pixels.flat()) };
}

/** A 64×64 image with every channel varying, alpha included. */
function gradient(): ClassicyRgbaImage {
	const data = new Uint8Array(64 * 64 * 4);
	for (let y = 0; y < 64; y++)
		for (let x = 0; x < 64; x++) {
			const p = (y * 64 + x) * 4;
			data[p] = x * 4;
			data[p + 1] = y * 4;
			data[p + 2] = (x * y) & 255;
			data[p + 3] = ((x + y) * 2) & 255;
		}
	return { width: 64, height: 64, data };
}

function ascii(bytes: Uint8Array, from: number, to: number) {
	return Buffer.from(bytes.subarray(from, to)).toString("latin1");
}

function pngChunk(type: string, data: Uint8Array) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const typed = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typed));
	return Buffer.concat([length, typed, crc]);
}

/**
 * A one-row PNG written byte by byte, for the formats pngjs cannot write
 * (bit depths under 8, palettes): `row` is the packed samples.
 */
function handBuiltPng(
	width: number,
	depth: number,
	colorType: number,
	row: number[],
	chunks: [string, number[]][] = [],
) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(1, 4);
	header[8] = depth;
	header[9] = colorType;
	return new Uint8Array(
		Buffer.concat([
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			pngChunk("IHDR", header),
			...chunks.map(([type, data]) => pngChunk(type, Uint8Array.from(data))),
			// Filter type 0 (none), then the row.
			pngChunk("IDAT", deflateSync(Uint8Array.from([0, ...row]))),
			pngChunk("IEND", new Uint8Array(0)),
		]),
	);
}

describe("encodeClassicyWebp and decodeClassicyWebp", () => {
	it("a lossless round trip keeps every channel, color under alpha 0 included", async () => {
		const source = rgba(4, 1, [
			[12, 34, 56, 255],
			[255, 0, 0, 0],
			[0, 255, 0, 128],
			[7, 8, 9, 1],
		]);
		const webp = await encodeClassicyWebp(source, { lossless: true });
		// A RIFF WebP holding exactly its own bytes, in the lossless bitstream.
		expect(ascii(webp, 0, 4)).toBe("RIFF");
		expect(Buffer.from(webp).readUInt32LE(4) + 8).toBe(webp.length);
		expect(ascii(webp, 8, 16)).toBe("WEBPVP8L");

		const decoded = await decodeClassicyWebp(webp);
		expect(decoded.width).toBe(4);
		expect(decoded.height).toBe(1);
		expect(Array.from(decoded.data)).toEqual(Array.from(source.data));
		expect(classicyPixelsEqual(decoded, source)).toBe(true);

		// The comparison reads color under alpha 0 too.
		const recolored = { ...decoded, data: decoded.data.slice() };
		recolored.data[4] = 254;
		expect(classicyPixelsEqual(recolored, source)).toBe(false);
	});

	it("encodes identical bytes on repeated runs", async () => {
		const image = gradient();
		const first = await encodeClassicyWebp(image, { lossless: true });
		const second = await encodeClassicyWebp(image, { lossless: true });
		expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
		// The same bytes as on the machine this test was written on: the pinned
		// encoder (@jsquash/webp 1.5.0's SIMD build) writes them anywhere.
		expect(createHash("sha256").update(first).digest("hex")).toBe(
			"f5a1a2828e3c4b3255ae842ee61d1dc9528fb4a3609ddca538d779bfeffafc4b",
		);

		const lossyFirst = await encodeClassicyWebp(image, {
			lossless: false,
			quality: 90,
		});
		const lossySecond = await encodeClassicyWebp(image, {
			lossless: false,
			quality: 90,
		});
		expect(ascii(lossyFirst, 8, 12)).toBe("WEBP");
		expect(Buffer.from(lossySecond).equals(Buffer.from(lossyFirst))).toBe(true);
	});
});

describe("decodeClassicySourceImage", () => {
	it("rounds 16-bit samples to the nearest 8-bit value", () => {
		// pngjs writes 16-bit samples from a native-endian Uint16Array's bytes.
		const png = new PNG({ width: 2, height: 1 });
		png.data = Buffer.from(
			Uint16Array.from([65535, 257, 384, 386, 0, 128, 129, 65535]).buffer,
		);
		// gAMA 1/2.2, as earth.png carries: ignored, the samples stay raw.
		png.gamma = 0.45455;
		const bytes = new Uint8Array(
			PNG.sync.write(png, { bitDepth: 16, colorType: 6, inputColorType: 6 }),
		);
		expect(bytes[24]).toBe(16); // IHDR's bit depth: the fixture is 16-bit
		expect(ascii(bytes, 37, 41)).toBe("gAMA");

		const image = decodeClassicySourceImage(bytes, "png");
		expect(image.width).toBe(2);
		expect(image.height).toBe(1);
		expect(Array.from(image.data)).toEqual([255, 1, 1, 2, 0, 0, 1, 255]);
	});

	it("decodes grayscale and palette PNGs as RGBA", () => {
		// 4-bit gray, as both sad-mac.png files are: 15 and 5 of 15.
		const gray = decodeClassicySourceImage(
			handBuiltPng(2, 4, 0, [0xf5]),
			"png",
		);
		expect(Array.from(gray.data)).toEqual([
			255, 255, 255, 255, 85, 85, 85, 255,
		]);

		// A 2-bit palette whose first entry is transparent: its color stays.
		const palette = decodeClassicySourceImage(
			handBuiltPng(
				2,
				2,
				3,
				[0b0001_0000],
				[
					["PLTE", [10, 20, 30, 200, 100, 50]],
					["tRNS", [0]],
				],
			),
			"png",
		);
		expect(Array.from(palette.data)).toEqual([
			10, 20, 30, 0, 200, 100, 50, 255,
		]);
	});

	it("decodes a JPEG", () => {
		const pixels = Array.from({ length: 16 * 16 }, () => [200, 100, 50, 255]);
		const jpeg = encodeJpeg(rgba(16, 16, pixels), 100);
		const image = decodeClassicySourceImage(new Uint8Array(jpeg.data), "jpg");
		expect(image.width).toBe(16);
		expect(image.height).toBe(16);
		expect(image.data.length).toBe(16 * 16 * 4);
		for (let p = 0; p < image.data.length; p += 4) {
			expect(Math.abs(image.data[p] - 200)).toBeLessThanOrEqual(2);
			expect(Math.abs(image.data[p + 1] - 100)).toBeLessThanOrEqual(2);
			expect(Math.abs(image.data[p + 2] - 50)).toBeLessThanOrEqual(2);
			expect(image.data[p + 3]).toBe(255);
		}
	});
});

describe("classicyPsnr", () => {
	it("classicyPsnr is Infinity for identical images and finite otherwise", () => {
		const a = rgba(2, 1, [
			[10, 20, 30, 255],
			[40, 50, 60, 0],
		]);
		expect(classicyPsnr(a, a, "white")).toBe(Infinity);
		expect(classicyPsnr(a, { ...a, data: a.data.slice() }, "black")).toBe(
			Infinity,
		);

		// One step in one channel of six: MSE 1/6.
		const off = { ...a, data: a.data.slice() };
		off.data[0] = 11;
		const expected = 10 * Math.log10((255 * 255 * 6) / 1);
		expect(classicyPsnr(a, off, "white")).toBeCloseTo(expected, 9);
		expect(classicyPsnr(a, off, "black")).toBeCloseTo(expected, 9);

		// Composited, color under alpha 0 draws nothing.
		const hidden = { ...a, data: a.data.slice() };
		hidden.data[4] = 255;
		expect(classicyPsnr(a, hidden, "white")).toBe(Infinity);

		// Alpha shows through to the background, so a pixel half covered
		// scores differently over white and over black.
		const half = { ...a, data: a.data.slice() };
		half.data[3] = 128;
		const overWhite = classicyPsnr(a, half, "white");
		const overBlack = classicyPsnr(a, half, "black");
		expect(Number.isFinite(overWhite)).toBe(true);
		expect(Number.isFinite(overBlack)).toBe(true);
		expect(overWhite).not.toBeCloseTo(overBlack, 3);
	});
});

// The deterministic WebP converter (plan 0019-fb7 Part 5, §6.1). A source PNG
// or JPG decodes to 8-bit RGBA with pngjs or jpeg-js, and libwebp compiled to
// WebAssembly encodes it (@jsquash/webp, pinned exactly in package.json), so
// one image gives the same bytes on any machine: sharp's per-platform libvips
// builds promise no such thing.
//
// Both codecs are instantiated from their wasm files, read from disk:
// @jsquash/webp's own init fetches them by URL, which Node cannot do. The
// encoder is always the SIMD build, codec/enc/webp_enc_simd.wasm, never chosen
// by feature detection. (Its init still picks its JavaScript glue by detecting
// SIMD, but once that module has compiled the answer can only be yes, so the
// glue is always the SIMD build's too.) The decoder has one build,
// codec/dec/webp_dec.wasm.
//
// Sources are read as their raw samples: gAMA, cHRM, sRGB and iCCP are
// ignored, and 16-bit samples round to the nearest 8-bit value. A gray or RGB
// PNG whose tRNS chunk keys a color is refused (its keyed pixels' color would
// be lost); none in scope has one.
//
// Browsers draw a PNG's gAMA and cHRM (without sRGB or iCCP) color-managed,
// and a WebP with no ICC profile as plain sRGB. classicyIccFromPngChunks
// writes the profile those chunks stand for, and withClassicyIccProfile muxes
// it into a WebP (VP8X plus ICCP), so the WebP draws as its PNG did.
//
// Build tool, not library code: nothing under src/ imports it. Its callers are
// the one-time conversion (§6.2) and System 7's asset exporter (§6.5).
// Erasable TypeScript only, so Node runs it directly.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";
import decodeWebp, { init as initWebpDecoder } from "@jsquash/webp/decode.js";
import encodeWebp, { init as initWebpEncoder } from "@jsquash/webp/encode.js";
import { decode as decodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";

/** An image as 8-bit RGBA samples, row by row, four bytes a pixel. */
export type ClassicyRgbaImage = {
	width: number;
	height: number;
	data: Uint8Array;
};

export type ClassicyWebpOptions =
	| { lossless: true }
	| { lossless: false; quality: number };

// Lossless at libwebp's slowest, smallest effort (cwebp's `-z 9`), keeping
// the color under fully transparent pixels (`-exact`). Lossy keeps it too.
const LOSSLESS = { lossless: 1, exact: 1, quality: 100, method: 6 };

const fromHere = createRequire(import.meta.url);
const ENCODER_WASM = fromHere.resolve(
	"@jsquash/webp/codec/enc/webp_enc_simd.wasm",
);
const DECODER_WASM = fromHere.resolve("@jsquash/webp/codec/dec/webp_dec.wasm");

let encoderReady: Promise<unknown> | undefined;
let decoderReady: Promise<unknown> | undefined;

async function compileWasm(file: string): Promise<WebAssembly.Module> {
	return WebAssembly.compile(await readFile(file));
}

function readyEncoder() {
	encoderReady ??= compileWasm(ENCODER_WASM).then((module) =>
		initWebpEncoder(module),
	);
	return encoderReady;
}

function readyDecoder() {
	decoderReady ??= compileWasm(DECODER_WASM).then((module) =>
		initWebpDecoder(module),
	);
	return decoderReady;
}

function assertRgba(image: ClassicyRgbaImage, name: string) {
	const { width, height, data } = image;
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width < 0 ||
		height < 0 ||
		data.length !== width * height * 4
	)
		throw new RangeError(
			`${name}: ${data.length} bytes are not ${width}×${height} RGBA pixels`,
		);
}

function decodePng(bytes: Uint8Array): ClassicyRgbaImage {
	// skipRescale: pngjs hands over the samples at the source's own bit depth,
	// so the scaling to 8 bits below is this module's. Every color type comes
	// out as four samples a pixel, a palette's already looked up.
	const png = PNG.sync.read(
		Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
		{ skipRescale: true },
	);
	// A tRNS chunk in a gray or RGB image keys one color as transparent, and
	// pngjs zeroes the keyed pixels' color along with their alpha (it reports
	// the key as `transColor`, which its types leave out). The color under
	// alpha 0 would be lost, so no conversion of such a file is lossless.
	if ("transColor" in png)
		throw new RangeError(
			`decodeClassicySourceImage: a tRNS color key (PNG color type ${png.colorType}) would lose the keyed pixels' color`,
		);
	const { width, height, depth } = png;
	// A Uint16Array at depth 16, whatever its type says.
	const samples: ArrayLike<number> = png.data;
	const data = new Uint8Array(width * height * 4);
	if (samples.length !== data.length)
		throw new RangeError(
			`decodeClassicySourceImage: ${samples.length} samples for ${width}×${height} pixels`,
		);
	if (depth === 16) {
		for (let i = 0; i < data.length; i++)
			data[i] = Math.round(samples[i] / 257);
	} else if (depth < 8 && !png.palette) {
		// 1-, 2- and 4-bit gray, alpha included: 255 / (2^depth - 1) is a whole
		// number (255, 85, 17), so every value lands exactly.
		const scale = 255 / (2 ** depth - 1);
		for (let i = 0; i < data.length; i++) data[i] = samples[i] * scale;
	} else {
		data.set(samples);
	}
	return { width, height, data };
}

/** A PNG or JPG's pixels as 8-bit RGBA: raw samples, no color management. */
export function decodeClassicySourceImage(
	bytes: Uint8Array,
	kind: "png" | "jpg",
): ClassicyRgbaImage {
	if (kind === "png") return decodePng(bytes);
	const jpeg = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });
	return { width: jpeg.width, height: jpeg.height, data: jpeg.data };
}

/** The image as WebP bytes, lossless or at a lossy quality (0 to 100). */
export async function encodeClassicyWebp(
	image: ClassicyRgbaImage,
	options: ClassicyWebpOptions,
): Promise<Uint8Array> {
	assertRgba(image, "encodeClassicyWebp");
	if (!options.lossless && !(options.quality >= 0 && options.quality <= 100))
		throw new RangeError(
			`encodeClassicyWebp: quality ${options.quality} is not between 0 and 100`,
		);
	await readyEncoder();
	// libwebp reads only the samples and the size; the copy is a buffer of its
	// own, as ImageData's is.
	const pixels: ImageData = {
		data: new Uint8ClampedArray(image.data),
		width: image.width,
		height: image.height,
		colorSpace: "srgb",
	};
	const encoded = await encodeWebp(
		pixels,
		options.lossless
			? LOSSLESS
			: { quality: options.quality, method: 6, exact: 1 },
	);
	return new Uint8Array(encoded);
}

/** A WebP's pixels as 8-bit RGBA. */
export async function decodeClassicyWebp(
	bytes: Uint8Array,
): Promise<ClassicyRgbaImage> {
	await readyDecoder();
	const decoded = await decodeWebp(bytes.slice().buffer);
	return {
		width: decoded.width,
		height: decoded.height,
		data: new Uint8Array(decoded.data),
	};
}

/**
 * Whether two images hold the same pixels: all four channels, so the color
 * under a fully transparent pixel counts too.
 */
export function classicyPixelsEqual(
	a: ClassicyRgbaImage,
	b: ClassicyRgbaImage,
): boolean {
	if (
		a.width !== b.width ||
		a.height !== b.height ||
		a.data.length !== b.data.length
	)
		return false;
	for (let i = 0; i < a.data.length; i++)
		if (a.data[i] !== b.data[i]) return false;
	return true;
}

/**
 * The PSNR of `b` against `a`, in dB, both composited over the background, so
 * alpha counts as it draws and the color under alpha 0 not at all. Identical
 * drawings give Infinity.
 */
export function classicyPsnr(
	a: ClassicyRgbaImage,
	b: ClassicyRgbaImage,
	background: "white" | "black",
): number {
	assertRgba(a, "classicyPsnr");
	assertRgba(b, "classicyPsnr");
	if (a.width !== b.width || a.height !== b.height)
		throw new RangeError(
			`classicyPsnr: ${a.width}×${a.height} and ${b.width}×${b.height} differ in size`,
		);
	const ground = background === "white" ? 255 : 0;
	let squares = 0;
	for (let p = 0; p < a.data.length; p += 4) {
		const alphaA = a.data[p + 3] / 255;
		const alphaB = b.data[p + 3] / 255;
		// Over the ground, a sample c at alpha α draws ground + (c − ground)·α.
		for (let c = p; c < p + 3; c++) {
			const d = (a.data[c] - ground) * alphaA - (b.data[c] - ground) * alphaB;
			squares += d * d;
		}
	}
	if (squares === 0) return Infinity;
	const meanSquare = squares / ((a.data.length / 4) * 3);
	return 10 * Math.log10((255 * 255) / meanSquare);
}

type PngChunk = { type: string; data: Uint8Array };

/** A PNG's chunks, IHDR to IEND, each with its data. */
function pngChunks(bytes: Uint8Array): PngChunk[] {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const chunks: PngChunk[] = [];
	for (let at = 8; at + 8 <= bytes.length; ) {
		const length = view.getUint32(at);
		const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
		chunks.push({ type, data: bytes.subarray(at + 8, at + 8 + length) });
		if (type === "IEND") break;
		at += 12 + length;
	}
	return chunks;
}

type Matrix = number[][];
type Vector = number[];

const multiply = (a: Matrix, b: Matrix): Matrix =>
	a.map((row) =>
		b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)),
	);
const apply = (m: Matrix, v: Vector): Vector =>
	m.map((row) => row.reduce((sum, value, k) => sum + value * v[k], 0));
const diagonal = (v: Vector): Matrix =>
	v.map((d, i) => v.map((_, j) => (i === j ? d : 0)));

function invert(m: Matrix): Matrix {
	const [[a, b, c], [d, e, f], [g, h, i]] = m;
	const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
	return [
		[(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
		[(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
		[(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
	];
}

// The constants of skcms (Skia's color management, with which Chromium makes
// a PNG's gAMA and cHRM into a profile): its D50 white and the Bradford cone
// matrices, so the profile's colorants come out as Chromium's own.
const D50: Vector = [0.96422, 1, 0.82521];
const XYZ_TO_LMS: Matrix = [
	[0.8951, 0.2664, -0.1614],
	[-0.7502, 1.7135, 0.0367],
	[0.0389, -0.0685, 1.0296],
];
const LMS_TO_XYZ: Matrix = [
	[0.9869929, -0.1470543, 0.1599627],
	[0.4323053, 0.5183603, 0.0492912],
	[-0.0085287, 0.0400428, 0.9684867],
];

/** The Bradford adaptation from the white point (x, y) to D50. */
function adaptToD50(wx: number, wy: number): Matrix {
	const white = [wx / wy, 1, (1 - wx - wy) / wy];
	const source = apply(XYZ_TO_LMS, white);
	const target = apply(XYZ_TO_LMS, D50);
	return multiply(
		LMS_TO_XYZ,
		multiply(diagonal(target.map((t, i) => t / source[i])), XYZ_TO_LMS),
	);
}

/** RGB to XYZ (D50) for the primaries and white point (x, y each). */
function primariesToXyzD50([wx, wy, rx, ry, gx, gy, bx, by]: number[]): Matrix {
	const primaries = [
		[rx, gx, bx],
		[ry, gy, by],
		[1 - rx - ry, 1 - gx - gy, 1 - bx - by],
	];
	const scale = apply(invert(primaries), [wx / wy, 1, (1 - wx - wy) / wy]);
	return multiply(adaptToD50(wx, wy), multiply(primaries, diagonal(scale)));
}

/** cHRM's white point and primaries when a PNG has none: sRGB's, D65. */
const SRGB_CHROMATICITIES = [0.3127, 0.329, 0.64, 0.33, 0.3, 0.6, 0.15, 0.06];

/** Bytes of an ICC profile, written big-endian. */
class IccWriter {
	bytes: number[] = [];
	ascii(text: string) {
		for (const c of text) this.bytes.push(c.charCodeAt(0));
		return this;
	}
	u16(v: number) {
		this.bytes.push((v >>> 8) & 255, v & 255);
		return this;
	}
	u32(v: number) {
		this.bytes.push(
			(v >>> 24) & 255,
			(v >>> 16) & 255,
			(v >>> 8) & 255,
			v & 255,
		);
		return this;
	}
	s15Fixed16(v: number) {
		return this.u32(Math.round(v * 65536) >>> 0);
	}
	pad() {
		while (this.bytes.length % 4) this.bytes.push(0);
		return this;
	}
}

const xyzTag = (xyz: Vector) => {
	const tag = new IccWriter().ascii("XYZ ").u32(0);
	for (const v of xyz) tag.s15Fixed16(v);
	return tag.bytes;
};

/** A multiLocalizedUnicodeType holding one English string. */
const textTag = (text: string) => {
	const tag = new IccWriter().ascii("mluc").u32(0).u32(1).u32(12);
	tag
		.ascii("enUS")
		.u32(text.length * 2)
		.u32(28);
	for (const c of text) tag.u16(c.charCodeAt(0));
	return tag.pad().bytes;
};

/**
 * A v4 display profile for the primaries and white point (cHRM's eight
 * values) and the power curve `gamma` (1 / gAMA), its TRCs one shared
 * parametric curve. Its bytes depend on nothing else: the header's date is
 * fixed.
 */
function iccProfile(chromaticities: number[], gamma: number): Uint8Array {
	const toXyzD50 = primariesToXyzD50(chromaticities);
	const column = (j: number) => toXyzD50.map((row) => row[j]);
	const curve = new IccWriter()
		.ascii("para")
		.u32(0)
		.u16(0)
		.u16(0)
		.s15Fixed16(gamma).bytes;
	const chad = new IccWriter().ascii("sf32").u32(0);
	for (const v of adaptToD50(chromaticities[0], chromaticities[1]).flat())
		chad.s15Fixed16(v);
	const tags: [string, number[]][] = [
		["desc", textTag("PNG gAMA and cHRM")],
		["cprt", textTag("No copyright, use freely")],
		["wtpt", xyzTag([0.9642, 1, 0.8249])],
		["chad", chad.bytes],
		["rXYZ", xyzTag(column(0))],
		["gXYZ", xyzTag(column(1))],
		["bXYZ", xyzTag(column(2))],
		["rTRC", curve],
		["gTRC", curve],
		["bTRC", curve],
	];
	// The three TRCs share one curve's bytes.
	const data = new IccWriter();
	const table = new IccWriter().u32(tags.length);
	const start = 128 + 4 + tags.length * 12;
	const placed = new Map<number[], number>();
	for (const [signature, body] of tags) {
		let offset = placed.get(body);
		if (offset === undefined) {
			offset = start + data.bytes.length;
			placed.set(body, offset);
			data.bytes.push(...body);
			data.pad();
		}
		table.ascii(signature).u32(offset).u32(body.length);
	}
	const size = start + data.bytes.length;
	const header = new IccWriter();
	header.u32(size);
	header.u32(0); // no preferred CMM
	header.u32(0x04300000); // version 4.3
	header.ascii("mntrRGB XYZ "); // a display, RGB, the XYZ connection space
	// 2026-11-18 00:00:00, the design's date, so every run writes the same.
	for (const field of [2026, 11, 18, 0, 0, 0]) header.u16(field);
	header.ascii("acsp");
	// Platform, flags, manufacturer, model, attributes (two), perceptual.
	for (let i = 0; i < 7; i++) header.u32(0);
	for (const v of [0.9642, 1, 0.8249]) header.s15Fixed16(v); // PCS illuminant, D50
	header.u32(0); // no creator
	while (header.bytes.length < 128) header.bytes.push(0); // profile ID, reserved
	return Uint8Array.from([...header.bytes, ...table.bytes, ...data.bytes]);
}

/**
 * The ICC profile a browser draws a PNG with: its iCCP's profile, as it is;
 * else, when it has gAMA and no sRGB chunk, a profile built from gAMA and
 * cHRM (sRGB's primaries without cHRM). Undefined where both browsers draw
 * the PNG as sRGB: an sRGB chunk, or no gAMA. Without gAMA, Firefox ignores
 * cHRM and Chromium pairs it with sRGB's curve, which is sRGB itself for
 * sRGB's primaries (help-button.png's); a cHRM alone with other primaries
 * (none in scope) draws differently in the two, and no one file matches both.
 */
export function classicyIccFromPngChunks(
	bytes: Uint8Array,
): Uint8Array | undefined {
	const chunks = pngChunks(bytes);
	const find = (type: string) =>
		chunks.find((chunk) => chunk.type === type)?.data;
	const iccp = find("iCCP");
	if (iccp) {
		// A name, its terminating 0, the compression method (0, zlib), the data.
		const end = iccp.indexOf(0);
		return new Uint8Array(inflateSync(iccp.subarray(end + 2)));
	}
	if (find("sRGB")) return undefined;
	const gama = find("gAMA");
	if (!gama) return undefined;
	const fixed = (data: Uint8Array, at: number) =>
		new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(at) /
		100000;
	const chrm = find("cHRM");
	const chromaticities = chrm
		? [0, 4, 8, 12, 16, 20, 24, 28].map((at) => fixed(chrm, at))
		: SRGB_CHROMATICITIES;
	return iccProfile(chromaticities, 1 / fixed(gama, 0));
}

type WebpChunk = { type: string; data: Uint8Array };

function webpChunks(webp: Uint8Array): WebpChunk[] {
	const ascii = (from: number, to: number) =>
		String.fromCharCode(...webp.subarray(from, to));
	if (ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WEBP")
		throw new RangeError("withClassicyIccProfile: not a RIFF WebP");
	const view = new DataView(webp.buffer, webp.byteOffset, webp.byteLength);
	const chunks: WebpChunk[] = [];
	for (let at = 12; at + 8 <= webp.length; ) {
		const size = view.getUint32(at + 4, true);
		chunks.push({
			type: ascii(at, at + 4),
			data: webp.subarray(at + 8, at + 8 + size),
		});
		at += 8 + size + (size & 1);
	}
	return chunks;
}

/** A simple WebP's canvas and whether it has alpha: VP8L's header or VP8's frame. */
function webpCanvas({ type, data }: WebpChunk) {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	if (type === "VP8L") {
		const bits = view.getUint32(1, true);
		return {
			width: (bits & 0x3fff) + 1,
			height: ((bits >>> 14) & 0x3fff) + 1,
			alpha: ((bits >>> 28) & 1) === 1,
		};
	}
	if (type === "VP8 ")
		return {
			width: view.getUint16(6, true) & 0x3fff,
			height: view.getUint16(8, true) & 0x3fff,
			alpha: false,
		};
	throw new RangeError(
		`withClassicyIccProfile: a ${type} chunk where the image was expected`,
	);
}

/**
 * The WebP with `icc` embedded: an ICCP chunk after a VP8X header, whose ICC
 * flag is set (the VP8X written from the image's own header when the file
 * was simple). The image's own chunks are kept byte for byte.
 */
export function withClassicyIccProfile(
	webp: Uint8Array,
	icc: Uint8Array,
): Uint8Array {
	const chunks = webpChunks(webp);
	if (chunks.some(({ type }) => type === "ICCP"))
		throw new RangeError(
			"withClassicyIccProfile: the WebP already holds a profile",
		);
	let header: Uint8Array;
	let rest: WebpChunk[];
	if (chunks[0]?.type === "VP8X") {
		header = chunks[0].data.slice();
		rest = chunks.slice(1);
	} else {
		const { width, height, alpha } = webpCanvas(chunks[0]);
		header = new Uint8Array(10);
		header[0] = alpha ? 0x10 : 0;
		for (const [at, value] of [
			[4, width - 1],
			[7, height - 1],
		])
			header.set([value & 255, (value >>> 8) & 255, (value >>> 16) & 255], at);
		rest = chunks;
	}
	header[0] |= 0x20;
	const all = [
		{ type: "VP8X", data: header },
		{ type: "ICCP", data: icc },
		...rest,
	];
	const length = all.reduce(
		(sum, { data }) => sum + 8 + data.length + (data.length & 1),
		4,
	);
	const out = new Uint8Array(8 + length);
	const view = new DataView(out.buffer);
	const writeAscii = (text: string, at: number) => {
		for (let i = 0; i < 4; i++) out[at + i] = text.charCodeAt(i);
	};
	writeAscii("RIFF", 0);
	view.setUint32(4, length, true);
	writeAscii("WEBP", 8);
	let at = 12;
	for (const { type, data } of all) {
		writeAscii(type, at);
		view.setUint32(at + 4, data.length, true);
		out.set(data, at + 8);
		at += 8 + data.length + (data.length & 1);
	}
	return out;
}

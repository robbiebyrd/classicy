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
// ignored, and 16-bit samples round to the nearest 8-bit value.
//
// Build tool, not library code: nothing under src/ imports it. Its callers are
// the one-time conversion (§6.2) and System 7's asset exporter (§6.5).
// Erasable TypeScript only, so Node runs it directly.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
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

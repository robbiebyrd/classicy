// @vitest-environment node
// (It imports the converter, a build tool, which needs Node's file URLs.)
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	classicyPixelsEqual,
	decodeClassicyWebp,
	encodeClassicyWebp,
} from "../../../../../bin/classicyWebp";
import {
	CLASSICY_WEBP_KEEP_ORIGINAL,
	CLASSICY_WEBP_SCOPE,
	classicyWebpTarget,
} from "../../../../../bin/convert-images-to-webp";
import { SYSTEM7_WALLPAPERS, system7WallpaperFile } from "./system7Assets";

// Plan 0019-fb7 §6.5: System 7's art, icons and wallpapers are the WebP
// files the converter (bin/convert-images-to-webp.ts) wrote. Ruling R5: the
// package's runtime code cannot import bin/, so system7Assets.ts names each
// wallpaper's WebP file itself; these pin it to the converter's.

const assets = import.meta.dirname;
const platinumArt = path.resolve(
	assets,
	"../../../platinum/src/assets/art/sad-mac.webp",
);

describe("System 7's wallpaper files", () => {
	it("are in the converter's scope, with the art and icons, none kept in its own format", () => {
		for (const glob of [
			"packages/appearance/system7/src/assets/art/**/*.png",
			"packages/appearance/system7/src/assets/icons/**/*.png",
			"packages/appearance/system7/src/assets/wallpapers/*.png",
		])
			expect(CLASSICY_WEBP_SCOPE).toContain(glob);
		expect(
			CLASSICY_WEBP_KEEP_ORIGINAL.filter((file) =>
				file.startsWith("packages/appearance/system7/"),
			),
		).toEqual([]);
	});

	it("are named as the converter names each one's WebP", () => {
		for (const { file } of SYSTEM7_WALLPAPERS)
			expect(system7WallpaperFile(file), file).toBe(
				path.basename(
					classicyWebpTarget(
						`packages/appearance/system7/src/assets/wallpapers/${file}`,
					),
				),
			);
	});
});

/** A WebP's RIFF chunks (after the `WEBP` form type), each with its data. */
const chunks = (bytes: Buffer) => {
	const out: { type: string; data: Buffer }[] = [];
	for (let at = 12; at + 8 <= bytes.length; ) {
		const length = bytes.readUInt32LE(at + 4);
		out.push({
			type: bytes.toString("latin1", at, at + 4),
			data: bytes.subarray(at + 8, at + 8 + length),
		});
		at += 8 + length + (length & 1);
	}
	return out;
};

// The Sad Mac is ROM art, the same on every Mac: Platinum's image (ruling
// R19). Platinum's file carries the ICC profile its PNG's gAMA and cHRM stood
// for (VP8X + ICCP, plan 0019-fb7 §6.2); System 7's files carry none (the
// export never wrote a color chunk), so bin/export-assets.mjs decodes
// Platinum's and writes it again with the export's own lossless encoding.
describe("System 7's Sad Mac", () => {
	const system7 = readFileSync(path.join(assets, "art", "sad-mac.webp"));
	const platinum = readFileSync(platinumArt);

	it("is Platinum's image: the same pixels", async () => {
		expect(
			classicyPixelsEqual(
				await decodeClassicyWebp(new Uint8Array(system7)),
				await decodeClassicyWebp(new Uint8Array(platinum)),
			),
		).toBe(true);
	});

	it("carries no color profile: one VP8L chunk, no VP8X or ICCP", () => {
		expect(chunks(system7).map(({ type }) => type)).toEqual(["VP8L"]);
		expect(chunks(platinum).map(({ type }) => type)).toEqual([
			"VP8X",
			"ICCP",
			"VP8L",
		]);
	});

	it("holds Platinum's VP8L chunk byte for byte", () => {
		const vp8l = (bytes: Buffer) =>
			chunks(bytes).find(({ type }) => type === "VP8L")?.data;
		expect(vp8l(system7)?.equals(vp8l(platinum) ?? Buffer.alloc(0))).toBe(true);
	});

	it("is what the export writes: Platinum's pixels re-encoded, lossless", async () => {
		const encoded = await encodeClassicyWebp(
			await decodeClassicyWebp(new Uint8Array(platinum)),
			{ lossless: true },
		);
		expect(Buffer.from(encoded).equals(system7)).toBe(true);
	});
});

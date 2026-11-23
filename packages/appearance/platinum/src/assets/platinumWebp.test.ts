// @vitest-environment node
// (It imports the converter, a build tool, which needs Node's file URLs.)
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	CLASSICY_WEBP_KEEP_ORIGINAL,
	CLASSICY_WEBP_SCOPE,
	classicyWebpTarget,
} from "../../../../../bin/convert-images-to-webp";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperFile,
	platinumWallpaperUrl,
} from "./platinumWallpapers";

// Plan 0019-fb7 §6.4: Platinum's art and wallpapers are the WebP files the
// converter (bin/convert-images-to-webp.ts) wrote. Ruling R5: the package's
// runtime code cannot import bin/, so platinumWallpapers.ts names each
// wallpaper's WebP file itself, and verify-dist.mjs lists the originals kept
// in their own format itself; these pin both to the converter's.
describe("Platinum's wallpaper files", () => {
	it("are in the converter's scope", () => {
		expect(CLASSICY_WEBP_SCOPE).toContain(
			"packages/appearance/platinum/src/assets/wallpapers/*.{png,jpg}",
		);
	});

	it("are named as the converter names each one's WebP", () => {
		for (const { file } of PLATINUM_WALLPAPERS)
			expect(platinumWallpaperFile(file), file).toBe(
				path.basename(
					classicyWebpTarget(
						`packages/appearance/platinum/src/assets/wallpapers/${file}`,
					),
				),
			);
	});

	it("resolve to the file of that name", () => {
		for (const { file } of PLATINUM_WALLPAPERS)
			expect(
				path.basename(platinumWallpaperUrl(file).split("?")[0]),
				file,
			).toBe(platinumWallpaperFile(file));
	});
});

describe("Platinum's originals kept in their own format", () => {
	it("are the converter's, and verify-dist.mjs lists exactly them", () => {
		const prefix = "packages/appearance/platinum/src/assets/";
		const kept = CLASSICY_WEBP_KEEP_ORIGINAL.filter((file) =>
			file.startsWith(prefix),
		).map((file) => file.slice(prefix.length));
		expect(kept).toEqual(["art/alias.png"]);
		const script = readFileSync(
			path.resolve(import.meta.dirname, "../../bin/verify-dist.mjs"),
			"utf8",
		);
		const block =
			/const PLATINUM_ORIGINAL_FORMAT_EXCEPTIONS = \[([^\]]*)\];/.exec(
				script,
			)?.[1] ?? "";
		expect([...block.matchAll(/"([^"]*)"/g)].map((m) => m[1])).toEqual(kept);
	});
});

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "@/Appearance/Platinum";
import { AZUL_DARK_2_1_8 } from "@/Appearance/__tests__/platinumLegacyWallpaperFixture";
import {
	classicyWallpaperDigest,
	classicyWallpaperFilename,
	resolveClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import { PLATINUM_LEGACY_WALLPAPER_DIGESTS } from "@/Appearance/Platinum/assets/platinumLegacyWallpapers";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperUrl,
} from "@/Appearance/Platinum/assets/platinumWallpapers";

const WALLPAPERS = "assets/img/wallpapers";

/** The data: URI a 2.x library build inlines for a wallpaper file. */
const inlined = (file: string) =>
	`data:${file.endsWith(".jpg") ? "image/jpeg" : "image/png"};base64,${readFileSync(`${WALLPAPERS}/${file}`).toString("base64")}`;

describe("Platinum's legacy wallpaper digests", () => {
	it("pins the 2.1.8 fixture", () => {
		expect(AZUL_DARK_2_1_8).toBe(inlined("azul_dark.png"));
		expect(PLATINUM_LEGACY_WALLPAPER_DIGESTS["azul_dark.png"]).toEqual([
			classicyWallpaperDigest(AZUL_DARK_2_1_8),
		]);
	});

	// 2.x builds inlined each wallpaper byte for byte (checked against every
	// one the 2.1.8 tarball ships), so the table regenerates from the files.
	it("holds exactly the digest of every wallpaper file as a 2.x build inlined it", () => {
		const files = readdirSync(WALLPAPERS)
			.filter((f) => /\.(png|jpg)$/.test(f))
			.sort();
		expect(
			Object.fromEntries(
				files.map((file) => [file, [classicyWallpaperDigest(inlined(file))]]),
			),
		).toEqual(PLATINUM_LEGACY_WALLPAPER_DIGESTS);
		expect(Object.keys(PLATINUM_LEGACY_WALLPAPER_DIGESTS).sort()).toEqual(
			PLATINUM_WALLPAPERS.map((w) => w.file).sort(),
		);
	});

	it("maps 2.1.8's inlined Azul Dark to its filename while Azul's source is a plain URL", () => {
		// Under vitest the source is a path, as it is a file URL after 3.3.
		expect(platinumWallpaperUrl("azul_dark.png")).not.toMatch(/^data:/);
		expect(classicyWallpaperFilename(AZUL_DARK_2_1_8)).toBe("azul_dark.png");
		expect(resolveClassicyWallpaper("azul_dark.png")).toBe(
			platinumWallpaperUrl("azul_dark.png"),
		);
	});
});

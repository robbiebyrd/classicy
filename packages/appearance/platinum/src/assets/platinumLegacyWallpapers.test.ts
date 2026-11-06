import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import "../index";
import { AZUL_DARK_2_1_8 } from "@/Appearance/__tests__/platinumLegacyWallpaperFixture";
import {
	classicyWallpaperDigest,
	classicyWallpaperFilename,
	resolveClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import { PLATINUM_LEGACY_WALLPAPER_DIGESTS } from "./platinumLegacyWallpapers";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperUrl,
} from "./platinumWallpapers";

// The package's own wallpaper files (moved out of the core's
// assets/img/wallpapers, plan 0015-kxa §3.3, byte for byte).
const WALLPAPERS = path.resolve(import.meta.dirname, "../../assets/wallpapers");

/** The data: URI a 2.x library build inlines for a wallpaper file. */
const inlined = (file: string) =>
	`data:${file.endsWith(".jpg") ? "image/jpeg" : "image/png"};base64,${readFileSync(`${WALLPAPERS}/${file}`).toString("base64")}`;

/**
 * The digest of every wallpaper the published 2.1.8 tarball inlines (tarball
 * sha256 fb7ded2e70b267f145c40468bc53294749e730bf05fbaa0fc10458f7a6a9a94b;
 * dist/classicy.es.js and dist/classicy.umd.js carry the same 46 data: URIs),
 * computed from those URIs, not from today's files. Frozen: a 2.1.x save holds
 * exactly these, whatever later happens to the files.
 */
const DIGESTS_2_1_8: Readonly<Record<string, string>> = Object.freeze({
	"azul_dark.png": "932:7a4c986fa1d898f4",
	"azul_extra_light.png": "932:e72b8cbad7bdc937",
	"azul_light.png": "932:33469f447fbfc8c4",
	"bondi.png": "932:3cde50d77f94985b",
	"bondi_dark.png": "932:c7f28cc74b807d3c",
	"bondi_extra_dark.png": "932:dba19e2c4bc8e3b7",
	"bondi_light.png": "932:a7766ce877365352",
	"bondi_medium.png": "932:227422eb523988f9",
	"bossanova_bondi.png": "25448:941b35a4bcd14785",
	"bossanova_poppy.png": "28688:f210fc25bea58f05",
	"bossanova_poppy_2.png": "24340:a5aa782bc9fa7264",
	"bubbles_bondi.png": "18344:65d30c59d57ee413",
	"bubbles_poppy.png": "9328:ed4e26527cbe7c8a",
	"candy_bar.png": "22000:09dbc754570f404a",
	"candy_bar_azul.png": "21184:c4236035e26d63b4",
	"candy_bar_pistachio.png": "24980:763415abf37fa44a",
	"candy_bar_sunny.png": "18820:a631ba0d5e21736c",
	"default.png": "5780:1305a4f9719dd409",
	"diagonals_bondi.png": "24676:8dd93f2c1ad2323a",
	"diagonals_bondi_dark.png": "26432:4c1c145fb0da728d",
	"diagonals_poppy.png": "17024:7459a1a7afa3a50b",
	"flat_peanuts.png": "22048:d8ca61b5787237a9",
	"flat_peanuts_poppy.png": "16752:c097c0c185a8d33a",
	"french_blue_dark.png": "932:a7adbd3726231c33",
	"french_blue_light.png": "932:ba756c4e7d2f7389",
	"macos.png": "36308:847cc516f062d5e5",
	"peanuts_azul.png": "19864:a9a337728c7cfdaf",
	"peanuts_pistachio.png": "25100:10c5e3f43e45f91b",
	"pistachio_dark.png": "932:83112f7a18005b63",
	"pistachio_light.png": "932:e8a9f65fed29b9e0",
	"pistachio_medium.png": "932:e16662f5584c2121",
	"poppy.png": "932:65eeca145e6238c4",
	"poppy_dark.png": "932:59f8d9f669a25257",
	"poppy_light.png": "932:d22e289933642d08",
	"poppy_medium.png": "932:c7c13f8029764a4e",
	"rio_azul.png": "19572:c961710800916649",
	"rio_pistachio.png": "17716:d4f5fd9c8ddd2706",
	"ripple_azul.png": "25056:2769ae6c1c33cbd3",
	"ripple_bondi.png": "33072:9d769f1d1dcd8e5d",
	"ripple_poppy.png": "26584:228098302a3906c4",
	"sunny.png": "932:c43e9049b56ccc1b",
	"sunny_dark.png": "932:1a6ec62448a3a982",
	"sunny_light.png": "932:e637453907e47e7a",
	"waves_azul.png": "21420:94530b675786cafc",
	"waves_bondi.png": "26628:3cc813434b632c40",
	"waves_sunny.png": "23348:5accdddbdab362ce",
});

describe("Platinum's legacy wallpaper digests", () => {
	it("pins the 2.1.8 fixture", () => {
		expect(AZUL_DARK_2_1_8).toBe(inlined("azul_dark.png"));
		expect(classicyWallpaperDigest(AZUL_DARK_2_1_8)).toBe(
			DIGESTS_2_1_8["azul_dark.png"],
		);
	});

	it("registers every 2.1.8 digest under its file", () => {
		expect(Object.keys(DIGESTS_2_1_8)).toHaveLength(46);
		for (const [file, digest] of Object.entries(DIGESTS_2_1_8)) {
			expect(PLATINUM_LEGACY_WALLPAPER_DIGESTS[file], file).toContain(digest);
		}
	});

	// 2.x builds inlined each wallpaper byte for byte, so each file's own
	// digest is what a later 2.x build (default.jpg included) wrote.
	it("holds each current wallpaper file's digest as a 2.x build inlined it", () => {
		const files = readdirSync(WALLPAPERS)
			.filter((f) => /\.(png|jpg)$/.test(f))
			.sort();
		for (const file of files) {
			expect(PLATINUM_LEGACY_WALLPAPER_DIGESTS[file], file).toContain(
				classicyWallpaperDigest(inlined(file)),
			);
		}
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

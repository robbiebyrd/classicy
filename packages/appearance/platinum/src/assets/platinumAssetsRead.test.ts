import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLATINUM_FONT_FACES } from "./platinumFonts.internal";
import { PLATINUM_WALLPAPERS } from "./platinumWallpapers";

/**
 * The package ships no unread asset (story 0159-tf5, after 0150 did the same
 * for the core). Each tracked non-code file under src/assets is read by a
 * file or registry listed here, or is a build step's source, and says which.
 */

const PACKAGE = path.resolve(import.meta.dirname, "../..");
const REPO = path.resolve(PACKAGE, "../../..");
const ASSETS = "src/assets/";

const tracked = (): string[] =>
	execFileSync("git", ["ls-files", "-z", "--", `${PACKAGE}/${ASSETS}`], {
		cwd: PACKAGE,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean)
		.map((file) => path.relative(PACKAGE, path.resolve(PACKAGE, file)));

const code = (file: string): boolean => /\.(ts|tsx)$/.test(file);
const source = (relative: string): string =>
	readFileSync(path.join(PACKAGE, relative), "utf8");

/** The module that names a file, by folder: the reader must still say its name. */
const READERS: ReadonlyArray<{
	folder: string;
	readers: string[];
	reason: string;
}> = [
	{
		folder: "art/",
		readers: [
			"src/assets/art/platinumArt.ts",
			"src/assets/platinumAssets.ts",
			"src/index.ts",
		],
		reason:
			"a system-art key, the cursor-arrow, the Sad Mac or the package icon",
	},
	{
		folder: "cursors/",
		readers: ["src/assets/platinumAssets.ts"],
		reason: "a cursor role",
	},
	{
		folder: "pixelart/",
		readers: ["src/assets/pixelart/platinumPixelArt.ts"],
		reason: "imported ?raw into PLATINUM_PIXEL_ART",
	},
];

/** Sound sprite sources: bin/make_audio_sprites.sh builds the pack from them. */
const SPRITE_SOURCE = /^src\/assets\/sounds\/platinum\/sprites\/(.+)\.mp3$/;
const SOUND_PACK =
	/^src\/assets\/sounds\/platinum\/platinum\.(ogg|m4a|mp3|ac3|json)$/;

/** Why a file is read, or "" when nothing reads it. */
const readBy = (file: string): string => {
	const inAssets = file.slice(ASSETS.length);
	const base = path.basename(file);

	const folder = READERS.find((entry) => inAssets.startsWith(entry.folder));
	if (folder)
		return folder.readers.some((reader) => source(reader).includes(base))
			? folder.reason
			: "";

	if (inAssets.startsWith("fonts/"))
		return PLATINUM_FONT_FACES.some(
			({ file: face }) => `${face}.woff2` === base,
		)
			? "a bundled font face"
			: "";

	if (/^wallpapers\/[^/]+$/.test(inAssets))
		return PLATINUM_WALLPAPERS.some(({ file: wall }) => wall === base)
			? "a registered wallpaper"
			: "";

	if (SOUND_PACK.test(file))
		return source("src/assets/sounds/platinum.ts").includes(base) ||
			base === "platinum.json"
			? "the sound pack"
			: "";

	// build:audio's skip stamp (0155): the script compares it with a hash of
	// the pack's sources before encoding.
	if (base.endsWith(".sprites.sha256") && inAssets.startsWith("sounds/"))
		return readFileSync(
			path.join(REPO, "bin/make_audio_sprites.sh"),
			"utf8",
		).includes(".sprites.sha256")
			? "build:audio's skip stamp (bin/make_audio_sprites.sh)"
			: "";

	const sprite = file.match(SPRITE_SOURCE);
	if (sprite) {
		const pack = JSON.parse(
			source("src/assets/sounds/platinum/platinum.json"),
		) as { sprite: Record<string, unknown> };
		return sprite[1] in pack.sprite &&
			readFileSync(
				path.join(REPO, "bin/make_audio_sprites.sh"),
				"utf8",
			).includes("sprites")
			? "a sprite source for bin/make_audio_sprites.sh"
			: "";
	}
	return "";
};

describe("Platinum ships no unread asset", () => {
	it.each(
		tracked().filter((file) => !code(file)),
	)("%s is read, or listed with a reason", (file) => {
		expect(readBy(file), `${file} is read by nothing`).not.toBe("");
	});

	it("tracks no wallpaper photos: nothing reads them", () => {
		expect(tracked().filter((file) => file.includes("/photos/"))).toEqual([]);
	});

	it("covers the whole folder: 13 fonts, 47 wallpapers, 41 sprite sources", () => {
		const files = tracked();
		const count = (re: RegExp) => files.filter((file) => re.test(file)).length;
		expect(count(/fonts\/.+\.woff2$/)).toBe(13);
		expect(count(/wallpapers\/[^/]+$/)).toBe(47);
		expect(count(SPRITE_SOURCE)).toBe(41);
	});
});

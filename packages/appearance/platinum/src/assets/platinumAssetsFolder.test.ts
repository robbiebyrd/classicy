import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assetSourceFile } from "@/__tests__/assetSourceFile";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import "./platinumAssets";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperFile,
	platinumWallpaperUrl,
} from "./platinumWallpapers";
import { platinumSoundPack } from "./sounds/platinum";

/**
 * One assets folder (story 0154-3uz): the package keeps every asset, code
 * included, under `src/assets/`. The package-root `assets/` folder that plan
 * 0015 §3.3 created is gone.
 */

const PACKAGE = path.resolve(import.meta.dirname, "../..");
const SRC_ASSETS = path.join(PACKAGE, "src/assets");

const tracked = (dir: string): string[] =>
	execFileSync("git", ["ls-files", "-z", "--", dir], {
		cwd: PACKAGE,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean);

describe("the Platinum package's assets folder", () => {
	it("has no package-root assets/ folder", () => {
		expect(existsSync(path.join(PACKAGE, "assets"))).toBe(false);
		expect(tracked("assets")).toEqual([]);
	});

	it("holds the moved art, cursors, wallpapers and sound pack under src/assets", () => {
		for (const dir of [
			"src/assets/art",
			"src/assets/cursors",
			"src/assets/wallpapers",
			"src/assets/sounds/platinum",
		]) {
			expect(tracked(dir).length, dir).toBeGreaterThan(0);
		}
		expect(tracked("src/assets/sounds/platinum/sprites")).toHaveLength(41);
	});

	it("registers every system-art key and cursor role from a file under src/assets", () => {
		const keys = [
			"appleMenu",
			"trashEmpty",
			"trashFull",
			"aliasBadge",
			"helpButton",
		] as const;
		for (const key of keys) {
			const file = assetSourceFile(
				resolveClassicyAsset("systemArt", key) ?? "",
				PACKAGE,
			);
			expect(file, key).toMatch(
				new RegExp(
					`^${SRC_ASSETS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/art/`,
				),
			);
		}
		for (const role of [
			"watch",
			"resizeLr",
			"resizeUd",
			"resizeU",
			"resizeD",
			"resizeL",
			"resizeR",
		] as const) {
			const file = assetSourceFile(
				resolveClassicyAsset("cursors", role) ?? "",
				PACKAGE,
			);
			expect(file, role).toContain(`${SRC_ASSETS}/cursors/`);
		}
	});

	it("reads every wallpaper from src/assets/wallpapers, as its WebP", () => {
		for (const { file } of PLATINUM_WALLPAPERS) {
			expect(assetSourceFile(platinumWallpaperUrl(file), PACKAGE), file).toBe(
				path.join(SRC_ASSETS, "wallpapers", platinumWallpaperFile(file)),
			);
		}
	});

	// Plan 0019-fb7 §6.4: the art and wallpapers ship as WebP, and their
	// originals left the tree, except art/alias.png, which Chromium draws
	// differently from its WebP (CLASSICY_WEBP_KEEP_ORIGINAL). Cursors stay
	// PNG, the format every browser takes for a CSS cursor.
	it("tracks its art and wallpapers as WebP (and SVG), alias.png excepted", () => {
		const images = [
			...tracked("src/assets/art"),
			...tracked("src/assets/wallpapers"),
		].filter((file) => /\.(?:png|jpe?g|webp|svg)$/.test(file));
		expect(images.filter((file) => /\.(?:png|jpe?g)$/.test(file))).toEqual([
			"src/assets/art/alias.png",
		]);
		expect(
			tracked("src/assets/wallpapers").filter((file) => file.endsWith(".webp")),
		).toHaveLength(PLATINUM_WALLPAPERS.length);
		expect(
			tracked("src/assets/art").filter((file) => file.endsWith(".webp")),
		).toHaveLength(7);
		expect(
			tracked("src/assets/cursors").every((file) => file.endsWith(".png")),
		).toBe(true);
	});

	it("loads the sound sprites from src/assets/sounds/platinum", () => {
		for (const src of platinumSoundPack.src) {
			expect(assetSourceFile(src, PACKAGE)).toContain(
				`${SRC_ASSETS}/sounds/platinum/`,
			);
		}
	});
});

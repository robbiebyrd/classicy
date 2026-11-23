// @vitest-environment node
// (A build tool: Node's own modules, no DOM.)
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	CLASSICY_WEBP_FIREFOX_PREFS,
	classicyWebpLaunchOptions,
} from "./check-webp-in-browsers.ts";
import {
	CLASSICY_WEBP_KEEP_ORIGINAL,
	CLASSICY_WEBP_PHOTO_FLOOR_DB,
	CLASSICY_WEBP_PHOTO_QUALITY,
	CLASSICY_WEBP_PHOTOS,
	CLASSICY_WEBP_SCOPE,
	chooseClassicyWebpEncoding,
	classicyWebpScopeFiles,
	classicyWebpTarget,
	isClassicyTrackedFile,
	removeClassicyStaleWebp,
} from "./convert-images-to-webp.ts";

// The one-time PNG and JPG to WebP conversion (plan 0019-fb7 §6.2): which
// files it converts, where each WebP goes and when a photo may go lossy.

const PLATINUM = "packages/appearance/platinum/src/assets";
const SYSTEM7 = "packages/appearance/system7/src/assets";

describe("classicyWebpTarget", () => {
	it("classicyWebpTarget maps default.jpg to default_photo.webp and the rest to <stem>.webp", () => {
		// default.png takes default.webp, so the photo needs a name of its own.
		expect(classicyWebpTarget(`${PLATINUM}/wallpapers/default.jpg`)).toBe(
			`${PLATINUM}/wallpapers/default_photo.webp`,
		);
		expect(classicyWebpTarget(`${PLATINUM}/wallpapers/default.png`)).toBe(
			`${PLATINUM}/wallpapers/default.webp`,
		);
		expect(classicyWebpTarget(`${PLATINUM}/wallpapers/azul_dark.png`)).toBe(
			`${PLATINUM}/wallpapers/azul_dark.webp`,
		);
		expect(classicyWebpTarget(`${SYSTEM7}/icons/color/16/finder.png`)).toBe(
			`${SYSTEM7}/icons/color/16/finder.webp`,
		);
		expect(classicyWebpTarget("assets/img/ui/earth.png")).toBe(
			"assets/img/ui/earth.webp",
		);
		// Only the extension changes: a dotted stem keeps its dots.
		expect(classicyWebpTarget(`${SYSTEM7}/art/a.b.png`)).toBe(
			`${SYSTEM7}/art/a.b.webp`,
		);
		expect(() => classicyWebpTarget(`${PLATINUM}/art/halftone.svg`)).toThrow(
			/not a PNG or JPG/,
		);
	});
});

describe("chooseClassicyWebpEncoding", () => {
	it("chooseClassicyWebpEncoding picks lossy only above the floor on both backgrounds and only when smaller", () => {
		expect(CLASSICY_WEBP_PHOTO_FLOOR_DB).toBe(45);
		expect(CLASSICY_WEBP_PHOTO_QUALITY).toBe(90);
		const smaller = { losslessBytes: 26_506, lossyBytes: 4_400 };
		expect(
			chooseClassicyWebpEncoding({ ...smaller, psnrWhite: 52, psnrBlack: 52 }),
		).toBe("lossy");
		expect(
			chooseClassicyWebpEncoding({ ...smaller, psnrWhite: 52, psnrBlack: 44 }),
		).toBe("lossless");
		expect(
			chooseClassicyWebpEncoding({ ...smaller, psnrWhite: 44, psnrBlack: 52 }),
		).toBe("lossless");
		expect(
			chooseClassicyWebpEncoding({
				losslessBytes: 4_400,
				lossyBytes: 26_506,
				psnrWhite: 52,
				psnrBlack: 52,
			}),
		).toBe("lossless");
		// "At least 45 dB" and "smaller": the floor itself passes, a tie in
		// size does not.
		expect(
			chooseClassicyWebpEncoding({ ...smaller, psnrWhite: 45, psnrBlack: 45 }),
		).toBe("lossy");
		expect(
			chooseClassicyWebpEncoding({
				losslessBytes: 4_400,
				lossyBytes: 4_400,
				psnrWhite: 52,
				psnrBlack: 52,
			}),
		).toBe("lossless");
		// Identical drawings score Infinity.
		expect(
			chooseClassicyWebpEncoding({
				...smaller,
				psnrWhite: Infinity,
				psnrBlack: Infinity,
			}),
		).toBe("lossy");
		expect(
			chooseClassicyWebpEncoding({
				...smaller,
				psnrWhite: Number.NaN,
				psnrBlack: 52,
			}),
		).toBe("lossless");
	});
});

describe("classicyWebpScopeFiles", () => {
	const tracked = [
		`${PLATINUM}/art/sad-mac.png`,
		`${PLATINUM}/art/halftone.svg`,
		`${PLATINUM}/art/platinumArt.ts`,
		`${PLATINUM}/art/nested/deep.png`,
		`${PLATINUM}/cursors/arrow.png`,
		`${PLATINUM}/wallpapers/default.jpg`,
		`${PLATINUM}/wallpapers/default.png`,
		`${PLATINUM}/wallpapers/notes.txt`,
		`${SYSTEM7}/art/sad-mac.png`,
		`${SYSTEM7}/art/bw/window-stripes.png`,
		`${SYSTEM7}/art/dither-checker.svg`,
		`${SYSTEM7}/icons/color/16/finder.png`,
		`${SYSTEM7}/icons/selected/32/trash.png`,
		`${SYSTEM7}/cursors/watch.png`,
		`${SYSTEM7}/wallpapers/desktop-gray.png`,
		"assets/img/ui/earth.png",
		"assets/img/ui/other.png",
	];

	it("selects the scope's PNGs and JPGs, in order, and nothing else", () => {
		expect(CLASSICY_WEBP_SCOPE).toEqual([
			`${PLATINUM}/art/*.png`,
			`${PLATINUM}/wallpapers/*.{png,jpg}`,
			`${SYSTEM7}/art/**/*.png`,
			`${SYSTEM7}/icons/**/*.png`,
			`${SYSTEM7}/wallpapers/*.png`,
			"assets/img/ui/earth.png",
		]);
		expect(CLASSICY_WEBP_PHOTOS).toEqual([
			`${PLATINUM}/wallpapers/default.jpg`,
			"assets/img/ui/earth.png",
		]);
		// Chromium draws alias.png's translucent pixels a level darker from a
		// WebP than from the PNG (it rounds the premultiplied color down), and
		// no profile changes that: it stays a PNG.
		expect(CLASSICY_WEBP_KEEP_ORIGINAL).toEqual([`${PLATINUM}/art/alias.png`]);

		const scope = classicyWebpScopeFiles(tracked);
		expect(scope.files).toEqual([
			`${PLATINUM}/art/sad-mac.png`,
			`${PLATINUM}/wallpapers/default.jpg`,
			`${PLATINUM}/wallpapers/default.png`,
			`${SYSTEM7}/art/bw/window-stripes.png`,
			`${SYSTEM7}/art/sad-mac.png`,
			`${SYSTEM7}/icons/color/16/finder.png`,
			`${SYSTEM7}/icons/selected/32/trash.png`,
			`${SYSTEM7}/wallpapers/desktop-gray.png`,
			"assets/img/ui/earth.png",
		]);
		expect(scope.perGlob.map(({ count }) => count)).toEqual([1, 2, 2, 2, 1, 1]);
		expect(scope.problems).toEqual([]);
	});

	it("keeps only the files under the prefixes and reports a glob or prefix that selects nothing", () => {
		const system7 = classicyWebpScopeFiles(tracked, [`./${SYSTEM7}/icons/`]);
		expect(system7.files).toEqual([
			`${SYSTEM7}/icons/color/16/finder.png`,
			`${SYSTEM7}/icons/selected/32/trash.png`,
		]);
		expect(system7.problems).toEqual([]);

		// A prefix is a folder or a file, never part of a name.
		const partial = classicyWebpScopeFiles(tracked, [`${SYSTEM7}/ic`]);
		expect(partial.files).toEqual([]);
		expect(partial.problems).toEqual([
			`no in-scope file lies under ${SYSTEM7}/ic`,
		]);
		const one = classicyWebpScopeFiles(tracked, ["assets/img/ui/earth.png"]);
		expect(one.files).toEqual(["assets/img/ui/earth.png"]);

		// With no prefix every glob must match; under a prefix only the globs
		// inside it must.
		const noIcons = tracked.filter((file) => !file.includes("/icons/"));
		expect(classicyWebpScopeFiles(noIcons).problems).toEqual([
			`${SYSTEM7}/icons/**/*.png matches no tracked file`,
		]);
		expect(classicyWebpScopeFiles(noIcons, [PLATINUM]).problems).toEqual([]);
		expect(classicyWebpScopeFiles(noIcons, [SYSTEM7]).problems).toEqual([
			`${SYSTEM7}/icons/**/*.png matches no tracked file`,
		]);
	});
});

describe("removeClassicyStaleWebp", () => {
	const dirs: string[] = [];
	afterEach(() => {
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
	});
	const scratch = () => {
		const dir = mkdtempSync(join(tmpdir(), "classicy-stale-webp-"));
		dirs.push(dir);
		return dir;
	};

	it("deletes only an untracked WebP left for a kept original, never a tracked file", () => {
		// The converter runs in place (6.4 to 6.6): a target that git tracks is
		// only ever removed with `git rm`, so the converter refuses it.
		const repo = scratch();
		const git = (...args: string[]) =>
			spawnSync("git", args, { cwd: repo, encoding: "utf8" });
		expect(git("init", "-q").status).toBe(0);
		const tracked = join(repo, "alias.webp");
		const untracked = join(repo, "stale.webp");
		const notWebp = join(repo, "alias.png");
		for (const file of [tracked, untracked, notWebp]) writeFileSync(file, "x");
		expect(git("add", "--", "alias.webp").status).toBe(0);

		expect(isClassicyTrackedFile(repo, tracked)).toBe(true);
		expect(isClassicyTrackedFile(repo, untracked)).toBe(false);
		expect(removeClassicyStaleWebp(repo, tracked)).toBe("refused");
		expect(existsSync(tracked)).toBe(true);
		expect(removeClassicyStaleWebp(repo, notWebp)).toBe("refused");
		expect(existsSync(notWebp)).toBe(true);
		expect(removeClassicyStaleWebp(repo, untracked)).toBe("deleted");
		expect(existsSync(untracked)).toBe(false);
		expect(removeClassicyStaleWebp(repo, untracked)).toBe("absent");

		// A mirror outside the repository (--out-dir) holds nothing git tracks.
		const mirror = join(scratch(), "alias.webp");
		writeFileSync(mirror, "x");
		expect(isClassicyTrackedFile(repo, mirror)).toBe(false);
		expect(removeClassicyStaleWebp(repo, mirror)).toBe("deleted");
		expect(existsSync(mirror)).toBe(false);
	});
});

describe("classicyWebpLaunchOptions", () => {
	it("launches Firefox with release color management, which Playwright's builds turn off", () => {
		// Playwright's Firefox (playwright.cfg) sets mode 0 and intent 3: an
		// untagged WebP and a color-managed PNG would then draw alike.
		expect(CLASSICY_WEBP_FIREFOX_PREFS).toEqual({
			"gfx.color_management.mode": 2,
			"gfx.color_management.rendering_intent": 0,
		});
		expect(classicyWebpLaunchOptions("firefox")).toEqual({
			firefoxUserPrefs: CLASSICY_WEBP_FIREFOX_PREFS,
		});
		// Chromium manages color by default; only the parity flags are added.
		const chromium = classicyWebpLaunchOptions("chromium");
		expect(chromium.args).toEqual([
			"--disable-gpu",
			"--disable-lcd-text",
			"--disable-partial-raster",
		]);
		expect(chromium.firefoxUserPrefs).toBeUndefined();
	});
});

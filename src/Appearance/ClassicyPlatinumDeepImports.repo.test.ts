import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Root tests, Storybook and bin scripts import Platinum (and System 7) by name
 * (`@classicy/appearance-platinum`), which registers the whole package. A few
 * need less: only the sound pack or the assets (a test of "no package
 * registered", or of the order they register in), a data file, or an internal
 * module the package does not export. Those reach into the package's source by
 * a relative path, and each target is listed here with its reason, so a new
 * one is a deliberate entry.
 */
const ALLOWED: Record<string, string> = {
	"packages/appearance/platinum/src/assets/sounds/platinum":
		"the sound pack alone: the themes name it, and the test must not register the package",
	"packages/appearance/platinum/src/assets/platinumAssets":
		"the assets alone (wallpapers, art, cursors), without the package",
	"packages/appearance/platinum/src/assets/platinumWallpapers":
		"the wallpaper list and URLs: not part of the package's public API",
	"packages/appearance/platinum/src/platinum.json":
		"the theme data, for tests that must not register the package",
	"packages/appearance/platinum/src/hooks":
		"a module-load-order case: the hooks module evaluated first",
	"packages/appearance/platinum/src/assets/platinumFonts.internal":
		"the face list the dist checks compare against; internal, not exported",
	"packages/appearance/platinum/src/assets/art/cursor-arrow.svg":
		"the cursor art file, for the cursor test",
	"packages/appearance/platinum/src/assets/sounds/platinum/platinum.json":
		"the sound pack's sprite map, read by the sound-pack tests (it moved out of the core's assets/ in 3.3)",
	"packages/appearance/platinum/src":
		"the source directory, to build a module-copy path (a query makes a new instance)",
	"packages/appearance/platinum/src/**/*.stories.@(ts|tsx)":
		"Storybook's stories glob (main.ts): Platinum's own stories, its screen savers'",
	"packages/appearance/system7/src/**/*.stories.@(ts|tsx)":
		"Storybook's stories glob (main.ts): System 7's own stories",
};

const RELATIVE_INTO_PACKAGES = /["'`]((?:\.\.\/)+packages\/[^"'`]*)["'`]/g;

const tracked = (): string[] =>
	execFileSync(
		"git",
		["ls-files", "-z", "--", "src", "storybook/.storybook", "bin"],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	)
		.split("\0")
		.filter((file) => /\.(?:[cm]?[jt]sx?)$/.test(file));

const SELF = "src/Appearance/ClassicyPlatinumDeepImports.repo.test.ts";

const targets = (): Map<string, string[]> => {
	const found = new Map<string, string[]>();
	for (const file of tracked()) {
		if (file === SELF) continue;
		for (const match of readFileSync(file, "utf8").matchAll(
			RELATIVE_INTO_PACKAGES,
		)) {
			const target = path
				.normalize(path.join(path.dirname(file), match[1]))
				.replace(/\.tsx?$/, "");
			found.set(target, [...(found.get(target) ?? []), file]);
		}
	}
	return found;
};

describe("relative imports from root code into packages/", () => {
	it("reach only the listed targets", () => {
		const unlisted = [...targets()]
			.filter(([target]) => !(target in ALLOWED))
			.map(([target, files]) => `${target} (${files[0]})`);
		expect(unlisted).toEqual([]);
	});

	it("leave no listed target unused", () => {
		const used = new Set(targets().keys());
		expect(Object.keys(ALLOWED).filter((target) => !used.has(target))).toEqual(
			[],
		);
	});

	// Platinum's, or System 7's stories glob (plan 0018-dbd §2.2).
	it("are all inside a workspace Appearance Package", () => {
		expect(
			Object.keys(ALLOWED).filter(
				(target) =>
					!/^packages\/appearance\/(?:platinum|system7)\//.test(target),
			),
		).toEqual([]);
	});
});

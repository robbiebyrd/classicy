import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Root tests, Storybook and bin scripts import Platinum by name
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
	"packages/appearance/platinum/src":
		"the source directory, to build a module-copy path (a query makes a new instance)",
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

	it("are all inside Platinum's package source", () => {
		expect(
			Object.keys(ALLOWED).filter(
				(target) => !target.startsWith("packages/appearance/platinum/src"),
			),
		).toEqual([]);
	});
});

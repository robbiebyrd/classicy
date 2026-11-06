import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASSICY_IMAGE_TOOLS_EXCLUDES } from "./classicyImageTools";
import { isClassicyAppearanceSourcePath } from "./classicyNoInlineAssets";

describe("CLASSICY_IMAGE_TOOLS_EXCLUDES", () => {
	it("matches package art in the repo and in the packages/ layout", () => {
		for (const id of [
			"/r/src/Appearance/Platinum/assets/art/resizer.svg",
			"/r/packages/appearance/platinum/src/assets/art/resizer.svg",
		]) {
			expect(CLASSICY_IMAGE_TOOLS_EXCLUDES.test(id)).toBe(true);
		}
	});

	it("leaves other images to the image plugin", () => {
		expect(CLASSICY_IMAGE_TOOLS_EXCLUDES.test("/r/assets/img/logo.png")).toBe(
			false,
		);
	});

	// One matcher for "an Appearance Package's own source file": the image
	// tools' excludes, the no-inline plugin (both library builds) and the core
	// build's assetFileNames all read it (plan 0015-kxa §3.1).
	it("is the one Appearance Package source matcher", () => {
		for (const [file, expected] of [
			["/r/src/Appearance/Platinum/assets/fonts/a.woff2", true],
			["/r/packages/appearance/platinum/src/assets/art/grip.svg", true],
			["packages\\appearance\\platinum\\src\\assets\\art\\grip.svg", true],
			["/r/assets/img/wallpapers/azul_dark.png", false],
			["/r/assets/sounds/platinum/platinum.ogg", false],
		] as const)
			expect(isClassicyAppearanceSourcePath(file), file).toBe(expected);
		const noInline = readFileSync("bin/classicyNoInlineAssets.ts", "utf8");
		expect(noInline).toContain("CLASSICY_IMAGE_TOOLS_EXCLUDES.test(");
		const vite = readFileSync("vite.config.ts", "utf8");
		expect(vite).toContain("isClassicyAppearanceSourcePath(name)");
		// No second spelling of the pattern in the build configs.
		for (const config of [
			vite,
			noInline,
			readFileSync("packages/appearance/platinum/vite.config.ts", "utf8"),
		])
			expect(config).not.toMatch(/src\\\/Appearance|\/src\/Appearance\//);
	});

	it("is the pattern both the library and Storybook configs hand the plugin", () => {
		for (const file of ["vite.config.ts", "storybook/.storybook/main.ts"]) {
			const source = readFileSync(file, "utf8");
			expect(source, file).toContain("excludes: CLASSICY_IMAGE_TOOLS_EXCLUDES");
		}
	});
});

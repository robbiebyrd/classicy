import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isClassicyAppearanceSourcePath } from "./classicyNoInlineAssets";

// Every file of an Appearance Package ships as a file in its build's
// dist/assets: its source assets and the sound sprites, wallpapers, art and
// cursors in packages/appearance/<id>/assets (plan 0015-kxa §3.3). Since the
// core stopped bundling Platinum (§3.4) no build narrows the rule.
describe("which assets the library builds emit as files", () => {
	const PACKAGE = [
		"/r/packages/appearance/platinum/src/assets/art/resizer.svg",
		"/r/packages/appearance/platinum/src/assets/fonts/Geneva-normal-normal.woff2",
		"/r/src/Appearance/Other/assets/art/a.png",
		"/r/packages/appearance/platinum/assets/sounds/platinum/platinum.ogg",
		"/r/packages/appearance/platinum/assets/wallpapers/azul_dark.png",
		"/r/packages/appearance/platinum/assets/art/apple.png",
		"/r/packages/appearance/platinum/assets/cursors/cursor-watch.png",
		"packages\\appearance\\platinum\\assets\\wallpapers\\default.jpg",
	];
	const CORE = ["/r/assets/img/icons/system/macos.svg", "/r/src/index.ts"];

	it("every file in a package, none of the core's", () => {
		for (const file of PACKAGE)
			expect(isClassicyAppearanceSourcePath(file), file).toBe(true);
		for (const file of CORE)
			expect(isClassicyAppearanceSourcePath(file), file).toBe(false);
	});

	it("both builds hand the no-inline plugin the default rule", () => {
		for (const config of [
			"vite.config.ts",
			"packages/appearance/platinum/vite.config.ts",
		]) {
			const source = readFileSync(config, "utf8");
			expect(source, config).toContain("noInlineAppearanceAssetsPlugin()");
			expect(source, config).not.toContain("isClassicyCoreBuildPackageAsset");
		}
		// No widening for files in the core's assets/ folder: Platinum has none.
		expect(
			readFileSync("packages/appearance/platinum/vite.config.ts", "utf8"),
		).not.toMatch(/assets\/(?:img|sounds)/);
	});
});

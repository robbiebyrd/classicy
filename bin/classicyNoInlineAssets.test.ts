import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	isClassicyAppearanceSourcePath,
	isClassicyCoreBuildPackageAsset,
} from "./classicyNoInlineAssets";

// Platinum's files that left the core's assets/ folder (plan 0015-kxa §3.3)
// live in packages/appearance/platinum/assets/. Platinum's own build emits
// them as files, like the rest of its assets; the core's build, which bundles
// Platinum until §3.4, inlines them as it did before they moved, so its
// dist/assets (and verify:dist) do not change.
describe("which package assets each library build emits as files", () => {
	const PACKAGE_SOURCE = [
		"/r/packages/appearance/platinum/src/assets/art/resizer.svg",
		"/r/packages/appearance/platinum/src/assets/fonts/Geneva-normal-normal.woff2",
		"/r/src/Appearance/Other/assets/art/a.png",
	];
	const MOVED_FROM_CORE_ASSETS = [
		"/r/packages/appearance/platinum/assets/sounds/platinum/platinum.ogg",
		"/r/packages/appearance/platinum/assets/wallpapers/azul_dark.png",
		"/r/packages/appearance/platinum/assets/art/apple.png",
		"/r/packages/appearance/platinum/assets/cursors/cursor-watch.png",
		"packages\\appearance\\platinum\\assets\\wallpapers\\default.jpg",
	];
	const CORE = ["/r/assets/img/icons/system/macos.svg", "/r/src/index.ts"];

	it("Platinum's build: every file in the package", () => {
		for (const file of [...PACKAGE_SOURCE, ...MOVED_FROM_CORE_ASSETS])
			expect(isClassicyAppearanceSourcePath(file), file).toBe(true);
		for (const file of CORE)
			expect(isClassicyAppearanceSourcePath(file), file).toBe(false);
	});

	it("the core's build: the package's source assets, not the files from assets/", () => {
		for (const file of PACKAGE_SOURCE)
			expect(isClassicyCoreBuildPackageAsset(file), file).toBe(true);
		for (const file of [...MOVED_FROM_CORE_ASSETS, ...CORE])
			expect(isClassicyCoreBuildPackageAsset(file), file).toBe(false);
	});

	it("is what each build hands the no-inline plugin", () => {
		expect(readFileSync("vite.config.ts", "utf8")).toContain(
			"noInlineAppearanceAssetsPlugin(isClassicyCoreBuildPackageAsset)",
		);
		const platinum = readFileSync(
			"packages/appearance/platinum/vite.config.ts",
			"utf8",
		);
		expect(platinum).toContain("noInlineAppearanceAssetsPlugin()");
		// No widening for files still in the core's assets/ folder: there are none.
		expect(platinum).not.toMatch(/assets\/(?:img|sounds)/);
	});
});

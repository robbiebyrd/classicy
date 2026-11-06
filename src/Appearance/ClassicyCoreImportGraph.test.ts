import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runtimeImportGraph } from "@/__tests__/runtimeImportGraph";

/**
 * The core neither imports nor exports Platinum (plan 0015 §1.6): a host loads
 * an Appearance Package itself, so a host using another package pays for none
 * of Platinum's stylesheet, art, fonts, sounds or wallpapers. The runtime
 * import graph from the barrel is walked statically (type-only imports are
 * erased by the build, so they are skipped).
 *
 * Platinum is its own workspace package, `@classicy/appearance-platinum` at
 * packages/appearance/platinum (plan 0015 §3.1), so the core reaches nothing
 * under packages/ at all.
 */

const PLATINUM_PACKAGE = "packages/appearance/platinum/";

// The paths that matter, not the whole tree: the package folder also holds
// resources/ (80,000 files, plan 0015-kxa §3.5).
const trackedFiles = (): string[] =>
	execFileSync(
		"git",
		[
			"ls-files",
			"-z",
			"--",
			"src/Appearance",
			`${PLATINUM_PACKAGE}package.json`,
			`${PLATINUM_PACKAGE}src`,
		],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	)
		.split("\0")
		.filter(Boolean);

describe("Platinum's source", () => {
	it("lives only in its package, packages/appearance/platinum/src", () => {
		const tracked = trackedFiles();
		expect(existsSync("src/Appearance/Platinum")).toBe(false);
		expect(
			tracked.filter((file) => file.startsWith("src/Appearance/Platinum/")),
		).toEqual([]);
		expect(tracked).toEqual(
			expect.arrayContaining([
				`${PLATINUM_PACKAGE}package.json`,
				`${PLATINUM_PACKAGE}src/index.ts`,
				`${PLATINUM_PACKAGE}src/hooks.ts`,
				`${PLATINUM_PACKAGE}src/platinum.json`,
				`${PLATINUM_PACKAGE}src/styles/platinum.scss`,
				`${PLATINUM_PACKAGE}src/assets/platinumAssets.ts`,
			]),
		);
	});
});

describe("the core's import graph", () => {
	it("reaches nothing under packages/ from src/index.ts", () => {
		const graph = runtimeImportGraph("src/index.ts");
		// The walk reaches the desktop, so it is not trivially short.
		expect(graph).toContain(
			"src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx",
		);
		expect(graph.filter((file) => file.startsWith("packages/"))).toEqual([]);
		expect(graph).not.toContain("package:@classicy/appearance-platinum");
	});

	// Moved from Platinum's asset import-graph test with the package (plan
	// 0015-kxa §3.1): this half is the core's.
	it("the asset registry reads the pixel-art rule from the codec, not the component", () => {
		const graph = runtimeImportGraph("src/Appearance/ClassicyAssetRegistry.ts");
		expect(graph).toContain(
			"src/Appearance/ClassicyPixelArtSource.internal.ts",
		);
		expect(graph.filter((file) => /\.(s?css|sass)$/.test(file))).toEqual([]);
		expect(graph.filter((file) => file.endsWith(".tsx"))).toEqual([]);
	});

	it("exports none of Platinum's names from the barrel", async () => {
		const api: Record<string, unknown> = await import("@/index");
		expect(api).not.toHaveProperty("platinumSoundPack");
		expect(api).not.toHaveProperty("platinumAppearanceHooks");
		expect(api).not.toHaveProperty("PLATINUM_APPEARANCE_PACKAGE_ID");
		// The barrel did load: a core name is there.
		expect(api).toHaveProperty("registerClassicyAppearancePackage");
	}, 60_000);

	// Until the core's build stops bundling Platinum (plan 0015 §3.4), the
	// library build bundles the package from its own entry, after the barrel,
	// so the built bundle still registers it; its API stays the barrel's.
	it("the build entry adds Platinum's registration, not its names", async () => {
		expect(runtimeImportGraph("src/ClassicyLibraryBuild.internal.ts")).toEqual(
			expect.arrayContaining([
				"src/index.ts",
				`${PLATINUM_PACKAGE}src/index.ts`,
			]),
		);
		const api: Record<string, unknown> = await import("@/index");
		const build: Record<string, unknown> = await import(
			"@/ClassicyLibraryBuild.internal"
		);
		expect(Object.keys(build).sort()).toEqual(Object.keys(api).sort());
	}, 60_000);
});

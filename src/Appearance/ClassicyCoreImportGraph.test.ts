import { describe, expect, it } from "vitest";
import { runtimeImportGraph } from "@/__tests__/runtimeImportGraph";

/**
 * The core neither imports nor exports Platinum (plan 0015 §1.6): a host loads
 * an Appearance Package itself, so a host using another package pays for none
 * of Platinum's stylesheet, art, fonts, sounds or wallpapers. The runtime
 * import graph from the barrel is walked statically (type-only imports are
 * erased by the build, so they are skipped).
 */

const PLATINUM = "src/Appearance/Platinum/";

describe("the core's import graph", () => {
	it("reaches nothing under src/Appearance/Platinum from src/index.ts", () => {
		const graph = runtimeImportGraph("src/index.ts");
		// The walk reaches the desktop, so it is not trivially short.
		expect(graph).toContain(
			"src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx",
		);
		expect(graph.filter((file) => file.startsWith(PLATINUM))).toEqual([]);
	});

	it("exports none of Platinum's names from the barrel", async () => {
		const api: Record<string, unknown> = await import("@/index");
		expect(api).not.toHaveProperty("platinumSoundPack");
		expect(api).not.toHaveProperty("platinumAppearanceHooks");
		expect(api).not.toHaveProperty("PLATINUM_APPEARANCE_PACKAGE_ID");
		// The barrel did load: a core name is there.
		expect(api).toHaveProperty("registerClassicyAppearancePackage");
	}, 60_000);

	// Until Platinum is its own package (plan 0015 Phase 3), the library build
	// bundles it from its own entry, after the barrel, so the built bundle
	// still registers it; its API stays the barrel's.
	it("the build entry adds Platinum's registration, not its names", async () => {
		expect(runtimeImportGraph("src/ClassicyLibraryBuild.internal.ts")).toEqual(
			expect.arrayContaining([
				"src/index.ts",
				"src/Appearance/Platinum/index.ts",
			]),
		);
		const api: Record<string, unknown> = await import("@/index");
		const build: Record<string, unknown> = await import(
			"@/ClassicyLibraryBuild.internal"
		);
		expect(Object.keys(build).sort()).toEqual(Object.keys(api).sort());
	}, 60_000);
});

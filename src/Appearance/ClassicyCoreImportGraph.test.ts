import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
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

// Platinum's saver ids and logo ids (packages/appearance/platinum/src/
// screenSavers/), less the logo id "classicy", which the core uses as a
// string of its own (the product name).
const PLATINUM_SAVER_IDS = new Set([
	"bouncing-ball",
	"fade-out",
	"fish",
	"flying-toasters",
	"globe",
	"hard-rain",
	"logo",
	"messages",
	"messages2",
	"rainstorm",
	"spotlight",
	"warp",
	"berkeley-systems",
	"startup-screen",
]);

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

	// Plan 0016-vbq §2.1: the core keeps the Screen Saver mechanism and no
	// saver. Platinum ships the twelve After Dark savers, their art and the
	// Logo saver's logo registry.
	it("nothing src/index.ts reaches names a saver module, its art or a Platinum saver id", () => {
		const graph = runtimeImportGraph("src/index.ts");
		expect(graph).toContain(
			"src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.tsx",
		);
		expect(
			graph.filter((file) =>
				/Extensions\/ScreenSaver\/savers\/|ClassicyScreenSaverLogoRegistry|ClassicyScreenSaverBuiltIns/.test(
					file,
				),
			),
		).toEqual([]);
		expect(graph.filter((file) => file.endsWith(".webp"))).toEqual([]);
		// The ids Platinum registers its savers and logos under, as string
		// literals anywhere in the graph's source (comments do not count).
		const literals = graph
			.filter((file) => /\.tsx?$/.test(file))
			.flatMap((file) => {
				const found: string[] = [];
				const visit = (node: ts.Node) => {
					if (ts.isStringLiteralLike(node) && PLATINUM_SAVER_IDS.has(node.text))
						found.push(`${file}: "${node.text}"`);
					ts.forEachChild(node, visit);
				};
				visit(
					ts.createSourceFile(
						file,
						readFileSync(file, "utf8"),
						ts.ScriptTarget.Latest,
						true,
					),
				);
				return found;
			});
		expect(literals).toEqual([]);
	});

	it("exports none of the savers' or the logo registry's names from the barrel", async () => {
		const api: Record<string, unknown> = await import("@/index");
		for (const name of [
			"ClassicyScreenSaverBouncingBall",
			"BouncingBallConfigSchema",
			"ClassicyScreenSaverFlyingToasters",
			"ClassicyScreenSaverLogo",
			"LogoConfigSchema",
			"registerClassicyScreenSaverLogo",
			"CLASSICY_SCREEN_SAVER_LOGO_IDS",
			"CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID",
		])
			expect(api, name).not.toHaveProperty(name);
		// The mechanism stays.
		expect(api).toHaveProperty("registerClassicyScreenSaver");
		expect(api).toHaveProperty("ClassicyScreenSaverConfigForm");
	}, 60_000);

	// The core's library build enters at the barrel (plan 0015 §3.4): the
	// interim entry that bundled Platinum after it is gone, and so are the
	// build's aliases that resolved Platinum, and Platinum's own import of the
	// core, to source. Platinum ships in its own build.
	it("builds the library from the barrel alone", () => {
		expect(existsSync("src/ClassicyLibraryBuild.internal.ts")).toBe(false);
		const config = readFileSync("vite.config.ts", "utf8");
		expect(config).toMatch(/entry: resolve\(__dirname, "src\/index\.ts"\)/);
		expect(config).not.toContain("ClassicyLibraryBuild");
		expect(config).not.toContain("@classicy\\/appearance-platinum");
		expect(config).not.toContain("@classicy\\/classicy$");
		expect(config).not.toContain("packages/appearance/platinum");
	});
});

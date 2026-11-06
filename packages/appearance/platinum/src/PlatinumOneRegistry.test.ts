import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import path from "node:path";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
	resolveClassicyAsset,
} from "@classicy/classicy";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PLATINUM_WALLPAPERS } from "./assets/platinumWallpapers";

// Review focus "one registry, not two" (plan 0015-kxa §3.1 step 5, design
// 0014-ahm anti-goal "Two copies of the registries"): the package's built
// bundle imports the core rather than carrying a copy of it, so registering
// Platinum lands in the registries the host's core reads. The bundle is built
// fresh, then imported next to the core in one module graph: its
// `@classicy/classicy` import resolves, through this project's alias, to the
// same core module the test reads the registries from (the core's source
// barrel, which is what its built bundle is made from; the gate runs these
// tests before any build). It is built under the package's ignored .tmp/,
// inside the project, so this project's resolver and aliases apply to it.

const packageDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(packageDir, "../../..");
const vite = path.join(repoRoot, "node_modules/vite/bin/vite.js");

let outDir = "";
let es = "";
let umd = "";

beforeAll(() => {
	const scratch = path.join(packageDir, ".tmp");
	mkdirSync(scratch, { recursive: true });
	outDir = mkdtempSync(path.join(scratch, "bundle-"));
	execFileSync(
		process.execPath,
		[vite, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "warn"],
		{ cwd: packageDir, stdio: "pipe" },
	);
	es = readFileSync(path.join(outDir, "appearance-platinum.es.js"), "utf8");
	umd = readFileSync(path.join(outDir, "appearance-platinum.umd.js"), "utf8");
}, 180_000);

afterAll(() => {
	if (outDir) rmSync(outDir, { recursive: true, force: true });
});

// Strings only the core's registries hold (their log messages). A bundle
// that carried its own copy of a registry would carry its messages too.
const CORE_REGISTRY_MARKERS = [
	"was not registered: ",
	"cannot be unregistered; register a package with its id to replace it.",
	"Ignored forbidden key",
	"Rejected sound pack",
];

describe("the built bundle and the core's registries", () => {
	it("registers Platinum into the core's package registry", async () => {
		expect(listClassicyAppearancePackages()).toEqual([]);
		const bundle: Record<string, unknown> = await import(
			/* @vite-ignore */ path.join(outDir, "appearance-platinum.es.js")
		);
		expect(listClassicyAppearancePackages().map((pkg) => pkg.id)).toEqual([
			"platinum",
		]);
		// The registered package is the bundle's own object, so the core reads
		// what the bundle registered, not a copy registered elsewhere.
		expect(getClassicyAppearancePackage("platinum")?.hooks).toBe(
			bundle.platinumAppearanceHooks,
		);
		expect(bundle.PLATINUM_APPEARANCE_PACKAGE_ID).toBe("platinum");
		// The asset registry too: Platinum's art resolves through the core.
		expect(resolveClassicyAsset("systemArt", "windowGrip")).toMatch(/resizer/);
	}, 60_000);

	// The negative check below is only as good as its markers: each must still
	// be in the core's registries, or "carries none of it" would hold vacuously.
	it("checks for markers the core's registries really hold", () => {
		const core = [
			"src/Appearance/ClassicyAppearancePackageRegistry.ts",
			"src/Appearance/ClassicyAssetRegistry.ts",
			"src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts",
		]
			.map((file) => readFileSync(path.join(repoRoot, file), "utf8"))
			.join("\n");
		for (const marker of CORE_REGISTRY_MARKERS)
			expect(core, marker).toContain(marker);
	});

	it("imports @classicy/classicy, in both formats, and carries none of it", () => {
		expect(es).toMatch(/\bfrom\s*["']@classicy\/classicy["']/);
		expect(umd).toMatch(/require\(["']@classicy\/classicy["']\)/);
		expect(umd).toMatch(/\.classicy\b/);
		for (const marker of CORE_REGISTRY_MARKERS) {
			expect(es, marker).not.toContain(marker);
			expect(umd, marker).not.toContain(marker);
		}
	});

	it("ships its art, fonts, wallpapers and sound sprites as files: only the halftone mask is inlined (ruling E17)", () => {
		for (const bundle of [es, umd]) {
			const inlined = [
				...bundle.matchAll(/data:([a-z]+\/[a-z0-9.+-]+)[;,]/g),
			].map((match) => match[1]);
			expect(inlined).toEqual(["image/svg+xml"]);
		}
		expect(es).toMatch(/new URL\(["']assets\/[^"']+\.png["']/);
		expect(es).toMatch(/new URL\(["']assets\/[^"']+\.woff2["']/);
		for (const ext of ["ogg", "m4a", "mp3", "ac3"])
			expect(es).toContain(`new URL("assets/platinum.${ext}"`);
	});

	// Platinum's files from the core's assets/ folder (plan 0015-kxa §3.3)
	// are the package's own now, emitted with the rest of its assets.
	it("emits the sound sprites, wallpapers and the moved art and cursors into dist/assets", () => {
		const assets = readdirSync(path.join(outDir, "assets"));
		expect(assets).toEqual(
			expect.arrayContaining([
				"platinum.ogg",
				"platinum.m4a",
				"platinum.mp3",
				"platinum.ac3",
				...PLATINUM_WALLPAPERS.map(({ file }) => file),
				"apple.png",
				"alias.png",
				"trash-empty.png",
				"trash-full.png",
				"help-button.png",
				"cursor-watch.png",
				...["lr", "ud", "u", "d", "l", "r"].map(
					(dir) => `cursor-resize-${dir}.png`,
				),
			]),
		);
		// Nothing else is in dist/assets: the fonts and the package's art.
		expect(assets).toHaveLength(13 + 19 + 47 + 4 + 12);
		// The sprites are the files bin/make_audio_sprites.sh wrote, byte for byte.
		for (const ext of ["ogg", "m4a", "mp3", "ac3"])
			expect(
				readFileSync(path.join(outDir, "assets", `platinum.${ext}`)).equals(
					readFileSync(
						path.join(packageDir, `assets/sounds/platinum/platinum.${ext}`),
					),
				),
				ext,
			).toBe(true);
	});
});

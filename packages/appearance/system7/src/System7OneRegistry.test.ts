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
	getClassicySoundPack,
	listClassicyAppearancePackages,
} from "@classicy/classicy";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SYSTEM7_FONT_FACES } from "./assets/system7Fonts.internal";

// "One registry, not two" (design 0014-ahm anti-goal "Two copies of the
// registries"), as PlatinumOneRegistry.test.ts checks it for Platinum: the
// package's built bundle imports the core rather than carrying a copy of it,
// so registering System 7 lands in the registries the host's core reads. The
// bundle is built fresh under the package's ignored .tmp/, then imported next
// to the core in one module graph: its `@classicy/classicy` import resolves,
// through this project's alias, to the same core module the test reads the
// registries from. No other package is registered: System 7 registers alone.

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
		[
			vite,
			"build",
			"--outDir",
			outDir,
			"--emptyOutDir",
			"--logLevel",
			"warn",
			// No type declarations: they need the core's built ones, and this
			// runs before any build (vite.config.ts).
			"--mode",
			"bundle-test",
		],
		{ cwd: packageDir, stdio: "pipe" },
	);
	es = readFileSync(path.join(outDir, "appearance-system7.es.js"), "utf8");
	umd = readFileSync(path.join(outDir, "appearance-system7.umd.js"), "utf8");
}, 180_000);

afterAll(() => {
	if (outDir) rmSync(outDir, { recursive: true, force: true });
});

// Strings only the core's registries hold (their log messages). A bundle
// that carried its own copy of a registry would carry its messages too
// (bin/verify-dist.test.ts checks each is still in the core).
const CORE_REGISTRY_MARKERS = [
	"was not registered: ",
	"cannot be unregistered; register a package with its id to replace it.",
	"Ignored forbidden key",
	"Rejected sound pack",
];

describe("the built bundle and the core's registries", () => {
	it("registers System 7, alone, into the core's package and sound pack registries", async () => {
		expect(listClassicyAppearancePackages()).toEqual([]);
		const bundle: Record<string, unknown> = await import(
			/* @vite-ignore */ path.join(outDir, "appearance-system7.es.js")
		);
		expect(listClassicyAppearancePackages().map((pkg) => pkg.id)).toEqual([
			"system7",
		]);
		// The registered pack is the bundle's own object, so the core reads
		// what the bundle registered, not a copy registered elsewhere.
		expect(getClassicyAppearancePackage("system7")?.sounds?.[0]).toBe(
			bundle.system7SoundPack,
		);
		// The sound pack registry stores the pack as its schema parsed it.
		expect(getClassicySoundPack("system7")).toEqual(bundle.system7SoundPack);
		expect(bundle.SYSTEM7_APPEARANCE_PACKAGE_ID).toBe("system7");
		// The fonts too: the core's font registry wrote System 7's faces.
		expect(
			document
				.getElementById("classicy-fonts-system7")
				?.textContent?.match(/@font-face/g),
		).toHaveLength(SYSTEM7_FONT_FACES.length);
	}, 60_000);

	it("imports @classicy/classicy, in both formats, and carries none of it", () => {
		expect(es).toMatch(/\bfrom\s*["']@classicy\/classicy["']/);
		expect(umd).toMatch(/require\(["']@classicy\/classicy["']\)/);
		expect(umd).toMatch(/\.classicy\b/);
		for (const marker of CORE_REGISTRY_MARKERS) {
			expect(es, marker).not.toContain(marker);
			expect(umd, marker).not.toContain(marker);
		}
	});

	it("carries nothing of Platinum's", () => {
		for (const bundle of [es, umd]) {
			expect(bundle).not.toContain("appearance-platinum");
			expect(bundle).not.toMatch(/data-classicy-appearance=\\?"?platinum/);
		}
	});

	it("ships its fonts and sound sheet as files: nothing is inlined", () => {
		for (const bundle of [es, umd])
			expect([...bundle.matchAll(/data:([a-z]+\/[a-z0-9.+-]+)[;,]/g)]).toEqual(
				[],
			);
		expect(es).toMatch(/new URL\(["']assets\/[^"']+\.woff2["']/);
		expect(es).toContain('new URL("assets/silence.wav"');
	});

	it("emits exactly its fonts and its sound sheet into dist/assets, byte for byte", () => {
		const assets = readdirSync(path.join(outDir, "assets")).sort();
		expect(assets).toEqual(
			[
				...SYSTEM7_FONT_FACES.map(({ file }) => `${file}.woff2`),
				"silence.wav",
			].sort(),
		);
		for (const { file } of SYSTEM7_FONT_FACES)
			expect(
				readFileSync(path.join(outDir, "assets", `${file}.woff2`)).equals(
					readFileSync(
						path.join(packageDir, "src/assets/fonts", `${file}.woff2`),
					),
				),
				file,
			).toBe(true);
	});

	it("emits the two strict-CSP stylesheets", () => {
		const files = readdirSync(outDir);
		expect(files).toEqual(
			expect.arrayContaining([
				"classicy-system7.css",
				"classicy-system7.fonts.css",
			]),
		);
		expect(
			readFileSync(path.join(outDir, "classicy-system7.css"), "utf8"),
		).toMatch(
			/^@layer classicy\.base, classicy\.package, classicy\.user;\n@layer classicy\.package\{\.classicyDesktop\[data-classicy-appearance=system7\] /,
		);
	});
});

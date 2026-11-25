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
	listClassicyScreenSavers,
} from "@classicy/classicy";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WINDOWS98_FONT_FACES } from "./assets/windows98Fonts.internal";

// "One registry, not two" (design 0014-ahm anti-goal "Two copies of the
// registries"), as System7OneRegistry.test.ts checks it for System 7: the
// package's built bundle imports the core rather than carrying a copy of it,
// so registering Windows 98 lands in the registries the host's core reads.
// The bundle is built fresh under the package's ignored .tmp/, then imported
// next to the core in one module graph: its `@classicy/classicy` import
// resolves, through this project's alias, to the same core module the test
// reads the registries from. No other package is registered: Windows 98
// registers alone.

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
	es = readFileSync(path.join(outDir, "appearance-windows98.es.js"), "utf8");
	umd = readFileSync(path.join(outDir, "appearance-windows98.umd.js"), "utf8");
}, 180_000);

afterAll(() => {
	if (outDir) rmSync(outDir, { recursive: true, force: true });
});

// Strings only the core's registries hold (their log messages). A bundle
// that carried its own copy of a registry would carry its messages too
// (the core's bin/verify-dist.test.ts checks each is still in the core).
const CORE_REGISTRY_MARKERS = [
	"was not registered: ",
	"cannot be unregistered; register a package with its id to replace it.",
	"Ignored forbidden key",
	"Rejected sound pack",
];

describe("the built bundle and the core's registries", () => {
	it("registers Windows 98, alone, into the core's package and sound pack registries", async () => {
		expect(listClassicyAppearancePackages()).toEqual([]);
		const bundle: Record<string, unknown> = await import(
			/* @vite-ignore */ path.join(outDir, "appearance-windows98.es.js")
		);
		expect(listClassicyAppearancePackages().map((pkg) => pkg.id)).toEqual([
			"windows98",
		]);
		// The registered pack is the bundle's own object, so the core reads
		// what the bundle registered, not a copy registered elsewhere.
		expect(getClassicyAppearancePackage("windows98")?.sounds?.[0]).toBe(
			bundle.windows98SoundPack,
		);
		// The sound pack registry stores the pack as its schema parsed it.
		expect(getClassicySoundPack("windows98")).toEqual(
			bundle.windows98SoundPack,
		);
		expect(bundle.WINDOWS98_APPEARANCE_PACKAGE_ID).toBe("windows98");
		// The fonts too: the core's font registry wrote Windows 98's faces.
		expect(
			document
				.getElementById("classicy-fonts-windows98")
				?.textContent?.match(/@font-face/g),
		).toHaveLength(WINDOWS98_FONT_FACES.length);
		// And no screen savers: the package names none and bundles none.
		expect(listClassicyScreenSavers()).toEqual([]);
		expect(
			getClassicyAppearancePackage("windows98")?.defaultScreenSaver,
		).toBeUndefined();
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

	it("carries nothing of Platinum's or System 7's", () => {
		for (const bundle of [es, umd]) {
			expect(bundle).not.toContain("appearance-platinum");
			expect(bundle).not.toContain("appearance-system7");
			expect(bundle).not.toMatch(/data-classicy-appearance=\\?"?platinum/);
			expect(bundle).not.toMatch(/data-classicy-appearance=\\?"?system7/);
			expect(bundle).not.toContain("classicySaver");
			// Not Platinum's hooks: their feedback sounds' sprite names.
			expect(bundle).not.toContain("ClassicyButtonClickDown");
			expect(bundle).not.toContain("ClassicyMenuItemHover");
		}
	});

	it("ships its files as files: nothing is inlined", () => {
		for (const bundle of [es, umd])
			expect(bundle).not.toMatch(/data:[a-z]+\/[a-z0-9.+-]+[;,]/);
		for (const ext of ["ogg", "m4a"])
			expect(es).toContain(`new URL("assets/windows98.${ext}"`);
		expect(es).toContain('new URL("assets/windows98.svg"');
	});

	it("emits its fonts, art, icons, cursors and sound sheet into dist/assets, byte for byte", () => {
		const assets = readdirSync(path.join(outDir, "assets")).sort();
		const sources = (
			readdirSync(path.join(packageDir, "src/assets"), {
				recursive: true,
			}) as string[]
		)
			.map((file) => path.join("src/assets", file))
			.filter(
				(file) =>
					/\.(webp|svg|woff2)$/.test(file) ||
					/^src\/assets\/cursors\/[^/]+\.png$/.test(file) ||
					/^src\/assets\/sounds\/windows98\/windows98\.(ogg|m4a)$/.test(file),
			);
		expect(assets).toEqual(sources.map((file) => path.basename(file)).sort());
		for (const source of sources)
			expect(
				readFileSync(path.join(outDir, "assets", path.basename(source))).equals(
					readFileSync(path.join(packageDir, source)),
				),
				source,
			).toBe(true);
		for (const { file } of WINDOWS98_FONT_FACES)
			expect(assets, file).toContain(`${file}.woff2`);
		// The art and icons ship as WebP: the only PNGs are the cursors.
		expect(assets.filter((name) => name.endsWith(".png"))).toEqual(
			readdirSync(path.join(packageDir, "src/assets/cursors")).sort(),
		);
		// The fonts' readme and license files are not assets.
		expect(assets.filter((name) => name.endsWith(".txt"))).toEqual([]);
	});

	it("emits the two strict-CSP stylesheets", () => {
		const files = readdirSync(outDir);
		expect(files).toEqual(
			expect.arrayContaining([
				"classicy-windows98.css",
				"classicy-windows98.fonts.css",
			]),
		);
		// The fonts stylesheet names each face's emitted file.
		const fonts = readFileSync(
			path.join(outDir, "classicy-windows98.fonts.css"),
			"utf8",
		);
		for (const { file } of WINDOWS98_FONT_FACES)
			expect(fonts).toContain(`url("assets/${file}.woff2")`);
		expect(
			readFileSync(path.join(outDir, "classicy-windows98.css"), "utf8"),
		).toMatch(
			/^@layer classicy\.base, classicy\.package, classicy\.user;\n@layer classicy\.package\{\.classicyDesktop\[data-classicy-appearance=windows98\]/,
		);
	});
});

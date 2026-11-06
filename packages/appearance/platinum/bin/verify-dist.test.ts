import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { classicyFontStylesheet } from "../../../../bin/classicyFontStylesheet";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";
import { PLATINUM_FONT_FACES } from "../src/assets/platinumFonts.internal";

// The package's dist check, bin/verify-dist.mjs (plan 0015-kxa §3.4), run for
// real on a fixture package folder: the shape of Platinum's (src/assets/fonts,
// src/assets/art, assets/art, assets/cursors, assets/wallpapers,
// assets/sounds/platinum) with a few files each, and a dist/ built to pass.
// Each case breaks one thing and expects the script to name it.

const SCRIPT = path.resolve(import.meta.dirname, "verify-dist.mjs");
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const root = mkdtempSync(path.join(tmpdir(), "platinum-verify-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow{border:1px solid}}';
const HALFTONE = "data:image/svg+xml,%3csvg%3e%3c/svg%3e";
const bytes = (seed: number, n = 64) =>
	Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256));

// Source file → its bytes. Every one ships in dist/assets under its name,
// except the wallpaper photos, which nothing imports.
const SOURCES: Record<string, Buffer> = {
	...Object.fromEntries(
		PLATINUM_FONT_FACES.map((face, i) => [
			`src/assets/fonts/${face.file}.woff2`,
			bytes(i),
		]),
	),
	"src/assets/art/zoom.svg": Buffer.from("<svg/>"),
	"src/assets/art/sad-mac.png": bytes(40),
	"assets/art/apple.png": bytes(41),
	"assets/cursors/cursor-watch.png": bytes(42),
	"assets/wallpapers/azul_dark.png": bytes(43),
	"assets/wallpapers/default.jpg": bytes(44),
	"assets/wallpapers/photos/beach.jpg": bytes(45),
	...Object.fromEntries(
		["ogg", "m4a", "mp3", "ac3"].map((ext, i) => [
			`assets/sounds/platinum/platinum.${ext}`,
			bytes(50 + i),
		]),
	),
	"assets/sounds/platinum/platinum.json": Buffer.from("{}"),
	"assets/sounds/platinum/sprites/ClassicyBeep.mp3": bytes(60),
};
const SHIPPED = Object.keys(SOURCES).filter(
	(file) =>
		!file.includes("/photos/") &&
		!file.includes("/sprites/") &&
		!file.endsWith(".json"),
);

const urls = SHIPPED.map(
	(file) => `new URL("assets/${path.basename(file)}",import.meta.url).href`,
).join(",");
const ES = `import{registerClassicyAppearancePackage as r}from"@classicy/classicy";import{jsx as j}from"react/jsx-runtime";const h="${HALFTONE}";const u=[${urls}];const css=${JSON.stringify(PACKAGE)};r({css});export{u};\n//# sourceMappingURL=appearance-platinum.es.js.map\n`;
const UMD = `(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("@classicy/classicy"),require("react/jsx-runtime")):f(g.classicyAppearancePlatinum={},g.classicy,g.React)})(this,function(e,c,j){const h="${HALFTONE}";const z=typeof document>"u"?require("url").pathToFileURL(__dirname+"/assets/zoom.svg").href:"";const css=${JSON.stringify(PACKAGE)};c.registerClassicyAppearancePackage({css});});\n`;
const FONTS = classicyFontStylesheet(
	PLATINUM_FONT_FACES,
	(face) => `assets/${face.file}.woff2`,
	"classicy-platinum.fonts.css",
);
const DIST: Record<string, string | Buffer> = {
	"appearance-platinum.es.js": ES,
	"appearance-platinum.es.js.map": "{}",
	"appearance-platinum.umd.js": UMD,
	"appearance-platinum.umd.js.map": "{}",
	"classicy-platinum.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
	"classicy-platinum.fonts.css": FONTS,
	"types/index.d.ts": 'export * from "./hooks.js";\n',
	"types/hooks.d.ts": "export declare const a: number;\n",
	...Object.fromEntries(
		SHIPPED.map((file) => [`assets/${path.basename(file)}`, SOURCES[file]]),
	),
};

let run = 0;
/**
 * Writes the fixture package (the sources, then dist/ with `changes`
 * applied: a path to new content, or `null` to delete it) and runs the
 * script in it.
 */
const verify = (changes: Record<string, string | Buffer | null> = {}) => {
	const dir = path.join(root, `case-${run++}`);
	for (const [file, content] of Object.entries(SOURCES)) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	for (const [file, content] of Object.entries({ ...DIST, ...changes })) {
		if (content === null) continue;
		const target = path.join(dir, "dist", file);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, content);
	}
	const result = spawnSync(process.execPath, [SCRIPT], {
		cwd: dir,
		encoding: "utf8",
	});
	return { status: result.status, stderr: result.stderr.trim() };
};

describe("bin/verify-dist.mjs", () => {
	it("passes a dist that holds what the package ships", () =>
		expect(verify()).toEqual({ status: 0, stderr: "" }));

	// Invariant 1: one copy of the registries (design 0014-ahm anti-goal).
	describe("1. the core is an import, not a copy", () => {
		it("fails a bundle that does not import @classicy/classicy", () =>
			expect(
				verify({
					"appearance-platinum.umd.js": UMD.replace(
						'require("@classicy/classicy")',
						'require("@classicy/classicy-copy")',
					),
				}),
			).toEqual({
				status: 1,
				stderr: [
					'dist/appearance-platinum.umd.js: externalizes "@classicy/classicy-copy", which is not the core or React -> check `external` in vite.config.ts.',
					"dist/appearance-platinum.umd.js: does not import @classicy/classicy -> the core must stay external (a peer dependency), or Platinum registers into a copy of the registries nothing reads.",
				].join("\n"),
			}));

		// Vite's Node-only asset URL shim is UMD output; an ES bundle has none.
		it("fails Node's url module in the ES bundle", () =>
			expect(
				verify({
					"appearance-platinum.es.js": `import"url";${ES}`,
				}).stderr,
			).toBe(
				'dist/appearance-platinum.es.js: externalizes "url", which is not the core or React -> check `external` in vite.config.ts.',
			));

		it("fails a bundle that carries the core's registries", () =>
			expect(
				verify({
					"appearance-platinum.es.js": ES.replace(
						"export{u};",
						'console.warn("Rejected sound pack");export{u};',
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					'dist/appearance-platinum.es.js: carries the core\'s registry code ("Rejected sound pack") -> @classicy/classicy must stay external.',
			}));

		it("fails an import that carries a Vite query", () =>
			expect(
				verify({
					"appearance-platinum.es.js": `import"@classicy/classicy/x.svg?url";${ES}`,
				}).stderr,
			).toBe(
				'dist/appearance-platinum.es.js: externalizes "@classicy/classicy/x.svg?url", which carries a Vite query -> an asset import must stay bundled.',
			));
	});

	// Invariant 2 (the core's old 5, and 0131-ku3's review): exactly the
	// package's files, each byte for byte.
	describe("2. dist/assets holds every package file, as authored", () => {
		it("fails a missing file, by name", () =>
			expect(verify({ "assets/default.jpg": null })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing default.jpg; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					// And the bundle's reference to it dangles (invariant 3).
					"dist/appearance-platinum.es.js: new URL() names no file in dist/assets: assets/default.jpg",
				].join("\n"),
			}));

		it("fails a file nothing ships, a .webp included", () =>
			expect(verify({ "assets/sad-mac.webp": bytes(1) })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing none; extra sad-mac.webp -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					// And nothing loads it (invariant 3).
					"dist/appearance-platinum.es.js: references no new URL() for sad-mac.webp in dist/assets -> nothing loads it.",
				].join("\n"),
			}));

		it.each([
			"cursor-watch.png",
			"azul_dark.png",
			"zoom.svg",
			"platinum.ogg",
			"Monaco-normal-normal.woff2",
		])("fails %s when it differs from its source", (file) =>
			expect(verify({ [`assets/${file}`]: Buffer.from("changed") })).toEqual({
				status: 1,
				stderr: expect.stringMatching(
					new RegExp(
						`^dist/assets/${file.replace(".", "\\.")}: differs from [^ ]+/${file.replace(".", "\\.")} -> package files ship byte for byte; check the build's plugins \\(an image optimizer\\?\\)\\.$`,
					),
				),
			}));

		it("fails a stray file beside the bundles", () =>
			expect(verify({ "classicy.css": "" })).toEqual({
				status: 1,
				stderr:
					"dist/classicy.css: not a file the package ships -> the package's dist holds its two bundles and their maps, classicy-platinum.css, classicy-platinum.fonts.css, assets/ and types/.",
			}));
	});

	// Invariant 3: assets are files, referenced from the bundle.
	describe("3. nothing but the halftone mask is inlined", () => {
		it("fails a bundle that inlines a PNG", () =>
			expect(
				verify({
					"appearance-platinum.umd.js": UMD.replace(
						HALFTONE,
						"data:image/png;base64,AAAA",
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-platinum.umd.js: inlines image/png -> only the halftone mask (image/svg+xml, ruling E17) may be inlined; check noInlineAppearanceAssetsPlugin.",
			}));

		it("fails a reference to a file that is not in dist/assets", () =>
			expect(
				verify({
					"appearance-platinum.es.js": ES.replace(
						"const u=[",
						'const u=[new URL("assets/gone.png",import.meta.url).href,',
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-platinum.es.js: new URL() names no file in dist/assets: assets/gone.png",
			}));

		it("fails a file in dist/assets the bundle never references", () => {
			const { status, stderr } = verify({
				"appearance-platinum.es.js": ES.replace(
					'new URL("assets/apple.png",import.meta.url).href,',
					"",
				),
			});
			expect(status).toBe(1);
			expect(stderr).toBe(
				"dist/appearance-platinum.es.js: references no new URL() for apple.png in dist/assets -> nothing loads it.",
			);
		});
	});

	// Invariant 4 (the core's old 7): the look ships in both bundles and as
	// the strict-CSP stylesheet, byte for byte.
	describe("4. the package stylesheet", () => {
		it("fails a bundle without it", () =>
			expect(
				verify({
					"appearance-platinum.umd.js": UMD.replaceAll(
						JSON.stringify(PACKAGE),
						'""',
					),
				}).stderr,
			).toMatch(
				/^dist\/appearance-platinum\.umd\.js: carries no non-empty @layer classicy\.package stylesheet/,
			));

		it("fails a missing dist/classicy-platinum.css", () =>
			expect(verify({ "classicy-platinum.css": null }).stderr).toMatch(
				/^dist\/classicy-platinum\.css: missing/,
			));

		it("fails one that differs from the injected stylesheet", () =>
			expect(
				verify({
					"classicy-platinum.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace("1px", "2px")}`,
				}).stderr.split("\n"),
			).toEqual([
				expect.stringMatching(
					/^dist\/classicy-platinum\.css: differs from the package stylesheet dist\/appearance-platinum\.es\.js injects/,
				),
				expect.stringMatching(
					/^dist\/classicy-platinum\.css: differs from the package stylesheet dist\/appearance-platinum\.umd\.js injects/,
				),
			]));
	});

	// Invariant 5 (the core's old 9).
	it("5. fails a stylesheet with raw UTF-8 and no @charset", () =>
		expect(
			verify({
				"classicy-platinum.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace(".classicyWindow", '.a::before{content:"✓"} .classicyWindow')}`,
			}).stderr,
		).toMatch(/dist\/classicy-platinum\.css: non-ASCII byte at offset/));

	// Invariant 6 (the core's old 12).
	describe("6. the font stylesheet", () => {
		it("fails a missing face", () =>
			expect(
				verify({
					"classicy-platinum.fonts.css": FONTS.split("\n")
						.filter((rule) => !rule.includes('"Monaco"'))
						.join("\n"),
				}),
			).toEqual({
				status: 1,
				stderr:
					'dist/classicy-platinum.fonts.css: no @font-face for "Monaco" normal normal, which the runtime registers.',
			}));

		it("fails a missing file", () =>
			expect(verify({ "classicy-platinum.fonts.css": null }).stderr).toMatch(
				/^dist\/classicy-platinum\.fonts\.css: missing/,
			));
	});

	// Invariant 7: the `types` export.
	describe("7. dist/types", () => {
		it("fails without index.d.ts", () =>
			expect(verify({ "types/index.d.ts": null })).toEqual({
				status: 1,
				stderr:
					"dist/types/index.d.ts: missing -> the package's `types` export points at it; check dts in vite.config.ts.",
			}));

		// platinumJson is PlatinumJson, on the core's types; nothing imports
		// the JSON's own declaration.
		it("fails a JSON declaration", () =>
			expect(
				verify({ "types/platinum.json.d.ts": "declare const a: 1;\n" }),
			).toEqual({
				status: 1,
				stderr:
					"dist/types: 1 declaration(s) of imported JSON (platinum.json.d.ts) -> check the dts exclude in vite.config.ts.",
			}));

		// A node16/nodenext host resolves a relative specifier only with its
		// extension (the package is "type": "module"), so an extensionless
		// re-export drops every name behind it (TS2305).
		it("fails a relative specifier without an extension", () =>
			expect(
				verify({
					"types/index.d.ts":
						'export * from "./hooks";\nexport * from "./assets/a.js";\n',
				}),
			).toEqual({
				status: 1,
				stderr:
					'dist/types/index.d.ts: relative specifier(s) without an extension ("./hooks") -> a node16 or nodenext host resolves none of them; check beforeWriteFile on dts in vite.config.ts.',
			}));

		it("fails a test declaration", () =>
			expect(verify({ "types/hooks.test.d.ts": "export {};\n" })).toEqual({
				status: 1,
				stderr:
					"dist/types: 1 declaration(s) of tests, test helpers or stories (hooks.test.d.ts) -> check the dts exclude in vite.config.ts.",
			}));
	});
});

// The registry markers invariant 1 looks for must still be in the core, or
// "carries none of it" would hold vacuously.
it("looks for markers the core's registries really hold", () => {
	const script = readFileSync(SCRIPT, "utf8");
	const block =
		/const CORE_REGISTRY_MARKERS = \[([^\]]*)\];/.exec(script)?.[1] ?? "";
	const markers = [...block.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
	expect(markers.length).toBeGreaterThan(2);
	const core = [
		"src/Appearance/ClassicyAppearancePackageRegistry.ts",
		"src/Appearance/ClassicyAssetRegistry.ts",
		"src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts",
	]
		.map((file) => readFileSync(path.join(repoRoot, file), "utf8"))
		.join("\n");
	for (const marker of markers) expect(core, marker).toContain(marker);
});

// The fixture mirrors the package's layout: every folder the script reads
// exists in the package.
it("reads folders the package has", () => {
	const packageDir = path.resolve(import.meta.dirname, "..");
	for (const dir of [
		"src/assets/fonts",
		"src/assets/art",
		"assets/art",
		"assets/cursors",
		"assets/wallpapers",
		"assets/sounds/platinum",
	])
		expect(existsSync(path.join(packageDir, dir)), dir).toBe(true);
});

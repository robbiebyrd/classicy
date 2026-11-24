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
import {
	classicyCommonJsDeclaration,
	classicyCommonJsDeclarationFile,
} from "../../../../bin/classicyCommonJsDeclarations";
import { classicyFontStylesheet } from "../../../../bin/classicyFontStylesheet";
import { CLASSICY_NODE_IMPORT_FIXTURE } from "../../../../bin/classicyNodeImportFixture";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";
import { classicyUmdLoader } from "../../../../bin/classicyUmdLoader";
import { PLATINUM_FONT_FACES } from "../src/assets/platinumFonts.internal";

// The package's dist check, bin/verify-dist.mjs (plan 0015-kxa §3.4), run for
// real on a fixture package folder: the shape of Platinum's (src/assets/fonts,
// art, cursors, wallpapers and sounds/platinum) with a few files each, and a dist/ built to pass.
// Each case breaks one thing and expects the script to name it.

const SCRIPT = path.resolve(import.meta.dirname, "verify-dist.mjs");
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const root = mkdtempSync(path.join(tmpdir(), "platinum-verify-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow{border:1px solid}}';
// PACKAGE as the JavaScript string literal the fixture bundles carry. Written
// out, not built with JSON.stringify, so the fixture source is fixed text; a
// test below keeps it equal to PACKAGE.
const PACKAGE_LITERAL = String.raw`"@layer classicy.package{.classicyDesktop[data-classicy-appearance=\"platinum\"] .classicyWindow{border:1px solid}}"`;
const HALFTONE = "data:image/svg+xml,%3csvg%3e%3c/svg%3e";
const bytes = (seed: number, n = 64) =>
	Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256));

// Source file → its bytes. Every one ships in dist/assets under its name,
// except the wallpaper photos, which nothing imports. The art and wallpapers
// are WebP (plan 0019-fb7 §6.4), except alias.png, the one original kept
// (PLATINUM_ORIGINAL_FORMAT_EXCEPTIONS); the cursors stay PNG.
const SOURCES: Record<string, Buffer> = {
	...Object.fromEntries(
		PLATINUM_FONT_FACES.map((face, i) => [
			`src/assets/fonts/${face.file}.woff2`,
			bytes(i),
		]),
	),
	"src/assets/art/zoom.svg": Buffer.from("<svg/>"),
	"src/assets/art/sad-mac.webp": bytes(40),
	"src/assets/art/apple.webp": bytes(41),
	"src/assets/art/alias.png": bytes(46),
	"src/assets/cursors/cursor-watch.png": bytes(42),
	"src/assets/wallpapers/azul_dark.webp": bytes(43),
	"src/assets/wallpapers/default_photo.webp": bytes(44),
	"src/assets/wallpapers/photos/beach.jpg": bytes(45),
	...Object.fromEntries(
		["ogg", "m4a"].map((ext, i) => [
			`src/assets/sounds/platinum/platinum.${ext}`,
			bytes(50 + i),
		]),
	),
	// The screen savers' art (plan 0016-vbq §2.1): one folder per saver.
	"src/screenSavers/Fish/fish-red.webp": bytes(70),
	"src/screenSavers/Warp/stars1.webp": bytes(71),
	"src/assets/sounds/platinum/platinum.json": Buffer.from("{}"),
	"src/assets/sounds/platinum/sprites/ClassicyBeep.mp3": bytes(60),
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
const ES = `import{registerClassicyAppearancePackage as r}from"@classicy/classicy";import{jsx as j}from"react/jsx-runtime";const h="${HALFTONE}";const u=[${urls}];const css=${PACKAGE_LITERAL};r({css});export{u};\n//# sourceMappingURL=appearance-platinum.es.js.map\n`;
const UMD = `(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("@classicy/classicy"),require("react/jsx-runtime")):f(g.classicyAppearancePlatinum={},g.classicy,g.React)})(this,function(e,c,j){const h="${HALFTONE}";const z=typeof document>"u"?$classicyUrl().pathToFileURL(__dirname+"/assets/zoom.svg").href:"";const css=${PACKAGE_LITERAL};c.registerClassicyAppearancePackage({css});});\nfunction $classicyUrl(){return process.getBuiltinModule("node:url")}\n`;
const FONTS = classicyFontStylesheet(
	PLATINUM_FONT_FACES,
	(face) => `assets/${face.file}.woff2`,
	"classicy-platinum.fonts.css",
);
// A source map as the library build writes it: Classicy's own text kept.
const MAP = JSON.stringify({
	version: 3,
	sources: ["../src/index.ts"],
	sourcesContent: ["x"],
	names: [],
	mappings: "",
});
const DIST: Record<string, string | Buffer> = {
	"appearance-platinum.es.js": ES,
	"appearance-platinum.es.js.map": MAP,
	"appearance-platinum.umd.js": UMD,
	"appearance-platinum.umd.js.map": MAP,
	"appearance-platinum.umd.cjs": classicyUmdLoader(
		"appearance-platinum.umd.js",
		"@classicy/appearance-platinum",
	),
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
 * Writes the fixture package (the sources with `sourceChanges` applied, then
 * dist/ with `changes` applied: a path to new content, or `null` to delete
 * it) and runs the script in it.
 */
const verify = (
	changes: Record<string, string | Buffer | null> = {},
	sourceChanges: Record<string, Buffer | null> = {},
) => {
	const dir = path.join(root, `case-${run++}`);
	// What the bundles import, for the server-import invariant (11).
	for (const [file, content] of Object.entries(CLASSICY_NODE_IMPORT_FIXTURE)) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	for (const [file, content] of Object.entries({
		...SOURCES,
		...sourceChanges,
	})) {
		if (content === null) continue;
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	// Each declaration's .d.cts twin, as the build writes it (invariant 7),
	// unless the case sets the twin itself.
	const files: Record<string, string | Buffer | null> = { ...DIST, ...changes };
	for (const [file, content] of Object.entries(files))
		if (
			file.endsWith(".d.ts") &&
			typeof content === "string" &&
			!(classicyCommonJsDeclarationFile(file) in changes)
		)
			files[classicyCommonJsDeclarationFile(file)] =
				classicyCommonJsDeclaration(content);
	for (const [file, content] of Object.entries(files)) {
		if (content === null) continue;
		const target = path.join(dir, "dist", file);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, content);
	}
	const result = spawnSync(process.execPath, [SCRIPT], {
		cwd: dir,
		encoding: "utf8",
		// The fixture bundles start no load-time task to wait for (invariant 11).
		env: { ...process.env, CLASSICY_NODE_IMPORT_SETTLE_MS: "0" },
	});
	return { status: result.status, stderr: result.stderr.trim() };
};

describe("bin/verify-dist.mjs", () => {
	it("carries PACKAGE as its JavaScript string literal", () => {
		expect(JSON.parse(PACKAGE_LITERAL)).toBe(PACKAGE);
	});

	it("passes a dist that holds what the package ships", () =>
		expect(verify()).toEqual({ status: 0, stderr: "" }));

	// Invariant 1: one copy of the registries (design 0014-ahm anti-goal).
	describe("1. the core is an import, not a copy", () => {
		it("fails a bundle that does not import @classicy/classicy", () => {
			const { status, stderr } = verify({
				"appearance-platinum.umd.js": UMD.replace(
					'require("@classicy/classicy")',
					'require("@classicy/classicy-copy")',
				),
			});
			expect(status).toBe(1);
			expect(stderr.split("\n")).toEqual([
				'dist/appearance-platinum.umd.js: externalizes "@classicy/classicy-copy", which is not the core or React -> check `external` in vite.config.ts.',
				"dist/appearance-platinum.umd.js: does not import @classicy/classicy -> the core must stay external (a peer dependency), or Platinum registers into a copy of the registries nothing reads.",
				// And Node cannot load it (invariant 11), in either environment.
				expect.stringMatching(
					/^dist\/appearance-platinum\.umd\.cjs: does not require cleanly in Node with no browser globals: throws Error: Cannot find module '@classicy\/classicy-copy'/,
				),
				expect.stringMatching(
					/^dist\/appearance-platinum\.umd\.cjs: does not require cleanly in Node with Node's own globals: throws Error: Cannot find module '@classicy\/classicy-copy'/,
				),
			]);
		});

		// Vite's Node-only asset URL shim is UMD output; an ES bundle has none.
		it("fails Node's url module in the ES bundle", () =>
			expect(
				verify({
					"appearance-platinum.es.js": `import"url";${ES}`,
				}).stderr,
			).toBe(
				'dist/appearance-platinum.es.js: externalizes "url", which is not the core or React -> check `external` in vite.config.ts.',
			));

		// Rollup's UMD asset URL, require("url"), which a browser bundler that
		// bundles the UMD bundle cannot resolve: the build rewrites it
		// (bin/classicyUmdNodeUrl.ts).
		it("fails Node's url module in the UMD bundle too", () =>
			expect(
				verify({
					"appearance-platinum.umd.js": UMD.replace(
						"$classicyUrl()",
						'require("url")',
					),
				}).stderr,
			).toBe(
				'dist/appearance-platinum.umd.js: externalizes "url", which is not the core or React -> check `external` in vite.config.ts.',
			));

		it("fails a bundle that carries the core's registries", () =>
			expect(
				verify({
					"appearance-platinum.es.js": ES.replace(
						"export{u};",
						// Never called: the core warns only when a pack is rejected,
						// and a bundle that logged at load would fail invariant 11.
						'const w=()=>console.warn("Rejected sound pack");export{u,w};',
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
				}).stderr.split("\n"),
			).toEqual([
				'dist/appearance-platinum.es.js: externalizes "@classicy/classicy/x.svg?url", which carries a Vite query -> an asset import must stay bundled.',
				// Nor can Node resolve it (invariant 11), in either environment.
				expect.stringMatching(
					/^dist\/appearance-platinum\.es\.js: does not import cleanly in Node with no browser globals: throws Error: Package subpath '\.\/x\.svg\?url' is not defined by "exports"/,
				),
				expect.stringMatching(
					/^dist\/appearance-platinum\.es\.js: does not import cleanly in Node with Node's own globals: throws Error: Package subpath '\.\/x\.svg\?url' is not defined by "exports"/,
				),
			]));
	});

	// Invariant 2 (the core's old 5, and 0131-ku3's review): exactly the
	// package's files, each byte for byte.
	describe("2. dist/assets holds every package file, as authored", () => {
		it("fails a missing file, by name", () =>
			expect(verify({ "assets/default_photo.webp": null })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing default_photo.webp; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					// And the bundle's reference to it dangles (invariant 3).
					"dist/appearance-platinum.es.js: new URL() names no file in dist/assets: assets/default_photo.webp",
				].join("\n"),
			}));

		it("fails a leftover platinum.mp3 in dist/assets", () =>
			expect(verify({ "assets/platinum.mp3": bytes(1) }).stderr).toMatch(
				/^dist\/assets: missing none; extra platinum\.mp3 /,
			));

		it("fails a file nothing ships, a leftover original included", () =>
			expect(verify({ "assets/sad-mac.png": bytes(1) })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing none; extra sad-mac.png -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					// And nothing loads it (invariant 3).
					"dist/appearance-platinum.es.js: references no new URL() for sad-mac.png in dist/assets -> nothing loads it.",
				].join("\n"),
			}));

		// Plan 0019-fb7 §6.4: the art and wallpapers ship as WebP; only a file
		// PLATINUM_ORIGINAL_FORMAT_EXCEPTIONS names keeps its PNG or JPG.
		it.each([
			"src/assets/art/apple.png",
			"src/assets/wallpapers/azul_dark.png",
			"src/assets/wallpapers/default.jpg",
		])("fails %s, an original that is not an exception", (file) =>
			expect(verify({}, { [file]: bytes(9) })).toEqual({
				status: 1,
				stderr: `${file}: ships in its original format -> the package's art and wallpapers ship as WebP: convert it (node bin/convert-images-to-webp.ts packages/appearance/platinum) and git rm the original, or list it in PLATINUM_ORIGINAL_FORMAT_EXCEPTIONS if the browser check keeps it.`,
			}));

		// The exception list itself is pinned to the converter's kept
		// originals by src/assets/platinumWebp.test.ts.
		it("passes alias.png, the one exception, in its PNG", () => {
			expect(SOURCES["src/assets/art/alias.png"]).toBeDefined();
			expect(verify()).toEqual({ status: 0, stderr: "" });
		});

		it.each([
			"cursor-watch.png",
			"azul_dark.webp",
			"default_photo.webp",
			"apple.webp",
			"alias.png",
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

		// The savers' art ships from src/screenSavers, not src/assets.
		it.each([
			"fish-red.webp",
			"stars1.webp",
		])("fails the saver image %s when it is missing", (file) =>
			expect(verify({ [`assets/${file}`]: null })).toEqual({
				status: 1,
				stderr: [
					`dist/assets: missing ${file}; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.`,
					`dist/appearance-platinum.es.js: new URL() names no file in dist/assets: assets/${file}`,
				].join("\n"),
			}));

		it.each([
			["fish-red.webp", "Fish"],
			["stars1.webp", "Warp"],
		])("fails the saver image %s when it differs from its source", (file, dir) =>
			expect(verify({ [`assets/${file}`]: Buffer.from("changed") })).toEqual({
				status: 1,
				stderr: `${path.join("dist", "assets", file)}: differs from ${path.join("src", "screenSavers", dir, file)} -> package files ship byte for byte; check the build's plugins (an image optimizer?).`,
			}));

		it("fails a stray file beside the bundles", () =>
			expect(verify({ "classicy.css": "" })).toEqual({
				status: 1,
				stderr:
					"dist/classicy.css: not a file the package ships -> the package's dist holds its two bundles and their maps, the UMD bundle's CommonJS loader, classicy-platinum.css, classicy-platinum.fonts.css, assets/ and types/.",
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
					'new URL("assets/apple.webp",import.meta.url).href,',
					"",
				),
			});
			expect(status).toBe(1);
			expect(stderr).toBe(
				"dist/appearance-platinum.es.js: references no new URL() for apple.webp in dist/assets -> nothing loads it.",
			);
		});
	});

	// Invariant 4 (the core's old 7): the look ships in both bundles and as
	// the strict-CSP stylesheet, byte for byte.
	describe("4. the package stylesheet", () => {
		it("fails a bundle without it", () =>
			expect(
				verify({
					"appearance-platinum.umd.js": UMD.replaceAll(PACKAGE_LITERAL, '""'),
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

	// Invariant 9 (the core's 15).
	it("9. fails a stylesheet calling round() with no fallback", () =>
		expect(
			verify({
				"classicy-platinum.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace(".classicyWindow", ".a{left:round(50%,1px)} .classicyWindow")}`,
			}).stderr,
		).toMatch(
			/dist\/classicy-platinum\.css: `left: round\(50%,1px\)` in `[^`]*\.a` calls round\(\)/,
		));

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

		// The exports map's `require` types (story 0223-a0y).
		it("fails a declaration without its .d.cts twin", () =>
			expect(verify({ "types/hooks.d.cts": null })).toEqual({
				status: 1,
				stderr:
					"dist/types/hooks.d.cts: missing -> a CommonJS TypeScript host reads it for require(); check afterBuild (classicyCommonJsDeclarationsWriter) on dts in vite.config.ts.",
			}));

		it("fails a .d.cts twin that is not its declaration's", () =>
			expect(
				verify({ "types/index.d.cts": 'export * from "./hooks.js";\n' }),
			).toEqual({
				status: 1,
				stderr:
					"dist/types/index.d.cts: is not index.d.ts with its relative specifiers ending in .cjs -> it is written by classicyCommonJsDeclarationsWriter (bin/classicyCommonJsDeclarations.ts), not by hand.",
			}));

		it("fails a .d.cts with no declaration", () =>
			expect(verify({ "types/stray.d.cts": "export {};\n" })).toEqual({
				status: 1,
				stderr:
					"dist/types/stray.d.cts: has no stray.d.ts -> a .d.cts is only ever a .d.ts's CommonJS twin.",
			}));

		it("fails a declaration map", () =>
			expect(verify({ "types/index.d.ts.map": "{}" })).toEqual({
				status: 1,
				stderr:
					"dist/types: 1 declaration map(s) (index.d.ts.map) -> each dts() call must pass compilerOptions: { declarationMap: false }.",
			}));

		it("fails a test declaration", () =>
			expect(verify({ "types/hooks.test.d.ts": "export {};\n" })).toEqual({
				status: 1,
				stderr:
					"dist/types: 1 declaration(s) of tests, test helpers or stories (hooks.test.d.ts) -> check the dts exclude in vite.config.ts.",
			}));
	});

	// Invariant 8: the production JSX runtime (the core's invariant 13).
	describe("8. both bundles use the production JSX runtime", () => {
		const jsxLines = (stderr: string) =>
			stderr.split("\n").filter((l) => /JSX|jsxDEV|build-machine/.test(l));

		it("passes the production runtime (the baseline bundles import it)", () =>
			expect(verify().stderr).toBe(""));

		it.each([
			[
				"the dev runtime import",
				'import{jsxDEV as d}from"react/jsx-dev-runtime";',
				/^dist\/appearance-platinum\.es\.js: references react\/jsx-dev-runtime /,
			],
			[
				"a jsxDEV call",
				'x.jsxDEV("a",{});',
				/^dist\/appearance-platinum\.es\.js: calls jsxDEV\(\) /,
			],
			[
				"a /home/ fileName",
				'f({fileName:"/home/me/src/A.tsx",lineNumber:1});',
				/^dist\/appearance-platinum\.es\.js: carries absolute build-machine paths in fileName /,
			],
		])("fails the ES bundle with %s", (_n, body, message) => {
			const r = verify({ "appearance-platinum.es.js": `${body}${ES}` });
			expect(r.status).toBe(1);
			expect(jsxLines(r.stderr)[0]).toMatch(message);
		});

		it("fails the UMD bundle with a jsxDEV call", () => {
			const r = verify({
				"appearance-platinum.umd.js": `${UMD}x.jsxDEV("a",{});`,
			});
			expect(r.status).toBe(1);
			expect(jsxLines(r.stderr).join("\n")).toMatch(
				/^dist\/appearance-platinum\.umd\.js: calls jsxDEV\(\)/,
			);
		});
	});

	// Invariant 10 (the core's 16, plan 0019-fb7 Part 1): the maps keep
	// Classicy's own text and drop third-party and asset text.
	describe("10. the source maps carry Classicy's own text only", () => {
		const VENDOR =
			"../../../../node_modules/.pnpm/zod@4.1.12/node_modules/zod/index.js";

		it("fails on vendor text in appearance-platinum.es.js.map", () =>
			expect(
				verify({
					"appearance-platinum.es.js.map": JSON.stringify({
						version: 3,
						sources: ["../src/index.ts", VENDOR],
						sourcesContent: ["x", "y"],
						names: [],
						mappings: "",
						x_google_ignoreList: [1],
					}),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/appearance-platinum.es.js.map: keeps the text of vendor source ${VENDOR} -> the library build must run classicySourceMapTextPlugin.`,
			}));

		it("fails on an own source with null text", () =>
			expect(
				verify({
					"appearance-platinum.umd.js.map": JSON.stringify({
						version: 3,
						sources: ["../src/index.ts"],
						sourcesContent: [null],
						names: [],
						mappings: "",
					}),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-platinum.umd.js.map: has no text for Classicy's own source ../src/index.ts -> only third-party and asset text may be dropped; if it is an embedded asset, add its extension to CLASSICY_MAP_ASSET_EXTENSIONS.",
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
		"src/assets/cursors",
		"src/assets/wallpapers",
		"src/assets/sounds/platinum",
		"src/screenSavers",
	])
		expect(existsSync(path.join(packageDir, dir)), dir).toBe(true);
});

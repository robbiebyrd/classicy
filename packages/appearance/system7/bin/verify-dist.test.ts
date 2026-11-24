import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { classicyFontStylesheet } from "../../../../bin/classicyFontStylesheet";
import { CLASSICY_NODE_IMPORT_FIXTURE } from "../../../../bin/classicyNodeImportFixture";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";
import { classicyUmdLoader } from "../../../../bin/classicyUmdLoader";
import { SYSTEM7_FONT_FACES } from "../src/assets/system7Fonts.internal";
import { system7AssetFileName } from "./system7AssetNames";

// The package's dist check, bin/verify-dist.mjs (plan 0018-dbd §2.2), run for
// real on a fixture package folder: the shape System 7's takes (src/assets/
// fonts, art and its variant folders, icons/<variant>/<size>, cursors,
// wallpapers and sounds/system7)
// with a few files each, beside a Platinum source folder holding two savers'
// art (../platinum/src/screenSavers, which every case shares), and a dist/
// built to pass. Each case breaks one thing and expects the script to name
// it, as Platinum's verify-dist.test.ts does.

const SCRIPT = path.resolve(import.meta.dirname, "verify-dist.mjs");
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const root = mkdtempSync(path.join(tmpdir(), "system7-verify-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="system7"] .classicyWindow{border:1px solid}}';
// PACKAGE as the JavaScript string literal the fixture bundles carry. Written
// out, not built with JSON.stringify, so the fixture source is fixed text; a
// test below keeps it equal to PACKAGE.
const PACKAGE_LITERAL = String.raw`"@layer classicy.package{.classicyDesktop[data-classicy-appearance=\"system7\"] .classicyWindow{border:1px solid}}"`;
// The masks, the files the bundles inline: the dither checker (as Vite
// writes an SVG `data:` URI: single quotes, the rest percent-encoded), and
// the stripe and dot WebPs and the 1-bit Apple and Help titles' art
// (base64, plan 0019-fb7 §6.5), whose files ship too.
const DITHER_CHECKER =
	'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect x="1" width="1" height="1"/></svg>';
const DITHER_URI = `data:image/svg+xml,${encodeURIComponent(DITHER_CHECKER.replaceAll('"', "'")).replaceAll("%27", "'")}`;
const bytes = (seed: number, n = 64) =>
	Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256));
const WEBP_MASKS: Record<string, Buffer> = {
	"src/assets/art/color/window-stripes.webp": bytes(80, 84),
	"src/assets/art/bw/window-stripes.webp": bytes(81, 82),
	"src/assets/art/color/window-utility-texture.webp": bytes(82, 73),
	"src/assets/art/bw/window-utility-texture.webp": bytes(83, 73),
	"src/assets/art/bw/apple-menu.webp": bytes(84, 60),
	"src/assets/art/bw/help-button.webp": bytes(85, 61),
};
const webpUri = (file: string) =>
	`data:image/webp;base64,${WEBP_MASKS[file]?.toString("base64")}`;
const MASK_URIS = Object.keys(WEBP_MASKS)
	.map((file, i) => `const m${i}="${webpUri(file)}";`)
	.join("");
const MASKS_NAMED =
	"src/assets/art/dither-checker.svg, src/assets/art/color/window-stripes.webp, src/assets/art/color/window-utility-texture.webp, src/assets/art/bw/window-stripes.webp, src/assets/art/bw/window-utility-texture.webp, src/assets/art/bw/apple-menu.webp, src/assets/art/bw/help-button.webp";

// Source file → its bytes. Every one ships in dist/assets under its name,
// except the wallpaper photos, which nothing imports.
const SOURCES: Record<string, Buffer> = {
	...Object.fromEntries(
		SYSTEM7_FONT_FACES.map((face, i) => [
			`src/assets/fonts/${face.file}.woff2`,
			bytes(i),
		]),
	),
	"src/assets/art/zoom.svg": Buffer.from("<svg/>"),
	"src/assets/art/dither-checker.svg": Buffer.from(DITHER_CHECKER),
	...WEBP_MASKS,
	"src/assets/art/bw/apple-bw.webp": bytes(40),
	"src/assets/art/color/apple.webp": bytes(41),
	// One name in two variant folders, and in an icon's four folders.
	"src/assets/art/bw/trash.webp": bytes(44),
	"src/assets/art/color/trash.webp": bytes(45),
	"src/assets/icons/color/32/disk.webp": bytes(46),
	"src/assets/icons/color/16/disk.webp": bytes(47),
	"src/assets/icons/bw/32/disk.webp": bytes(48),
	"src/assets/icons/bw/16/disk.webp": bytes(49),
	// The cursors stay PNG.
	"src/assets/cursors/cursor-watch.png": bytes(42),
	"src/assets/wallpapers/pattern.webp": bytes(43),
	"src/assets/sounds/system7/system7.ogg": bytes(50),
	"src/assets/sounds/system7/system7.m4a": bytes(51),
	"src/assets/sounds/system7/system7.json": Buffer.from("{}"),
	"src/assets/sounds/system7/system7.sprites.sha256": Buffer.from("0"),
	"src/assets/sounds/system7/sprites/ClassicyBeep.wav": bytes(60),
};
// The screen savers' art, in Platinum's source beside the package folder
// (plan 0018-dbd §3.8): every case dir is a sibling of this platinum/.
const SAVER_ART: Record<string, Buffer> = {
	"platinum/src/screenSavers/Fish/fish-angel.webp": bytes(70),
	"platinum/src/screenSavers/Logo/logo.webp": bytes(71),
	"platinum/src/screenSavers/Logo/ClassicyScreenSaverLogo.tsx": bytes(72),
};
for (const [file, content] of Object.entries(SAVER_ART)) {
	mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
	writeFileSync(path.join(root, file), content);
}
const SAVER_SHIPPED = Object.keys(SAVER_ART).filter((file) =>
	file.endsWith(".webp"),
);
const SHIPPED = [
	...Object.keys(SOURCES).filter(
		(file) =>
			!file.includes("/sprites/") &&
			!file.endsWith(".json") &&
			!file.endsWith(".sha256"),
	),
	...SAVER_SHIPPED,
];
/** A shipped file's bytes: the package's, or a saver's in Platinum's source. */
const sourceBytes = (file: string) => SOURCES[file] ?? SAVER_ART[file];

const urls = SHIPPED.map(
	(file) =>
		`new URL("assets/${system7AssetFileName(file)}",import.meta.url).href`,
).join(",");
const ES = `import{registerClassicyAppearancePackage as r}from"@classicy/classicy";import{jsx as j}from"react/jsx-runtime";const d="${DITHER_URI}";${MASK_URIS}const u=[${urls}];const css=${PACKAGE_LITERAL};r({css});export{u};\n//# sourceMappingURL=appearance-system7.es.js.map\n`;
const UMD = `(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("@classicy/classicy"),require("react/jsx-runtime")):f(g.classicyAppearanceSystem7={},g.classicy,g.React)})(this,function(e,c,j){const d="${DITHER_URI}";${MASK_URIS}const z=typeof document>"u"?require("url").pathToFileURL(__dirname+"/assets/zoom.svg").href:"";const css=${PACKAGE_LITERAL};c.registerClassicyAppearancePackage({css});});\n`;
const FONTS = classicyFontStylesheet(
	SYSTEM7_FONT_FACES,
	(face) => `assets/${face.file}.woff2`,
	"classicy-system7.fonts.css",
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
	"appearance-system7.es.js": ES,
	"appearance-system7.es.js.map": MAP,
	"appearance-system7.umd.js": UMD,
	"appearance-system7.umd.js.map": MAP,
	"appearance-system7.umd.cjs": classicyUmdLoader("appearance-system7.umd.js"),
	"classicy-system7.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
	"classicy-system7.fonts.css": FONTS,
	"types/index.d.ts": 'export * from "./hooks.js";\n',
	"types/hooks.d.ts": "export declare const a: number;\n",
	...Object.fromEntries(
		SHIPPED.map((file) => [
			`assets/${system7AssetFileName(file)}`,
			sourceBytes(file),
		]),
	),
};

let run = 0;
/**
 * Writes the fixture package (the sources, with `sources` over them and
 * `omit` left out, then dist/ with `changes` applied: a path to new content,
 * or `null` to delete it) and runs the script in it.
 */
const verify = (
	changes: Record<string, string | Buffer | null> = {},
	sources: Record<string, Buffer> = {},
	omit: readonly string[] = [],
) => {
	const dir = path.join(root, `case-${run++}`);
	// What the bundles import, for the server-import invariant (11).
	for (const [file, content] of Object.entries(CLASSICY_NODE_IMPORT_FIXTURE)) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	for (const [file, content] of Object.entries({ ...SOURCES, ...sources })) {
		if (omit.includes(file)) continue;
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
				"appearance-system7.umd.js": UMD.replace(
					'require("@classicy/classicy")',
					'require("@classicy/classicy-copy")',
				),
			});
			expect(status).toBe(1);
			expect(stderr.split("\n")).toEqual([
				'dist/appearance-system7.umd.js: externalizes "@classicy/classicy-copy", which is not the core or React -> check `external` in vite.config.ts.',
				"dist/appearance-system7.umd.js: does not import @classicy/classicy -> the core must stay external (a peer dependency), or System 7 registers into a copy of the registries nothing reads.",
				// And Node cannot load it (invariant 11).
				expect.stringMatching(
					/^dist\/appearance-system7\.umd\.cjs: does not require cleanly in Node with no browser globals: throws Error: Cannot find module '@classicy\/classicy-copy'/,
				),
			]);
		});

		// Vite's Node-only asset URL shim is UMD output; an ES bundle has none.
		it("fails Node's url module in the ES bundle", () =>
			expect(
				verify({
					"appearance-system7.es.js": `import"url";${ES}`,
				}).stderr,
			).toBe(
				'dist/appearance-system7.es.js: externalizes "url", which is not the core or React -> check `external` in vite.config.ts.',
			));

		it("fails a bundle that carries the core's registries", () =>
			expect(
				verify({
					"appearance-system7.es.js": ES.replace(
						"export{u};",
						// Never called: the core warns only when a pack is rejected,
						// and a bundle that logged at load would fail invariant 11.
						'const w=()=>console.warn("Rejected sound pack");export{u,w};',
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					'dist/appearance-system7.es.js: carries the core\'s registry code ("Rejected sound pack") -> @classicy/classicy must stay external.',
			}));

		it("fails an import that carries a Vite query", () =>
			expect(
				verify({
					"appearance-system7.es.js": `import"@classicy/classicy/x.svg?url";${ES}`,
				}).stderr.split("\n"),
			).toEqual([
				'dist/appearance-system7.es.js: externalizes "@classicy/classicy/x.svg?url", which carries a Vite query -> an asset import must stay bundled.',
				// Nor can Node resolve it (invariant 11).
				expect.stringMatching(
					/^dist\/appearance-system7\.es\.js: does not import cleanly in Node with no browser globals: throws Error: Package subpath '\.\/x\.svg\?url' is not defined by "exports"/,
				),
			]));
	});

	// Invariant 2 (the core's old 5, and 0131-ku3's review): exactly the
	// package's files, each byte for byte.
	describe("2. dist/assets holds every package file, as authored", () => {
		it("fails a missing file, by name", () =>
			expect(verify({ "assets/pattern.webp": null })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing pattern.webp; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					// And the bundle's reference to it dangles (invariant 3).
					"dist/appearance-system7.es.js: new URL() names no file in dist/assets: assets/pattern.webp",
				].join("\n"),
			}));

		// System 7 bundles Platinum's savers, so it ships their art.
		it("fails a missing saver image, by name", () =>
			expect(verify({ "assets/logo.webp": null })).toEqual({
				status: 1,
				stderr: [
					"dist/assets: missing logo.webp; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
					"dist/appearance-system7.es.js: new URL() names no file in dist/assets: assets/logo.webp",
				].join("\n"),
			}));

		it("fails a saver image that differs from Platinum's source", () =>
			expect(
				verify({ "assets/fish-angel.webp": Buffer.from("changed") }),
			).toEqual({
				status: 1,
				stderr: `${path.join("dist", "assets", "fish-angel.webp")}: differs from ${path.join("..", "platinum", "src", "screenSavers", "Fish", "fish-angel.webp")} -> package files ship byte for byte; check the build's plugins (an image optimizer?).`,
			}));

		it("fails a leftover system7.mp3 in dist/assets", () =>
			expect(verify({ "assets/system7.mp3": bytes(1) }).stderr).toMatch(
				/^dist\/assets: missing none; extra system7\.mp3 /,
			));

		// The art, icons and wallpapers ship as WebP (plan 0019-fb7 §6.5): a
		// PNG of one in dist/assets is a file nothing ships.
		it.each([
			"art-color-apple.png",
			"icons-color-32-disk.png",
			"pattern.png",
		])("fails a file nothing ships, the PNG %s included", (file) =>
			expect(verify({ [`assets/${file}`]: bytes(1) })).toEqual({
				status: 1,
				stderr: [
					`dist/assets: missing none; extra ${file} -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.`,
					// And nothing loads it (invariant 3).
					`dist/appearance-system7.es.js: references no new URL() for ${file} in dist/assets -> nothing loads it.`,
				].join("\n"),
			}));

		it.each([
			"cursor-watch.png",
			"pattern.webp",
			"zoom.svg",
			"system7.ogg",
			"system7.m4a",
			"Geneva-bold-normal.woff2",
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

		// A variant or size folder's file ships with its folders in its name
		// (bin/system7AssetNames.ts), so one name in two folders never clashes.
		it.each([
			["art-bw-trash.webp", "art/bw/trash.webp"],
			["art-color-trash.webp", "art/color/trash.webp"],
			["icons-color-32-disk.webp", "icons/color/32/disk.webp"],
			["icons-bw-16-disk.webp", "icons/bw/16/disk.webp"],
		])("fails the folder image %s when it differs from %s", (file, source) =>
			expect(verify({ [`assets/${file}`]: Buffer.from("changed") })).toEqual({
				status: 1,
				stderr: `${path.join("dist", "assets", file)}: differs from ${path.join("src", "assets", ...source.split("/"))} -> package files ship byte for byte; check the build's plugins (an image optimizer?).`,
			}));

		it("fails a folder image shipped under its bare name", () => {
			const { status, stderr } = verify({
				"assets/icons-color-32-disk.webp": null,
				"assets/disk.webp": SOURCES["src/assets/icons/color/32/disk.webp"],
			});
			expect(status).toBe(1);
			expect(stderr.split("\n")[0]).toBe(
				"dist/assets: missing icons-color-32-disk.webp; extra disk.webp -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
			);
		});

		// The build emits byte-identical files once, under either name.
		it("passes identical sources shipped once, under either name", () => {
			const twin = { "src/assets/icons/bw/32/disk.webp": bytes(46) };
			expect(
				verify(
					{
						"assets/icons-bw-32-disk.webp": null,
						"appearance-system7.es.js": ES.replace(
							'new URL("assets/icons-bw-32-disk.webp",import.meta.url).href,',
							"",
						),
					},
					twin,
				),
			).toEqual({ status: 0, stderr: "" });
		});

		it("fails identical sources when neither ships", () => {
			const twin = { "src/assets/icons/bw/32/disk.webp": bytes(46) };
			const { status, stderr } = verify(
				{
					"assets/icons-bw-32-disk.webp": null,
					"assets/icons-color-32-disk.webp": null,
				},
				twin,
			);
			expect(status).toBe(1);
			expect(stderr.split("\n")[0]).toBe(
				"dist/assets: missing icons-bw-32-disk.webp or icons-color-32-disk.webp; extra none -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.",
			);
		});

		// The sound sheet ships; its JSON, hash and sprite sources do not.
		it("fails a sprite source in dist/assets", () =>
			expect(verify({ "assets/ClassicyBeep.wav": bytes(60) }).stderr).toMatch(
				/^dist\/assets: missing none; extra ClassicyBeep\.wav /,
			));

		it("fails a stray file beside the bundles", () =>
			expect(verify({ "classicy.css": "" })).toEqual({
				status: 1,
				stderr:
					"dist/classicy.css: not a file the package ships -> the package's dist holds its two bundles and their maps, the UMD bundle's CommonJS loader, classicy-system7.css, classicy-system7.fonts.css, assets/ and types/.",
			}));
	});

	// Invariant 3: assets are files, referenced from the bundle; the inlined
	// files are the masks.
	describe("3. nothing is inlined but the masks", () => {
		it.each([
			["a PNG", "data:image/png;base64,AAAA", "image/png"],
			[
				"another SVG",
				"data:image/svg+xml,%3csvg%3e%3c/svg%3e",
				"image/svg+xml",
			],
		])("fails a bundle that inlines %s", (_kind, uri, type) =>
			expect(
				verify({
					"appearance-system7.umd.js": UMD.replace(
						"const z=",
						`const h="${uri}";const z=`,
					),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/appearance-system7.umd.js: inlines ${type} -> System 7 inlines only its masks (${MASKS_NAMED}); check noInlineAppearanceAssetsPlugin.`,
			}));

		it("fails the dither checker inlined when its source changed", () =>
			expect(
				verify(
					{},
					{
						"src/assets/art/dither-checker.svg": Buffer.from(
							DITHER_CHECKER.replace('x="1"', 'x="0"'),
						),
					},
				).stderr.split("\n"),
			).toContain(
				`dist/appearance-system7.es.js: inlines image/svg+xml -> System 7 inlines only its masks (${MASKS_NAMED}); check noInlineAppearanceAssetsPlugin.`,
			));

		it.each([
			["a stripe mask", "src/assets/art/bw/window-stripes.webp"],
			["a 1-bit title's mask", "src/assets/art/bw/apple-menu.webp"],
		])("fails %s inlined when its source changed", (_kind, file) =>
			expect(
				verify(
					{},
					{
						[file]: bytes(90, 82),
					},
				).stderr.split("\n"),
			).toEqual(
				expect.arrayContaining([
					`dist/appearance-system7.es.js: inlines image/webp -> System 7 inlines only its masks (${MASKS_NAMED}); check noInlineAppearanceAssetsPlugin.`,
					`dist/appearance-system7.umd.js: inlines image/webp -> System 7 inlines only its masks (${MASKS_NAMED}); check noInlineAppearanceAssetsPlugin.`,
				]),
			));

		// The masks ship inline as WebP (plan 0019-fb7 §6.5): their bytes
		// typed as a PNG are no mask.
		it("fails on an inlined PNG mask", () =>
			expect(
				verify({
					"appearance-system7.es.js": ES.replace(
						webpUri("src/assets/art/bw/apple-menu.webp"),
						webpUri("src/assets/art/bw/apple-menu.webp").replace(
							"data:image/webp;",
							"data:image/png;",
						),
					),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/appearance-system7.es.js: inlines image/png -> System 7 inlines only its masks (${MASKS_NAMED}); check noInlineAppearanceAssetsPlugin.`,
			}));

		it("fails a mask's source gone", () =>
			expect(
				verify(
					{
						"appearance-system7.es.js": ES.replace(
							`const m3="${webpUri("src/assets/art/bw/window-utility-texture.webp")}";`,
							"",
						),
						"appearance-system7.umd.js": UMD.replace(
							`const m3="${webpUri("src/assets/art/bw/window-utility-texture.webp")}";`,
							"",
						),
					},
					{},
					["src/assets/art/bw/window-utility-texture.webp"],
				).stderr.split("\n"),
			).toContain(
				"src/assets/art/bw/window-utility-texture.webp: missing -> a mask the bundles inline.",
			));

		it("fails a reference to a file that is not in dist/assets", () =>
			expect(
				verify({
					"appearance-system7.es.js": ES.replace(
						"const u=[",
						'const u=[new URL("assets/gone.png",import.meta.url).href,',
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-system7.es.js: new URL() names no file in dist/assets: assets/gone.png",
			}));

		it("fails a file in dist/assets the bundle never references", () => {
			const { status, stderr } = verify({
				"appearance-system7.es.js": ES.replace(
					'new URL("assets/cursor-watch.png",import.meta.url).href,',
					"",
				),
			});
			expect(status).toBe(1);
			expect(stderr).toBe(
				"dist/appearance-system7.es.js: references no new URL() for cursor-watch.png in dist/assets -> nothing loads it.",
			);
		});
	});

	// Invariant 4 (the core's old 7): the look ships in both bundles and as
	// the strict-CSP stylesheet, byte for byte.
	describe("4. the package stylesheet", () => {
		it("fails a bundle without it", () =>
			expect(
				verify({
					"appearance-system7.umd.js": UMD.replaceAll(PACKAGE_LITERAL, '""'),
				}).stderr,
			).toMatch(
				/^dist\/appearance-system7\.umd\.js: carries no non-empty @layer classicy\.package stylesheet/,
			));

		it("fails a missing dist/classicy-system7.css", () =>
			expect(verify({ "classicy-system7.css": null }).stderr).toMatch(
				/^dist\/classicy-system7\.css: missing/,
			));

		it("fails one that differs from the injected stylesheet", () =>
			expect(
				verify({
					"classicy-system7.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace("1px", "2px")}`,
				}).stderr.split("\n"),
			).toEqual([
				expect.stringMatching(
					/^dist\/classicy-system7\.css: differs from the package stylesheet dist\/appearance-system7\.es\.js injects/,
				),
				expect.stringMatching(
					/^dist\/classicy-system7\.css: differs from the package stylesheet dist\/appearance-system7\.umd\.js injects/,
				),
			]));
	});

	// Invariant 5 (the core's old 9).
	it("5. fails a stylesheet with raw UTF-8 and no @charset", () =>
		expect(
			verify({
				"classicy-system7.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace(".classicyWindow", '.a::before{content:"✓"} .classicyWindow')}`,
			}).stderr,
		).toMatch(/dist\/classicy-system7\.css: non-ASCII byte at offset/));

	// Invariant 9 (the core's 15).
	it("9. fails a stylesheet calling round() with no fallback", () =>
		expect(
			verify({
				"classicy-system7.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace(".classicyWindow", ".a{left:round(50%,1px)} .classicyWindow")}`,
			}).stderr,
		).toMatch(
			/dist\/classicy-system7\.css: `left: round\(50%,1px\)` in `[^`]*\.a` calls round\(\)/,
		));

	// Invariant 6 (the core's old 12).
	describe("6. the font stylesheet", () => {
		it.each(["ChicagoFLF", "Monaco"])("fails a missing %s face", (family) =>
			expect(
				verify({
					"classicy-system7.fonts.css": FONTS.split("\n")
						.filter((rule) => !rule.includes(`"${family}"`))
						.join("\n"),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/classicy-system7.fonts.css: no @font-face for "${family}" normal normal, which the runtime registers.`,
			}));

		it("expects the five faces the runtime registers, Monaco among them", () =>
			expect(
				SYSTEM7_FONT_FACES.map(({ family, weight, style }) =>
					[family, weight, style].join(" "),
				),
			).toEqual([
				"ChicagoFLF normal normal",
				"Geneva normal normal",
				"Geneva bold normal",
				"Geneva normal italic",
				"Monaco normal normal",
			]));

		it("fails a missing file", () =>
			expect(verify({ "classicy-system7.fonts.css": null }).stderr).toMatch(
				/^dist\/classicy-system7\.fonts\.css: missing/,
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

		// system7Json is System7Json, on the core's types; nothing imports
		// the JSON's own declaration.
		it("fails a JSON declaration", () =>
			expect(
				verify({ "types/system7.json.d.ts": "declare const a: 1;\n" }),
			).toEqual({
				status: 1,
				stderr:
					"dist/types: 1 declaration(s) of imported JSON (system7.json.d.ts) -> check the dts exclude in vite.config.ts.",
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

		// System 7 bundles the savers but re-exports none of them (plan
		// 0018-dbd §3.8): a host that installs only System 7 must resolve
		// every type it declares.
		it("fails a declaration of a Platinum module", () =>
			expect(
				verify({
					"types/platinum/src/screenSavers/platinumScreenSavers.d.ts":
						"export {};\n",
				}),
			).toEqual({
				status: 1,
				stderr: `dist/types: 1 declaration(s) of Platinum's modules (${path.join("platinum", "src", "screenSavers", "platinumScreenSavers.d.ts")}) -> System 7 re-exports nothing of the savers; check index.ts and the dts include in vite.config.ts.`,
			}));

		// The check names folders: a module of System 7's own whose name only
		// starts with "platinum" is not Platinum's.
		it("passes a declaration whose file name only starts with platinum", () =>
			expect(
				verify({
					"types/platinumCompat.d.ts": "export declare const a: number;\n",
					"types/assets/platinumLike.d.ts": "export {};\n",
				}).status,
			).toBe(0));

		it("fails a declaration in a screenSavers folder", () =>
			expect(
				verify({ "types/screenSavers/Fish.d.ts": "export {};\n" }),
			).toEqual({
				status: 1,
				stderr: `dist/types: 1 declaration(s) of Platinum's modules (${path.join("screenSavers", "Fish.d.ts")}) -> System 7 re-exports nothing of the savers; check index.ts and the dts include in vite.config.ts.`,
			}));

		it.each([
			[
				'export * from "../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish.js";\n',
				'"../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish.js"',
			],
			[
				'export type { ClassicyScreenSaverLogoDefinition } from "@classicy/appearance-platinum";\n',
				'"@classicy/appearance-platinum"',
			],
		])("fails a declaration that references Platinum: %s", (code, named) =>
			expect(verify({ "types/index.d.ts": code })).toEqual({
				status: 1,
				stderr: `dist/types/index.d.ts: references Platinum or a file outside dist/types (${named}) -> a host that installs only System 7 resolves none of it; re-export nothing of the savers.`,
			}));

		it("passes a relative specifier that stays in dist/types, from a subfolder", () =>
			expect(
				verify({
					"types/assets/a.d.ts": 'export * from "../hooks.js";\n',
				}).status,
			).toBe(0));

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
				/^dist\/appearance-system7\.es\.js: references react\/jsx-dev-runtime /,
			],
			[
				"a jsxDEV call",
				'x.jsxDEV("a",{});',
				/^dist\/appearance-system7\.es\.js: calls jsxDEV\(\) /,
			],
			[
				"a /home/ fileName",
				'f({fileName:"/home/me/src/A.tsx",lineNumber:1});',
				/^dist\/appearance-system7\.es\.js: carries absolute build-machine paths in fileName /,
			],
		])("fails the ES bundle with %s", (_n, body, message) => {
			const r = verify({ "appearance-system7.es.js": `${body}${ES}` });
			expect(r.status).toBe(1);
			expect(jsxLines(r.stderr)[0]).toMatch(message);
		});

		it("fails the UMD bundle with a jsxDEV call", () => {
			const r = verify({
				"appearance-system7.umd.js": `${UMD}x.jsxDEV("a",{});`,
			});
			expect(r.status).toBe(1);
			expect(jsxLines(r.stderr).join("\n")).toMatch(
				/^dist\/appearance-system7\.umd\.js: calls jsxDEV\(\)/,
			);
		});
	});

	// Invariant 10 (the core's 16, plan 0019-fb7 Part 1): the maps keep
	// Classicy's own text, Platinum's savers that System 7 bundles included,
	// and drop third-party and asset text.
	describe("10. the source maps carry Classicy's own text only", () => {
		const VENDOR =
			"../../../../node_modules/.pnpm/zod@4.1.12/node_modules/zod/index.js";
		const SAVER =
			"../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish.tsx";

		it("fails on vendor text in appearance-system7.es.js.map", () =>
			expect(
				verify({
					"appearance-system7.es.js.map": JSON.stringify({
						version: 3,
						sources: ["../src/index.ts", SAVER, VENDOR],
						sourcesContent: ["x", "z", "y"],
						names: [],
						mappings: "",
						x_google_ignoreList: [2],
					}),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/appearance-system7.es.js.map: keeps the text of vendor source ${VENDOR} -> the library build must run classicySourceMapTextPlugin.`,
			}));

		it("fails on an own source with null text", () =>
			expect(
				verify({
					"appearance-system7.umd.js.map": JSON.stringify({
						version: 3,
						sources: ["../src/index.ts", SAVER],
						sourcesContent: ["x", null],
						names: [],
						mappings: "",
					}),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/appearance-system7.umd.js.map: has no text for Classicy's own source ${SAVER} -> only third-party and asset text may be dropped; if it is an embedded asset, add its extension to CLASSICY_MAP_ASSET_EXTENSIONS.`,
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

// The fixture mirrors the package's layout, and the script reads every asset
// folder the package has: a new one must be added to invariant 2 before its
// files can ship.
it("reads every asset folder the package has", () => {
	const assets = path.resolve(import.meta.dirname, "../src/assets");
	// pixelart/ holds `ClassicyPixelArt` rows, imported `?raw` into the
	// bundle, never shipped as files.
	const READ = ["fonts", "art", "icons", "cursors", "wallpapers", "sounds"];
	const BUNDLED = ["pixelart"];
	const folders = readdirSync(assets, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	expect(
		folders.filter(
			(folder) => !READ.includes(folder) && !BUNDLED.includes(folder),
		),
	).toEqual([]);
	for (const dir of ["fonts", "sounds/system7", "icons", "art", "cursors"])
		expect(existsSync(path.join(assets, dir)), dir).toBe(true);
	expect(
		readdirSync(path.join(assets, "sounds"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name),
	).toEqual(["system7"]);
});

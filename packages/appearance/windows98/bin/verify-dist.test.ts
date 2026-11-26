import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { classicyFontStylesheet } from "../../../../bin/classicyFontStylesheet";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";
import { WINDOWS98_FONT_FACES } from "../src/assets/windows98Fonts.internal";

// The package's dist check, bin/verify-dist.mjs, run for real on a fixture
// package folder: the shape Windows 98's takes (src/assets/fonts, art,
// icons, cursors, wallpapers and sounds/windows98, and a screen saver's art
// under src/screenSavers) with a few files each, and a dist/
// built to pass. Each case breaks one thing and expects the script to name
// it, as System 7's verify-dist.test.ts does for its own invariants.

const SCRIPT = path.resolve(import.meta.dirname, "verify-dist.mjs");
const root = mkdtempSync(path.join(tmpdir(), "windows98-verify-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="windows98"] .classicyWindow{border:1px solid}}';
// PACKAGE as the JavaScript string literal the fixture bundles carry, written
// out so the fixture source is fixed text; a test keeps it equal to PACKAGE.
const PACKAGE_LITERAL = String.raw`"@layer classicy.package{.classicyDesktop[data-classicy-appearance=\"windows98\"] .classicyWindow{border:1px solid}}"`;
const bytes = (seed: number, n = 64) =>
	Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256));

// Source file → its bytes. Every one but the fonts' notices and the sound
// sheet's JSON, hash and WAV sources ships in dist/assets under its own name.
const SOURCES: Record<string, Buffer> = {
	...Object.fromEntries(
		WINDOWS98_FONT_FACES.map((face, i) => [
			`src/assets/fonts/${face.file}.woff2`,
			bytes(20 + i),
		]),
	),
	"src/assets/fonts/font-readme.txt": Buffer.from("readme"),
	"src/assets/fonts/font-license.txt": Buffer.from("license"),
	"src/assets/art/windows98.svg": Buffer.from("<svg/>"),
	"src/assets/art/explorer-bitmap-143.webp": bytes(1),
	"src/assets/art/explorer-bitmap-157.webp": bytes(17),
	"src/assets/icons/shell32-4-32.webp": bytes(2),
	"src/assets/icons/shell32-4-16.webp": bytes(3),
	"src/assets/icons/browseui-bitmap-266-cell-4.webp": bytes(4),
	// The cursors stay PNG.
	"src/assets/cursors/user-cursor-100.png": bytes(12),
	"src/assets/cursors/user-cursor-105.png": bytes(13),
	"src/assets/wallpapers/clouds.webp": bytes(14),
	"src/assets/wallpapers/pattern-bricks.webp": bytes(15),
	// A saver's art beside its code; the code itself is no asset.
	"src/screenSavers/Pipes/pipes-texture.webp": bytes(16),
	"src/screenSavers/Pipes/pipes.ts": Buffer.from("export {};"),
	"src/assets/sounds/windows98/windows98.ogg": bytes(5),
	"src/assets/sounds/windows98/windows98.m4a": bytes(6),
	"src/assets/sounds/windows98/windows98.json": Buffer.from("{}"),
	"src/assets/sounds/windows98/windows98.sprites.sha256": Buffer.from("0"),
	"src/assets/sounds/windows98/sprites/ClassicyBeep.wav": bytes(7),
};
const SHIPPED = Object.keys(SOURCES).filter(
	(file) =>
		!file.includes("/sprites/") &&
		!file.endsWith(".txt") &&
		!file.endsWith(".json") &&
		!file.endsWith(".sha256") &&
		!file.endsWith(".ts"),
);
const urls = SHIPPED.map(
	(file) => `new URL("assets/${path.basename(file)}",import.meta.url).href`,
).join(",");
const ES = `import{registerClassicyAppearancePackage as r}from"@classicy/classicy";const u=[${urls}];const css=${PACKAGE_LITERAL};r({css});export{u};\n//# sourceMappingURL=appearance-windows98.es.js.map\n`;
const UMD = `(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("@classicy/classicy")):f(g.classicyAppearanceWindows98={},g.classicy)})(this,function(e,c){const i=typeof document>"u"?require("url").pathToFileURL(__dirname+"/assets/windows98.svg").href:"";const css=${PACKAGE_LITERAL};c.registerClassicyAppearancePackage({css});});\n`;
const FONTS = classicyFontStylesheet(
	WINDOWS98_FONT_FACES,
	(face) => `assets/${face.file}.woff2`,
	"classicy-windows98.fonts.css",
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
	"appearance-windows98.es.js": ES,
	"appearance-windows98.es.js.map": MAP,
	"appearance-windows98.umd.js": UMD,
	"appearance-windows98.umd.js.map": MAP,
	"classicy-windows98.css": `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
	"classicy-windows98.fonts.css": FONTS,
	"types/index.d.ts": 'export * from "./windows98Apps.js";\n',
	"types/windows98Apps.d.ts": "export declare const a: number;\n",
	...Object.fromEntries(
		SHIPPED.map((file) => [
			`assets/${path.basename(file)}`,
			SOURCES[file] as Buffer,
		]),
	),
};

let run = 0;
/**
 * Writes the fixture package (the sources, with `sources` over them, then
 * dist/ with `changes` applied: a path to new content, or `null` to delete
 * it) and runs the script in it.
 */
const verify = (
	changes: Record<string, string | Buffer | null> = {},
	sources: Record<string, Buffer> = {},
) => {
	const dir = path.join(root, `case-${run++}`);
	for (const [file, content] of Object.entries({ ...SOURCES, ...sources })) {
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

const ASSET_RULE =
	"-> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.";

describe("bin/verify-dist.mjs", () => {
	it("carries PACKAGE as its JavaScript string literal", () => {
		expect(JSON.parse(PACKAGE_LITERAL)).toBe(PACKAGE);
	});

	it("passes a dist that holds what the package ships", () =>
		expect(verify()).toEqual({ status: 0, stderr: "" }));

	// Invariant 2: exactly the package's files (the fonts, the art, the icons,
	// the cursors and the sound sheet), each byte for byte, each under its own
	// name.
	describe("2. dist/assets holds every package file, as authored", () => {
		it("fails a missing icon, by name", () =>
			expect(verify({ "assets/shell32-4-16.webp": null })).toEqual({
				status: 1,
				stderr: [
					`dist/assets: missing shell32-4-16.webp; extra none ${ASSET_RULE}`,
					// And the bundle's reference to it dangles (invariant 3).
					"dist/appearance-windows98.es.js: new URL() names no file in dist/assets: assets/shell32-4-16.webp",
				].join("\n"),
			}));

		it.each([
			["shell32-4-32.webp", "icons"],
			["browseui-bitmap-266-cell-4.webp", "icons"],
			["explorer-bitmap-143.webp", "art"],
			["explorer-bitmap-157.webp", "art"],
			["windows98.svg", "art"],
			["user-cursor-105.png", "cursors"],
			["PixelatedMSSansSerif-bold-normal.woff2", "fonts"],
			["clouds.webp", "wallpapers"],
			["pattern-bricks.webp", "wallpapers"],
			["pipes-texture.webp", "../screenSavers/Pipes"],
		])("fails %s when it differs from its source", (file, folder) =>
			expect(verify({ [`assets/${file}`]: Buffer.from("changed") })).toEqual({
				status: 1,
				stderr: `${path.join("dist", "assets", file)}: differs from ${path.join("src", "assets", folder, file)} -> package files ship byte for byte; check the build's plugins (an image optimizer?).`,
			}));

		it("fails a missing wallpaper and a missing saver's art, by name", () =>
			expect(
				verify({
					"assets/pattern-bricks.webp": null,
					"assets/pipes-texture.webp": null,
				}).stderr.split("\n")[0],
			).toBe(
				`dist/assets: missing pattern-bricks.webp, pipes-texture.webp; extra none ${ASSET_RULE}`,
			));

		// A saver's code is source, not an asset: only its images ship.
		it("ships no saver code in dist/assets", () =>
			expect(verify({ "assets/pipes.ts": "export {};" }).stderr).toContain(
				`dist/assets: missing none; extra pipes.ts ${ASSET_RULE}`,
			));

		// The icons and art ship as WebP: a PNG of one in dist/assets is a
		// file nothing ships, and nothing loads it.
		it("fails a file nothing ships, a PNG icon included", () =>
			expect(verify({ "assets/shell32-4-32.png": bytes(9) })).toEqual({
				status: 1,
				stderr: [
					`dist/assets: missing none; extra shell32-4-32.png ${ASSET_RULE}`,
					"dist/appearance-windows98.es.js: references no new URL() for shell32-4-32.png in dist/assets -> nothing loads it.",
				].join("\n"),
			}));

		// A PNG left in a WebP folder is no source: the build imports WebP.
		it("passes a PNG left in src/assets/icons, which nothing ships", () =>
			expect(
				verify({}, { "src/assets/icons/shell32-4-32.png": bytes(10) }),
			).toEqual({ status: 0, stderr: "" }));

		it("fails two sources that would ship under one name", () =>
			expect(
				verify({}, { "src/assets/art/shell32-4-16.webp": bytes(11) }).stderr,
			).toContain(
				`${path.join("src", "assets", "icons", "shell32-4-16.webp")}: shares its name with ${path.join("src", "assets", "art", "shell32-4-16.webp")} -> both would ship as dist/assets/shell32-4-16.webp; rename one.`,
			));

		it("fails a missing cursor and a missing font, by name", () =>
			expect(
				verify({
					"assets/user-cursor-100.png": null,
					"assets/PixelatedMSSansSerif-normal-normal.woff2": null,
				}).stderr.split("\n")[0],
			).toBe(
				`dist/assets: missing PixelatedMSSansSerif-normal-normal.woff2, user-cursor-100.png; extra none ${ASSET_RULE}`,
			));

		// The fonts' readme and license files travel in the tarball beside
		// their faces (package.json `files`); nothing loads them.
		it("ships no font notice in dist/assets", () =>
			expect(verify({ "assets/font-readme.txt": "readme" })).toEqual({
				status: 1,
				stderr: [
					`dist/assets: missing none; extra font-readme.txt ${ASSET_RULE}`,
					"dist/appearance-windows98.es.js: references no new URL() for font-readme.txt in dist/assets -> nothing loads it.",
				].join("\n"),
			}));

		it("fails a stray file beside the bundles", () =>
			expect(verify({ "stray.txt": "x" }).stderr).toMatch(
				/^dist\/stray\.txt: not a file the package ships /,
			));
	});

	// Invariant 3: the icons and art are files, never inlined, each loaded.
	describe("3. nothing is inlined", () => {
		it("fails an inlined image", () =>
			expect(
				verify({
					"appearance-windows98.es.js": ES.replace(
						"const u=",
						'const m="data:image/webp;base64,UklGRg==";const u=',
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-windows98.es.js: inlines image/webp -> Windows 98 inlines nothing; check noInlineAppearanceAssetsPlugin.",
			}));

		it("fails a cursor the ES bundle never loads", () =>
			expect(
				verify({
					"appearance-windows98.es.js": ES.replace(
						'new URL("assets/user-cursor-105.png",import.meta.url).href,',
						"",
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-windows98.es.js: references no new URL() for user-cursor-105.png in dist/assets -> nothing loads it.",
			}));

		it("fails an icon the ES bundle never loads", () =>
			expect(
				verify({
					"appearance-windows98.es.js": ES.replace(
						'new URL("assets/shell32-4-32.webp",import.meta.url).href,',
						"",
					),
				}),
			).toEqual({
				status: 1,
				stderr:
					"dist/appearance-windows98.es.js: references no new URL() for shell32-4-32.webp in dist/assets -> nothing loads it.",
			}));
	});

	// Invariant 6: the fonts' static twin, for strict-CSP hosts.
	describe("6. the font stylesheet", () => {
		it.each(["normal", "bold"])("fails a missing %s face", (weight) =>
			expect(
				verify({
					"classicy-windows98.fonts.css": FONTS.split("\n")
						.filter((rule) => !rule.includes(`font-weight:${weight}`))
						.join("\n"),
				}),
			).toEqual({
				status: 1,
				stderr: `dist/classicy-windows98.fonts.css: no @font-face for "Pixelated MS Sans Serif" ${weight} normal, which the runtime registers.`,
			}));

		it("expects the two faces the runtime registers", () =>
			expect(
				WINDOWS98_FONT_FACES.map(({ family, weight, style }) =>
					[family, weight, style].join(" "),
				),
			).toEqual([
				"Pixelated MS Sans Serif normal normal",
				"Pixelated MS Sans Serif bold normal",
			]));

		it("fails a missing file", () =>
			expect(verify({ "classicy-windows98.fonts.css": null }).stderr).toMatch(
				/^dist\/classicy-windows98\.fonts\.css: missing/,
			));
	});
});

// The art the package ships, exactly: the Start flag (Explorer's bitmap 143),
// the Start menu banner (Explorer's bitmap 157), the Windows logo (shell32's
// bitmap 130) and the package's own SVG icon.
it("ships exactly the package's art", () => {
	const art = path.resolve(import.meta.dirname, "../src/assets/art");
	expect(readdirSync(art).sort()).toEqual([
		"explorer-bitmap-143.webp",
		"explorer-bitmap-157.webp",
		"shell32-bitmap-130.webp",
		"windows98.svg",
	]);
});

// The fixture mirrors the package's layout, and the script reads every asset
// folder the package has: a new one must be added to invariant 2 before its
// files can ship.
it("reads every asset folder the package has", () => {
	const assets = path.resolve(import.meta.dirname, "../src/assets");
	const READ = ["fonts", "art", "icons", "cursors", "wallpapers", "sounds"];
	const folders = readdirSync(assets, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	expect(folders.filter((folder) => !READ.includes(folder))).toEqual([]);
	for (const dir of [
		"fonts",
		"sounds/windows98",
		"icons",
		"art",
		"cursors",
		"wallpapers",
	])
		expect(existsSync(path.join(assets, dir)), dir).toBe(true);
	expect(
		readdirSync(path.join(assets, "sounds"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name),
	).toEqual(["windows98"]);
	// The screen savers' art is a WebP in a saver's own folder: none sits
	// directly in src/screenSavers, and no saver folder holds a folder.
	const savers = path.resolve(import.meta.dirname, "../src/screenSavers");
	expect(
		readdirSync(savers).filter((name) => /\.(?:webp|png|svg)$/.test(name)),
	).toEqual([]);
	for (const saver of readdirSync(savers, { withFileTypes: true }).filter(
		(entry) => entry.isDirectory(),
	))
		expect(
			readdirSync(path.join(savers, saver.name), {
				withFileTypes: true,
			}).filter((entry) => entry.isDirectory()),
			saver.name,
		).toEqual([]);
});

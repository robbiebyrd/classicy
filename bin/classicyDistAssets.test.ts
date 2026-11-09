import { describe, expect, it } from "vitest";
import {
	compareClassicyAssetNames,
	findClassicyCorePackageFiles,
	findClassicyInlinedFiles,
	findClassicySaverMarkers,
	findClassicyStrayAssetUrls,
	isClassicyPackageAssetFile,
} from "./classicyDistAssets";

describe("compareClassicyAssetNames", () => {
	it("finds nothing when dist ships exactly the expected files", () =>
		expect(
			compareClassicyAssetNames(
				["zoom.svg", "sad-mac.png", "Geneva-normal-normal.woff2"],
				["Geneva-normal-normal.woff2", "sad-mac.png", "zoom.svg"],
			),
		).toEqual({ missing: [], extra: [] }));

	it("names expected files dist/assets lacks, sorted", () =>
		expect(
			compareClassicyAssetNames(
				["zoom.svg", "platinum.ogg", "collapse.svg"],
				["zoom.svg"],
			),
		).toEqual({ missing: ["collapse.svg", "platinum.ogg"], extra: [] }));

	// Every file counts, not just art: a stray sprite, wallpaper or font fails
	// by name too.
	it("names files in dist/assets that nothing expects, sorted", () =>
		expect(
			compareClassicyAssetNames(
				["zoom.svg"],
				["zoom.svg", "stray.png", "old.woff2", "x.webp"],
			),
		).toEqual({ missing: [], extra: ["old.woff2", "stray.png", "x.webp"] }));
});

describe("findClassicyInlinedFiles", () => {
	const file = Uint8Array.from({ length: 4096 }, (_, i) => (i * 7) % 256);
	const inlined = `const a="data:image/png;base64,${Buffer.from(file).toString("base64")}";`;

	it("names each package file a bundle carries as base64", () =>
		expect(
			findClassicyInlinedFiles(
				[
					{ file: "dist/classicy.es.js", source: inlined },
					{ file: "dist/classicy.umd.js", source: "const a=1;" },
				],
				[
					{
						path: "packages/appearance/x/assets/wallpapers/a.png",
						bytes: file,
					},
					{
						path: "packages/appearance/x/assets/wallpapers/b.png",
						bytes: Uint8Array.from(file).reverse(),
					},
				],
			),
		).toEqual([
			{
				bundle: "dist/classicy.es.js",
				path: "packages/appearance/x/assets/wallpapers/a.png",
			},
		]));

	// Files of one format share long stretches: a PNG's signature and IHDR,
	// an exporter's XMP packet, an mp3's silent frames. Only the whole file
	// counts, so a bundle inlining another file with the same stretches
	// does not report this one.
	it("does not report a file that only shares a stretch with an inlined one", () => {
		const other = Uint8Array.from(file);
		other[4000] = 255 - other[4000];
		expect(
			findClassicyInlinedFiles(
				[
					{
						file: "dist/classicy.es.js",
						source: `a="data:image/png;base64,${Buffer.from(other).toString("base64")}"`,
					},
				],
				[{ path: "a.png", bytes: file }],
			),
		).toEqual([]);
	});

	it("finds nothing in a bundle that carries no package file", () =>
		expect(
			findClassicyInlinedFiles(
				[{ file: "dist/classicy.es.js", source: "const a=1;" }],
				[{ path: "a.png", bytes: file }],
			),
		).toEqual([]));
});

describe("findClassicyStrayAssetUrls", () => {
	const es =
		'a=new URL("assets/zoom.svg",import.meta.url);b=new URL("assets/gone.png",import.meta.url);c=new URL("assets/zoom.svg",import.meta.url)';

	it('names each `new URL("assets/…")` reference with no file, once', () =>
		expect(findClassicyStrayAssetUrls(es, ["zoom.svg"])).toEqual({
			refs: ["assets/zoom.svg", "assets/gone.png"],
			stray: ["assets/gone.png"],
		}));

	it("finds no references in a bundle with none", () =>
		expect(findClassicyStrayAssetUrls("const a=1;", [])).toEqual({
			refs: [],
			stray: [],
		}));
});

// verify:dist invariant 5 (plan 0015-kxa §3.4): the core's dist holds none
// of a workspace Appearance Package's files, as files or inlined.
describe("findClassicyCorePackageFiles", () => {
	const wallpaper = Uint8Array.from({ length: 4096 }, (_, i) => (i * 13) % 256);
	const PACKAGE_FILES = [
		{
			path: "packages/appearance/platinum/src/assets/wallpapers/azul.png",
			bytes: wallpaper,
		},
		{
			path: "packages/appearance/platinum/src/assets/art/zoom.svg",
			bytes: new Uint8Array([60, 115]),
		},
	];
	const clean = {
		distFiles: [
			"classicy.es.js",
			"classicy.umd.js",
			"classicy.css",
			"fonts.js",
			"fonts.d.ts",
			"assets",
			"types",
		],
		assets: ["sad-mac.png"],
		packageFiles: PACKAGE_FILES,
		bundles: [
			{
				file: "dist/classicy.es.js",
				source: 'a="data:audio/wav;base64,UklGRiQAAABXQVZF"',
			},
		],
	};

	it("passes a dist with none of them (a dependency's tiny data:audio probe included)", () =>
		expect(findClassicyCorePackageFiles(clean)).toEqual([]));

	it.each([
		["a font", "Geneva-normal-normal.woff2"],
		["a sound sprite", "platinum.ogg"],
		["a package file by name", "zoom.svg"],
		["a wallpaper by name", "azul.png"],
	])("fails %s in dist/assets", (_name, file) =>
		expect(
			findClassicyCorePackageFiles({
				...clean,
				assets: [...clean.assets, file],
			}),
		).toEqual([
			`dist/assets/${file}: an Appearance Package's file in the core's dist -> the core bundles no package; it ships in the package's own build.`,
		]));

	it.each([
		"classicy-platinum.fonts.css",
		"appearance-platinum.js",
		"appearance-platinum.d.ts",
	])("fails dist/%s", (file) =>
		expect(
			findClassicyCorePackageFiles({
				...clean,
				distFiles: [...clean.distFiles, file],
			}),
		).toEqual([
			`dist/${file}: an Appearance Package's file in the core's dist -> the core bundles no package; it ships in the package's own build.`,
		]));

	it("fails a package file a bundle inlined", () =>
		expect(
			findClassicyCorePackageFiles({
				...clean,
				bundles: [
					{
						file: "dist/classicy.umd.js",
						source: `a="data:image/png;base64,${Buffer.from(wallpaper).toString("base64")}"`,
					},
				],
			}),
		).toEqual([
			"dist/classicy.umd.js: inlines packages/appearance/platinum/src/assets/wallpapers/azul.png -> the core bundles no package; check that nothing under src/ imports one.",
		]));
});

// Plan 0016-vbq §2.2: the screen savers' art lives beside their code in the
// package (src/screenSavers/<Saver>/), not under src/assets, so the core's
// check must treat it as a package file wherever it lives.
describe("isClassicyPackageAssetFile", () => {
	const root = "packages/appearance/platinum";
	it.each([
		`${root}/src/assets/art/zoom.svg`,
		`${root}/src/assets/wallpapers/azul.png`,
		`${root}/assets/x.png`,
		`${root}/src/screenSavers/Fish/fish-red.webp`,
		`${root}/src/screenSavers/Logo/logo.webp`,
	])("counts %s", (path) =>
		expect(isClassicyPackageAssetFile(path, root)).toBe(true));

	it.each([
		`${root}/src/screenSavers/Fish/Fish.tsx`,
		`${root}/src/screenSavers/Fish/Fish.scss`,
		`${root}/src/hooks.ts`,
		`${root}/src/art.webp`,
	])("skips %s", (path) =>
		expect(isClassicyPackageAssetFile(path, root)).toBe(false));

	it("catches a saver image in the core's dist, as a file and inlined", () => {
		const webp = Uint8Array.from({ length: 2048 }, (_, i) => (i * 11) % 256);
		const packageFiles = [
			{
				path: "packages/appearance/platinum/src/screenSavers/Fish/fish-red.webp",
				bytes: webp,
			},
		];
		const dist = { distFiles: [], assets: [], packageFiles, bundles: [] };
		expect(
			findClassicyCorePackageFiles({ ...dist, assets: ["fish-red.webp"] }),
		).toEqual([
			"dist/assets/fish-red.webp: an Appearance Package's file in the core's dist -> the core bundles no package; it ships in the package's own build.",
		]);
		expect(
			findClassicyCorePackageFiles({
				...dist,
				bundles: [
					{
						file: "dist/classicy.es.js",
						source: `x="data:image/webp;base64,${Buffer.from(webp).toString("base64")}"`,
					},
				],
			}),
		).toEqual([
			"dist/classicy.es.js: inlines packages/appearance/platinum/src/screenSavers/Fish/fish-red.webp -> the core bundles no package; check that nothing under src/ imports one.",
		]);
	});
});

describe("findClassicySaverMarkers", () => {
	it("passes a bundle or stylesheet with no saver class or keyframe", () =>
		expect(
			findClassicySaverMarkers([
				{ file: "dist/classicy.css", text: ".classicyWindow{top:0}" },
				{ file: "dist/classicy.es.js", text: "classicy-screen-saver-overlay" },
			]),
		).toEqual([]));

	it.each([
		["a keyframe", "@keyframes classicySaverFloat{from{top:0}}"],
		["a class", ".classicySaverFishBody{top:0}"],
		["a JS string", 'a="classicySaverToaster"'],
	])("fails %s", (_n, text) =>
		expect(findClassicySaverMarkers([{ file: "dist/x.css", text }])).toEqual([
			expect.stringMatching(
				/^dist\/x\.css: carries a classicySaver name .* -> the core names no screen saver/,
			),
		]));
});

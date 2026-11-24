#!/usr/bin/env node
// The dist check for @classicy/appearance-system7 (plan 0018-dbd §2.2), run
// by its `build` script after `vite build`, from the package folder: the
// invariants Platinum's bin/verify-dist.mjs holds for Platinum, held for
// System 7. The helpers are the core's bin/ modules, shared by every check.
//
// 1. THE CORE IS AN IMPORT, NOT A COPY. Both bundles import
//    `@classicy/classicy` (the ES bundle with `import`, the UMD bundle with
//    `require`), externalize nothing but the core and React, and carry none
//    of the core's registry code: a bundle that carried its own copy would
//    register System 7 into registries nothing reads (design 0014-ahm,
//    anti-goal "Two copies of the registries"). No external specifier
//    carries a Vite query (the core's invariant 1).
//
// 2. DIST/ASSETS HOLDS EVERY PACKAGE FILE, AS AUTHORED. Exactly the fonts
//    (src/assets/fonts), the art (src/assets/art and its variant folders,
//    art/color and art/bw: SVG and WebP), the icons
//    (src/assets/icons/<variant>/<size>: WebP), the cursors
//    (src/assets/cursors: PNG), the wallpapers (src/assets/wallpapers: WebP;
//    plan 0019-fb7 §6.5, the art, icons and wallpapers converted from PNG),
//    the sound sheet (src/assets/sounds/system7/system7.{ogg,m4a},
//    not its JSON, its hash or its sprites/ WAV sources) and the screen
//    savers' art, which stays in Platinum's source
//    (../platinum/src/screenSavers/<Saver>/*.webp; plan 0018-dbd §3.8), each
//    byte-identical to its source, so an image optimizer added to
//    vite.config.ts fails here. Each ships under the name
//    bin/system7AssetNames.ts gives it: its own, or, in a variant or size
//    folder, its folders and its own (`icons-bw-16-system-files-document.webp`),
//    so no two share one. A folder the package does not have yet holds
//    nothing. A PNG left in a WebP folder is no source: nothing ships it.
//    dist/ itself holds only the two bundles and their maps, the two
//    strict-CSP stylesheets, assets/ and types/.
//
// 3. NOTHING IS INLINED BUT THE MASKS. The only `data:` URIs in either
//    bundle are the package's mask art, which a `mask-image` URL would fetch
//    in CORS mode (Platinum's halftone, ruling E17): src/assets/art/
//    dither-checker.svg, the dither vocabulary's mask, and the title bar's
//    racing stripes and the windoid's drag-bar dots, art/{color,bw}/
//    window-stripes.webp and window-utility-texture.webp, and the 1-bit open
//    Apple and Help titles' inversion masks, art/bw/apple-menu.webp and
//    help-button.webp, each typed image/webp and byte for byte its file
//    (base64). The ES bundle's `new URL("assets/…", import.meta.url)`
//    references each name a file in dist/assets, and every file there is
//    referenced.
//
// 4. THE LOOK SHIPS IN BOTH BUNDLES AND AS dist/classicy-system7.css. Each
//    bundle carries the package stylesheet (`system7.scss?inline`) as exactly
//    one non-empty `@layer classicy.package` block scoped under
//    `[data-classicy-appearance=…]`, never nested in `classicy.base`; and
//    dist/classicy-system7.css, which strict-CSP hosts link after the core's
//    classicy.css, opens with the layer order and is that block, byte for byte.
//
// 5. EVERY STYLESHEET IN DIST/ IS ASCII ONLY, OR OPENS WITH `@charset "UTF-8";`
//    (the core's invariant 9): a linked file served without an HTTP charset
//    takes a non-UTF-8 page's encoding.
//
// 6. THE FONTS SHIP AS A STYLESHEET TOO. dist/classicy-system7.fonts.css holds
//    only unlayered `@font-face` rules, exactly one per face the runtime
//    registers (SYSTEM7_FONT_FACES), each the rule the runtime writes, and
//    every url() names the face's own file in dist/assets.
//
// 7. DIST/TYPES DECLARES THE PACKAGE. dist/types/index.d.ts (the `types`
//    export) exists, and no declaration is for a test, a test helper, a story,
//    a build script or an imported JSON file (system7Json is typed
//    System7Json, on the core's types). Every relative specifier in a
//    declaration carries its extension (`./assets/sounds/system7.js`): the
//    package is `"type": "module"`, so a host on `moduleResolution: node16`
//    or `nodenext` resolves no other. And none references Platinum: no
//    declaration of a Platinum module (the bundled savers), no relative
//    specifier out of dist/types, no `@classicy/appearance-*` import, so a
//    host that installs only System 7 resolves every type (plan 0018-dbd
//    §3.8). And no declaration map (.d.ts.map): the dts() call passes
//    `compilerOptions: { declarationMap: false }` (plan 0019-fb7 §2.1). And
//    each .d.ts has its .d.cts twin, its relative specifiers ending in .cjs
//    (bin/classicyCommonJsDeclarations.ts): the exports map's `require`
//    types for a CommonJS TypeScript host (story 0223-a0y).
//
// 8. BOTH BUNDLES USE THE PRODUCTION JSX RUNTIME (the core's invariant 13).
//    No import of react/jsx-dev-runtime, no jsxDEV() call, no absolute
//    build-machine path in a fileName option (the screen savers bring JSX,
//    plan 0018-dbd §3.8).
//
// 9. EVERY STYLESHEET KEEPS TO THE BROWSER FLOOR'S CSS MATH (the core's
//    invariant 15): a declaration calling `round()` or another function
//    Chrome 120, Safari 16.2 or Firefox 113 lacks carries a fallback, an
//    earlier declaration of its property that calls none, or an enclosing
//    `@supports` testing it (bin/classicyCssFloor.ts).
//
// 10. SOURCE MAPS CARRY CLASSICY'S OWN TEXT ONLY (the core's invariant 16,
//    plan 0019-fb7 Part 1). Every dist/*.js.map has null text for each
//    node_modules/ (zod) and embedded asset source, lists every vendor source
//    in x_google_ignoreList, and keeps the text of each src/ source, the
//    Platinum savers it bundles included (classicySourceMapTextPlugin,
//    bin/classicySourceMapText.ts).
//
// 11. BOTH BUNDLES LOAD IN NODE, SILENTLY (the core's invariant 19, story
//    0223-a0y). A server-rendering host imports the package in Node:
//    appearance-system7.es.js is imported, and appearance-system7.umd.cjs,
//    what `require()` resolves to there, required, each in a child Node
//    process (bin/classicyNodeImport.ts), once with the browser's globals
//    deleted and once with Node's own globals but `localStorage` and
//    `sessionStorage` failing on any read; each must load, registering the
//    package into the core it imports, without throwing, without a
//    load-time task throwing, without a process warning and without writing
//    to the console. appearance-system7.umd.cjs is the CommonJS loader
//    bin/classicyUmdLoader.ts writes, which runs the UMD bundle beside it as
//    CommonJS (in this "type": "module" package Node reads a .js file as an
//    ES module), and the UMD bundle requires no Node built-in (its asset
//    URLs reach Node's url module through process.getBuiltinModule,
//    bin/classicyUmdNodeUrl.ts; invariant 1 allows only the core and React)
//    and declares nothing at its top level (no global on a `<script>` page,
//    no slow global lookups under the loader's eval).
//    The core must be built first: the bundles import it.
//
// 12. THE ES BUNDLE IS NO CLIENT MODULE (story 0224-siu): it does not start
//    with a "use client" directive, which the core's ES entry does (its
//    invariant 20). The package registers System 7 when it runs, which must
//    happen in the browser, so a host imports it from a client module. Marked
//    as a client module, a server component's import of it (`import
//    "@classicy/appearance-system7"` in the root layout) builds, but the browser
//    never runs it and the desktop draws no package; unmarked, that import
//    fails the host's build (Next.js 16.4.6, webpack and Turbopack:
//    `Attempted to call encodeClassicyPixelArtRows() from the server`), which
//    says where it went wrong (findClassicyNoUseClientProblems,
//    bin/classicyUseClient.ts).

import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, posix, sep } from "node:path";
import { exit } from "node:process";
import { parseAst } from "vite";
import { classicyBundleSpecifiers } from "../../../../bin/classicyBundleSpecifiers.ts";
import { findClassicyCommonJsDeclarationProblems } from "../../../../bin/classicyCommonJsDeclarations.ts";
import { findClassicyCssFloorProblems } from "../../../../bin/classicyCssFloor.ts";
import {
	findClassicyBareSpecifiers,
	findClassicyExtensionlessSpecifiers,
	findClassicyRelativeSpecifiers,
} from "../../../../bin/classicyDeclarationSpecifiers.ts";
import {
	compareClassicyAssetNames,
	findClassicyStrayAssetUrls,
} from "../../../../bin/classicyDistAssets.ts";
import { findClassicyCssCharsetProblem } from "../../../../bin/classicyDistCharset.ts";
import { findClassicyDevJsxProblems } from "../../../../bin/classicyDistJsx.ts";
import {
	findClassicyBuildScriptDeclarations,
	findClassicyJsonDeclarations,
	findClassicyTestDeclarations,
} from "../../../../bin/classicyDistTypes.ts";
import {
	classicyFontStylesheetFile,
	findClassicyFontStylesheetProblems,
} from "../../../../bin/classicyFontStylesheet.ts";
import { findClassicyNodeImportProblems } from "../../../../bin/classicyNodeImport.ts";
import { findClassicyPackageCssProblems } from "../../../../bin/classicyPackageCss.ts";
import { findClassicySourceMapTextProblems } from "../../../../bin/classicySourceMapText.ts";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector.ts";
import {
	classicyUmdLoaderFile,
	findClassicyUmdLoaderProblems,
} from "../../../../bin/classicyUmdLoader.ts";
import { findClassicyUmdTopLevelDeclarations } from "../../../../bin/classicyUmdNodeUrl.ts";
import { findClassicyNoUseClientProblems } from "../../../../bin/classicyUseClient.ts";
import { SYSTEM7_FONT_FACES } from "../src/assets/system7Fonts.internal.ts";
import { system7AssetFileName } from "./system7AssetNames.ts";

const DIST = "dist";
const ES = join(DIST, "appearance-system7.es.js");
const UMD = join(DIST, "appearance-system7.umd.js");
const UMD_LOADER = join(
	DIST,
	classicyUmdLoaderFile("appearance-system7.umd.js"),
);
const BUNDLES = [ES, UMD];
const STYLESHEET = join(DIST, "classicy-system7.css");
const FONT_STYLESHEET = join(DIST, classicyFontStylesheetFile("system7"));
const TYPES = join(DIST, "types");

let failed = false;
const report = (problems, ok) => {
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else console.log(ok);
};
const read = (file) => readFile(file, "utf8").catch(() => null);
const bundles = await Promise.all(
	BUNDLES.map(async (file) => ({ file, source: (await read(file)) ?? "" })),
);

// Invariant 1: the core is an import, not a copy.
const EXTERNAL = [
	"@classicy/classicy",
	"react",
	"react-dom",
	"react/jsx-runtime",
];
// Strings only the core's registries hold (their log messages): a bundle that
// carried its own copy of a registry would carry its messages too
// (verify-dist.test.ts checks each is still in the core).
const CORE_REGISTRY_MARKERS = [
	"was not registered: ",
	"cannot be unregistered; register a package with its id to replace it.",
	"Ignored forbidden key",
	"Rejected sound pack",
];
{
	const problems = [];
	for (const { file, source } of bundles) {
		const specifiers = classicyBundleSpecifiers(source);
		for (const specifier of new Set(specifiers)) {
			if (specifier.includes("?"))
				problems.push(
					`${file}: externalizes "${specifier}", which carries a Vite query -> an asset import must stay bundled.`,
				);
			else if (!EXTERNAL.includes(specifier))
				problems.push(
					`${file}: externalizes "${specifier}", which is not the core or React -> check \`external\` in vite.config.ts.`,
				);
		}
		if (!specifiers.includes("@classicy/classicy"))
			problems.push(
				`${file}: does not import @classicy/classicy -> the core must stay external (a peer dependency), or System 7 registers into a copy of the registries nothing reads.`,
			);
		for (const marker of CORE_REGISTRY_MARKERS)
			if (source.includes(marker))
				problems.push(
					`${file}: carries the core's registry code (${JSON.stringify(marker)}) -> @classicy/classicy must stay external.`,
				);
	}
	report(
		problems,
		`${BUNDLES.join(", ")}: import @classicy/classicy, externalize only it and React, carry none of it`,
	);
}

// Invariant 2: dist/assets holds every package file, byte for byte.
const listFiles = async (dir, accept = () => true) =>
	(await readdir(dir, { withFileTypes: true }).catch(() => []))
		.filter((entry) => entry.isFile() && accept(entry.name))
		.map((entry) => join(dir, entry.name));
// The art's folders: src/assets/art and each variant folder in it
// (art/bw, art/color, …), and every icons/<variant>/<size> folder.
const subfolders = async (dir) =>
	(await readdir(dir, { withFileTypes: true }).catch(() => []))
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(dir, entry.name));
const artDirs = [
	join("src", "assets", "art"),
	...(await subfolders(join("src", "assets", "art"))),
];
const iconDirs = (
	await Promise.all(
		(await subfolders(join("src", "assets", "icons"))).map(subfolders),
	)
).flat();
// The art and icons are SVG and WebP, the cursors PNG, the wallpapers WebP.
const ART = /\.(?:svg|webp)$/;
const CURSOR = /\.png$/;
const WALLPAPER = /\.webp$/;
// The screen savers' folders in Platinum's source, one per saver, each
// holding its art: System 7 bundles the savers' registration module.
const SAVERS = join("..", "platinum", "src", "screenSavers");
const saverDirs = await subfolders(SAVERS);
const sources = [
	...(await listFiles("src/assets/fonts", (n) => n.endsWith(".woff2"))),
	...(
		await Promise.all(
			[...artDirs, ...iconDirs].map((dir) =>
				listFiles(dir, (n) => ART.test(n)),
			),
		)
	).flat(),
	...(await listFiles("src/assets/cursors", (n) => CURSOR.test(n))),
	...(await listFiles("src/assets/wallpapers", (n) => WALLPAPER.test(n))),
	// The sheet's two formats, not its JSON, its hash or its sprites/ WAV
	// sources.
	...(await listFiles(join("src", "assets", "sounds", "system7"), (n) =>
		/^system7\.(?:ogg|m4a)$/.test(n),
	)),
	...(
		await Promise.all(
			saverDirs.map((dir) => listFiles(dir, (n) => n.endsWith(".webp"))),
		)
	).flat(),
];
const shipped = await readdir(join(DIST, "assets")).catch(() => []);
{
	const problems = [];
	const sourceOf = new Map();
	for (const source of sources) {
		const name = system7AssetFileName(source);
		if (sourceOf.has(name))
			problems.push(
				`${source}: shares its name with ${sourceOf.get(name)} -> both would ship as dist/assets/${name}; rename one.`,
			);
		sourceOf.set(name, source);
	}
	// The build emits byte-identical files once (an alert icon is the same
	// 1-bit image in icons/color/32 and icons/bw/32), under the name of
	// whichever is imported first: each set of identical sources ships as
	// exactly one of its names.
	const twins = new Map();
	for (const [name, source] of sourceOf) {
		const bytes = (
			await readFile(source).catch(() => Buffer.alloc(0))
		).toString("base64");
		twins.set(bytes, [...(twins.get(bytes) ?? []), name]);
	}
	const shippedSet = new Set(shipped);
	const missing = [];
	for (const names of twins.values()) {
		const present = names.filter((name) => shippedSet.has(name));
		if (present.length === 0) missing.push(names.sort().join(" or "));
		else if (present.length > 1)
			problems.push(
				`${join(DIST, "assets")}: ships the same file as ${present.sort().join(" and ")} -> identical sources ship once.`,
			);
	}
	missing.sort();
	const { extra } = compareClassicyAssetNames([...sourceOf.keys()], shipped);
	if (missing.length || extra.length)
		problems.push(
			`${join(DIST, "assets")}: missing ${missing.join(", ") || "none"}; extra ${extra.join(", ") || "none"} -> check noInlineAppearanceAssetsPlugin and assetFileNames in vite.config.ts.`,
		);
	for (const name of shipped) {
		const source = sourceOf.get(name);
		if (!source) continue;
		const [authored, emitted] = await Promise.all([
			readFile(source).catch(() => null),
			readFile(join(DIST, "assets", name)),
		]);
		if (authored === null || !authored.equals(emitted))
			problems.push(
				`${join(DIST, "assets", name)}: differs from ${source} -> package files ship byte for byte; check the build's plugins (an image optimizer?).`,
			);
	}
	const top = new Set([
		"appearance-system7.es.js",
		"appearance-system7.es.js.map",
		"appearance-system7.umd.js",
		"appearance-system7.umd.js.map",
		basename(UMD_LOADER),
		basename(STYLESHEET),
		basename(FONT_STYLESHEET),
		"assets",
		"types",
	]);
	for (const name of (await readdir(DIST).catch(() => [])).sort())
		if (!top.has(name))
			problems.push(
				`${join(DIST, name)}: not a file the package ships -> the package's dist holds its two bundles and their maps, the UMD bundle's CommonJS loader, ${basename(STYLESHEET)}, ${basename(FONT_STYLESHEET)}, assets/ and types/.`,
			);
	report(
		problems,
		`${join(DIST, "assets")}: ${shipped.length} file(s), exactly the package's, each byte-identical to its source`,
	);
}

// Invariant 3: nothing but the masks is inlined; the files are referenced
// from the ES bundle.
const DITHER_CHECKER = join("src", "assets", "art", "dither-checker.svg");
const WEBP_MASKS = [
	...["color", "bw"].flatMap((variant) =>
		["window-stripes.webp", "window-utility-texture.webp"].map((name) =>
			join("src", "assets", "art", variant, name),
		),
	),
	...["apple-menu.webp", "help-button.webp"].map((name) =>
		join("src", "assets", "art", "bw", name),
	),
];
{
	const problems = [];
	const checker = ((await read(DITHER_CHECKER)) ?? "").trim();
	const webpMasks = new Set();
	for (const file of WEBP_MASKS) {
		const bytes = await readFile(file).catch(() => null);
		if (bytes) webpMasks.add(`base64,${bytes.toString("base64")}`);
		else problems.push(`${file}: missing -> a mask the bundles inline.`);
	}
	for (const { file, source } of bundles) {
		const uris = new Set(
			[...source.matchAll(/data:([a-z]+\/[a-z0-9.+-]+)[;,]([^"`\s]*)/g)].map(
				(m) => `${m[1]},${m[2]}`,
			),
		);
		for (const uri of [...uris].sort()) {
			const [type, ...rest] = uri.split(",");
			const body = rest.join(",");
			let decoded = "";
			try {
				decoded = decodeURIComponent(body).replaceAll("'", '"');
			} catch {}
			if (type === "image/svg+xml" && checker && decoded === checker) continue;
			if (type === "image/webp" && webpMasks.has(body)) continue;
			problems.push(
				`${file}: inlines ${type} -> System 7 inlines only its masks (${[DITHER_CHECKER, ...WEBP_MASKS].join(", ")}); check noInlineAppearanceAssetsPlugin.`,
			);
		}
	}
	const es = bundles.find(({ file }) => file === ES)?.source ?? "";
	const { refs, stray } = findClassicyStrayAssetUrls(es, shipped);
	if (stray.length)
		problems.push(
			`${ES}: new URL() names no file in dist/assets: ${stray.join(", ")}`,
		);
	const referenced = new Set(refs.map((ref) => ref.slice("assets/".length)));
	for (const name of shipped.filter((n) => !referenced.has(n)).sort())
		problems.push(
			`${ES}: references no new URL() for ${name} in dist/assets -> nothing loads it.`,
		);
	report(
		problems,
		`${BUNDLES.join(", ")}: inline only the masks; ${refs.length} file reference(s), one per file in dist/assets`,
	);
}

// Invariant 4: the package stylesheet, in both bundles and as a file.
{
	const css = await read(STYLESHEET);
	report(
		findClassicyPackageCssProblems({
			layerOrder: CLASSICY_LAYER_ORDER,
			bundles,
			baseStylesheets: [],
			packageStylesheets: css === null ? [] : [{ file: STYLESHEET, css }],
			requiredBundles: BUNDLES,
			requiredPackageStylesheets: [STYLESHEET],
		}),
		`${STYLESHEET}: the package stylesheet both bundles inject, after the layer order`,
	);
}

// Invariant 5: every stylesheet decodes the same under any page encoding.
{
	const problems = [];
	const cssFiles = (await readdir(DIST).catch(() => []))
		.filter((f) => f.endsWith(".css"))
		.sort()
		.map((f) => join(DIST, f));
	for (const file of cssFiles) {
		const problem = findClassicyCssCharsetProblem(file, await readFile(file));
		if (problem) problems.push(problem);
	}
	report(
		problems,
		`stylesheet charset: ${cssFiles.length} .css file(s), each ASCII only or opening with @charset "UTF-8"`,
	);
}

// Invariant 6: the font stylesheet.
{
	const css = await read(FONT_STYLESHEET);
	const assets = new Set(shipped);
	report(
		findClassicyFontStylesheetProblems(
			FONT_STYLESHEET,
			css,
			SYSTEM7_FONT_FACES,
			(url) => url.startsWith("assets/") && assets.has(url.slice(7)),
		),
		`${FONT_STYLESHEET}: the ${SYSTEM7_FONT_FACES.length} @font-face rules the runtime writes, unlayered, each url() its own file in assets/`,
	);
}

// Invariant 7: the type declarations.
{
	const problems = [];
	const declarations = (
		await readdir(TYPES, { recursive: true }).catch(() => [])
	).map(String);
	if (!declarations.includes("index.d.ts"))
		problems.push(
			`${join(TYPES, "index.d.ts")}: missing -> the package's \`types\` export points at it; check dts in vite.config.ts.`,
		);
	const maps = declarations.filter((file) => file.endsWith(".d.ts.map")).sort();
	if (maps.length)
		problems.push(
			`${TYPES}: ${maps.length} declaration map(s) (${maps.slice(0, 5).join(", ")}) -> each dts() call must pass compilerOptions: { declarationMap: false }.`,
		);
	const tests = findClassicyTestDeclarations(declarations);
	if (tests.length)
		problems.push(
			`${TYPES}: ${tests.length} declaration(s) of tests, test helpers or stories (${tests.slice(0, 5).join(", ")}) -> check the dts exclude in vite.config.ts.`,
		);
	for (const declaration of declarations
		.filter((file) => file.endsWith(".d.ts"))
		.sort()) {
		const file = join(TYPES, declaration);
		const bare = findClassicyExtensionlessSpecifiers((await read(file)) ?? "");
		if (bare.length)
			problems.push(
				`${file}: relative specifier(s) without an extension (${bare.map((s) => JSON.stringify(s)).join(", ")}) -> a node16 or nodenext host resolves none of them; check beforeWriteFile on dts in vite.config.ts.`,
			);
	}
	const platinum = declarations.filter(
		(file) =>
			file.endsWith(".d.ts") &&
			/(?:^|[\\/])(?:screenSavers|platinum)[\\/]/i.test(file),
	);
	if (platinum.length)
		problems.push(
			`${TYPES}: ${platinum.length} declaration(s) of Platinum's modules (${platinum.slice(0, 5).join(", ")}) -> System 7 re-exports nothing of the savers; check index.ts and the dts include in vite.config.ts.`,
		);
	for (const declaration of declarations
		.filter((file) => file.endsWith(".d.ts"))
		.sort()) {
		const file = join(TYPES, declaration);
		const code = (await read(file)) ?? "";
		const from = posix.dirname(declaration.split(sep).join("/"));
		const outside = [
			...findClassicyRelativeSpecifiers(code).filter((specifier) =>
				posix.join(from, specifier).startsWith(".."),
			),
			...findClassicyBareSpecifiers(code).filter((specifier) =>
				specifier.startsWith("@classicy/appearance-"),
			),
		];
		if (outside.length)
			problems.push(
				`${file}: references Platinum or a file outside ${TYPES} (${outside.map((s) => JSON.stringify(s)).join(", ")}) -> a host that installs only System 7 resolves none of it; re-export nothing of the savers.`,
			);
	}
	const json = findClassicyJsonDeclarations(declarations);
	if (json.length)
		problems.push(
			`${TYPES}: ${json.length} declaration(s) of imported JSON (${json.slice(0, 5).join(", ")}) -> check the dts exclude in vite.config.ts.`,
		);
	const scripts = findClassicyBuildScriptDeclarations(declarations);
	if (scripts.length)
		problems.push(
			`${TYPES}: ${scripts.length} declaration(s) of build scripts or configs (${scripts.slice(0, 5).join(", ")}) -> check the dts include in vite.config.ts.`,
		);
	problems.push(
		...findClassicyCommonJsDeclarationProblems(TYPES, declarations, (file) =>
			readFileSync(join(TYPES, file), "utf8"),
		),
	);
	report(
		problems,
		`${TYPES}: ${declarations.length} file(s), index.d.ts among them, each .d.ts with its .d.cts twin for require(), none for a test, build script or JSON file, none referencing Platinum`,
	);
}

// Invariant 8: the production JSX runtime, with no build-machine paths.
report(
	bundles.flatMap(({ file, source }) =>
		findClassicyDevJsxProblems(file, source, process.cwd()),
	),
	`${BUNDLES.join(", ")}: production JSX runtime, no build-machine paths`,
);

// Invariant 9: the browser floor's CSS math, in every stylesheet.
{
	const problems = [];
	const cssFiles = (await readdir(DIST).catch(() => []))
		.filter((f) => f.endsWith(".css"))
		.sort()
		.map((f) => join(DIST, f));
	for (const file of cssFiles)
		problems.push(
			...findClassicyCssFloorProblems(file, await readFile(file, "utf8")),
		);
	report(
		problems,
		`browser floor: ${cssFiles.length} .css file(s), every newer CSS math function with a fallback`,
	);
}

// Invariant 10: the source maps carry Classicy's own text only.
{
	const problems = [];
	const maps = (await readdir(DIST).catch(() => []))
		.filter((f) => f.endsWith(".js.map"))
		.sort()
		.map((f) => join(DIST, f));
	for (const file of maps)
		problems.push(
			...findClassicySourceMapTextProblems(await readFile(file, "utf8"), file),
		);
	report(
		problems,
		`source maps: ${maps.length} dist/*.js.map file(s), each with Classicy's own text and no third-party or asset text`,
	);
}

// Invariant 11: both bundles load in Node with no browser globals, the UMD
// bundle through its CommonJS loader.
{
	const problems = [
		...findClassicyUmdLoaderProblems(
			UMD_LOADER,
			basename(UMD),
			"@classicy/appearance-system7",
			(file) => (existsSync(file) ? readFileSync(file, "utf8") : null),
		),
		...findClassicyUmdTopLevelDeclarations(
			UMD,
			existsSync(UMD) ? readFileSync(UMD, "utf8") : "",
			parseAst,
		),
	];
	if (!problems.length)
		problems.push(
			...(await findClassicyNodeImportProblems([
				{ file: ES, kind: "import" },
				{ file: UMD_LOADER, kind: "require" },
			])),
		);
	report(
		problems,
		`server import: ${ES} (import) and ${UMD_LOADER} (require) load in Node with no browser globals and with Node's own, silently; ${UMD_LOADER} is the CommonJS loader of ${basename(UMD)}, which declares nothing at its top level`,
	);
}

// Invariant 12: the ES bundle is no client module.
report(
	findClassicyNoUseClientProblems(
		ES,
		existsSync(ES) ? readFileSync(ES, "utf8") : null,
	),
	`${ES}: no "use client" directive, so a host imports it from a client module`,
);

if (failed) exit(1);

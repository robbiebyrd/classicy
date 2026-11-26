#!/usr/bin/env node
// The dist check for @classicy/appearance-windows98, run by its `build`
// script after `vite build`, from the package folder: the invariants System
// 7's bin/verify-dist.mjs holds for System 7, held for Windows 98. The
// helpers are the core's bin/ modules, shared by every check.
//
// 1. THE CORE IS AN IMPORT, NOT A COPY. Both bundles import
//    `@classicy/classicy` (the ES bundle with `import`, the UMD bundle with
//    `require`), externalize nothing but the core and React, and carry none
//    of the core's registry code: a bundle that carried its own copy would
//    register Windows 98 into registries nothing reads (design 0014-ahm,
//    anti-goal "Two copies of the registries"). No external specifier
//    carries a Vite query (the core's invariant 1).
//
// 2. DIST/ASSETS HOLDS EVERY PACKAGE FILE, AS AUTHORED. Exactly the fonts
//    (src/assets/fonts: the two woff2 faces, not their readme and license
//    files, which ship in the tarball beside them), the art
//    (src/assets/art: the package's SVG icon and the WebP bitmaps, the
//    Start flag, the Start menu banner and the Windows logo), the icons (src/assets/icons: WebP,
//    the Windows 98 SE icon groups' 32 px and 16 px images, IE 5's toolbar
//    cells and Web View's sky), the cursors (src/assets/cursors: PNG,
//    USER.EXE's), the wallpapers (src/assets/wallpapers: WebP, the CD's
//    wallpaper bitmaps and the desktop patterns' tiles), the screen savers'
//    art (src/screenSavers/<Saver>/*.webp: 3D Pipes' texture) and the sound
//    sheet (src/assets/sounds/windows98/windows98.{ogg,m4a}, not its JSON,
//    its hash or its sprites/ WAV sources), each byte-identical to its
//    source, so an image optimizer added to vite.config.ts fails here. Each
//    ships under its own name (every name in those folders is unique). A PNG
//    left in a WebP folder is no source: nothing ships it. dist/ itself holds
//    only the two bundles and their maps, the two strict-CSP stylesheets,
//    assets/ and types/.
//
// 3. NOTHING IS INLINED. No `data:` URI in either bundle: the package has no
//    masks (its icons, art, wallpapers and cursors are images, its desktop
//    patterns black-on-clear tiles, and every glyph Windows
//    drew in the scheme's colors is drawn from theme tokens in its
//    stylesheet; the empty `data:,` a cursor declaration falls back to
//    carries no file). The
//    ES bundle's `new URL("assets/…", import.meta.url)` references each name
//    a file in dist/assets, and every file there is referenced.
//
// 4. THE LOOK SHIPS IN BOTH BUNDLES AND AS dist/classicy-windows98.css. Each
//    bundle carries the package stylesheet (`windows98.scss?inline`) as
//    exactly one non-empty `@layer classicy.package` block scoped under
//    `[data-classicy-appearance=…]`, never nested in `classicy.base`; and
//    dist/classicy-windows98.css, which strict-CSP hosts link after the
//    core's classicy.css, opens with the layer order and is that block, byte
//    for byte.
//
// 5. EVERY STYLESHEET IN DIST/ IS ASCII ONLY, OR OPENS WITH `@charset "UTF-8";`
//    (the core's invariant 9): a linked file served without an HTTP charset
//    takes a non-UTF-8 page's encoding.
//
// 6. THE FONTS SHIP AS A STYLESHEET TOO. dist/classicy-windows98.fonts.css
//    holds only unlayered `@font-face` rules, exactly one per face the
//    runtime registers (WINDOWS98_FONT_FACES), each the rule the runtime
//    writes, and every url() names the face's own file in dist/assets.
//
// 7. DIST/TYPES DECLARES THE PACKAGE. dist/types/index.d.ts (the `types`
//    export) exists, and no declaration is for a test, a test helper, a story,
//    a build script or an imported JSON file (windows98Json is typed
//    Windows98Json, on the core's types). Every relative specifier in a
//    declaration carries its extension (`./assets/sounds/windows98.js`): the
//    package is `"type": "module"`, so a host on `moduleResolution: node16`
//    or `nodenext` resolves no other. And none references another package:
//    no relative specifier out of dist/types, no `@classicy/appearance-*`
//    import, so a host that installs only Windows 98 resolves every type.
//    And no declaration map (.d.ts.map): the dts() call passes
//    `compilerOptions: { declarationMap: false }`.
//
// 8. BOTH BUNDLES USE THE PRODUCTION JSX RUNTIME (the core's invariant 13).
//    No import of react/jsx-dev-runtime, no jsxDEV() call, no absolute
//    build-machine path in a fileName option.
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
//    in x_google_ignoreList, and keeps the text of each src/ source
//    (classicySourceMapTextPlugin, bin/classicySourceMapText.ts).

import { readdir, readFile } from "node:fs/promises";
import { basename, join, posix, sep } from "node:path";
import { exit } from "node:process";
import { classicyBundleSpecifiers } from "../../../../bin/classicyBundleSpecifiers.ts";
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
import { findClassicyPackageCssProblems } from "../../../../bin/classicyPackageCss.ts";
import { findClassicySourceMapTextProblems } from "../../../../bin/classicySourceMapText.ts";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector.ts";
import { WINDOWS98_FONT_FACES } from "../src/assets/windows98Fonts.internal.ts";

const DIST = "dist";
const ES = join(DIST, "appearance-windows98.es.js");
const UMD = join(DIST, "appearance-windows98.umd.js");
const BUNDLES = [ES, UMD];
const STYLESHEET = join(DIST, "classicy-windows98.css");
const FONT_STYLESHEET = join(DIST, classicyFontStylesheetFile("windows98"));
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
// Vite's UMD output resolves an asset's URL with
// `require("url").pathToFileURL(__dirname + "/assets/…")` when there is no
// document (Node), so the UMD bundle may name Node's own `url` too.
const UMD_ONLY_EXTERNAL = ["url"];
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
			else if (
				!EXTERNAL.includes(specifier) &&
				!(file === UMD && UMD_ONLY_EXTERNAL.includes(specifier))
			)
				problems.push(
					`${file}: externalizes "${specifier}", which is not the core or React -> check \`external\` in vite.config.ts.`,
				);
		}
		if (!specifiers.includes("@classicy/classicy"))
			problems.push(
				`${file}: does not import @classicy/classicy -> the core must stay external (a peer dependency), or Windows 98 registers into a copy of the registries nothing reads.`,
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
// The fonts are woff2, flat in src/assets/fonts; the art SVG and WebP, flat
// in src/assets/art; the icons WebP, flat in src/assets/icons; the cursors
// PNG, flat in src/assets/cursors; the wallpapers WebP, flat in
// src/assets/wallpapers; a screen saver's art WebP, in its own folder under
// src/screenSavers.
const FONT = /\.woff2$/;
const ART = /\.(?:svg|webp)$/;
const WEBP = /\.webp$/;
const CURSOR = /\.png$/;
const saverFolders = (
	await readdir(join("src", "screenSavers"), { withFileTypes: true }).catch(
		() => [],
	)
)
	.filter((entry) => entry.isDirectory())
	.map((entry) => join("src", "screenSavers", entry.name))
	.sort();
const sources = [
	...(await listFiles(join("src", "assets", "fonts"), (n) => FONT.test(n))),
	...(await listFiles(join("src", "assets", "art"), (n) => ART.test(n))),
	...(await listFiles(join("src", "assets", "icons"), (n) => WEBP.test(n))),
	...(await listFiles(join("src", "assets", "cursors"), (n) => CURSOR.test(n))),
	...(await listFiles(join("src", "assets", "wallpapers"), (n) =>
		WEBP.test(n),
	)),
	...(
		await Promise.all(
			saverFolders.map((dir) => listFiles(dir, (n) => WEBP.test(n))),
		)
	).flat(),
	// The sheet's two formats, not its JSON, its hash or its sprites/ WAV
	// sources.
	...(await listFiles(join("src", "assets", "sounds", "windows98"), (n) =>
		/^windows98\.(?:ogg|m4a)$/.test(n),
	)),
];
const shipped = await readdir(join(DIST, "assets")).catch(() => []);
{
	const problems = [];
	const sourceOf = new Map();
	for (const source of sources) {
		const name = basename(source);
		if (sourceOf.has(name))
			problems.push(
				`${source}: shares its name with ${sourceOf.get(name)} -> both would ship as dist/assets/${name}; rename one.`,
			);
		sourceOf.set(name, source);
	}
	// The build emits byte-identical files once, under the name of whichever
	// is imported first: each set of identical sources ships as exactly one
	// of its names.
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
		"appearance-windows98.es.js",
		"appearance-windows98.es.js.map",
		"appearance-windows98.umd.js",
		"appearance-windows98.umd.js.map",
		basename(STYLESHEET),
		basename(FONT_STYLESHEET),
		"assets",
		"types",
	]);
	for (const name of (await readdir(DIST).catch(() => [])).sort())
		if (!top.has(name))
			problems.push(
				`${join(DIST, name)}: not a file the package ships -> the package's dist holds its two bundles and their maps, ${basename(STYLESHEET)}, ${basename(FONT_STYLESHEET)}, assets/ and types/.`,
			);
	report(
		problems,
		`${join(DIST, "assets")}: ${shipped.length} file(s), exactly the package's, each byte-identical to its source`,
	);
}

// Invariant 3: nothing is inlined; the files are referenced from the ES
// bundle.
{
	const problems = [];
	for (const { file, source } of bundles) {
		const uris = new Set(
			[...source.matchAll(/data:([a-z]+\/[a-z0-9.+-]+)[;,]/g)].map((m) => m[1]),
		);
		for (const type of [...uris].sort())
			problems.push(
				`${file}: inlines ${type} -> Windows 98 inlines nothing; check noInlineAppearanceAssetsPlugin.`,
			);
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
		`${BUNDLES.join(", ")}: inline nothing; ${refs.length} file reference(s), one per file in dist/assets`,
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
			WINDOWS98_FONT_FACES,
			(url) => url.startsWith("assets/") && assets.has(url.slice(7)),
		),
		`${FONT_STYLESHEET}: the ${WINDOWS98_FONT_FACES.length} @font-face rules the runtime writes, unlayered, each url() its own file in assets/`,
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
	// Its own screenSavers/ declarations are Windows 98's; a folder named for
	// another package is not.
	const platinum = declarations.filter(
		(file) =>
			file.endsWith(".d.ts") &&
			/(?:^|[\\/])(?:platinum|system7)[\\/]/i.test(file),
	);
	if (platinum.length)
		problems.push(
			`${TYPES}: ${platinum.length} declaration(s) of another package's modules (${platinum.slice(0, 5).join(", ")}) -> Windows 98 imports nothing of the other packages; check index.ts and the dts include in vite.config.ts.`,
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
				`${file}: references another package or a file outside ${TYPES} (${outside.map((s) => JSON.stringify(s)).join(", ")}) -> a host that installs only Windows 98 resolves none of it; import nothing of the other packages.`,
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
	report(
		problems,
		`${TYPES}: ${declarations.length} file(s), index.d.ts among them, none for a test, build script or JSON file, none referencing another package`,
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

if (failed) exit(1);

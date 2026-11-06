#!/usr/bin/env node
// The dist check for @classicy/appearance-platinum (plan 0015-kxa §3.4), run
// by its `build` script after `vite build`, from the package folder. Until
// 3.0 the core's bundle carried Platinum and the core's check-dist-imports.mjs
// checked it (its invariants 5, 7, 9 and 12); the core now checks that it
// carries none of it, and this checks that Platinum ships whole on its own.
// The helpers are the core's bin/ modules, shared by both checks.
//
// 1. THE CORE IS AN IMPORT, NOT A COPY. Both bundles import
//    `@classicy/classicy` (the ES bundle with `import`, the UMD bundle with
//    `require`), externalize nothing but the core and React, and carry none
//    of the core's registry code: a bundle that carried its own copy would
//    register Platinum into registries nothing reads (design 0014-ahm,
//    anti-goal "Two copies of the registries"). No external specifier
//    carries a Vite query (the core's invariant 1).
//
// 2. DIST/ASSETS HOLDS EVERY PACKAGE FILE, AS AUTHORED. Exactly the fonts
//    (src/assets/fonts), the art (src/assets/art), the cursors
//    (src/assets/cursors), the wallpapers (src/assets/wallpapers, not its
//    photos/ folder) and the four sound sprites
//    (src/assets/sounds/platinum/platinum.*),
//    each under its source name and byte-identical to its source, so an
//    image optimizer or a WebP pass added to vite.config.ts fails here
//    (0131-ku3's review). dist/ itself holds only the two bundles and their
//    maps, the two strict-CSP stylesheets, assets/ and types/.
//
// 3. NOTHING BUT THE HALFTONE MASK IS INLINED. Every `data:` URI in either
//    bundle is an image/svg+xml (ruling E17: Platinum's only mask, which needs
//    no CORS fetch). The ES bundle's `new URL("assets/…", import.meta.url)`
//    references each name a file in dist/assets, and every file there is
//    referenced.
//
// 4. THE LOOK SHIPS IN BOTH BUNDLES AND AS dist/classicy-platinum.css. Each
//    bundle carries the package stylesheet (`platinum.scss?inline`) as exactly
//    one non-empty `@layer classicy.package` block scoped under
//    `[data-classicy-appearance=…]`, never nested in `classicy.base`; and
//    dist/classicy-platinum.css, which strict-CSP hosts link after the core's
//    classicy.css, opens with the layer order and is that block, byte for byte.
//
// 5. EVERY STYLESHEET IN DIST/ IS ASCII ONLY, OR OPENS WITH `@charset "UTF-8";`
//    (the core's invariant 9): a linked file served without an HTTP charset
//    takes a non-UTF-8 page's encoding.
//
// 6. THE FONTS SHIP AS A STYLESHEET TOO. dist/classicy-platinum.fonts.css holds
//    only unlayered `@font-face` rules, exactly one per face the runtime
//    registers (PLATINUM_FONT_FACES), each the rule the runtime writes, and
//    every url() names the face's own file in dist/assets.
//
// 7. DIST/TYPES DECLARES THE PACKAGE. dist/types/index.d.ts (the `types`
//    export) exists, and no declaration is for a test, a test helper, a story,
//    a build script or an imported JSON file (platinumJson is typed
//    PlatinumJson, on the core's types; nothing imports platinum.json.d.ts).
//    Every relative specifier in a declaration carries its extension
//    (`./hooks.js`): the package is `"type": "module"`, so a host on
//    `moduleResolution: node16` or `nodenext` resolves no other.

import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { exit } from "node:process";
import { classicyBundleSpecifiers } from "../../../../bin/classicyBundleSpecifiers.ts";
import { findClassicyExtensionlessSpecifiers } from "../../../../bin/classicyDeclarationSpecifiers.ts";
import {
	compareClassicyAssetNames,
	findClassicyStrayAssetUrls,
} from "../../../../bin/classicyDistAssets.ts";
import { findClassicyCssCharsetProblem } from "../../../../bin/classicyDistCharset.ts";
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
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector.ts";
import { PLATINUM_FONT_FACES } from "../src/assets/platinumFonts.internal.ts";

const DIST = "dist";
const ES = join(DIST, "appearance-platinum.es.js");
const UMD = join(DIST, "appearance-platinum.umd.js");
const BUNDLES = [ES, UMD];
const STYLESHEET = join(DIST, "classicy-platinum.css");
const FONT_STYLESHEET = join(DIST, classicyFontStylesheetFile("platinum"));
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
				`${file}: does not import @classicy/classicy -> the core must stay external (a peer dependency), or Platinum registers into a copy of the registries nothing reads.`,
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
const sources = [
	...(await listFiles("src/assets/fonts", (n) => n.endsWith(".woff2"))),
	...(await listFiles("src/assets/art", (n) => /\.(?:svg|png)$/.test(n))),
	...(await listFiles("src/assets/cursors")),
	...(await listFiles("src/assets/wallpapers", (n) =>
		/\.(?:png|jpg)$/.test(n),
	)),
	...["ogg", "m4a", "mp3", "ac3"].map((ext) =>
		join("src", "assets", "sounds", "platinum", `platinum.${ext}`),
	),
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
	const { missing, extra } = compareClassicyAssetNames(
		[...sourceOf.keys()],
		shipped,
	);
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
		"appearance-platinum.es.js",
		"appearance-platinum.es.js.map",
		"appearance-platinum.umd.js",
		"appearance-platinum.umd.js.map",
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

// Invariant 3: nothing but the halftone mask is inlined; the files are
// referenced from the ES bundle.
{
	const problems = [];
	for (const { file, source } of bundles) {
		const types = new Set(
			[...source.matchAll(/data:([a-z]+\/[a-z0-9.+-]+)[;,]/g)].map((m) => m[1]),
		);
		for (const type of [...types].filter((t) => t !== "image/svg+xml"))
			problems.push(
				`${file}: inlines ${type} -> only the halftone mask (image/svg+xml, ruling E17) may be inlined; check noInlineAppearanceAssetsPlugin.`,
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
		`${BUNDLES.join(", ")}: inline only the halftone mask; ${refs.length} file reference(s), one per file in dist/assets`,
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
			PLATINUM_FONT_FACES,
			(url) => url.startsWith("assets/") && assets.has(url.slice(7)),
		),
		`${FONT_STYLESHEET}: the ${PLATINUM_FONT_FACES.length} @font-face rules the runtime writes, unlayered, each url() its own file in assets/`,
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
		`${TYPES}: ${declarations.length} file(s), index.d.ts among them, none for a test, build script or JSON file`,
	);
}

if (failed) exit(1);

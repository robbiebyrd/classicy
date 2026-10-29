#!/usr/bin/env node
// Two invariants on the *published* bundle, both of which have shipped broken
// and neither of which any other signal catches. `vite build` in a consumer app
// succeeds either way, and jsdom tests never load our own dist -- these only
// surfaced as production outages.
//
// 1. NO IMPORT SPECIFIER MAY CARRY A VITE QUERY (`?url`, `?raw`, `?worker`).
//    Those queries are a Vite *source* convention, meaningful only while a file
//    is being transformed by vite:asset. A consumer resolving our dist gets a
//    specifier that names no real module. This leaks whenever a
//    rollupOptions.external predicate matches an asset import -- see isExternal
//    in vite.config.ts. Shipped in 0.70.0: rt911's dev server refused to boot
//    (rolldown: "No such file or directory") and its vitest failed to collect
//    62 suites ("does not provide an export named 'default'").
//
// 2. pdfjs-dist MUST NOT BE EXTERNAL. build.lib forces asset inlining, so
//    PDFViewerDocument's `?url` import bakes *this repo's* pdf.worker into dist
//    as a data: URI. pdf.js refuses to run when the worker and API disagree on
//    version, so externalizing the library lets the consumer supply a different
//    API and the two drift. Shipped in 0.70.0-0.70.2: classicy inlined the
//    6.1.200 worker while rt911 resolved the 6.2.108 API, and every PDF failed
//    with "Couldn't load this PDF." -- caught and rendered as UI text, so no
//    console error and no failing test anywhere.
//
// 3. EACH ENTRY BUNDLE MUST INJECT THE STYLESHEET (#303), and carry no inlined
//    fonts. `import "classicy"` is supposed to be enough for a styled desktop;
//    if injectCssPlugin stopped matching the CSS asset (it is found by name),
//    the bundles would silently ship unstyled. The Platinum fonts are files
//    under src/Appearance, registered at runtime by registerClassicyFonts; if
//    the `?no-inline` resolver stopped matching them, Vite's lib mode would
//    base64 them into the bundle again (every consumer pays for every font).
//
// 4. dist/fonts.js AND dist/appearance-platinum.js MUST STAY SELF-CONTAINED
//    NO-OPS. `import "classicy/fonts"` is the deprecated opt-in from before the
//    fonts became files; existing consumers still import it, so it has to keep
//    resolving. `import "classicy/appearance/platinum"` is the Platinum
//    package's documented side-effect entry, a no-op because the main bundle
//    already registers Platinum (and a second copy of the registries would
//    split the state). Both are emitted assets, not Rollup chunks, so nothing
//    else notices if one goes missing or picks up an import a consumer can't
//    resolve.
//
// 5. PACKAGE ASSETS MUST EMIT AS FILES. dist/assets/ holds exactly the 13
//    Platinum .woff2 fonts plus the Platinum art (svg/png), and the ES bundle
//    resolves them with `new URL("assets/...", import.meta.url)`. They ship
//    exactly as authored: no .webp, only .woff2/.svg/.png references, and a
//    shipped SVG byte-identical to its source.
//
// 6. THE STYLESHEET MUST DECLARE THE CASCADE LAYER ORDER BEFORE ANY RULE.
//    Every component rule is compiled into `@layer classicy.base`
//    (classicyCssLayerPlugin). The order statement fixes base < package <
//    user; without it first, a host that names `classicy.user` before our
//    stylesheet loads would put its own overrides *under* the base layer.
//    Checked in the injected <style> text of both entry bundles and at the
//    head of dist/classicy.css (linked by strict-CSP hosts).
//
// 7. PACKAGE CSS IS ITS OWN `@layer classicy.package` BLOCK. An Appearance
//    Package's stylesheet (`platinum.scss?inline`) must ship as exactly one
//    `classicy.package` block, never nested inside `classicy.base`: the layer
//    plugin wraps every src stylesheet, and a wrapped package block would sit
//    in `classicy.base.classicy.package`, under every base rule, so the whole
//    look would lose to the structure it decorates. Checked in every emitted
//    bundle, in each emitted dist/classicy-<id>.css (the order statement, then
//    the one block), and in the library stylesheet (dist/classicy.css and the
//    injected text), which must carry no package look. Both entry bundles
//    (classicy.es.js, classicy.umd.js) must carry a NON-EMPTY one: they
//    register Platinum, whose look ships in it since plan 0005-1b3 §4.2, so a
//    missing string, an empty block, the bare `@layer classicy.package;`
//    statement, or a block not scoped under `[data-classicy-appearance=…]`
//    means the look stopped shipping. And dist/classicy-platinum.css must
//    exist and be that same block, byte for byte: strict-CSP hosts, whose
//    policy blocks the injected <style>, link it after classicy.css.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { argv, exit } from "node:process";
import {
	findClassicyPackageCssProblems,
	requiredClassicyPackageBundles,
	requiredClassicyPackageStylesheets,
} from "./classicyPackageCss.ts";

const DIST = "dist";

async function bundles() {
	if (argv.slice(2).length) return argv.slice(2);
	const entries = await readdir(DIST);
	// Every emitted file: not just the entry (a dynamic import like pdfjs is
	// code-split into its own chunk) and not just the ESM build. The UMD build
	// is published too, and 0.70.2's carried a bare `import("pdfjs-dist")` --
	// a `require()` scan alone would have missed it, because Rollup keeps the
	// externalized *dynamic* import as an import() even in UMD output.
	return entries
		.filter((f) => f.endsWith(".js"))
		.sort()
		.map((f) => join(DIST, f));
}

// One ESM static import at the head of a bundle. An import clause can never
// contain a quote or a semicolon, so [^"';]* consumes it without risking a
// match against a string literal deeper in the file.
const IMPORT = /\s*import\s*(?:[^"';]*from\s*)?"([^"]*)"\s*;?/y;

// Dynamic imports are NOT in the prologue and are the form that actually
// mattered: PDFViewerDocument loads pdfjs lazily, so an externalized
// `import("pdfjs-dist")` sits in the middle of the minified body. Checking only
// static imports passed 0.70.2 clean while every PDF was broken in production.
// Minified output quotes with " or ` depending on the chunk, so accept both.
const DYNAMIC_IMPORT = /\bimport\(\s*(["'`])([^"'`]*)\1\s*\)/g;

// UMD lists its static externals as require() calls in the factory header.
const REQUIRE = /\brequire\(\s*(["'`])([^"'`]*)\1\s*\)/g;

// Our own emitted chunks, and specifiers the bundler computes at runtime
// (`import(`${v}`)`), are not external packages.
const isExternalSpecifier = (s) =>
	!s.startsWith(".") && !s.startsWith("/") && !s.includes("${");

async function specifiersOf(file) {
	const source = await readFile(file, "utf8");
	const specifiers = [];
	IMPORT.lastIndex = 0;
	// The prologue is a contiguous run of imports; the first non-import ends it.
	let match = IMPORT.exec(source);
	while (match) {
		specifiers.push(match[1]);
		match = IMPORT.exec(source);
	}
	for (const re of [DYNAMIC_IMPORT, REQUIRE]) {
		for (const m of source.matchAll(re)) {
			if (isExternalSpecifier(m[2])) specifiers.push(m[2]);
		}
	}
	return specifiers;
}

const MUST_BE_BUNDLED = ["pdfjs-dist"];

let failed = false;
for (const file of await bundles()) {
	const specifiers = await specifiersOf(file);

	const queried = specifiers.filter((s) => s.includes("?"));
	if (queried.length) {
		failed = true;
		console.error(`${file}: ${queried.length} import(s) carry a Vite query:`);
		for (const s of queried) console.error(`  import "${s}"`);
		console.error(
			"  -> an asset import must stay bundled so vite:asset can inline it; " +
				"exclude the query from isExternal in vite.config.ts.",
		);
	}

	const leaked = specifiers.filter((s) =>
		MUST_BE_BUNDLED.some((p) => s === p || s.startsWith(`${p}/`)),
	);
	if (leaked.length) {
		failed = true;
		console.error(`${file}: externalized a package that must stay bundled:`);
		for (const s of leaked) console.error(`  import "${s}"`);
		console.error(
			"  -> its worker is inlined here at build time; the consumer would " +
				"supply a mismatched API version and every PDF would fail to load.",
		);
	}

	if (!queried.length && !leaked.length) {
		console.log(`${file}: ${specifiers.length} import(s), clean`);
	}
}

// Invariant 3: the stylesheet injector is appended to the two entry bundles,
// and neither carries inlined fonts.
const STYLE_ID = '"classicy-styles"';
// A base64 payload, not the bare prefix: a bundled dependency builds
// `data:font/opentype;base64,${...}` URLs at runtime and is not an inlined font.
const INLINED_FONT =
	/data:(?:font\/|application\/font-)[^,"'`]*;base64,[A-Za-z0-9+/=]{16}/;
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	if (source.lastIndexOf(`document.getElementById(${STYLE_ID})`) === -1) {
		failed = true;
		console.error(
			`${file}: does not inject its stylesheet -> check injectCssPlugin in vite.config.ts.`,
		);
	} else if (INLINED_FONT.test(source)) {
		failed = true;
		console.error(
			`${file}: inlines fonts as data: URIs -> check noInlineAppearanceAssetsPlugin in vite.config.ts.`,
		);
	} else {
		console.log(`${file}: injects its stylesheet, without inlined fonts`);
	}
}

// Invariant 4: the no-op shims (the deprecated fonts entry, the Platinum
// package entry).
for (const shim of ["fonts.js", "appearance-platinum.js"]) {
	const entry = join(DIST, shim);
	if (argv.slice(2).length && !argv.slice(2).includes(entry)) continue;
	const source = await readFile(entry, "utf8").catch(() => null);
	if (source === null) {
		failed = true;
		console.error(
			`${entry}: missing -> check injectCssPlugin in vite.config.ts.`,
		);
	} else if (
		/\b(?:import|require)\b/.test(source.replace(/^\s*\/\/.*$/gm, ""))
	) {
		failed = true;
		console.error(
			`${entry}: has an import/require; it must stay a self-contained script.`,
		);
	} else {
		console.log(`${entry}: self-contained no-op shim`);
	}
}

// Invariant 5: package assets are files in dist/assets, referenced relative to
// the bundle. Skipped when the caller names specific files.
if (!argv.slice(2).length) {
	const assets = await readdir(join(DIST, "assets")).catch(() => []);
	const fonts = assets.filter((f) => f.endsWith(".woff2"));
	const art = assets.filter((f) => /\.(svg|png)$/.test(f));
	if (fonts.length !== 13) {
		failed = true;
		console.error(
			`${join(DIST, "assets")}: expected 13 .woff2 files, found ${fonts.length} -> check noInlineAppearanceAssetsPlugin in vite.config.ts.`,
		);
	} else if (art.length < 17) {
		failed = true;
		console.error(
			`${join(DIST, "assets")}: expected at least 17 .svg/.png files from src/Appearance/Platinum/assets/art, found ${art.length}.`,
		);
	} else {
		console.log(
			`${join(DIST, "assets")}: ${fonts.length} .woff2 font(s), ${art.length} .svg/.png file(s)`,
		);
	}
	// Package assets ship exactly as authored: the image plugin must not have
	// rewritten them to WebP or run svgo over them (Part E uses the art as CSS
	// masks, and svgo's removeViewBox breaks that).
	const webp = assets.filter((f) => f.endsWith(".webp"));
	if (webp.length) {
		failed = true;
		console.error(
			`${join(DIST, "assets")}: ${webp.length} .webp file(s) (${webp.join(", ")}) -> the image plugin rewrote package art; check \`excludes\` on VitePluginImageTools in vite.config.ts.`,
		);
	}
	const es = join(DIST, "classicy.es.js");
	const esSource = await readFile(es, "utf8");
	const refs = [...esSource.matchAll(/new URL\("(assets\/[^"]*)"/g)].map(
		(m) => m[1],
	);
	const strays = [...new Set(refs)].filter(
		(r) => !/\.(woff2|svg|png)$/.test(r),
	);
	if (refs.length === 0) {
		failed = true;
		console.error(
			`${es}: no \`new URL("assets/\` reference -> package assets are not resolved relative to the bundle.`,
		);
	} else if (strays.length) {
		failed = true;
		console.error(
			`${es}: asset reference(s) to unexpected file types: ${strays.join(", ")}`,
		);
	} else {
		console.log(
			`${es}: ${refs.length} file asset reference(s), all as authored`,
		);
	}
	const svgSource = "src/Appearance/Platinum/assets/art/slider-strikes.svg";
	const [authored, shipped] = await Promise.all([
		readFile(svgSource).catch(() => null),
		readFile(join(DIST, "assets", "slider-strikes.svg")).catch(() => null),
	]);
	if (authored === null || shipped === null || !authored.equals(shipped)) {
		failed = true;
		console.error(
			`${join(DIST, "assets", "slider-strikes.svg")}: differs from ${svgSource} (or is missing) -> package SVGs must ship byte-for-byte.`,
		);
	} else {
		console.log("dist/assets/slider-strikes.svg: byte-identical to its source");
	}
}

// Invariant 6: the cascade layer order, first, in the injected stylesheet of
// both entry bundles and in the linked dist/classicy.css.
const LAYER_ORDER = "@layer classicy.base, classicy.package, classicy.user;";
// The order statement, exactly once, then the first component stylesheet's
// (minified) layer block. Vite hoists a `@charset` to the top of the CSS: the
// injected text keeps it after the statement (it means nothing in a <style>),
// the linked file before it (it only counts as a file's first bytes).
const CHARSET = '(?:@charset "[^"]*";\\s*)?';
const ORDER = LAYER_ORDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BASE_BLOCK = "@layer classicy\\.base\\s*\\{";
const INJECTED_START = new RegExp(`^${ORDER}\\n${CHARSET}${BASE_BLOCK}`);
const LINKED_START = new RegExp(`^${CHARSET}${ORDER}\\n${BASE_BLOCK}`);

// The CSS text the injector at `at` writes: its `textContent=` string
// literal, decoded.
function injectedText(source, at) {
	const literal = /\.textContent=("(?:[^"\\]|\\.)*")/.exec(source.slice(at));
	try {
		return literal ? JSON.parse(literal[1]) : "";
	} catch {
		return "";
	}
}
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	const at = source.lastIndexOf(`document.getElementById(${STYLE_ID})`);
	if (at === -1) continue; // reported by invariant 3
	if (!INJECTED_START.test(injectedText(source, at))) {
		failed = true;
		console.error(
			`${file}: the injected stylesheet does not start with "${LAYER_ORDER}" exactly once, then a classicy.base block -> check classicyStyleInjector and classicyCssLayerPlugin.`,
		);
	} else {
		console.log(
			`${file}: the injected stylesheet declares the layer order first`,
		);
	}
}
const cssFile = join(DIST, "classicy.css");
if (!argv.slice(2).length || argv.slice(2).includes(cssFile)) {
	const css = await readFile(cssFile, "utf8").catch(() => "");
	if (!LINKED_START.test(css)) {
		failed = true;
		console.error(
			`${cssFile}: does not start with "${LAYER_ORDER}" exactly once, then a classicy.base block -> check injectCssPlugin and classicyCssLayerPlugin.`,
		);
	} else {
		console.log(`${cssFile}: declares the layer order first`);
	}
}

// Invariant 7: package CSS is its own classicy.package block. With named
// files, only those are checked (a .js file as a bundle, a .css file by name).
{
	const named = argv.slice(2);
	const distFiles = named.length ? [] : await readdir(DIST);
	const jsFiles = named.length
		? named.filter((f) => f.endsWith(".js"))
		: distFiles.filter((f) => f.endsWith(".js")).map((f) => join(DIST, f));
	const PACKAGE_CSS_FILE = /^classicy-[a-z0-9]+(?:-[a-z0-9]+)*\.css$/;
	const packageFiles = named.length
		? named.filter((f) => PACKAGE_CSS_FILE.test(f.split(/[\\/]/).pop()))
		: distFiles
				.filter((f) => PACKAGE_CSS_FILE.test(f))
				.map((f) => join(DIST, f));
	const read = async (file) => ({ file, text: await readFile(file, "utf8") });
	const bundles = await Promise.all(jsFiles.map(read));
	const baseStylesheets = bundles.flatMap(({ file, text }) => {
		const at = text.lastIndexOf(`document.getElementById(${STYLE_ID})`);
		return at === -1
			? []
			: [
					{
						file: `${file} (injected stylesheet)`,
						css: injectedText(text, at),
					},
				];
	});
	if (!named.length || named.includes(cssFile)) {
		const css = await readFile(cssFile, "utf8").catch(() => null);
		if (css !== null) baseStylesheets.push({ file: cssFile, css });
	}
	const packageStylesheets = (await Promise.all(packageFiles.map(read))).map(
		({ file, text }) => ({ file, css: text }),
	);
	// The entry bundles register Platinum, so each must ship its stylesheet.
	// Named files: those of them that were named.
	const requiredBundles = requiredClassicyPackageBundles(named, (f) =>
		join(DIST, f),
	);
	// dist/classicy-platinum.css (R5). Named files: if it was named.
	const requiredPackageStylesheets = requiredClassicyPackageStylesheets(
		named,
		(f) => join(DIST, f),
	);
	const problems = findClassicyPackageCssProblems({
		layerOrder: LAYER_ORDER,
		bundles: bundles.map(({ file, text }) => ({ file, source: text })),
		baseStylesheets,
		packageStylesheets,
		requiredBundles,
		requiredPackageStylesheets,
	});
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`package CSS: ${requiredBundles.length} entry bundle(s) carry a non-empty package stylesheet; ${packageStylesheets.length} package stylesheet file(s), ${requiredPackageStylesheets.length} of them required and identical to the injected one; every @layer classicy.package block stands alone`,
		);
}

if (failed) exit(1);

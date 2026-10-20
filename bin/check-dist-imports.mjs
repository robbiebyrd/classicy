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
// 3. EACH ENTRY BUNDLE MUST INJECT THE STYLESHEET (#303), and without the
//    base64 fonts. `import "classicy"` is supposed to be enough for a styled
//    desktop; if injectCssPlugin stopped matching the CSS asset (it is found
//    by name), the bundles would silently ship unstyled. And if it ran before
//    the font split, every consumer would download several MB of fonts.
//
// 4. dist/fonts.js MUST INJECT THE BUNDLED FONTS, and stay self-contained.
//    `import "classicy/fonts"` is the opt-in for them; it is an emitted asset,
//    not a Rollup chunk, so nothing else notices if it goes missing, injects
//    an empty stylesheet, or picks up an import a consumer can't resolve.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { argv, exit } from "node:process";

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

// Invariant 3: the stylesheet injector is appended to the two entry bundles.
const STYLE_ID = '"classicy-styles"';
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	const at = source.lastIndexOf(`document.getElementById(${STYLE_ID})`);
	if (at === -1) {
		failed = true;
		console.error(
			`${file}: does not inject its stylesheet -> check injectCssPlugin in vite.config.ts.`,
		);
	} else if (/@font-face[^}]*data:/.test(source.slice(at))) {
		failed = true;
		console.error(
			`${file}: the injected stylesheet carries base64 @font-face rules -> injectCssPlugin must run after splitFontFacesPlugin.`,
		);
	} else {
		console.log(`${file}: injects its stylesheet, without bundled fonts`);
	}
}

// Invariant 4: the opt-in fonts entry.
const fontsEntry = join(DIST, "fonts.js");
if (!argv.slice(2).length || argv.slice(2).includes(fontsEntry)) {
	const source = await readFile(fontsEntry, "utf8").catch(() => null);
	if (source === null) {
		failed = true;
		console.error(
			`${fontsEntry}: missing -> check injectCssPlugin in vite.config.ts.`,
		);
	} else if (!source.includes('document.getElementById("classicy-fonts")')) {
		failed = true;
		console.error(`${fontsEntry}: does not inject the fonts stylesheet.`);
	} else if (!/@font-face[^}]*data:/.test(source)) {
		failed = true;
		console.error(
			`${fontsEntry}: carries no bundled @font-face rules -> is splitFontFacesPlugin still emitting fonts.css?`,
		);
	} else if (/^\s*(?:import|export)\b/m.test(source)) {
		failed = true;
		console.error(
			`${fontsEntry}: has an import/export; it must stay a self-contained script.`,
		);
	} else {
		console.log(`${fontsEntry}: injects the bundled fonts`);
	}
}

if (failed) exit(1);

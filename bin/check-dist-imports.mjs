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

if (failed) exit(1);

#!/usr/bin/env node
// Fails if the published ES bundle keeps an import specifier carrying a Vite
// query (`?url`, `?raw`, `?worker`, ...).
//
// Those queries are a Vite *source* convention. They are meaningful only while
// a file is being transformed by vite:asset; a consumer resolving our dist gets
// a specifier that does not name a real module. This leaks whenever a
// rollupOptions.external predicate matches an asset import -- see isExternal in
// vite.config.ts.
//
// It needs its own check because no other signal catches it: `vite build` in a
// consumer app resolves the query and succeeds, and jsdom tests never load the
// bundle's own dist. It surfaced only as a consumer's dev server refusing to
// boot and a consumer's vitest failing to collect (classicy 0.70.0, the
// pdfjs-dist worker).

import { readFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const BUNDLES = argv.slice(2).length ? argv.slice(2) : ["dist/classicy.es.js"];

// One ESM static import at the head of the bundle. An import clause can never
// contain a quote or a semicolon, so [^"';]* consumes it without risking a
// match against a string literal deeper in the file.
const IMPORT = /\s*import\s*(?:[^"';]*from\s*)?"([^"]*)"\s*;?/y;

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
	return specifiers;
}

let failed = false;
for (const file of BUNDLES) {
	const specifiers = await specifiersOf(file);
	const queried = specifiers.filter((s) => s.includes("?"));
	if (queried.length) {
		failed = true;
		console.error(`${file}: ${queried.length} import(s) carry a Vite query:`);
		for (const s of queried) console.error(`  import "${s}"`);
	} else {
		console.log(`${file}: ${specifiers.length} import(s), none queried`);
	}
}

if (failed) {
	console.error(
		"\nAdd the package to neither side of isExternal, or exclude the query -- " +
			"an asset import must stay bundled so vite:asset can inline it.",
	);
	exit(1);
}

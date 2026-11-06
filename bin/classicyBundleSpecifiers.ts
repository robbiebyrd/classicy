// The external module specifiers a built bundle loads, shared by the core's
// check-dist-imports.mjs (no Vite query, pdfjs-dist bundled) and the Platinum
// package's verify-dist (only the core and React external, the core
// imported rather than carried).
//
// Plain erasable TypeScript: the dist checks import this file through Node's
// type stripping.

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

// The bundle's own emitted chunks, and specifiers the bundler computes at
// runtime (`import(`${v}`)`), are not external packages.
const isExternalSpecifier = (s: string) =>
	!s.startsWith(".") && !s.startsWith("/") && !s.includes("${");

/**
 * The external specifiers in `source`, a bundle's text, in order: the
 * prologue's static imports (a contiguous run; the first non-import ends
 * it), then every dynamic `import()` and every `require()`.
 */
export const classicyBundleSpecifiers = (source: string): string[] => {
	const specifiers: string[] = [];
	const prologue = new RegExp(IMPORT.source, "y");
	let match = prologue.exec(source);
	while (match) {
		if (isExternalSpecifier(match[1])) specifiers.push(match[1]);
		match = prologue.exec(source);
	}
	for (const re of [DYNAMIC_IMPORT, REQUIRE]) {
		for (const m of source.matchAll(re)) {
			if (isExternalSpecifier(m[2])) specifiers.push(m[2]);
		}
	}
	return specifiers;
};

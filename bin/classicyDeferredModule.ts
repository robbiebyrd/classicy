import type { Plugin } from "vite";

// A module imported only with `import()` is a lazy chunk in the ES build, but
// the UMD build has one file, so Rollup inlines it and, as its docs say of
// `inlineDynamicImports`, "a module that is only imported dynamically will be
// executed immediately". pdf.js's legacy build then runs when the UMD bundle
// loads, and its top level (`const SCALE_MATRIX = new DOMMatrix()`) throws
// without a DOM, so `require()` of the bundle fails in Node (story 0223-a0y).
// This transform moves such a module's body into a function the importer
// calls, so it runs when the PDF viewer first loads a document, in both
// builds, and never at load.

/** The one export a deferred module keeps: it runs the module's body on its
 * first call and returns the module's exports, the same object every call.
 * Call it unbound, so the body's top-level `this` stays `undefined`. */
export const CLASSICY_DEFERRED_EXPORT = "__classicyDeferred";

/** pdf.js's legacy API build, the PDF viewer's lazy import. */
export const CLASSICY_DEFERRED_MODULE_RE =
	/[\\/]pdfjs-dist[\\/]legacy[\\/]build[\\/]pdf\.mjs$/;

// The cache the wrapper keeps the exports in, outside the body's scope.
const CACHE = "classicyDeferredExports";

type AstNode = { type: string; start: number; end: number };
type ExportName = { type: string; name?: string; value?: unknown };
type ExportSpecifierNode = { local: ExportName; exported: ExportName };
type ExportNamedNode = AstNode & {
	declaration: unknown;
	source: unknown;
	specifiers: ExportSpecifierNode[];
};

const nameOf = (node: ExportName): string =>
	node.type === "Identifier" ? String(node.name) : String(node.value);

/**
 * Wraps an ES module's body in the `__classicyDeferred` function. The module
 * must import nothing and export only through `export { … }` lists (pdf.js's
 * legacy build does); anything else throws, so a pdf.js update that changes
 * its shape fails the build instead of shipping a broken viewer. Every
 * character of the body keeps its line and column: the export lists become
 * spaces and the wrapper's head sits on the first line, which must hold no
 * code, so the transform needs no source map of its own.
 */
export function classicyDeferModule(
	code: string,
	// Rollup's ESTree program, whose nodes carry their `start` and `end`.
	program: { body: ReadonlyArray<object> },
	id = "module",
): string {
	const nodes = program.body as ReadonlyArray<AstNode>;
	if (code.includes(CACHE))
		throw new Error(
			`${id}: already names ${CACHE}, the deferred module's cache -> rename it in bin/classicyDeferredModule.ts.`,
		);
	const exported: string[] = [];
	const spans: AstNode[] = [];
	for (const node of nodes) {
		if (node.type === "ExportNamedDeclaration") {
			const named = node as ExportNamedNode;
			if (named.declaration === null && named.source === null) {
				for (const specifier of named.specifiers)
					exported.push(
						`${JSON.stringify(nameOf(specifier.exported))}:${nameOf(specifier.local)}`,
					);
				spans.push(node);
				continue;
			}
		}
		if (/^(?:Import|Export)/.test(node.type))
			throw new Error(
				`${id}: has a top-level ${node.type} at ${node.start} -> a deferred module may import nothing and export only through \`export { … }\` lists (bin/classicyDeferredModule.ts).`,
			);
	}
	const first = nodes[0];
	if (first && !code.slice(0, first.start).includes("\n"))
		throw new Error(
			`${id}: has code on its first line -> the deferred module's wrapper goes there (bin/classicyDeferredModule.ts).`,
		);
	let body = code;
	for (const span of [...spans].sort((a, b) => b.start - a.start))
		body =
			body.slice(0, span.start) +
			body.slice(span.start, span.end).replace(/[^\n]/g, " ") +
			body.slice(span.end);
	return (
		`let ${CACHE};export function ${CLASSICY_DEFERRED_EXPORT}(){if(${CACHE})return ${CACHE};` +
		body +
		`\nreturn ${CACHE}=Object.freeze({__proto__:null,${exported.join(",")}});}\n`
	);
}

/**
 * Defers the modules `match` names (pdf.js's legacy build by default) in a
 * library build: see `classicyDeferModule`. The importer unwraps the result
 * with `classicyDeferredExports`
 * (src/SystemFolder/PDFViewer/ClassicyDeferredExports.internal.ts), which
 * passes an undeferred module through, so the configs that do not register
 * this plugin (vitest, Storybook, the example's dev server) need none.
 */
export function classicyDeferredModulePlugin(
	match: RegExp = CLASSICY_DEFERRED_MODULE_RE,
): Plugin {
	return {
		name: "classicy-deferred-module",
		apply: "build",
		transform(code, id) {
			const [file] = id.split("?");
			if (!match.test(file)) return null;
			return {
				code: classicyDeferModule(code, this.parse(code), file),
				map: null,
			};
		},
	};
}

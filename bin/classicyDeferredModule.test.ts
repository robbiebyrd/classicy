// @vitest-environment node
// (importing vite loads esbuild, which refuses jsdom's TextEncoder.)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseAst } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_DEFERRED_EXPORT,
	CLASSICY_DEFERRED_MODULE_RE,
	classicyDeferModule,
	classicyDeferredModulePlugin,
} from "./classicyDeferredModule";

const defer = (code: string) =>
	classicyDeferModule(code, parseAst(code), "m.js");

// A module shaped like pdf.js's legacy build: a license comment on the first
// line, a body that touches a browser global at its top level, and one
// export list at the end.
const MODULE = [
	"/**",
	" * License.",
	" */",
	"globalThis.evaluations = (globalThis.evaluations ?? 0) + 1;",
	"const matrix = new DOMMatrix();",
	"function getDocument() { return matrix; }",
	"class Util {}",
	"const self = this;",
	"export { getDocument, Util as Utility, self };",
	"",
].join("\n");

const root = mkdtempSync(join(tmpdir(), "classicy-deferred-module-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
let run = 0;
const load = async (code: string) => {
	const file = join(root, `m${run++}.mjs`);
	writeFileSync(file, code);
	return (await import(pathToFileURL(file).href)) as Record<string, unknown>;
};

describe("classicyDeferModule", () => {
	it("keeps one export, a function that runs the body on its first call", async () => {
		const globals = globalThis as { evaluations?: number; DOMMatrix?: unknown };
		const hadDomMatrix = "DOMMatrix" in globals;
		const DOMMatrix = globals.DOMMatrix;
		delete globals.DOMMatrix;
		globals.evaluations = 0;
		try {
			// Loading it touches nothing: the body has not run.
			const module = await load(defer(MODULE));
			expect(Object.keys(module)).toEqual([CLASSICY_DEFERRED_EXPORT]);
			expect(globals.evaluations).toBe(0);
			const load1 = module[CLASSICY_DEFERRED_EXPORT] as () => unknown;
			// Its first call runs it, and throws as the module itself would.
			expect(load1).toThrow(/DOMMatrix is not defined/);

			globals.DOMMatrix = class {};
			const deferred = await load(defer(MODULE));
			const exportsOf = deferred[CLASSICY_DEFERRED_EXPORT] as () => Record<
				string,
				unknown
			>;
			const first = exportsOf();
			expect(Object.keys(first)).toEqual(["getDocument", "Utility", "self"]);
			expect(first.getDocument).toBeTypeOf("function");
			expect(first.Utility).toBeTypeOf("function");
			// Called unbound, the body's top-level `this` is undefined, as in
			// a module.
			expect(first.self).toBeUndefined();
			expect(Object.isFrozen(first)).toBe(true);
			expect(Object.getPrototypeOf(first)).toBeNull();
			// The same object every call, the body run once.
			const runs = globals.evaluations;
			expect(exportsOf()).toBe(first);
			expect(globals.evaluations).toBe(runs);
		} finally {
			if (hadDomMatrix) globals.DOMMatrix = DOMMatrix;
			else delete globals.DOMMatrix;
			delete globals.evaluations;
		}
	});

	it("keeps every character of the body on its line and column", () => {
		const deferred = defer(MODULE).split("\n");
		const lines = MODULE.split("\n");
		// The wrapper's head is on the first line, before the comment opens.
		expect(deferred[0].endsWith(lines[0])).toBe(true);
		for (let i = 1; i < lines.length - 2; i++)
			expect(deferred[i]).toBe(lines[i]);
		// The export list is blanked, not removed.
		expect(deferred[lines.length - 2]).toBe(
			" ".repeat(lines[lines.length - 2].length),
		);
	});

	it.each([
		["an import", `/**/\nimport x from "x";\nexport { x };\n`],
		["a re-export", `/**/\nexport { x } from "x";\n`],
		["an export *", `/**/\nexport * from "x";\n`],
		["a default export", "/**/\nexport default 1;\n"],
		["an exported declaration", "/**/\nexport const x = 1;\n"],
	])("refuses a module with %s", (_name, code) =>
		expect(() => defer(code)).toThrow(
			/^m\.js: has a top-level (?:Import|Export)\w+ at \d+ -> a deferred module may import nothing/,
		));

	it("refuses a module with code on its first line", () =>
		expect(() => defer("const a = 1;\nexport { a };\n")).toThrow(
			/^m\.js: has code on its first line/,
		));

	it("refuses a module that already names the wrapper's cache", () =>
		expect(() =>
			defer("/**/\nconst classicyDeferredExports = 1;\nexport {};\n"),
		).toThrow(/already names classicyDeferredExports/));
});

describe("classicyDeferredModulePlugin", () => {
	const plugin = classicyDeferredModulePlugin();
	type Transform = (
		this: { parse: typeof parseAst },
		code: string,
		id: string,
	) => { code: string; map: null } | null;
	const transform = plugin.transform as unknown as Transform;
	const context = { parse: parseAst };

	it("runs in builds only", () => expect(plugin.apply).toBe("build"));

	it("defers pdf.js's legacy build, keeping the input source map", () => {
		const result = transform.call(
			context,
			MODULE,
			"/repo/node_modules/pdfjs-dist/legacy/build/pdf.mjs?v=1",
		);
		expect(result?.code).toBe(defer(MODULE));
		expect(result?.map).toBeNull();
	});

	it("leaves every other module alone, pdf.js's modern build included", () => {
		for (const id of [
			"/repo/node_modules/pdfjs-dist/build/pdf.mjs",
			"/repo/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
			"/repo/src/index.ts",
		])
			expect(transform.call(context, MODULE, id), id).toBeNull();
	});

	// The real file: a pdf.js update that changes its shape fails here first.
	it("defers the installed pdfjs-dist legacy build", () => {
		const require = createRequire(import.meta.url);
		const file = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
		expect(file).toMatch(CLASSICY_DEFERRED_MODULE_RE);
		const code = readFileSync(file, "utf8");
		const deferred = defer(code);
		expect(deferred.startsWith("let classicyDeferredExports;")).toBe(true);
		expect(deferred).toContain('"getDocument":getDocument');
		expect(deferred).toContain('"GlobalWorkerOptions":GlobalWorkerOptions');
		expect(() => parseAst(deferred)).not.toThrow();
	});
});

// @vitest-environment node
// (The Node branch runs only where there is no document; parseAst loads
// esbuild-free Rollup, but vite's entry needs Node's TextEncoder.)
import { runInNewContext } from "node:vm";
import { parseAst } from "vite";
import { describe, expect, it } from "vitest";
import {
	CLASSICY_UMD_NODE_URL,
	classicyUmdNodeUrl,
	classicyUmdNodeUrlPlugin,
	findClassicyUmdNodeBuiltinProblems,
	findClassicyUmdTopLevelDeclarations,
} from "./classicyUmdNodeUrl";

// Rollup's UMD rendering of import.meta.url and of an asset URL, as the
// library build minifies it, and unminified.
const MINIFIED =
	'(function(I,C){typeof exports=="object"?C(exports,require("react")):C(I.x={},I.React)})(this,(function(I,C){const a=typeof document>"u"&&typeof location>"u"?require("url").pathToFileURL(__filename).href:location.href;\nconst b=""+(typeof document>"u"&&typeof location>"u"?require("url").pathToFileURL(__dirname+"/sample.mp4").href:"x");I.a=a;I.b=b}));\n//# sourceMappingURL=classicy.umd.js.map\n';
const ROLLUP =
	"(function (g, f) { f(exports); })(this, (function (exports) {\nconst a = (typeof document === 'undefined' && typeof location === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : location.href);\nexports.a = a;\n\n}));\n";
const HELPER = `function ${CLASSICY_UMD_NODE_URL}(){return process.getBuiltinModule("node:url")}`;

describe("classicyUmdNodeUrl", () => {
	it("replaces each require of Node's url module, keeping every other character's line and column", () => {
		const out = classicyUmdNodeUrl(MINIFIED);
		expect(out).not.toMatch(/require\("url"\)/);
		const before = MINIFIED.split("\n");
		const after = out.split("\n");
		expect(after).toHaveLength(before.length);
		// The first line: only the replaced spans differ.
		expect(after[0]).toBe(
			before[0].replaceAll('require("url")', `${CLASSICY_UMD_NODE_URL}()`),
		);
		// The last code line: the same, and the function declared inside the
		// factory, just before its closing "}));", which alone moves.
		const last = before[1].replaceAll(
			'require("url")',
			`${CLASSICY_UMD_NODE_URL}()`,
		);
		expect(after[1]).toBe(`${last.slice(0, -4)};${HELPER}}));`);
		expect(after.slice(2)).toEqual(before.slice(2));
	});

	it("pads Rollup's own require('u' + 'rl') to its length, and declares the function in its factory", () => {
		const out = classicyUmdNodeUrl(ROLLUP).split("\n");
		const before = ROLLUP.split("\n");
		expect(out[1]).toHaveLength(before[1].length);
		expect(out[1]).toContain(
			`${CLASSICY_UMD_NODE_URL}()     .pathToFileURL(__filename)`,
		);
		expect(out[4]).toBe(`;${HELPER}}));`);
	});

	it("leaves a bundle that requires no url module alone", () =>
		expect(classicyUmdNodeUrl("const a=1;\n")).toBe("const a=1;\n"));

	it("refuses a bundle that does not end with its factory's }));", () =>
		expect(() =>
			classicyUmdNodeUrl(
				'const a=require("url");\n//# sourceMappingURL=a.js.map\n',
			),
		).toThrow(/does not end with its factory's "\}\)\);"/));

	// Nothing at the top level: no global on a <script> page, and no slow
	// global lookups under the CommonJS loader's eval.
	it("declares nothing at the bundle's top level", () => {
		expect(
			findClassicyUmdTopLevelDeclarations(
				"dist/classicy.umd.js",
				classicyUmdNodeUrl(MINIFIED),
				parseAst,
			),
		).toEqual([]);
		// As a <script> page runs it: a classic script whose global is the
		// window (a vm context), where a top-level function would be a global.
		const window: Record<string, unknown> = {
			document: { baseURI: "https://host.example/" },
			location: { href: "https://host.example/" },
			React: {},
		};
		runInNewContext(classicyUmdNodeUrl(MINIFIED), window);
		expect(Object.keys(window).sort()).toEqual([
			"React",
			"document",
			"location",
			"x",
		]);
		expect(window.x).toEqual({ a: "https://host.example/", b: "x" });
	});

	// In Node the rewritten branch still gives the file's URL.
	it("still resolves file URLs in Node", () => {
		const run = new Function(
			"exports",
			"require",
			"module",
			"__filename",
			"__dirname",
			classicyUmdNodeUrl(MINIFIED),
		);
		const exports: Record<string, string> = {};
		run(
			exports,
			(id: string) => {
				if (id === "react") return {};
				throw new Error(`required ${id}`);
			},
			{ exports },
			"/srv/app/node_modules/@classicy/classicy/dist/classicy.umd.js",
			"/srv/app/node_modules/@classicy/classicy/dist",
		);
		expect(exports).toEqual({
			a: "file:///srv/app/node_modules/@classicy/classicy/dist/classicy.umd.js",
			b: "file:///srv/app/node_modules/@classicy/classicy/dist/sample.mp4",
		});
	});
});

describe("classicyUmdNodeUrlPlugin", () => {
	type GenerateBundle = (
		this: { error: (message: string) => never },
		options: { format: string },
		bundle: Record<string, { type: string; code?: string; fileName?: string }>,
	) => void;
	const run = (format: string, code = MINIFIED) => {
		const bundle = {
			"classicy.umd.js": { type: "chunk", code, fileName: "classicy.umd.js" },
			"classicy.umd.js.map": { type: "asset" },
		};
		(
			classicyUmdNodeUrlPlugin().generateBundle as unknown as GenerateBundle
		).call(
			{
				error: (message: string) => {
					throw new Error(message);
				},
			},
			{ format },
			bundle,
		);
		return bundle["classicy.umd.js"].code;
	};

	it("rewrites the UMD output", () =>
		expect(run("umd")).toBe(classicyUmdNodeUrl(MINIFIED)));

	it("leaves the ES output alone", () => expect(run("es")).toBe(MINIFIED));

	it("fails the build on a UMD chunk it cannot rewrite", () =>
		expect(() => run("umd", 'require("url");\n')).toThrow(
			/^classicy\.umd\.js: the UMD bundle does not end with its factory's/,
		));
});

describe("findClassicyUmdTopLevelDeclarations", () => {
	it("names each declaration at a bundle's top level", () =>
		expect(
			findClassicyUmdTopLevelDeclarations(
				"dist/classicy.umd.js",
				"(function(){})();\nfunction $classicyUrl(){}\nvar a=1,b=2;\nclass C{}\n;(function(){})();\n",
				parseAst,
			),
		).toEqual([
			"dist/classicy.umd.js: declares $classicyUrl at its top level (FunctionDeclaration) -> a <script> page gets it as a global, and the CommonJS loader's eval slows every global name the bundle reads; keep it inside the UMD factory (bin/classicyUmdNodeUrl.ts).",
			"dist/classicy.umd.js: declares a, b at its top level (VariableDeclaration) -> a <script> page gets it as a global, and the CommonJS loader's eval slows every global name the bundle reads; keep it inside the UMD factory (bin/classicyUmdNodeUrl.ts).",
			"dist/classicy.umd.js: declares C at its top level (ClassDeclaration) -> a <script> page gets it as a global, and the CommonJS loader's eval slows every global name the bundle reads; keep it inside the UMD factory (bin/classicyUmdNodeUrl.ts).",
		]));
});

describe("findClassicyUmdNodeBuiltinProblems", () => {
	it("passes a UMD bundle that requires no Node built-in", () =>
		expect(
			findClassicyUmdNodeBuiltinProblems(
				"dist/classicy.umd.js",
				classicyUmdNodeUrl(MINIFIED),
			),
		).toEqual([]));

	it("names each Node built-in a UMD bundle requires", () =>
		expect(
			findClassicyUmdNodeBuiltinProblems(
				"dist/classicy.umd.js",
				`${MINIFIED}require("node:fs");require("path");require("react");`,
			),
		).toEqual(
			["url", "node:fs", "path"].map(
				(name) =>
					`dist/classicy.umd.js: requires Node's "${name}" -> a browser bundler that bundles the UMD bundle cannot resolve it; reach it through process.getBuiltinModule (classicyUmdNodeUrlPlugin, bin/classicyUmdNodeUrl.ts).`,
			),
		));
});

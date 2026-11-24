// @vitest-environment node
// (The Node branch runs only where there is no document.)
import { describe, expect, it } from "vitest";
import {
	CLASSICY_UMD_NODE_URL,
	classicyUmdNodeUrl,
	classicyUmdNodeUrlPlugin,
	findClassicyUmdNodeBuiltinProblems,
} from "./classicyUmdNodeUrl";

// Rollup's UMD rendering of import.meta.url and of an asset URL, as the
// library build minifies it, and unminified.
const MINIFIED =
	'(function(I,C){typeof exports=="object"?C(exports,require("react")):C(I.x={},I.React)})(this,function(I,C){const a=typeof document>"u"&&typeof location>"u"?require("url").pathToFileURL(__filename).href:location.href;\nconst b=""+(typeof document>"u"&&typeof location>"u"?require("url").pathToFileURL(__dirname+"/sample.mp4").href:"x");I.a=a;I.b=b});\n//# sourceMappingURL=classicy.umd.js.map\n';
const ROLLUP =
	"const a = (typeof document === 'undefined' && typeof location === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : location.href);\n";

describe("classicyUmdNodeUrl", () => {
	it("replaces each require of Node's url module, keeping every other character's line and column", () => {
		const out = classicyUmdNodeUrl(MINIFIED);
		expect(out).not.toMatch(/require\("url"\)/);
		const before = MINIFIED.split("\n");
		const after = out.split("\n");
		// Same lines, same lengths: only the replaced spans differ.
		for (const [i, line] of before.slice(0, 2).entries()) {
			expect(after[i]).toHaveLength(line.length);
			expect(after[i]).toBe(
				line.replaceAll('require("url")', `${CLASSICY_UMD_NODE_URL}()`),
			);
		}
		// The function on its own line, before the source map comment.
		expect(after.slice(2)).toEqual([
			`function ${CLASSICY_UMD_NODE_URL}(){return process.getBuiltinModule("node:url")}`,
			"//# sourceMappingURL=classicy.umd.js.map",
			"",
		]);
	});

	it("pads Rollup's own require('u' + 'rl') to its length", () => {
		const out = classicyUmdNodeUrl(ROLLUP).split("\n");
		expect(out[0]).toHaveLength(ROLLUP.split("\n")[0].length);
		expect(out[0]).toContain(
			`${CLASSICY_UMD_NODE_URL}()     .pathToFileURL(__filename)`,
		);
		expect(out[2]).toBe(
			`function ${CLASSICY_UMD_NODE_URL}(){return process.getBuiltinModule("node:url")}`,
		);
	});

	it("leaves a bundle that requires no url module alone", () =>
		expect(classicyUmdNodeUrl("const a=1;\n")).toBe("const a=1;\n"));

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
		options: { format: string },
		bundle: Record<string, { type: string; code?: string }>,
	) => void;
	const run = (format: string) => {
		const bundle = {
			"classicy.umd.js": { type: "chunk", code: MINIFIED },
			"classicy.umd.js.map": { type: "asset" },
		};
		(classicyUmdNodeUrlPlugin().generateBundle as unknown as GenerateBundle)(
			{ format },
			bundle,
		);
		return bundle["classicy.umd.js"].code;
	};

	it("rewrites the UMD output", () =>
		expect(run("umd")).toBe(classicyUmdNodeUrl(MINIFIED)));

	it("leaves the ES output alone", () => expect(run("es")).toBe(MINIFIED));
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

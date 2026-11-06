import { describe, expect, it } from "vitest";
import { classicyBundleSpecifiers } from "./classicyBundleSpecifiers";

// The external module specifiers a built bundle loads, as both dist checks
// read them: the ES prologue's static imports, every dynamic import() and
// every require() (the UMD factory header).
describe("classicyBundleSpecifiers", () => {
	it("reads the ES prologue's static imports, then dynamic imports", () =>
		expect(
			classicyBundleSpecifiers(
				'import{a as b}from"@classicy/classicy";import"react";\nconst x=1;const y=()=>import("pdfjs-dist");import(`./chunk.js`);const s="import \\"nope\\"";',
			),
		).toEqual(["@classicy/classicy", "react", "pdfjs-dist"]));

	it("reads a UMD factory's require() calls", () =>
		expect(
			classicyBundleSpecifiers(
				'(function(g,f){typeof exports=="object"?f(exports,require("@classicy/classicy"),require(\'react\')):f(g.x={},g.classicy,g.React)})(this,function(e,c,r){});',
			),
		).toEqual(["@classicy/classicy", "react"]));

	it("skips the bundle's own chunks and computed specifiers", () =>
		expect(
			classicyBundleSpecifiers(
				// A computed specifier: import(`${p}`), spelled so it is no template.
				'import"./a.js";const z=()=>import("/b.js");const w=()=>import(`$' +
					"{p}`);",
			),
		).toEqual([]));

	it("keeps a specifier's Vite query, which the checks reject", () =>
		expect(classicyBundleSpecifiers('import a from"x.svg?url";')).toEqual([
			"x.svg?url",
		]));
});

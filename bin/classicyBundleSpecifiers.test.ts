import { describe, expect, it } from "vitest";
import {
	classicyBundleSpecifiers,
	classicyBundleStaticImports,
} from "./classicyBundleSpecifiers";

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

	// An ES entry starts with "use client"; (story 0224-siu): the static
	// imports after it are still the prologue's. A string statement after an
	// import is no directive, and ends the run as any other statement does.
	it("reads the static imports after a directive prologue, and only there", () =>
		expect(
			classicyBundleSpecifiers(
				'"use client";\nimport{a as b}from"@classicy/classicy";\n\'use strict\';import"react";\nconst x=1;',
			),
		).toEqual(["@classicy/classicy"]));

	it("reads the imports after each directive of a prologue", () =>
		expect(
			classicyBundleSpecifiers(
				'"use client";\n\'use strict\';\nimport"react";import"zustand";const s="import \\"nope\\"";',
			),
		).toEqual(["react", "zustand"]));

	it("reads the static imports after a comment banner", () =>
		expect(
			classicyBundleSpecifiers(
				'/*! Classicy | MIT */\n// built\n"use client";\nimport"react";const a=1;',
			),
		).toEqual(["react"]));

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

// The head's static imports alone, the bundle's own chunks included: what
// check-dist-imports.mjs's invariant 1 floor reads, so a head it cannot parse
// shows as no import at all.
describe("classicyBundleStaticImports", () => {
	it("reads every static import after the directives, its own chunks too", () =>
		expect(
			classicyBundleStaticImports(
				'"use client";\nimport*as r from"react";import"./chunk.js";const a=import("pdfjs-dist");',
			),
		).toEqual(["react", "./chunk.js"]));

	it.each([
		["a directive with no semicolon", '"use client"\nimport"react";'],
		["single-quoted imports", "import'react';"],
	])("reads none past %s", (_name, source) =>
		expect(classicyBundleStaticImports(source)).toEqual([]));
});

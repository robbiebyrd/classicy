// @vitest-environment node
// (vite loads esbuild, which refuses jsdom's TextEncoder.)
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, type Rollup } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_USE_CLIENT,
	classicyUseClientPlugin,
	findClassicyNoUseClientProblems,
	findClassicyUseClientProblems,
	hasClassicyUseClientDirective,
} from "./classicyUseClient";

// A library built as the three packages build theirs (lib mode, UMD and ES,
// minified, source maps), with a lazy chunk, with and without the plugin.
const root = mkdtempSync(join(tmpdir(), "classicy-use-client-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
writeFileSync(
	join(root, "index.js"),
	'import { useState } from "react";\nexport function useThing() {\n\tconst [value] = useState(1);\n\treturn value + offset;\n}\nconst offset = 41;\nexport const later = () => import("./lazy.js");\n',
);
writeFileSync(join(root, "lazy.js"), "export const lazy = 1;\n");

const outputs = async (withPlugin: boolean) => {
	const result = (await build({
		root,
		configFile: false,
		logLevel: "silent",
		plugins: withPlugin ? [classicyUseClientPlugin("lib.es.js")] : [],
		build: {
			write: false,
			sourcemap: true,
			lib: {
				entry: join(root, "index.js"),
				formats: ["umd", "es"],
				name: "lib",
				fileName: (format) => `lib.${format}.js`,
			},
			rollupOptions: {
				external: ["react"],
				output: { globals: { react: "React" } },
			},
		},
	})) as Rollup.RollupOutput[];
	const files = new Map<string, Rollup.OutputChunk | Rollup.OutputAsset>();
	for (const { output } of result)
		for (const file of output) files.set(file.fileName, file);
	const chunk = (name: string | RegExp) => {
		const found = [...files.values()].find(
			(file) =>
				file.type === "chunk" &&
				(typeof name === "string"
					? file.fileName === name
					: name.test(file.fileName)),
		);
		if (found?.type !== "chunk") throw new Error(`no chunk ${name}`);
		return found;
	};
	return { chunk };
};
const marked = outputs(true);
const plain = outputs(false);

describe("classicyUseClientPlugin", () => {
	it("makes the directive the ES entry's first statement, ahead of its imports", async () => {
		const es = (await marked).chunk("lib.es.js").code;
		expect(es.startsWith(`${CLASSICY_USE_CLIENT}\nimport `)).toBe(true);
		// One more line, and nothing else moves (esbuild may pick other short
		// names: it ranks them by the characters in the file).
		expect(es.split("\n")).toHaveLength(
			(await plain).chunk("lib.es.js").code.split("\n").length + 1,
		);
		expect(es.split(CLASSICY_USE_CLIENT)).toHaveLength(2);
	});

	it("moves the ES entry's source map down the one line it adds", async () => {
		const map = (await marked).chunk("lib.es.js").map;
		const before = (await plain).chunk("lib.es.js").map;
		expect(map?.mappings).toBe(`;${before?.mappings}`);
	});

	it("leaves the UMD bundle and the lazy chunk alone", async () => {
		for (const name of ["lib.umd.js", /^lazy-.*\.m?js$/])
			expect((await marked).chunk(name).code).toBe(
				(await plain).chunk(name).code,
			);
		expect((await marked).chunk("lib.umd.js").code).not.toContain("use client");
	});
});

describe("findClassicyUseClientProblems", () => {
	it("passes a bundle that starts with the directive", () =>
		expect(
			findClassicyUseClientProblems(
				"dist/lib.es.js",
				`${CLASSICY_USE_CLIENT}\nimport "react";\n`,
			),
		).toEqual([]));

	it.each([
		["no directive", 'import "react";\n'],
		["a comment ahead of it", `/* x */\n${CLASSICY_USE_CLIENT}\n`],
		["single quotes", "'use client';\n"],
		["a byte order mark ahead of it", `\uFEFF${CLASSICY_USE_CLIENT}\n`],
		["the directive later on", `import "react";\n${CLASSICY_USE_CLIENT}\n`],
	])("fails %s", (_name, source) =>
		expect(findClassicyUseClientProblems("dist/lib.es.js", source)).toEqual([
			`dist/lib.es.js: does not start with ${CLASSICY_USE_CLIENT} -> a React Server Components bundler (Next.js's App Router) evaluates it as a server module, where React has no createContext or hooks, so a server component that imports it fails the host's build; check classicyUseClientPlugin in vite.config.ts (bin/classicyUseClient.ts).`,
		]));

	it("fails a missing bundle", () =>
		expect(findClassicyUseClientProblems("dist/lib.es.js", null)).toEqual([
			`dist/lib.es.js: missing, so it cannot start with ${CLASSICY_USE_CLIENT}`,
		]));
});

// An Appearance Package's ES bundle stays a plain module: it registers itself
// when it runs, and a server component's import of a client module never runs
// in the browser.
describe("findClassicyNoUseClientProblems", () => {
	const PROBLEM = `dist/appearance-x.es.js: starts with a "use client" directive -> an Appearance Package registers itself when it loads: as a client module, a server component's import of it builds but never runs in the browser, and the desktop draws no package; unmarked, that import fails the host's build, and a client module's import of it works. Leave classicyUseClientPlugin out of the package's vite.config.ts (bin/classicyUseClient.ts).`;

	it.each([
		["imports first", 'import{a}from"@classicy/classicy";a();\n'],
		["the directive's text later on", 'import"react";const s="use client";\n'],
		["another directive", '"use strict";\nimport"react";\n'],
	])("passes a bundle with %s", (_name, source) =>
		expect(
			findClassicyNoUseClientProblems("dist/appearance-x.es.js", source),
		).toEqual([]));

	it.each([
		["the directive first", `${CLASSICY_USE_CLIENT}\nimport"react";\n`],
		["single quotes", "'use client'\nimport\"react\";\n"],
		["a comment ahead of it", `/*! x */\n// y\n${CLASSICY_USE_CLIENT}\n`],
		["another directive ahead of it", `"use strict";${CLASSICY_USE_CLIENT}\n`],
	])("fails a bundle with %s", (_name, source) =>
		expect(
			findClassicyNoUseClientProblems("dist/appearance-x.es.js", source),
		).toEqual([PROBLEM]));

	it("fails a missing bundle", () =>
		expect(
			findClassicyNoUseClientProblems("dist/appearance-x.es.js", null),
		).toEqual(["dist/appearance-x.es.js: missing"]));
});

// The directive prologue, read by hand in one pass (CodeQL alert 51,
// js/redos: the regular expression it replaced backtracked exponentially).
describe("hasClassicyUseClientDirective", () => {
	it.each([
		["the directive alone", '"use client"'],
		["the directive with its semicolon", '"use client";\nimport"react";'],
		["single quotes", "'use client'"],
		["whitespace ahead of it", ' \t\r\n\v\f"use client";'],
		["a byte order mark ahead of it", '﻿"use client";'],
		["a block comment ahead of it", '/* a */"use client";'],
		["a legal comment ahead of it", '/*! (c) x */\n"use client";'],
		["an empty block comment", '/**/"use client";'],
		["a block comment over lines", '/*\n * a\n */\n"use client";'],
		["a line comment ahead of it", '// a\n"use client";'],
		["a line comment ending in a carriage return", '// a\r\n"use client";'],
		["another directive ahead of it", '"use strict";"use client";'],
		["another directive with no semicolon", '"use strict"\n"use client"'],
		[
			"another directive, then whitespace and its semicolon",
			"'a' \n ;'use client'",
		],
		["an empty directive ahead of it", '"";"use client";'],
		["a directive that only starts like it", '"use clientx";"use client";'],
		[
			"everything at once",
			'﻿/*! x */\n// y\n"use strict";\n/* z */ \'b\' ;\n"use client";',
		],
	])("finds %s", (_name, source) =>
		expect(hasClassicyUseClientDirective(source)).toBe(true));

	it.each([
		["nothing", ""],
		["whitespace only", " \n\t"],
		["no directive", 'import "react";\n'],
		["code ahead of it", 'import"react";"use client";'],
		["its text in an expression later on", 'const s = "use client";'],
		["a block comment that never ends", '/* "use client";'],
		["the directive inside a block comment", '/* "use client"; */'],
		["text after the first */ of a comment", '/* a */ b */ "use client";'],
		["a line comment that never ends", '// "use client";'],
		["the directive inside a line comment", '// "use client";\n'],
		["mismatched quotes", "'use client\";"],
		["a directive left open", '"use strict\n"use client";'],
		["a directive with an escape ahead of it", '"a\\"b";"use client";'],
		["a directive holding the other quote", '"it\'s";"use client";'],
		["two semicolons after a directive", '"a";;"use client";'],
		["a lone slash", '/ "use client";'],
	])("finds none in %s", (_name, source) =>
		expect(hasClassicyUseClientDirective(source)).toBe(false));

	// The alert's input: "/*" and many "*//". The old expression's time grew
	// exponentially with the repetitions (1.2 s at 40 in Node 24, and 2.1 s
	// for 28 "*//*" before a "!"); one pass reads 50,000 at once.
	it.each([
		["the alert's input", `/*${"*//".repeat(50_000)}`],
		[
			"the alert's input, the directive after",
			`/*${"*//".repeat(50_000)}\n"use client";`,
		],
		["block comments back to back", `${"/**/".repeat(50_000)}"use client";`],
		["a block comment that never ends", `/*${"* /".repeat(50_000)}`],
		["the old expression's slowest shape", `/*${"*//*".repeat(50_000)}!`],
		["directives back to back", `${'"a";'.repeat(50_000)}"use client";`],
	])("reads %s at once", (_name, source) => {
		const start = performance.now();
		hasClassicyUseClientDirective(source);
		expect(performance.now() - start).toBeLessThan(50);
	});

	it("reads the alert's input as Node does: no directive in it", () => {
		expect(hasClassicyUseClientDirective(`/*${"*//".repeat(50_000)}`)).toBe(
			false,
		);
		expect(
			hasClassicyUseClientDirective(`${"/**/".repeat(50_000)}"use client";`),
		).toBe(true);
		expect(
			hasClassicyUseClientDirective(`${'"a";'.repeat(50_000)}"use client";`),
		).toBe(true);
	});
});

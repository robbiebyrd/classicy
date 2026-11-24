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

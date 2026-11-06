import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_HOST_MODES,
	checkClassicyHost,
	classicyHostDependencies,
	classicyHostLinks,
	classicyHostTsconfig,
	findClassicyUndeclaredImports,
	summarizeClassicyTscOutput,
	writeClassicyHost,
} from "./check-host-types";

// bin/check-host-types.ts packs both packages and type-checks a host against
// them under each mode (the end of `build:source`, stories 0151-0cc and
// 0153-k0e). Here the same host and the same tsc run against two tiny
// hand-written packages, `"type": "module"` like the real ones, whose
// declarations re-export through a dotted module name with or without `.js`,
// and may import a dependency that ships no types.

const TSC = resolve("node_modules/typescript/bin/tsc");
const root = mkdtempSync(join(tmpdir(), "classicy-host-types-test-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const write = (dir: string, files: Record<string, string>) => {
	for (const [file, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, file)), { recursive: true });
		writeFileSync(join(dir, file), text);
	}
};

const manifest = (name: string) =>
	JSON.stringify({
		name,
		type: "module",
		exports: { ".": { types: "./types/index.d.ts" } },
	});

let run = 0;
/**
 * A host whose packages re-export with `extension` ("" or ".js"); with
 * `untyped`, the core's declarations also import `untyped`, a package the
 * host has installed that ships no types (`howler` without `@types/howler`).
 */
const host = (extension: string, { untyped = false } = {}) => {
	const dir = join(root, `case-${run++}`);
	writeClassicyHost(dir, {});
	write(join(dir, "node_modules/@classicy/classicy"), {
		"package.json": manifest("@classicy/classicy"),
		"types/index.d.ts": `export * from './Manager.Colors${extension}';\n`,
		"types/Manager.Colors.d.ts": [
			...(untyped ? ["import { Player } from 'untyped';"] : []),
			"export type ClassicyTheme = { id: string; name: string };",
			"export declare const registerClassicyAppearancePackage: (id: string) => void;",
		].join("\n"),
	});
	if (untyped)
		write(join(dir, "node_modules/untyped"), {
			"package.json": JSON.stringify({ name: "untyped", main: "index.js" }),
			"index.js": "export const Player = class {};\n",
		});
	write(join(dir, "node_modules/@classicy/appearance-platinum"), {
		"package.json": manifest("@classicy/appearance-platinum"),
		"types/index.d.ts": `export * from './hooks${extension}';\n`,
		"types/hooks.d.ts": [
			"import type { ClassicyTheme } from '@classicy/classicy';",
			"export declare const platinumAppearanceHooks: object;",
			"export declare const platinumJson: { presets: ReadonlyArray<Readonly<ClassicyTheme>> };",
		].join("\n"),
	});
	return Object.fromEntries(
		checkClassicyHost(dir, TSC).map(({ mode, status, output }) => [
			mode,
			{ status, output },
		]),
	);
};

describe("check-host-types.ts", () => {
	it(
		"passes declarations whose relative specifiers carry .js, in every mode",
		() =>
			expect(host(".js")).toEqual({
				bundler: { status: 0, output: "" },
				"bundler-lib-check": { status: 0, output: "" },
				node16: { status: 0, output: "" },
				nodenext: { status: 0, output: "" },
			}),
		60_000,
	);

	it("fails extensionless specifiers under node16 and nodenext, not bundler", () => {
		const results = host("");
		expect(results.bundler).toEqual({ status: 0, output: "" });
		expect(results["bundler-lib-check"]).toEqual({ status: 0, output: "" });
		for (const resolution of ["node16", "nodenext"]) {
			expect(results[resolution].status, resolution).toBe(2);
			expect(results[resolution].output, resolution).toContain(
				`error TS2305: Module '"@classicy/classicy"' has no exported member 'ClassicyTheme'.`,
			);
			expect(results[resolution].output, resolution).toContain(
				`error TS2305: Module '"@classicy/appearance-platinum"' has no exported member 'platinumJson'.`,
			);
		}
	}, 60_000);

	// A declaration importing a dependency without types is `any` under
	// skipLibCheck and an error without it (0153-k0e: `howler`).
	it("fails a declaration importing an untyped package only without skipLibCheck", () => {
		const results = host(".js", { untyped: true });
		for (const mode of ["bundler", "node16", "nodenext"])
			expect(results[mode], mode).toEqual({ status: 0, output: "" });
		expect(results["bundler-lib-check"].status).toBe(2);
		expect(results["bundler-lib-check"].output).toContain(
			"error TS7016: Could not find a declaration file for module 'untyped'.",
		);
	}, 60_000);

	it("checks under bundler, node16 and nodenext with skipLibCheck, and bundler without", () => {
		expect(Object.keys(CLASSICY_HOST_MODES)).toEqual([
			"bundler",
			"bundler-lib-check",
			"node16",
			"nodenext",
		]);
		expect(classicyHostTsconfig("node16").compilerOptions).toMatchObject({
			module: "node16",
			moduleResolution: "node16",
			skipLibCheck: true,
			strict: true,
		});
		expect(classicyHostTsconfig("bundler").compilerOptions).toMatchObject({
			moduleResolution: "bundler",
			skipLibCheck: true,
		});
		expect(
			classicyHostTsconfig("bundler-lib-check").compilerOptions,
		).toMatchObject({
			module: "esnext",
			moduleResolution: "bundler",
			skipLibCheck: false,
			strict: true,
		});
		expect(classicyHostTsconfig("nodenext").compilerOptions).toMatchObject({
			moduleResolution: "nodenext",
			skipLibCheck: true,
		});
	});

	it("installs the dependencies and peer dependencies, and @types only when declared", () =>
		expect(
			classicyHostDependencies(
				{
					name: "@classicy/classicy",
					dependencies: { he: "^1", howler: "^2", "@types/howler": "^2" },
					peerDependencies: { react: "^19", "@types/react": "^19", he: "^1" },
				},
				{
					name: "@classicy/appearance-platinum",
					peerDependencies: { "@classicy/classicy": "3.0.0", react: "^19" },
				},
			),
		).toEqual(["@types/howler", "@types/react", "he", "howler", "react"]));

	// A real host never gets a package's devDependencies, its @types included
	// (0153-k0e: @types/howler, @types/he and @types/use-analytics were linked
	// from the checkout, so howler's missing types went unseen).
	it("links only declared packages that the checkout has, by real path", () => {
		const nodeModules = join(root, "links/node_modules");
		write(nodeModules, {
			"he/package.json": "{}",
			"@types/he/package.json": "{}",
			"howler/package.json": "{}",
			"@types/howler/package.json": "{}",
			"react/package.json": "{}",
		});
		expect(
			classicyHostLinks(nodeModules, {
				name: "@classicy/classicy",
				dependencies: { he: "^1", howler: "^2", missing: "^1" },
				peerDependencies: { react: "^19" },
				devDependencies: { "@types/he": "^1", "@types/howler": "^2" },
			} as Parameters<typeof classicyHostLinks>[1]),
		).toEqual({
			he: join(nodeModules, "he"),
			howler: join(nodeModules, "howler"),
			react: join(nodeModules, "react"),
		});
	});
});

describe("findClassicyUndeclaredImports", () => {
	const types = join(root, "undeclared/dist/types");
	write(types, {
		"src/index.d.ts": [
			"import { FC } from 'react';",
			"import type { z } from 'zod/v4';",
			"import type { EventEmitter } from 'node:events';",
			"import type { Readable } from 'stream';",
			"import type { T } from '@classicy/classicy/sub';",
			"export * from './Editor.js';",
		].join("\n"),
		"src/Editor.d.ts": [
			"/** Built on MDXEditor: `import { MDXEditor } from '@mdxeditor/editor'`. */",
			"import { MDXEditorMethods } from '@mdxeditor/editor';",
			"export type A = import('lodash/fp').A;",
		].join("\n"),
		"src/Editor.d.ts.map": "import 'not-a-declaration';",
	});

	it("names each package a declaration imports that the package does not declare", () =>
		expect(
			findClassicyUndeclaredImports(types, {
				name: "@classicy/classicy",
				dependencies: { zod: "^4" },
				peerDependencies: { react: "^19" },
			}),
		).toEqual([
			{ file: "src/Editor.d.ts", specifier: "@mdxeditor/editor" },
			{ file: "src/Editor.d.ts", specifier: "lodash/fp" },
		]));

	it("names none once each is declared", () =>
		expect(
			findClassicyUndeclaredImports(types, {
				name: "@classicy/classicy",
				dependencies: { zod: "^4", lodash: "^4" },
				peerDependencies: { react: "^19", "@mdxeditor/editor": "^3" },
			}),
		).toEqual([]));
});

describe("summarizeClassicyTscOutput", () => {
	it("keeps one line per distinct error, counting the rest", () =>
		expect(
			summarizeClassicyTscOutput(
				[
					"a.d.ts(1,2): error TS7016: Could not find a declaration file for module 'react'.",
					"  Try `npm i --save-dev @types/react`",
					"b.d.ts(3,4): error TS7016: Could not find a declaration file for module 'react'.",
					"c.d.ts(5,6): error TS2307: Cannot find module 'x'.",
					"error TS5083: Cannot read file 'tsconfig.json'.",
				].join("\n"),
			),
		).toEqual([
			"a.d.ts(1,2): error TS7016: Could not find a declaration file for module 'react'. (and 1 more)",
			"c.d.ts(5,6): error TS2307: Cannot find module 'x'.",
			"error TS5083: Cannot read file 'tsconfig.json'.",
		]));
});

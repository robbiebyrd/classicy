import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	classicyCommonJsDeclaration,
	classicyCommonJsDeclarationFile,
	classicyCommonJsDeclarationsWriter,
	findClassicyCommonJsDeclarationProblems,
} from "./classicyCommonJsDeclarations";

// The `.d.cts` twins (story 0223-a0y): a CommonJS TypeScript host reads them
// for `require()` of a "type": "module" package, whose `.d.ts` files are ES
// modules to it.

const DECLARATION = [
	'import type { ReactNode } from "react";',
	'import { a } from "./a.js";',
	'export * from "../b/index.js";',
	'export type { C } from "./c.js";',
	'export declare const d: typeof import("./d.js").D;',
	'/** e.g. `import x from "./not-a-specifier.js"` */',
	'export declare const e: "./kept.js";',
	"export declare const f: ReactNode;",
	"",
].join("\n");

describe("classicyCommonJsDeclaration", () => {
	it("names a declaration's twin", () => {
		expect(classicyCommonJsDeclarationFile("dist/types/index.d.ts")).toBe(
			"dist/types/index.d.cts",
		);
		expect(classicyCommonJsDeclarationFile("hooks.d.ts")).toBe("hooks.d.cts");
	});

	it("points each relative .js specifier at its .cjs twin, and nothing else", () =>
		expect(classicyCommonJsDeclaration(DECLARATION)).toBe(
			[
				'import type { ReactNode } from "react";',
				'import { a } from "./a.cjs";',
				'export * from "../b/index.cjs";',
				'export type { C } from "./c.cjs";',
				'export declare const d: typeof import("./d.cjs").D;',
				'/** e.g. `import x from "./not-a-specifier.js"` */',
				'export declare const e: "./kept.js";',
				"export declare const f: ReactNode;",
				"",
			].join("\n"),
		));
});

describe("classicyCommonJsDeclarationsWriter", () => {
	const dir = mkdtempSync(join(tmpdir(), "classicy-cjs-declarations-"));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it("writes the twin of each .d.ts the build emitted, and of nothing else", async () => {
		const index = join(dir, "index.d.ts");
		writeFileSync(index, 'export * from "./a.js";\n');
		await classicyCommonJsDeclarationsWriter()(
			new Map([
				[index, 'export * from "./a.js";\n'],
				[join(dir, "notes.txt"), "x"],
			]),
		);
		expect(readFileSync(join(dir, "index.d.cts"), "utf8")).toBe(
			'export * from "./a.cjs";\n',
		);
		expect(() => readFileSync(join(dir, "notes.d.cts"))).toThrow();
	});
});

describe("findClassicyCommonJsDeclarationProblems", () => {
	const check = (files: Record<string, string>) =>
		findClassicyCommonJsDeclarationProblems(
			"dist/types",
			Object.keys(files),
			(file) => files[file],
		);

	it("passes declarations with their twins", () =>
		expect(
			check({
				"index.d.ts": 'export * from "./a.js";\n',
				"index.d.cts": 'export * from "./a.cjs";\n',
				"src\\a.d.ts": "export {};\n",
				"src\\a.d.cts": "export {};\n",
			}),
		).toEqual([]));

	it("fails a missing twin, a wrong one and a stray one", () =>
		expect(
			check({
				"index.d.ts": 'export * from "./a.js";\n',
				"index.d.cts": 'export * from "./a.js";\n',
				"a.d.ts": "export {};\n",
				"stray.d.cts": "export {};\n",
			}),
		).toEqual([
			"dist/types/a.d.cts: missing -> a CommonJS TypeScript host reads it for require(); check afterBuild (classicyCommonJsDeclarationsWriter) on dts in vite.config.ts.",
			"dist/types/index.d.cts: is not index.d.ts with its relative specifiers ending in .cjs -> it is written by classicyCommonJsDeclarationsWriter (bin/classicyCommonJsDeclarations.ts), not by hand.",
			"dist/types/stray.d.cts: has no stray.d.ts -> a .d.cts is only ever a .d.ts's CommonJS twin.",
		]));
});

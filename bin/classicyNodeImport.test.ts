import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	type ClassicyNodeImportKind,
	findClassicyNodeImportProblems,
} from "./classicyNodeImport";

// The server-import invariant's check (story 0223-a0y), run for real: each
// fixture is a bundle in a "type": "module" package, loaded in a child Node
// with the browser's globals deleted, as a server-rendering host loads it.

const root = mkdtempSync(join(tmpdir(), "classicy-node-import-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
writeFileSync(join(root, "package.json"), '{"type":"module"}\n');

// A UMD factory as Rollup writes it: CommonJS when `exports` and `module`
// exist, its dependency then a require(); else globals, the dependency one
// too (`path` here, React and zustand in the core's).
const UMD =
	'(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("node:path")):(g=typeof globalThis<"u"?globalThis:g||self,f(g.fixture={},g.path))})(this,function(e,p){e.a=p.join("a","b")});\n';

let run = 0;
const load = (
	source: string,
	kind: ClassicyNodeImportKind = "import",
	name = kind === "import" ? "bundle.js" : "bundle.cjs",
) => {
	const dir = join(root, `case-${run++}`);
	mkdirSync(dir);
	const file = join(dir, name);
	writeFileSync(file, source);
	return findClassicyNodeImportProblems([{ file, kind }], {
		cwd: root,
		settleMs: 300,
	});
};
const problem = (detail: RegExp) => [
	expect.stringMatching(
		new RegExp(
			`: does not (?:import|require) cleanly in Node with no browser globals: .*${detail.source}.* -> a module reads a browser global`,
		),
	),
];

describe("findClassicyNodeImportProblems", () => {
	it("passes a bundle that reads browser globals only behind typeof guards", () =>
		expect(
			load(
				'export const d = typeof document === "undefined" ? null : document.title;\nexport const n = typeof navigator < "u" ? navigator.userAgent : "";\nexport const s = typeof localStorage < "u" ? localStorage.getItem("k") : null;\nexport const w = typeof window !== "undefined" && window.innerWidth;\n',
			),
		).resolves.toEqual([]));

	// decode-named-character-reference's browser entry, which 3.7.0 shipped.
	it("fails a bundle that touches document at load", () =>
		expect(
			load('const v3 = document.createElement("i");\nexport { v3 };\n'),
		).resolves.toEqual(
			problem(/throws ReferenceError: document is not defined/),
		));

	it("fails a bundle that touches window at load", () =>
		expect(load("export const width = window.innerWidth;\n")).resolves.toEqual(
			problem(/throws ReferenceError: window is not defined/),
		));

	it("fails a bundle that touches localStorage at load", () =>
		expect(
			load(
				'export const saved = localStorage.getItem("classicyDesktopState");\n',
			),
		).resolves.toEqual(
			problem(/throws ReferenceError: localStorage is not defined/),
		));

	// Node defines navigator; a server-rendering host may run on one that does
	// not, and a bundle that reads it at load still reads the server's.
	it("fails a bundle that touches navigator at load, though Node defines it", () =>
		expect(
			load("export const agent = navigator.userAgent;\n"),
		).resolves.toEqual(
			problem(/throws ReferenceError: navigator is not defined/),
		));

	it("fails a load-time timer that touches a browser global", () =>
		expect(
			load(
				'setTimeout(() => localStorage.setItem("k", "v"), 50);\nexport {};\n',
			),
		).resolves.toEqual(
			problem(
				/a load-time task throws ReferenceError: localStorage is not defined/,
			),
		));

	// The store's persistence write, before it was guarded: the error is caught
	// and logged, so the load itself succeeds.
	it("fails a bundle that logs while it loads", () =>
		expect(
			load(
				'setTimeout(() => { try { localStorage.setItem("k", "v"); } catch (error) { console.error("Failed to persist", error); } }, 50);\nexport {};\n',
			),
		).resolves.toEqual(
			problem(
				/logs while it loads: console\.error\(Failed to persist ReferenceError: localStorage is not defined/,
			),
		));

	it("requires a UMD bundle that ends in .cjs", () =>
		expect(load(UMD, "require")).resolves.toEqual([]));

	// In a "type": "module" package a .js file is an ES module even to
	// require(), so the factory finds no `exports` and takes the global path,
	// where its dependency is undefined (the core's 3.7.0 UMD bundle: "Cannot
	// read properties of undefined (reading 'create')", zustand's).
	it("fails require() of a UMD bundle that ends in .js", () =>
		expect(load(UMD, "require", "bundle.umd.js")).resolves.toEqual(
			problem(
				/throws TypeError: Cannot read properties of undefined \(reading 'join'\)/,
			),
		));

	it("names each failing bundle, and only those", async () => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(dir);
		writeFileSync(join(dir, "a.js"), "export const a = 1;\n");
		writeFileSync(join(dir, "b.js"), "export const b = document.title;\n");
		const problems = await findClassicyNodeImportProblems(
			[
				{ file: join(dir, "a.js"), kind: "import" },
				{ file: join(dir, "b.js"), kind: "import" },
			],
			{ cwd: root, settleMs: 0 },
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(
			new RegExp(`^${join(dir, "b.js").replaceAll(/[.\\]/g, "\\$&")}: `),
		);
	});
});

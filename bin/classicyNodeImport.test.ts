import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_NODE_IMPORT_ENVIRONMENTS,
	type ClassicyNodeImportEnvironment,
	type ClassicyNodeImportKind,
	findClassicyNodeImportProblems,
} from "./classicyNodeImport";
import { escapeClassicyRegExp } from "./classicyRegExpEscape";

// The server-import invariant's check (story 0223-a0y), run for real: each
// fixture is a bundle in a "type": "module" package, loaded in a child Node
// as a server-rendering host loads it, once with the browser's globals
// deleted and once with Node's own globals and storage that fails on a read.

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
	{
		kind = "import",
		name = kind === "import" ? "bundle.js" : "bundle.cjs",
		environments,
	}: {
		kind?: ClassicyNodeImportKind;
		name?: string;
		environments?: ClassicyNodeImportEnvironment[];
	} = {},
) => {
	const dir = join(root, `case-${run++}`);
	mkdirSync(dir);
	const file = join(dir, name);
	writeFileSync(file, source);
	return findClassicyNodeImportProblems([{ file, kind }], {
		cwd: root,
		settleMs: 300,
		environments,
	});
};
const problem = (environment: ClassicyNodeImportEnvironment, detail: RegExp) =>
	expect.stringMatching(
		new RegExp(
			`: does not (?:import|require) cleanly in Node ${CLASSICY_NODE_IMPORT_ENVIRONMENTS[environment]}: .*${detail.source}.* -> a module reads a browser global or Node's storage`,
		),
	);

describe("findClassicyNodeImportProblems", () => {
	it("passes a bundle that reads browser globals only behind typeof window, document and navigator guards", () =>
		expect(
			load(
				'export const d = typeof document === "undefined" ? null : document.title;\nexport const n = typeof navigator < "u" ? navigator.userAgent : "";\nexport const w = typeof window !== "undefined" && window.innerWidth;\n',
			),
		).resolves.toEqual([]));

	// decode-named-character-reference's browser entry, which 3.7.0 shipped.
	it("fails a bundle that touches document at load", () =>
		expect(
			load('const v3 = document.createElement("i");\nexport { v3 };\n'),
		).resolves.toEqual([
			problem("browserless", /throws ReferenceError: document is not defined/),
			problem("node", /throws ReferenceError: document is not defined/),
		]));

	it("fails a bundle that touches window at load", () =>
		expect(
			load("export const width = window.innerWidth;\n", {
				environments: ["browserless"],
			}),
		).resolves.toEqual([
			problem("browserless", /throws ReferenceError: window is not defined/),
		]));

	it("fails a bundle that touches localStorage at load, in both", () =>
		expect(
			load(
				'export const saved = localStorage.getItem("classicyDesktopState");\n',
			),
		).resolves.toEqual([
			problem(
				"browserless",
				/throws ReferenceError: localStorage is not defined/,
			),
			problem("node", /reads localStorage while it loads/),
		]));

	// From Node 25, `typeof localStorage` reads Node's accessor, which throws
	// (25.2), returns an object with no setItem (25.5) or warns (26) without
	// --localstorage-file: the guard the store's persistence once had.
	it("fails a typeof localStorage or sessionStorage guard with Node's globals only", async () => {
		const guard =
			'export const s = typeof localStorage < "u" ? 1 : 0;\nexport const t = typeof sessionStorage < "u" ? 1 : 0;\n';
		await expect(
			load(guard, { environments: ["browserless"] }),
		).resolves.toEqual([]);
		await expect(load(guard, { environments: ["node"] })).resolves.toEqual([
			problem("node", /reads localStorage while it loads \(at .*bundle\.js/),
		]);
	});

	// Node defines navigator; a server-rendering host may run on one that does
	// not, and a bundle that reads it at load reads the server's.
	it("fails a bundle that touches navigator at load, though Node defines it", () =>
		expect(
			load("export const agent = navigator.userAgent;\n"),
		).resolves.toEqual([
			problem("browserless", /throws ReferenceError: navigator is not defined/),
		]));

	it("fails a load-time timer that touches a browser global", () =>
		expect(
			load(
				'setTimeout(() => localStorage.setItem("k", "v"), 50);\nexport {};\n',
				{ environments: ["browserless"] },
			),
		).resolves.toEqual([
			problem(
				"browserless",
				/a load-time task throws ReferenceError: localStorage is not defined/,
			),
		]));

	// The store's persistence write, before it was guarded: the error is caught
	// and logged, so the load itself succeeds.
	it("fails a bundle that logs while it loads", () =>
		expect(
			load(
				'setTimeout(() => { try { localStorage.setItem("k", "v"); } catch (error) { console.error("Failed to persist", error); } }, 50);\nexport {};\n',
				{ environments: ["browserless"] },
			),
		).resolves.toEqual([
			problem(
				"browserless",
				/logs while it loads: console\.error\(Failed to persist ReferenceError: localStorage is not defined/,
			),
		]));

	// Node 26's warning on that read goes through process.emitWarning, to
	// stderr: no console call.
	it("fails a bundle that raises a process warning while it loads, in both", () =>
		expect(
			load(
				'process.emitWarning("localStorage is not available", "ExperimentalWarning");\nexport {};\n',
			),
		).resolves.toEqual([
			problem(
				"browserless",
				/raises a process warning while it loads: ExperimentalWarning: localStorage is not available/,
			),
			problem(
				"node",
				/raises a process warning while it loads: ExperimentalWarning: localStorage is not available/,
			),
		]));

	it("requires a CommonJS file", () =>
		expect(load(UMD, { kind: "require" })).resolves.toEqual([]));

	// In a "type": "module" package a .js file is an ES module even to
	// require(), so the factory finds no `exports` and takes the global path,
	// where its dependency is undefined (the core's 3.7.0 UMD bundle: "Cannot
	// read properties of undefined (reading 'create')", zustand's).
	it("fails require() of a UMD bundle that ends in .js", () =>
		expect(
			load(UMD, {
				kind: "require",
				name: "bundle.umd.js",
				environments: ["browserless"],
			}),
		).resolves.toEqual([
			problem(
				"browserless",
				/throws TypeError: Cannot read properties of undefined \(reading 'join'\)/,
			),
		]));

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
			{ cwd: root, settleMs: 0, environments: ["browserless"] },
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(
			new RegExp(`^${escapeClassicyRegExp(join(dir, "b.js"))}: `),
		);
	});
});

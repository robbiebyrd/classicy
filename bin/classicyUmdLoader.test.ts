import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_UMD_LOADER_MAX_BYTES,
	classicyUmdLoader,
	classicyUmdLoaderFile,
	classicyUmdLoaderPlugin,
	findClassicyUmdLoaderProblems,
} from "./classicyUmdLoader";

// The UMD bundle's CommonJS loader (story 0223-a0y), run for real: a
// "type": "module" package holding a UMD bundle as Rollup writes one (a
// dependency required in its CommonJS branch, a global in the other) and the
// loader beside it, required from a CommonJS file the way a Node host's
// `require()` reaches it through the exports map.

const root = mkdtempSync(join(tmpdir(), "classicy-umd-loader-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

// Line 3 builds the error a stack trace must name, at its own column.
const UMD = [
	'(function(g,f){typeof exports=="object"&&typeof module<"u"?f(exports,require("dep")):(g=typeof globalThis<"u"?globalThis:g||self,f(g.fixture={},g.dep))})(this,function(e,d){',
	'"use strict";e.value=d.value;e.file=typeof __filename<"u"?__filename:null;',
	'e.fail=function(){throw new Error("from inside the bundle")};',
	"});",
	"//# sourceMappingURL=fixture.umd.js.map",
	"",
].join("\n");

const pkg = join(root, "node_modules/fixture");
mkdirSync(join(pkg, "dist"), { recursive: true });
mkdirSync(join(root, "node_modules/dep"), { recursive: true });
writeFileSync(
	join(pkg, "package.json"),
	JSON.stringify({
		name: "fixture",
		type: "module",
		main: "./dist/fixture.umd.js",
		exports: {
			".": {
				require: {
					node: "./dist/fixture.umd.cjs",
					default: "./dist/fixture.umd.js",
				},
			},
		},
	}),
);
writeFileSync(join(pkg, "dist/fixture.umd.js"), UMD);
writeFileSync(
	join(pkg, "dist/fixture.umd.cjs"),
	classicyUmdLoader("fixture.umd.js"),
);
writeFileSync(join(root, "node_modules/dep/index.js"), "exports.value = 42;\n");

const host = (source: string) => {
	const file = join(root, `host-${Math.random().toString(36).slice(2)}.cjs`);
	writeFileSync(file, source);
	const result = spawnSync(process.execPath, [file], {
		cwd: root,
		encoding: "utf8",
	});
	return { status: result.status, stdout: result.stdout.trim() };
};

describe("classicyUmdLoader", () => {
	it("names the loader after the bundle, with .cjs", () => {
		expect(classicyUmdLoaderFile("classicy.umd.js")).toBe("classicy.umd.cjs");
		expect(classicyUmdLoaderFile("appearance-platinum.umd.js")).toBe(
			"appearance-platinum.umd.cjs",
		);
	});

	it("is a few lines of documented Node APIs", () => {
		const loader = classicyUmdLoader("classicy.umd.js");
		expect(Buffer.byteLength(loader)).toBeLessThan(
			CLASSICY_UMD_LOADER_MAX_BYTES,
		);
		expect(
			[...loader.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]),
		).toEqual(["node:fs", "node:path", "node:vm"]);
		expect(loader).toContain('join(__dirname, "classicy.umd.js")');
	});

	// The bug: in a "type": "module" package Node reads the .js bundle as an
	// ES module, so require() of the bundle itself takes the global branch.
	it("is needed: require() of the .js bundle itself fails in Node", () =>
		expect(
			host(
				`try { require(${JSON.stringify(join(pkg, "dist/fixture.umd.js"))}); console.log("loaded"); } catch (e) { console.log(e.name); }`,
			).stdout,
		).toBe("TypeError"));

	it("lets require() of the package load the bundle as CommonJS", () =>
		expect(
			host(
				'const m = require("fixture"); console.log(JSON.stringify([m.value, m.file]));',
			).stdout,
		).toBe(JSON.stringify([42, join(pkg, "dist/fixture.umd.js")])));

	it("returns the same exports on every require()", () =>
		expect(
			host('console.log(require("fixture") === require("fixture"));').stdout,
		).toBe("true"));

	it("keeps a stack trace from inside the bundle on the bundle's own lines and columns", () => {
		const { stdout } = host(
			'try { require("fixture").fail(); } catch (e) { console.log(e.stack.split("\\n")[1].trim()); }',
		);
		const column = UMD.split("\n")[2].indexOf("new Error") + 1;
		expect(stdout).toBe(
			`at e.fail (${join(pkg, "dist/fixture.umd.js")}:3:${column})`,
		);
	});
});

describe("classicyUmdLoaderPlugin", () => {
	type GenerateBundle = (
		this: { emitFile: (file: unknown) => void },
		options: { format: string },
	) => void;
	const emitted = (format: string) => {
		const files: unknown[] = [];
		const hook = classicyUmdLoaderPlugin("classicy.umd.js")
			.generateBundle as unknown as GenerateBundle;
		hook.call({ emitFile: (file) => files.push(file) }, { format });
		return files;
	};

	it("emits the loader beside the UMD bundle", () =>
		expect(emitted("umd")).toEqual([
			{
				type: "asset",
				fileName: "classicy.umd.cjs",
				source: classicyUmdLoader("classicy.umd.js"),
			},
		]));

	it("emits nothing in the ES output", () => expect(emitted("es")).toEqual([]));
});

describe("findClassicyUmdLoaderProblems", () => {
	const LOADER = "dist/classicy.umd.cjs";
	const files = (entries: Record<string, string>) => (file: string) =>
		entries[file] ?? null;
	const loader = classicyUmdLoader("classicy.umd.js");

	it("passes the loader beside its bundle", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				files({ [LOADER]: loader, "dist/classicy.umd.js": UMD }),
			),
		).toEqual([]));

	it("fails a missing loader", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				files({ "dist/classicy.umd.js": UMD }),
			),
		).toEqual([
			"dist/classicy.umd.cjs: missing -> the exports map's `require` condition names it; check classicyUmdLoaderPlugin in vite.config.ts (bin/classicyUmdLoader.ts).",
		]));

	it("fails a loader that is not the one written for its bundle", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				files({
					[LOADER]: classicyUmdLoader("other.umd.js"),
					"dist/classicy.umd.js": UMD,
				}),
			),
		).toEqual([
			"dist/classicy.umd.cjs: is not the CommonJS loader for classicy.umd.js -> it is written by classicyUmdLoaderPlugin (bin/classicyUmdLoader.ts), not by hand.",
		]));

	it("fails a loader that carries code of its own", () => {
		const big = `${loader}${"//".repeat(CLASSICY_UMD_LOADER_MAX_BYTES)}\n`;
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				files({ [LOADER]: big, "dist/classicy.umd.js": UMD }),
			),
		).toEqual([
			"dist/classicy.umd.cjs: is not the CommonJS loader for classicy.umd.js -> it is written by classicyUmdLoaderPlugin (bin/classicyUmdLoader.ts), not by hand.",
			`dist/classicy.umd.cjs: is ${Buffer.byteLength(big)} bytes, over ${CLASSICY_UMD_LOADER_MAX_BYTES} -> the loader runs the UMD bundle; it never carries code of its own.`,
		]);
	});

	it("fails a loader whose bundle is missing", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				files({ [LOADER]: loader }),
			),
		).toEqual([
			"dist/classicy.umd.cjs: loads dist/classicy.umd.js, which is missing -> the UMD bundle must ship beside its loader.",
		]));
});

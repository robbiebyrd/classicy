// @vitest-environment node
// (transformWithEsbuild, which builds the source-mapped fixture, refuses
// jsdom's TextEncoder.)
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transformWithEsbuild } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
	'"use strict";e.value=d.value;e.file=typeof __filename<"u"?__filename:null;e.self=this;e.realm=function(){return [{},globalThis]};',
	'e.fail=function(){throw new Error("from inside the bundle")};',
	"});",
	"//# sourceMappingURL=fixture.umd.js.map",
	"",
].join("\n");

// A package folder: package.json, the bundle and its loader.
const writePackage = (name: string, bundle: string | null) => {
	const dir = join(root, "node_modules", name);
	mkdirSync(join(dir, "dist"), { recursive: true });
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			name,
			type: "module",
			main: `./dist/${name}.umd.js`,
			exports: {
				".": {
					require: {
						node: `./dist/${name}.umd.cjs`,
						default: `./dist/${name}.umd.js`,
					},
				},
			},
		}),
	);
	if (bundle !== null) writeFileSync(join(dir, `dist/${name}.umd.js`), bundle);
	writeFileSync(
		join(dir, `dist/${name}.umd.cjs`),
		classicyUmdLoader(`${name}.umd.js`, name),
	);
	return dir;
};
const pkg = writePackage("fixture", UMD);
mkdirSync(join(root, "node_modules/dep"), { recursive: true });
writeFileSync(join(root, "node_modules/dep/index.js"), "exports.value = 42;\n");

// A minified bundle with a source map, as the library build writes one.
const MAPPED_SOURCE = [
	"function helper(x) {",
	"  if (x > 1) {",
	'    throw new Error("boom from helper");',
	"  }",
	"  return x;",
	"}",
	"exports.run = function run(v) {",
	"  return helper(v + 1);",
	"};",
	"",
].join("\n");
beforeAll(async () => {
	const dir = writePackage("mapped", null);
	writeFileSync(join(root, "mapped-src.js"), MAPPED_SOURCE);
	const { code, map } = await transformWithEsbuild(
		MAPPED_SOURCE,
		join(root, "mapped-src.js"),
		{ minify: true, sourcemap: "external", format: "cjs", loader: "js" },
	);
	writeFileSync(
		join(dir, "dist/mapped.umd.js"),
		`${code}//# sourceMappingURL=mapped.umd.js.map\n`,
	);
	writeFileSync(
		join(dir, "dist/mapped.umd.js.map"),
		JSON.stringify({ ...map, sources: ["../../../mapped-src.js"] }),
	);
});

const host = (source: string, flags: string[] = []) => {
	const file = join(root, `host-${Math.random().toString(36).slice(2)}.cjs`);
	writeFileSync(file, source);
	const result = spawnSync(process.execPath, [...flags, file], {
		cwd: root,
		encoding: "utf8",
	});
	return {
		status: result.status,
		stdout: result.stdout.trim(),
		stderr: result.stderr,
	};
};
const firstFrame = 'console.log(e.stack.split("\\n")[1].trim())';

describe("classicyUmdLoader", () => {
	it("names the loader after the bundle, with .cjs", () => {
		expect(classicyUmdLoaderFile("classicy.umd.js")).toBe("classicy.umd.cjs");
		expect(classicyUmdLoaderFile("appearance-platinum.umd.js")).toBe(
			"appearance-platinum.umd.cjs",
		);
	});

	it("is a few lines of documented Node APIs", () => {
		const loader = classicyUmdLoader("classicy.umd.js", "@classicy/classicy");
		expect(Buffer.byteLength(loader)).toBeLessThan(
			CLASSICY_UMD_LOADER_MAX_BYTES,
		);
		expect(
			[...loader.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]),
		).toEqual(["node:fs", "node:vm", "node:path"]);
		expect(loader).toContain('join(__dirname, "classicy.umd.js")');
		expect(loader).not.toContain('"use strict"');
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
				'const m = require("fixture"); console.log(JSON.stringify([m.value, m.file, m.self === m]));',
			).stdout,
		).toBe(JSON.stringify([42, join(pkg, "dist/fixture.umd.js"), false])));

	it("returns the same exports on every require()", () =>
		expect(
			host('console.log(require("fixture") === require("fixture"));').stdout,
		).toBe("true"));

	it("keeps a stack trace from inside the bundle on the bundle's own lines and columns", () => {
		const column = UMD.split("\n")[2].indexOf("new Error") + 1;
		expect(
			host(`try { require("fixture").fail(); } catch (e) { ${firstFrame}; }`)
				.stdout,
		).toBe(`at e.fail (${join(pkg, "dist/fixture.umd.js")}:3:${column})`);
	});

	// Node maps generated code that carries a source URL (module docs,
	// setSourceMapsSupport's `generatedCode`), so the bundle's own map applies.
	it("maps a stack trace through the bundle's source map under --enable-source-maps", () => {
		const run = `try { require("mapped").run(5); } catch (e) { ${firstFrame}; }`;
		expect(host(run).stdout).toMatch(/mapped\.umd\.js:1:\d+\)$/);
		expect(host(run, ["--enable-source-maps"]).stdout).toBe(
			`at helper (${join(root, "mapped-src.js")}:3:11)`,
		);
	});

	// --disallow-code-generation-from-strings forbids eval: vm compiles it.
	it("loads where code generation from strings is disallowed", () => {
		const { stdout } = host(
			`const m = require("fixture"); console.log(m.value); try { m.fail(); } catch (e) { ${firstFrame}; }`,
			["--disallow-code-generation-from-strings"],
		);
		const column = UMD.split("\n")[2].indexOf("new Error") + 1;
		expect(stdout.split("\n")).toEqual([
			"42",
			`at e.fail (${join(pkg, "dist/fixture.umd.js")}:3:${column})`,
		]);
	});

	// A test runner compiles each module in a context of its own (Jest's node
	// and jsdom environments): the bundle runs in that realm, with its
	// globals, not Node's main one.
	it("runs the bundle in the realm of the code that requires it", () => {
		const { stdout } = host(`
const vm = require("node:vm");
const { createRequire } = require("node:module");
const file = require.resolve("fixture");
const sandbox = vm.createContext({ marker: "sandbox" });
const compiled = vm.runInContext(
	"(function (exports, require, module, __filename, __dirname) {" + require("node:fs").readFileSync(file, "utf8") + "\\n})",
	sandbox,
	{ filename: file },
);
const mod = { exports: {} };
compiled(mod.exports, createRequire(file), mod, file, require("node:path").dirname(file));
const [object, global] = mod.exports.realm();
console.log(JSON.stringify([
	object instanceof Object,
	Object.getPrototypeOf(object) === vm.runInContext("Object.prototype", sandbox),
	global.marker,
]));`);
		expect(stdout).toBe(JSON.stringify([false, true, "sandbox"]));
	});

	// A Node-target bundler (esbuild --platform=node, webpack's target node)
	// can inline the loader and leave the bundle behind.
	it("says what happened when its bundle is missing", () => {
		const dir = writePackage("lonely", null);
		const { stdout } = host(
			'try { require("lonely"); } catch (e) { console.log(e.message); console.log(e.cause && e.cause.code); }',
		);
		expect(stdout.split("\n")).toEqual([
			`lonely: its UMD bundle, ${join(dir, "dist/lonely.umd.js")}, is missing beside its CommonJS loader. A bundler copied the loader into a server bundle without the bundle: keep @classicy/* external in a server bundle that require()s them, or import them (the ES build).`,
			"ENOENT",
		]);
	});
});

describe("classicyUmdLoaderPlugin", () => {
	type GenerateBundle = (
		this: { emitFile: (file: unknown) => void },
		options: { format: string },
	) => void;
	const emitted = (format: string) => {
		const files: unknown[] = [];
		const hook = classicyUmdLoaderPlugin(
			"classicy.umd.js",
			"@classicy/classicy",
		).generateBundle as unknown as GenerateBundle;
		hook.call({ emitFile: (file) => files.push(file) }, { format });
		return files;
	};

	it("emits the loader beside the UMD bundle", () =>
		expect(emitted("umd")).toEqual([
			{
				type: "asset",
				fileName: "classicy.umd.cjs",
				source: classicyUmdLoader("classicy.umd.js", "@classicy/classicy"),
			},
		]));

	it("emits nothing in the ES output", () => expect(emitted("es")).toEqual([]));
});

describe("findClassicyUmdLoaderProblems", () => {
	const LOADER = "dist/classicy.umd.cjs";
	const NAME = "@classicy/classicy";
	const files = (entries: Record<string, string>) => (file: string) =>
		entries[file] ?? null;
	const loader = classicyUmdLoader("classicy.umd.js", NAME);

	it("passes the loader beside its bundle", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				NAME,
				files({ [LOADER]: loader, "dist/classicy.umd.js": UMD }),
			),
		).toEqual([]));

	it("fails a missing loader", () =>
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				NAME,
				files({ "dist/classicy.umd.js": UMD }),
			),
		).toEqual([
			"dist/classicy.umd.cjs: missing -> the exports map's `require` condition names it; check classicyUmdLoaderPlugin in vite.config.ts (bin/classicyUmdLoader.ts).",
		]));

	it("fails a loader that is not the one written for its bundle and package", () => {
		for (const other of [
			classicyUmdLoader("other.umd.js", NAME),
			classicyUmdLoader("classicy.umd.js", "@classicy/other"),
		])
			expect(
				findClassicyUmdLoaderProblems(
					LOADER,
					"classicy.umd.js",
					NAME,
					files({ [LOADER]: other, "dist/classicy.umd.js": UMD }),
				),
			).toEqual([
				"dist/classicy.umd.cjs: is not the CommonJS loader for classicy.umd.js -> it is written by classicyUmdLoaderPlugin (bin/classicyUmdLoader.ts), not by hand.",
			]);
	});

	it("fails a loader that carries code of its own", () => {
		const big = `${loader}${"//".repeat(CLASSICY_UMD_LOADER_MAX_BYTES)}\n`;
		expect(
			findClassicyUmdLoaderProblems(
				LOADER,
				"classicy.umd.js",
				NAME,
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
				NAME,
				files({ [LOADER]: loader }),
			),
		).toEqual([
			"dist/classicy.umd.cjs: loads dist/classicy.umd.js, which is missing -> the UMD bundle must ship beside its loader.",
		]));
});

// The fixture bundle's source map is read from disk next to it.
it("writes the mapped fixture's map beside its bundle", () =>
	expect(
		JSON.parse(
			readFileSync(
				join(root, "node_modules/mapped/dist/mapped.umd.js.map"),
				"utf8",
			),
		).sources,
	).toEqual(["../../../mapped-src.js"]));

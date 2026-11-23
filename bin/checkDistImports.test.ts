import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { CLASSICY_DEFLATE_MARK } from "./classicyDeflateAsset";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

// The real bin/check-dist-imports.mjs, run in
// named-file mode on synthetic bundles. They live outside dist/, so the
// invariants that read dist/ itself (the injected stylesheet, fonts, assets)
// skip them and only the import scan and the named-file invariants apply.

const SCRIPT = resolve("bin/check-dist-imports.mjs");
const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow{border:1px solid}}';
const root = mkdtempSync(join(tmpdir(), "classicy-check-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let run = 0;
/**
 * Writes the bundles (literal = the package string's JS literal, or none) and
 * any other files (path → text, e.g. `fx/classicy-platinum.css` or
 * `dist/fonts.js`), then runs the script on all of them.
 */
const check = (
	bundles: Record<string, string | null>,
	files: Record<string, string> = {},
) => {
	const dir = join(root, `case-${run++}`);
	mkdirSync(join(dir, "fx"), { recursive: true });
	mkdirSync(join(dir, "dist"), { recursive: true });
	const names = Object.entries(bundles).map(([name, literal]) => {
		const file = join("fx", name);
		writeFileSync(
			join(dir, file),
			literal === null
				? "const a=1;export{a};"
				: `const css=${literal};export{css};`,
		);
		return file;
	});
	for (const [file, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, file)), { recursive: true });
		writeFileSync(join(dir, file), text);
	}
	const result = spawnSync(
		process.execPath,
		[SCRIPT, ...names, ...Object.keys(files)],
		{ cwd: dir, encoding: "utf8" },
	);
	return { status: result.status, stderr: result.stderr };
};
const literal = (css: string) => `\`${css}\``;
const both = (css: string | null) => ({
	"classicy.es.js": css === null ? null : literal(css),
	"classicy.umd.js": css === null ? null : literal(css),
});
const PACKAGE_FREE =
	/carries a @layer classicy\.package block -> the core ships no Appearance Package/;

// Invariant 7 (plan 0015-kxa §3.4): the core registers no Appearance Package,
// so no bundle of its carries a package block, well-formed or not, and its
// dist holds no package stylesheet. Platinum's look ships, and is checked, in
// @classicy/appearance-platinum (its bin/verify-dist.mjs).
describe("check-dist-imports.mjs invariant 7: no package CSS in the core (named files)", () => {
	it("passes entry bundles that carry no package stylesheet", () =>
		expect(check(both(null))).toEqual({ status: 0, stderr: "" }));

	it.each([
		["the package stylesheet", PACKAGE],
		["an empty block", "@layer classicy.package{}"],
		["a block nested in classicy.base", `@layer classicy.base{${PACKAGE}}`],
	])("fails %s, in each entry bundle", (_name, css) => {
		const { status, stderr } = check(both(css));
		expect(status).toBe(1);
		for (const bundle of ["classicy.es.js", "classicy.umd.js"])
			expect(
				stderr
					.split("\n")
					.filter((line) => line.startsWith(join("fx", bundle)))
					.some((line) => PACKAGE_FREE.test(line)),
				bundle,
			).toBe(true);
	});

	it("fails a package block in any other bundle too", () => {
		const { status, stderr } = check({
			...both(null),
			"pdf-DcHjwfzs.js": literal(PACKAGE),
		});
		expect(status).toBe(1);
		expect(stderr.trim().split("\n")).toEqual([
			expect.stringMatching(
				new RegExp(
					`^${join("fx", "pdf-DcHjwfzs\\.js")}: .*${PACKAGE_FREE.source}`,
				),
			),
		]);
	});

	it("fails a package stylesheet file", () => {
		const FILE = join("fx", "classicy-platinum.css");
		const { status, stderr } = check(both(null), {
			[FILE]: `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${FILE}: a package stylesheet in the core's dist -> the core ships no Appearance Package; a package's strict-CSP stylesheet ships in its own dist (Platinum's in @classicy/appearance-platinum).`,
		);
	});
});

// dist/fonts.js, the deprecated `@classicy/classicy/fonts` entry, is an
// emitted no-op, and so is its .d.ts: the exports map's `types` condition
// points at it, so without it a TypeScript consumer's side-effect import stops
// resolving under `noUncheckedSideEffectImports`. (The Platinum shim,
// dist/appearance-platinum.js, is gone with its export: invariant 5.)
describe("check-dist-imports.mjs invariant 4: dist/fonts.js and .d.ts (named files)", () => {
	const SHIM = join("dist", "fonts.js");
	const TYPES = join("dist", "fonts.d.ts");
	const DECLARATION = "// No-op side-effect module.\nexport {};\n";

	it("passes a self-contained no-op with its declaration", () =>
		expect(
			check(both(null), {
				[SHIM]: "// Deprecated no-op.\n",
				[TYPES]: DECLARATION,
			}),
		).toEqual({ status: 0, stderr: "" }));

	it("fails when it gains an import", () => {
		const { status, stderr } = check(both(null), {
			[SHIM]: 'import "./classicy.es.js";\n',
			[TYPES]: DECLARATION,
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${SHIM}: has an import/require; it must stay a self-contained script.`,
		);
	});

	it("fails when its declaration is missing", () => {
		const { status, stderr } = check(both(null), {
			[SHIM]: "// Deprecated no-op.\n",
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${TYPES}: missing -> check injectCssPlugin in vite.config.ts.`,
		);
	});

	it("fails when its declaration gains an import", () => {
		const { status, stderr } = check(both(null), {
			[SHIM]: "// Deprecated no-op.\n",
			[TYPES]: 'import "./types/src/index";\nexport {};\n',
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${TYPES}: has an import/require; it must stay a self-contained declaration.`,
		);
	});

	it("checks no dist/appearance-platinum.js shim", () =>
		expect(
			check(both(null), { [join("dist", "appearance-platinum.js")]: "" }),
		).toEqual({ status: 0, stderr: "" }));
});

// Invariant 9: a linked stylesheet is ASCII only, or opens with
// `@charset "UTF-8";`, so a host page that is not UTF-8 decodes it right.
describe("check-dist-imports.mjs invariant 9: stylesheet charset (named files)", () => {
	const FILE = join("fx", "glyphs.css");

	it.each([
		["an ASCII stylesheet", '.a::before{content:"\\2713"}'],
		[
			"a UTF-8 stylesheet with @charset",
			'@charset "UTF-8";.a::before{content:"✓"}',
		],
	])("passes %s", (_name, css) =>
		expect(check({}, { [FILE]: css })).toEqual({ status: 0, stderr: "" }));

	it("fails raw UTF-8 with no @charset", () => {
		const { status, stderr } = check({}, { [FILE]: '.a::before{content:"✓"}' });
		expect(status).toBe(1);
		expect(stderr.trim()).toMatch(
			new RegExp(`^${FILE.replace(".", "\\.")}: non-ASCII byte at offset 20`),
		);
	});
});

// Invariant 15: a declaration calling a CSS math function newer than the
// browser floor carries a fallback the floor parses.
describe("check-dist-imports.mjs invariant 15: the browser floor's CSS math (named files)", () => {
	const FILE = join("fx", "slider.css");

	it.each([
		[
			"a rounded value after its unrounded one",
			".a{left:calc(50% - 6px);left:round(50% - 6px,1px)}",
		],
		[
			"one under @supports testing it",
			"@supports (left: round(1px,1px)){.a{left:round(50%,1px)}}",
		],
	])("passes %s", (_name, css) =>
		expect(check({}, { [FILE]: css })).toEqual({ status: 0, stderr: "" }));

	it("fails an unguarded round()", () => {
		const { status, stderr } = check(
			{},
			{ [FILE]: ".a{left:round(50% - 6px,1px)}" },
		);
		expect(status).toBe(1);
		expect(stderr.trim()).toMatch(
			new RegExp(
				`^${FILE.replace(".", "\\.")}: \`left: round\\(50% - 6px,1px\\)\` in \`\\.a\` calls round\\(\\)`,
			),
		);
	});
});

// Invariant 10: the library stylesheet is only classicy.base blocks, so no
// unlayered rule outranks the package and host layers.
describe("check-dist-imports.mjs invariant 10: dist/classicy.css layers (named files)", () => {
	const FILE = join("dist", "classicy.css");
	const BASE = "@layer classicy.base{.a{color:red}}";

	it("passes the order statement then classicy.base blocks", () =>
		expect(
			check(
				{},
				{
					[FILE]: `${CLASSICY_LAYER_ORDER}\n${BASE}@layer classicy.base{.b{}}`,
				},
			),
		).toEqual({ status: 0, stderr: "" }));

	it.each([
		["between two blocks", `${BASE}.leak{color:red}${BASE}`],
		["after the last block", `${BASE}.leak{color:red}`],
	])("fails an unlayered rule %s", (_name, body) => {
		const { status, stderr } = check(
			{},
			{ [FILE]: `${CLASSICY_LAYER_ORDER}\n${body}` },
		);
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${FILE}: unlayered CSS outside the @layer classicy.base blocks: ".leak{color:red}" -> every component stylesheet must be an .scss file under src/, which classicyCssLayerPlugin compiles into @layer classicy.base.`,
		);
	});
});

// Invariant 11: a plain .css file under src/ would ship unlayered.
describe("check-dist-imports.mjs invariant 11: plain .css under src (named files)", () => {
	it("passes an empty or comment-only file", () =>
		expect(
			check(
				{},
				{
					[join("src", "index.css")]: "",
					[join("src", "a", "note.css")]: "/* placeholder */\n",
				},
			),
		).toEqual({ status: 0, stderr: "" }));

	it("fails a file with a rule", () => {
		const FILE = join("src", "a", "leak.css");
		const { status, stderr } = check({}, { [FILE]: ".leak{color:red}" });
		expect(status).toBe(1);
		const prefix = `${FILE}: a plain .css file with rules`;
		expect(stderr.trim().slice(0, prefix.length)).toBe(prefix);
	});

	// A workspace Appearance Package's source is scanned too (plan 0015-kxa
	// §3.1): its .css would ship unlayered just the same.
	it("fails a file with a rule under a package's src", () => {
		const FILE = join("packages", "appearance", "x", "src", "leak.css");
		const { status, stderr } = check({}, { [FILE]: ".leak{color:red}" });
		expect(status).toBe(1);
		const prefix = `${FILE}: a plain .css file with rules`;
		expect(stderr.trim().slice(0, prefix.length)).toBe(prefix);
	});
});

describe("check-dist-imports.mjs invariant 13: production JSX runtime (named files)", () => {
	const DEV = 'import{jsxDEV as o}from"react/jsx-dev-runtime";';
	const run13 = (body: string, head = "") => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		const file = join("dist", "classicy.es.js");
		writeFileSync(join(dir, file), `${head}const a=1;${body}export{a};`);
		const r = spawnSync(process.execPath, [SCRIPT, file], {
			cwd: dir,
			encoding: "utf8",
		});
		return { status: r.status, stderr: r.stderr, dir };
	};
	// Invariants 3 and 10 also fail on these stand-ins; only 13's lines count.
	const lines13 = (stderr: string) =>
		stderr
			.split("\n")
			.filter((l) => /JSX|build-machine|build directory/.test(l));

	it("passes a bundle with the production runtime", () => {
		const r = run13(
			'o("div",{children:1});',
			'import{jsx as o}from"react/jsx-runtime";',
		);
		expect(lines13(r.stderr)).toEqual([]);
	});

	it.each([
		["the dev runtime import", DEV, /react\/jsx-dev-runtime/],
		["a jsxDEV call", 'x.jsxDEV("a",{});', /calls jsxDEV/],
		[
			"a /home/ fileName",
			'f({fileName:"/home/me/src/A.tsx",lineNumber:1});',
			/absolute build-machine paths/,
		],
		[
			"a /Users/ fileName",
			"f({fileName:'/Users/me/src/A.tsx'});",
			/absolute build-machine paths/,
		],
		[
			"a Windows fileName",
			'f({fileName:"C:\\\\src\\\\A.tsx"});',
			/absolute build-machine paths/,
		],
	])("fails on %s", (_n, body, message) => {
		const r = run13(body);
		expect(r.status).toBe(1);
		expect(lines13(r.stderr).join("\n")).toMatch(message);
	});

	it("fails on the build directory", () => {
		const dir = join(root, `case-${run}`);
		const r = run13(`f("${dir.replaceAll("\\", "\\\\")}/src/A.tsx");`);
		expect(r.status).toBe(1);
		expect(lines13(r.stderr).join("\n")).toMatch(/build directory/);
	});

	it("ignores a /home/ path that is not a fileName", () => {
		const r = run13('f("see /home/docs");');
		expect(lines13(r.stderr)).toEqual([]);
	});
});

describe("check-dist-imports.mjs invariant 14: no screen saver in the core (named files)", () => {
	const lines14 = (stderr: string) =>
		stderr.split("\n").filter((l) => /classicySaver/.test(l));

	it("passes bundles and a stylesheet with no saver name", () =>
		expect(
			lines14(check(both(null), { "dist/classicy.css": ".a{top:0}" }).stderr),
		).toEqual([]));

	it("fails a classicySaver keyframe in a bundle", () => {
		const r = check(both("@keyframes classicySaverFloat{}"));
		expect(r.status).toBe(1);
		expect(lines14(r.stderr)).toHaveLength(2);
		expect(lines14(r.stderr)[0]).toMatch(
			/fx[\\/]classicy\.es\.js: carries a classicySaver name/,
		);
	});

	it("fails a classicySaver class in a stylesheet", () => {
		const r = check(both(null), {
			"dist/classicy.css": ".classicySaverFishBody{top:0}",
		});
		expect(r.status).toBe(1);
		expect(lines14(r.stderr).join("\n")).toMatch(
			/classicy\.css: carries a classicySaver name/,
		);
	});
});

// Invariant 5, whole dist: the Platinum package's saver art (under
// src/screenSavers, not src/assets) in the core's dist fails.
describe("check-dist-imports.mjs invariant 5: saver art (whole dist)", () => {
	const SAVER =
		"packages/appearance/platinum/src/screenSavers/Fish/fish-red.webp";
	const IMAGE = Buffer.from(
		Array.from({ length: 256 }, (_, i) => (i * 7) % 256),
	);
	const whole = (bundle: string, assets: string[] = []) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist", "assets"), { recursive: true });
		mkdirSync(dirname(join(dir, SAVER)), { recursive: true });
		writeFileSync(join(dir, SAVER), IMAGE);
		writeFileSync(join(dir, "dist", "classicy.es.js"), bundle);
		writeFileSync(join(dir, "dist", "classicy.umd.js"), "export{};");
		for (const a of assets) writeFileSync(join(dir, "dist", "assets", a), "x");
		const r = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		return r.stderr.split("\n").filter((l) => l.includes("fish-red"));
	};

	it("passes a dist with no saver image", () =>
		expect(whole("export{};")).toEqual([]));

	it("fails a saver image inlined in a bundle", () =>
		expect(
			whole(
				`a="data:image/webp;base64,${IMAGE.toString("base64")}";export{a};`,
			),
		).toEqual([
			expect.stringMatching(
				/classicy\.es\.js: inlines .*fish-red\.webp -> the core bundles no package/,
			),
		]));

	it("fails a saver image in dist/assets", () =>
		expect(whole("export{};", ["fish-red.webp"])[0]).toMatch(
			/fish-red\.webp: an Appearance Package's file/,
		));
});

// Invariant 8 (0151-0cc): the package is `"type": "module"`, so a host on
// node16 or nodenext resolves a declaration's relative specifier only with its
// extension. Run without named files on a dist/ holding only declarations
// and two empty entry bundles, so the other invariants report what that dist
// lacks; only the dist/types lines are read.
describe("check-dist-imports.mjs invariant 8: declaration specifiers (whole dist)", () => {
	const types = (declarations: Record<string, string>) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		for (const bundle of ["classicy.es.js", "classicy.umd.js"])
			writeFileSync(join(dir, "dist", bundle), "export{};");
		for (const [file, text] of Object.entries(declarations)) {
			const path = join(dir, "dist", "types", file);
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, text);
		}
		const result = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		const typesLines = (text: string) =>
			text.split("\n").filter((line) => line.startsWith(join("dist", "types")));
		return { out: typesLines(result.stdout), err: typesLines(result.stderr) };
	};

	// The count is readdir's, folders included (src/).
	it("passes relative specifiers with .js, dotted module names included", () =>
		expect(
			types({
				"src/index.d.ts":
					"export * from './Manager.Colors.js';\n/** import a from './icon.png'; */\n",
				"src/Manager.Colors.d.ts": "export type A = 1;\n",
			}),
		).toEqual({
			out: [
				`${join("dist", "types")}: 3 file(s), none for a test, test helper, story, build script in bin/, root build config or imported JSON; every relative specifier with its extension`,
			],
			err: [],
		}));

	it("invariant 8 fails on a .d.ts.map in dist/types", () =>
		expect(
			types({
				"src/index.d.ts": "export {};\n",
				"src/index.d.ts.map": "{}",
				"src/a/b.d.ts.map": "{}",
			}).err,
		).toEqual([
			`${join("dist", "types")}: 2 declaration map(s) (${join("src", "a", "b.d.ts.map")}, ${join("src", "index.d.ts.map")}) -> each dts() call must pass compilerOptions: { declarationMap: false }.`,
		]));

	it("fails each declaration with an extensionless relative specifier", () =>
		expect(
			types({
				"src/index.d.ts":
					"export * from './Manager.Colors';\nexport * from './a/b.js';\n",
				"src/a/b.d.ts": "export type B = import('../Manager.Colors').A;\n",
			}).err,
		).toEqual([
			`${join("dist", "types", "src", "a", "b.d.ts")}: relative specifier(s) without an extension ("../Manager.Colors") -> a node16 or nodenext host resolves none of them; check beforeWriteFile on dts in vite.config.ts.`,
			`${join("dist", "types", "src", "index.d.ts")}: relative specifier(s) without an extension ("./Manager.Colors") -> a node16 or nodenext host resolves none of them; check beforeWriteFile on dts in vite.config.ts.`,
		]));
});

// Invariant 16 (plan 0019-fb7 Part 1): every published source map keeps
// Classicy's own text and drops third-party and asset text. Run without named
// files on a dist/ holding two empty entry bundles and the maps, so the other
// invariants report what that dist lacks; only the lines naming a .js.map are
// read.
describe("check-dist-imports.mjs invariant 16: source map text (whole dist)", () => {
	const map = (sources: string[], sourcesContent: Array<string | null>) =>
		JSON.stringify({
			version: 3,
			sources,
			sourcesContent,
			names: [],
			mappings: "",
			x_google_ignoreList: sources.flatMap((source, i) =>
				source.includes("node_modules/") ? [i] : [],
			),
		});
	const maps = (files: Record<string, string>) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		for (const bundle of ["classicy.es.js", "classicy.umd.js"])
			writeFileSync(join(dir, "dist", bundle), "export{};");
		for (const [file, text] of Object.entries(files))
			writeFileSync(join(dir, "dist", file), text);
		const result = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		const mapLines = (text: string) =>
			text.split("\n").filter((line) => line.includes(".js.map"));
		return { out: mapLines(result.stdout), err: mapLines(result.stderr) };
	};
	const VENDOR = "../node_modules/.pnpm/zod@4.1.12/node_modules/zod/index.js";

	it("invariant 16 fails on a map that keeps node_modules text", () =>
		expect(
			maps({
				"classicy.es.js.map": map(["../src/index.ts", VENDOR], ["x", "y"]),
				"classicy.umd.js.map": map(["../src/index.ts", VENDOR], ["x", null]),
				"pdf-DM8UBKbM.js.map": map([VENDOR], ["y"]),
			}).err,
		).toEqual([
			`${join("dist", "classicy.es.js.map")}: keeps the text of vendor source ${VENDOR} -> the library build must run classicySourceMapTextPlugin.`,
			`${join("dist", "pdf-DM8UBKbM.js.map")}: keeps the text of vendor source ${VENDOR} -> the library build must run classicySourceMapTextPlugin.`,
		]));

	it("invariant 16 passes a map with own text and null vendor text", () =>
		expect(
			maps({
				"classicy.es.js.map": map(["../src/index.ts", VENDOR], ["x", null]),
				"classicy.umd.js.map": map(["../src/index.ts", VENDOR], ["x", null]),
			}),
		).toEqual({
			out: [
				"source maps: 2 dist/*.js.map file(s), each with Classicy's own text and no third-party or asset text",
			],
			err: [],
		}));
});

// Invariant 2: pdfjs-dist and fflate stay bundled. The worker is embedded
// from this repo's pdfjs-dist, and fflate (which inflates it) is a
// devDependency no host installs.
describe("check-dist-imports.mjs invariant 2: packages that stay bundled (named files)", () => {
	const FILE = join("fx", "ClassicyPdfWorkerSource.internal-Bq3x9Zt1.js");

	it("passes a chunk that carries fflate inline", () =>
		expect(
			check({}, { [FILE]: "function i(){}export{i as inflateSync};" }),
		).toEqual({ status: 0, stderr: "" }));

	it.each([
		[
			"fflate",
			'import{inflateSync as i}from"fflate";export{i};',
			"fflate: a devDependency (it inflates the embedded pdf.js worker), so a host has no copy to import.",
		],
		[
			"pdfjs-dist",
			'const p=()=>import("pdfjs-dist");export{p};',
			"pdfjs-dist: its worker is embedded here at build time; the consumer would supply a mismatched API version and every PDF would fail to load.",
		],
	])("fails a chunk that imports %s", (name, code, reason) => {
		const { status, stderr } = check({}, { [FILE]: code });
		expect(status).toBe(1);
		expect(stderr.trim().split("\n")).toEqual([
			`${FILE}: externalized a package that must stay bundled:`,
			`  import "${name}"`,
			`  -> ${reason}`,
		]);
	});
});

// Invariant 17 (plan 0019-fb7 Part 2): the pdf.js worker ships deflated
// (`?classicy-deflate`), never as a data:text/javascript URI; the UMD bundle
// carries it once, the ES build once in a lazy chunk, and the ES entry not at
// all; each copy inflates to the installed pdfjs-dist worker. Run without
// named files on a dist/ holding only the bundles given, so the other
// invariants report what that dist lacks; only the pdf.js worker lines are
// read.
describe("check-dist-imports.mjs invariant 17: the deflated pdf.js worker (whole dist)", () => {
	// The legacy build's worker (plan 0019-fb7 §3.4); the modern one calls
	// Map.prototype.getOrInsertComputed, which the oldest supported browsers
	// (Chrome 120, Safari 16.2, Firefox 113) lack.
	const resolveWorker = (path: string) =>
		readFileSync(createRequire(import.meta.url).resolve(path));
	const WORKER = resolveWorker("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
	const MODERN_WORKER = resolveWorker("pdfjs-dist/build/pdf.worker.min.mjs");
	const payload = (bytes: Buffer) =>
		`a=${JSON.stringify(
			CLASSICY_DEFLATE_MARK +
				deflateRawSync(bytes, { level: 9 }).toString("base64"),
		)};export{a};`;
	const DEFLATED = payload(WORKER);
	const CHUNK = "ClassicyPdfWorkerSource.internal-Bq3x9Zt1.js";
	const worker17 = (files: Record<string, string>) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		for (const [file, text] of Object.entries(files))
			writeFileSync(join(dir, "dist", file), text);
		const result = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		const workerLines = (text: string) =>
			text.split("\n").filter((line) => line.includes("pdf.js worker"));
		return { out: workerLines(result.stdout), err: workerLines(result.stderr) };
	};
	const ES = join("dist", "classicy.es.js");
	const UMD = join("dist", "classicy.umd.js");
	const LAZY = join("dist", CHUNK);

	it("passes with one payload in the UMD bundle and one in an ES chunk", () =>
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": DEFLATED,
				"pdf-DM8UBKbM.js": "export{};",
				[CHUNK]: DEFLATED,
			}),
		).toEqual({
			out: [
				`pdf.js worker: deflated once in ${UMD} and once in the ES chunks (${LAZY}), each equal to the installed pdfjs-dist legacy worker (${WORKER.length} bytes), never in ${ES}; no data:text/javascript URI in 4 bundle(s)`,
			],
			err: [],
		}));

	// The bare prefix is how the worker source builds its URI at runtime.
	it("passes the bare data:text/javascript prefix", () =>
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": `p="data:text/javascript;base64,";${DEFLATED}`,
				[CHUNK]: `p="data:text/javascript;base64,",u=p+b;${DEFLATED}`,
			}).err,
		).toEqual([]));

	it("invariant 17 fails on a data:text/javascript URI", () =>
		expect(
			worker17({
				"classicy.es.js": `w="data:text/javascript;base64,${WORKER.subarray(0, 48).toString("base64")}";export{w};`,
				"classicy.umd.js": DEFLATED,
				[CHUNK]: DEFLATED,
			}).err,
		).toEqual([
			`${ES}: carries a data:text/javascript URI -> the pdf.js worker is embedded deflated (\`?classicy-deflate\`, bin/classicyDeflateAsset.ts), never as a \`?url\` data: URI.`,
		]));

	it("fails when the deflated worker differs from the installed one", () => {
		const OTHER = payload(Buffer.concat([WORKER, Buffer.from("\n")]));
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": OTHER,
				[CHUNK]: OTHER,
			}).err,
		).toEqual([
			`${UMD}: its deflated pdf.js worker (${WORKER.length + 1} bytes) is not the installed pdfjs-dist legacy worker (${WORKER.length} bytes) -> check the \`?classicy-deflate\` import in ClassicyPdfWorkerSource.internal.ts.`,
			`${LAZY}: its deflated pdf.js worker (${WORKER.length + 1} bytes) is not the installed pdfjs-dist legacy worker (${WORKER.length} bytes) -> check the \`?classicy-deflate\` import in ClassicyPdfWorkerSource.internal.ts.`,
		]);
	});

	it("invariant 17 fails when the bundles carry the modern worker instead of the legacy one", () => {
		const MODERN = payload(MODERN_WORKER);
		const message = (file: string) =>
			`${file}: its deflated pdf.js worker is pdfjs-dist's modern build (${MODERN_WORKER.length} bytes), not its legacy build (${WORKER.length} bytes) -> the modern build calls Map.prototype.getOrInsertComputed, which the oldest supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack: import pdfjs-dist/legacy/build/pdf.worker.min.mjs?classicy-deflate in ClassicyPdfWorkerSource.internal.ts.`;
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": MODERN,
				[CHUNK]: MODERN,
			}).err,
		).toEqual([message(UMD), message(LAZY)]);
	});

	it("fails when classicy.es.js carries it", () =>
		expect(
			worker17({
				"classicy.es.js": DEFLATED,
				"classicy.umd.js": DEFLATED,
				[CHUNK]: DEFLATED,
			}).err,
		).toEqual([
			`${ES}: carries 1 deflated pdf.js worker(s) -> the ES entry carries none: PDFViewerDocument loads the worker source with import(), beside pdf.js, in a lazy chunk.`,
		]));

	it("fails when classicy.umd.js lacks it", () =>
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": "export{};",
				[CHUNK]: DEFLATED,
			}).err,
		).toEqual([
			`${UMD}: carries 0 deflated pdf.js workers, not 1 -> check the \`?classicy-deflate\` import in ClassicyPdfWorkerSource.internal.ts and classicyDeflateAssetPlugin in vite.config.ts.`,
		]));

	it("fails when no ES chunk carries it, or two do", () => {
		const message = (count: number, chunks: string) =>
			`dist: the ES chunks other than ${ES} carry ${count} deflated pdf.js workers, not 1 (${chunks}) -> PDFViewerDocument loads the worker source with import(), beside pdf.js, in a lazy chunk.`;
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": DEFLATED,
				"pdf-DM8UBKbM.js": "export{};",
			}).err,
		).toEqual([message(0, "none")]);
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": DEFLATED,
				"pdf-DM8UBKbM.js": DEFLATED,
				[CHUNK]: DEFLATED,
			}).err,
		).toEqual([message(2, `${LAZY}, ${join("dist", "pdf-DM8UBKbM.js")}`)]);
	});

	it("fails on a payload that does not inflate", () =>
		expect(
			worker17({
				"classicy.es.js": "export{};",
				"classicy.umd.js": `a="${CLASSICY_DEFLATE_MARK}AAAAAAAA";export{a};`,
				[CHUNK]: DEFLATED,
			}).err,
		).toEqual([
			expect.stringMatching(
				new RegExp(
					`^${UMD.replaceAll(".", "\\.")}: carries a deflated pdf.js worker that does not inflate \\(.+\\) -> check classicyDeflateAssetPlugin in vite.config.ts\\.$`,
				),
			),
		]));
});

// Invariant 17, its lazy chunks and its pdf.js (plan 0019-fb7's final
// review). No bundle but classicy.es.js imports the ES entry: a lazy chunk
// that did would make a host serving the entry under another URL load a
// second copy of the library, or none, on the first PDF. And classicy.umd.js
// and the ES chunks that carry pdf.js's API carry its legacy build, known by
// core-js's polyfill of Map.prototype.getOrInsertComputed, which the modern
// build lacks (it calls the method natively). Fixtures are the installed
// pdf.mjs files themselves, and the legacy one minified as the UMD bundle
// is. Only these lines are read.
describe("check-dist-imports.mjs invariant 17: lazy chunks and pdf.js's legacy build (whole dist)", () => {
	const pdfjs = (path: string) =>
		readFileSync(createRequire(import.meta.url).resolve(path), "utf8");
	const LEGACY = pdfjs("pdfjs-dist/legacy/build/pdf.mjs");
	const MODERN = pdfjs("pdfjs-dist/build/pdf.mjs");
	const PDF_CHUNK = "pdf-DM8UBKbM.js";
	const WORKER_CHUNK = "ClassicyPdfWorkerSource.internal-Bq3x9Zt1.js";
	const lines17 = (files: Record<string, string>) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		for (const [file, text] of Object.entries(files))
			writeFileSync(join(dir, "dist", file), text);
		const result = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		const ours = (text: string) =>
			text
				.split("\n")
				.filter(
					(line) => line.includes("pdf.js API") || line.includes("ES entry"),
				);
		return { out: ours(result.stdout), err: ours(result.stderr) };
	};
	const ES = join("dist", "classicy.es.js");
	const UMD = join("dist", "classicy.umd.js");
	const PDF = join("dist", PDF_CHUNK);
	const LAZY = join("dist", WORKER_CHUNK);
	const MODERN_MESSAGE = (file: string) =>
		`${file}: carries the pdf.js API's modern build, not its legacy build (no core-js polyfill of Map.prototype.getOrInsertComputed) -> import pdfjs-dist/legacy/build/pdf.mjs in PDFViewerDocument.tsx: the modern build calls the method natively, and the oldest supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack it.`;
	const ENTRY_MESSAGE = (file: string, specifier: string) =>
		`${file}: imports the ES entry ("${specifier}") -> a lazy chunk imports nothing of classicy.es.js, or a host serving the entry under another URL (a query string, a CDN redirect, a renamed file) loads a second copy of the library, or none: keep the chunk's modules free of Classicy imports (ClassicyPdfWorkerSource.internal.ts imports only fflate and the deflated worker).`;
	const dist = (overrides: Record<string, string> = {}) => ({
		"classicy.es.js": "export{};",
		"classicy.umd.js": LEGACY,
		[PDF_CHUNK]: LEGACY,
		[WORKER_CHUNK]: "var v=1;export{v as classicyPdfWorkerSrc};",
		...overrides,
	});

	it("passes the legacy build in the UMD bundle and an ES chunk, and chunks that import no entry", () =>
		expect(lines17(dist())).toEqual({
			out: [
				`pdf.js API: the legacy build (core-js's Map.prototype.getOrInsertComputed polyfill) in ${UMD} and ${PDF}`,
				`lazy chunks: none of 3 bundle(s) other than ${ES} imports the ES entry`,
			],
			err: [],
		}));

	// The marker is object keys and a string, which a minifier never renames.
	// Minified by esbuild (through Vite) in a child Node: esbuild refuses
	// jsdom's TextEncoder.
	it("passes the legacy build minified", () => {
		const minify = spawnSync(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`import { transformWithEsbuild } from "vite";
				import { text } from "node:stream/consumers";
				const { code } = await transformWithEsbuild(await text(process.stdin), "pdf.mjs", { minify: true });
				process.stdout.write(code);`,
			],
			{ input: LEGACY, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
		expect(minify.status).toBe(0);
		const minified = minify.stdout;
		expect(minified.length).toBeLessThan(LEGACY.length / 2);
		expect(minified).not.toContain("target: 'Map'");
		expect(
			lines17(dist({ "classicy.umd.js": minified, [PDF_CHUNK]: minified })).err,
		).toEqual([]);
	}, 60_000);

	it("invariant 17 fails on pdf.js's modern build, in the UMD bundle or an ES chunk", () =>
		expect(
			lines17(dist({ "classicy.umd.js": MODERN, [PDF_CHUNK]: MODERN })).err,
		).toEqual([MODERN_MESSAGE(UMD), MODERN_MESSAGE(PDF)]));

	it("fails when no ES chunk carries the pdf.js API, or the UMD bundle carries none", () => {
		expect(lines17(dist({ [PDF_CHUNK]: "export{};" })).err).toEqual([
			`dist: no ES chunk other than ${ES} carries the pdf.js API -> PDFViewerDocument loads pdfjs-dist/legacy/build/pdf.mjs with import(), in a lazy chunk.`,
		]);
		expect(lines17(dist({ "classicy.umd.js": "var a=1;" })).err).toEqual([
			`${UMD}: carries no pdf.js API -> the UMD bundle carries pdfjs-dist/legacy/build/pdf.mjs inline (PDFViewerDocument's import()).`,
		]);
	});

	it("invariant 17 fails on a lazy chunk that imports the ES entry", () => {
		// 3.7's worker chunk before the fix: its first line.
		const STATIC = `import { classicyLog as fr } from "./classicy.es.js";\nvar v=1;export{v};`;
		expect(lines17(dist({ [WORKER_CHUNK]: STATIC })).err).toEqual([
			ENTRY_MESSAGE(LAZY, "./classicy.es.js"),
		]);
		expect(
			lines17(
				dist({
					[WORKER_CHUNK]: `var v=1;export{v};export { a as b } from "./classicy.es.js";`,
					"other-Cx1.js": `import "./classicy.es.js";const l=()=>import("./classicy.es.js");export{l};`,
				}),
			).err,
		).toEqual([
			ENTRY_MESSAGE(LAZY, "./classicy.es.js"),
			ENTRY_MESSAGE(join("dist", "other-Cx1.js"), "./classicy.es.js"),
		]);
	});

	it("passes a chunk that imports another chunk", () =>
		expect(
			lines17(
				dist({
					[WORKER_CHUNK]: `import { i } from "./${PDF_CHUNK}";export{i};`,
				}),
			).err,
		).toEqual([]));
});

// Invariant 18 (plan 0019-fb7 §6.6): both core entry bundles embed
// assets/img/ui/earth.webp byte for byte, as the only data:image/webp in
// them, so the image plugin never re-encoded it. Whole-dist mode, reading
// assets/img/ui/earth.webp from the working directory.
describe("check-dist-imports.mjs invariant 18: the embedded earth WebP (whole dist)", () => {
	const EARTH = Buffer.from("RIFF....WEBPVP8X earth fixture bytes", "latin1");
	const uri = (bytes: Buffer) =>
		`data:image/webp;base64,${bytes.toString("base64")}`;
	const earth18 = (files: Record<string, string>) => {
		const dir = join(root, `case-${run++}`);
		mkdirSync(join(dir, "dist"), { recursive: true });
		mkdirSync(join(dir, "assets", "img", "ui"), { recursive: true });
		writeFileSync(join(dir, "assets", "img", "ui", "earth.webp"), EARTH);
		for (const [file, text] of Object.entries(files))
			writeFileSync(join(dir, "dist", file), text);
		const result = spawnSync(process.execPath, [SCRIPT], {
			cwd: dir,
			encoding: "utf8",
		});
		const lines = (text: string) =>
			text.split("\n").filter((line) => line.includes("earth WebP"));
		return { out: lines(result.stdout), err: lines(result.stderr) };
	};
	const ES = join("dist", "classicy.es.js");
	const UMD = join("dist", "classicy.umd.js");

	it("invariant 18 passes when both bundles embed it byte-identical", () => {
		const bundle = `a="${uri(EARTH)}";export{a};`;
		expect(
			earth18({ "classicy.es.js": bundle, "classicy.umd.js": bundle }).err,
		).toEqual([]);
		expect(
			earth18({ "classicy.es.js": bundle, "classicy.umd.js": bundle }).out,
		).toHaveLength(1);
	});

	it("invariant 18 fails when the embedded earth WebP differs from assets/img/ui/earth.webp", () => {
		const other = `a="${uri(Buffer.concat([EARTH, Buffer.from("!")]))}";export{a};`;
		const same = `a="${uri(EARTH)}";export{a};`;
		const { err } = earth18({
			"classicy.es.js": other,
			"classicy.umd.js": same,
		});
		expect(err).toHaveLength(1);
		expect(err[0]).toContain(ES);
		expect(err[0]).toContain("assets/img/ui/earth.webp");
	});

	it("invariant 18 fails when a bundle lacks it or carries another data:image/webp", () => {
		const same = `a="${uri(EARTH)}";export{a};`;
		const extra = `${same}b="data:image/webp;base64,AAAA";`;
		const none = "export{};";
		expect(
			earth18({ "classicy.es.js": same, "classicy.umd.js": none }).err,
		).toHaveLength(1);
		expect(
			earth18({ "classicy.es.js": same, "classicy.umd.js": extra }).err[0],
		).toContain(UMD);
	});
});

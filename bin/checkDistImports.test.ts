import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
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

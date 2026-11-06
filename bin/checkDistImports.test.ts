import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PLATINUM_FONT_FACES } from "../packages/appearance/platinum/src/assets/platinumFonts.internal";
import {
	CLASSICY_PLATINUM_FONT_STYLESHEET,
	classicyFontStylesheet,
} from "./classicyFontStylesheet";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

// Invariant 7 end to end: the real bin/check-dist-imports.mjs, run in
// named-file mode on synthetic bundles. They live outside dist/, so the
// invariants that read dist/ itself (the injected stylesheet, fonts, assets)
// skip them and only the import scan and invariant 7 apply.

const SCRIPT = resolve("bin/check-dist-imports.mjs");
const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow{border:1px solid}}';
const root = mkdtempSync(join(tmpdir(), "classicy-check-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let run = 0;
/**
 * Writes the bundles (literal = the package string's JS literal, or none) and
 * any other files (path → text, e.g. `fx/classicy-platinum.css` or
 * `dist/appearance-platinum.js`), then runs the script on all of them.
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
const MISSING = /carries no non-empty @layer classicy\.package stylesheet/;

describe("check-dist-imports.mjs invariant 7 (named files)", () => {
	it("passes entry bundles that each carry the package stylesheet", () => {
		expect(check(both(PACKAGE))).toEqual({ status: 0, stderr: "" });
		expect(check(both(`${CLASSICY_LAYER_ORDER}\n${PACKAGE}`)).status).toBe(0);
	});

	it("does not require a package stylesheet in a non-entry bundle", () =>
		expect(check({ ...both(PACKAGE), "pdf-DcHjwfzs.js": null }).status).toBe(
			0,
		));

	it.each([
		["missing package string", null, [MISSING]],
		["the bare layer statement", "@layer classicy.package;", [MISSING]],
		["an empty block", "@layer classicy.package{}", [MISSING]],
		[
			"a block without the data-classicy-appearance scope",
			"@layer classicy.package{.classicyWindow{border:1px solid}}",
			[MISSING],
		],
		[
			"a block nested in classicy.base",
			`@layer classicy.base{${PACKAGE}}`,
			[/nested inside classicy\.base/, MISSING],
		],
		[
			"a stray rule after the block",
			`${PACKAGE}.leak{color:red}`,
			[/not exactly one @layer classicy\.package block/, MISSING],
		],
	])("fails on %s, in each entry bundle", (_name, css, messages) => {
		const { status, stderr } = check(both(css));
		expect(status).toBe(1);
		for (const bundle of ["classicy.es.js", "classicy.umd.js"]) {
			const lines = stderr
				.split("\n")
				.filter((line) => line.startsWith(join("fx", bundle)));
			expect(lines, bundle).toHaveLength(messages.length);
			for (const [i, message] of messages.entries())
				expect(lines[i]).toMatch(message);
		}
	});

	it("fails when only one entry bundle lost its stylesheet", () => {
		const { status, stderr } = check({
			"classicy.es.js": literal(PACKAGE),
			"classicy.umd.js": literal("@layer classicy.package{}"),
		});
		expect(status).toBe(1);
		expect(stderr.trim().split("\n")).toEqual([
			expect.stringMatching(
				new RegExp(
					`^${join("fx", "classicy\\.umd\\.js")}: .*${MISSING.source}`,
				),
			),
		]);
	});
});

// R5: the package stylesheet strict-CSP hosts link, emitted from the string
// the entry bundles inject.
describe("check-dist-imports.mjs invariant 7: dist/classicy-platinum.css (named files)", () => {
	const FILE = join("fx", "classicy-platinum.css");
	const withFile = (css: string) => check(both(PACKAGE), { [FILE]: css });

	it("passes the order statement then the bundles' package string", () =>
		expect(withFile(`${CLASSICY_LAYER_ORDER}\n${PACKAGE}`)).toEqual({
			status: 0,
			stderr: "",
		}));

	it.each([
		["without the layer order statement", PACKAGE, /must be "@layer/],
		[
			"an empty block",
			`${CLASSICY_LAYER_ORDER}\n@layer classicy.package{}`,
			/carries no non-empty/,
		],
		[
			"a different stylesheet",
			`${CLASSICY_LAYER_ORDER}\n${PACKAGE.replace("1px", "2px")}`,
			/differs from the package stylesheet .*classicy\.es\.js injects/,
		],
	])("fails on a file %s", (_name, css, message) => {
		const { status, stderr } = withFile(css);
		expect(status).toBe(1);
		expect(stderr).toMatch(message);
		expect(
			stderr
				.trim()
				.split("\n")
				.every((line) => line.startsWith(FILE)),
		).toBe(true);
	});
});

// R4: `@classicy/classicy/appearance/platinum` resolves to an emitted no-op shim (the
// main bundle already registers Platinum), checked like dist/fonts.js. Each
// shim's .d.ts is checked with it: the exports map's `types` condition points
// at it, so without it a TypeScript consumer's side-effect import stops
// resolving under `noUncheckedSideEffectImports`.
describe.each([
	"appearance-platinum",
	"fonts",
])("check-dist-imports.mjs invariant 4: dist/%s.js and .d.ts (named files)", (name) => {
	const SHIM = join("dist", `${name}.js`);
	const TYPES = join("dist", `${name}.d.ts`);
	const DECLARATION = "// No-op side-effect module.\nexport {};\n";

	it("passes a self-contained no-op with its declaration", () =>
		expect(
			check(both(PACKAGE), {
				[SHIM]: "// Deprecated no-op.\n",
				[TYPES]: DECLARATION,
			}),
		).toEqual({ status: 0, stderr: "" }));

	it("fails when it gains an import", () => {
		const { status, stderr } = check(both(PACKAGE), {
			[SHIM]: 'import "./classicy.es.js";\n',
			[TYPES]: DECLARATION,
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${SHIM}: has an import/require; it must stay a self-contained script.`,
		);
	});

	it("fails when its declaration is missing", () => {
		const { status, stderr } = check(both(PACKAGE), {
			[SHIM]: "// Deprecated no-op.\n",
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${TYPES}: missing -> check injectCssPlugin in vite.config.ts.`,
		);
	});

	it("fails when its declaration gains an import", () => {
		const { status, stderr } = check(both(PACKAGE), {
			[SHIM]: "// Deprecated no-op.\n",
			[TYPES]: 'import "./types/src/index";\nexport {};\n',
		});
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${TYPES}: has an import/require; it must stay a self-contained declaration.`,
		);
	});
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

// Invariant 12: the static font stylesheet strict-CSP hosts link declares the
// runtime's faces, each pointing at a file next to it in assets/.
describe("check-dist-imports.mjs invariant 12: the Platinum font stylesheet (named files)", () => {
	const FILE = join("dist", CLASSICY_PLATINUM_FONT_STYLESHEET);
	const css = classicyFontStylesheet(
		PLATINUM_FONT_FACES,
		(face) => `assets/${face.file}.woff2`,
	);
	const fonts = (skip?: string) =>
		Object.fromEntries(
			PLATINUM_FONT_FACES.filter((face) => face.file !== skip).map((face) => [
				join("dist", "assets", `${face.file}.woff2`),
				"wOF2",
			]),
		);

	it("passes the generated stylesheet with every font beside it", () =>
		expect(check({}, { [FILE]: css, ...fonts() })).toEqual({
			status: 0,
			stderr: "",
		}));

	it("fails when a face's font file is missing", () => {
		const { status, stderr } = check(
			{},
			{ [FILE]: css, ...fonts("Monaco-normal-normal") },
		);
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${FILE}: url("assets/Monaco-normal-normal.woff2") does not resolve to a file in dist/assets.`,
		);
	});

	it("fails when a face is missing", () => {
		const { status, stderr } = check(
			{},
			{
				[FILE]: css
					.split("\n")
					.filter((rule) => !rule.includes('"Monaco"'))
					.join("\n"),
				...fonts(),
			},
		);
		expect(status).toBe(1);
		expect(stderr.trim()).toBe(
			`${FILE}: no @font-face for "Monaco" normal normal, which the runtime registers.`,
		);
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

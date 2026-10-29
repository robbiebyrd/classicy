import { describe, expect, it } from "vitest";
import {
	CLASSICY_ENTRY_BUNDLES,
	CLASSICY_PACKAGE_STYLESHEETS,
	classicyPackageStylesheets,
	findClassicyPackageCssProblems,
	isSingleClassicyLayerBlock,
	requiredClassicyPackageBundles,
	requiredClassicyPackageStylesheets,
} from "./classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

// Minified package CSS as Vite ships an `?inline` stylesheet: a JS string.
const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyButton{color:red}}';
const BASE = "@layer classicy.base{.classicyButton{display:flex}}";
const bundle = (literal: string) => `var a=1;const css=${literal};export{css};`;
const js = (css: string) => JSON.stringify(css);
const ORDER = CLASSICY_LAYER_ORDER;

const check = (
	input: Partial<Parameters<typeof findClassicyPackageCssProblems>[0]>,
) =>
	findClassicyPackageCssProblems({
		layerOrder: CLASSICY_LAYER_ORDER,
		bundles: [],
		baseStylesheets: [],
		packageStylesheets: [],
		...input,
	});

describe("isSingleClassicyLayerBlock", () => {
	it("accepts exactly one block of the layer, after an optional charset and order statement", () => {
		expect(isSingleClassicyLayerBlock(PACKAGE, "classicy.package", ORDER)).toBe(
			true,
		);
		expect(
			isSingleClassicyLayerBlock(
				`@charset "UTF-8";\n${CLASSICY_LAYER_ORDER}\n${PACKAGE}\n`,
				"classicy.package",
				ORDER,
			),
		).toBe(true);
	});

	it("rejects other layers, extra rules, two blocks and unbalanced braces", () => {
		for (const css of [
			BASE,
			`${PACKAGE}.b{}`,
			`.b{}${PACKAGE}`,
			`${PACKAGE}${PACKAGE}`,
			"@layer classicy.package{.a{}",
			"@layer classicy.packages{.a{}}",
			"@layer classicy.package.x{.a{}}",
			"",
		])
			expect(isSingleClassicyLayerBlock(css, "classicy.package", ORDER)).toBe(
				false,
			);
	});

	it("skips braces inside strings and comments", () =>
		expect(
			isSingleClassicyLayerBlock(
				'@layer classicy.package{.a::before{content:"}\\"}"}/* } */.b{}}',
				"classicy.package",
				ORDER,
			),
		).toBe(true));
});

describe("isSingleClassicyLayerBlock: prelude and trailer", () => {
	const single = (css: string) =>
		isSingleClassicyLayerBlock(css, "classicy.package", ORDER);

	// Sass keeps top-level loud comments in expanded output, which is what the
	// layer plugin sees on the dev server and in Storybook.
	it("accepts top-level comments before and after the block", () => {
		expect(single(`/* Platinum */\n${PACKAGE}\n/* end */\n`)).toBe(true);
		expect(
			single(
				`@charset "UTF-8";\n/* a */\n${ORDER}\n/* b */\n${PACKAGE}/* c */`,
			),
		).toBe(true);
		// An unterminated comment is not a comment.
		expect(single(`${PACKAGE}\n/* end`)).toBe(false);
	});

	it("accepts a BOM-prefixed block (Sass compressed output)", () =>
		expect(single(`\uFEFF${PACKAGE}`)).toBe(true));

	it("rejects a foreign @layer statement before the block", () => {
		expect(single(`@layer x;\n${PACKAGE}`)).toBe(false);
		expect(single(`@layer classicy.base, classicy.package;\n${PACKAGE}`)).toBe(
			false,
		);
	});

	it("rejects two order statements", () =>
		expect(single(`${ORDER}\n${ORDER}\n${PACKAGE}`)).toBe(false));
});

describe("findClassicyPackageCssProblems (check-dist invariant 7)", () => {
	it("passes when no package CSS has shipped yet", () =>
		expect(
			check({
				bundles: [{ file: "dist/classicy.es.js", source: bundle(js(BASE)) }],
				baseStylesheets: [
					{
						file: "dist/classicy.css",
						css: `${CLASSICY_LAYER_ORDER}\n${BASE}`,
					},
				],
			}),
		).toEqual([]));

	it("passes a bundle whose package string is one classicy.package block", () => {
		for (const literal of [
			js(PACKAGE),
			js(`${CLASSICY_LAYER_ORDER}\n${PACKAGE}`),
			`'${PACKAGE.replace(/"/g, '\\"')}'`,
			`\`${PACKAGE}\``,
		])
			expect(
				check({
					bundles: [{ file: "dist/classicy.es.js", source: bundle(literal) }],
				}),
			).toEqual([]);
	});

	it("applies the same prelude rule to bundle strings and package files", () => {
		expect(
			check({
				bundles: [
					{
						file: "dist/classicy.es.js",
						source: bundle(js(`@layer x;\n${PACKAGE}`)),
					},
				],
			}),
		).toHaveLength(1);
		expect(
			check({
				bundles: [
					{
						file: "dist/classicy.es.js",
						source: bundle(js(`${ORDER}\n${ORDER}\n${PACKAGE}`)),
					},
				],
			}),
		).toHaveLength(1);
		expect(
			check({
				packageStylesheets: [
					{
						file: "dist/classicy-platinum.css",
						css: `${ORDER}\n/* Platinum */\n${PACKAGE}\n`,
					},
				],
			}),
		).toEqual([]);
		for (const css of [
			`${ORDER}\n${ORDER}\n${PACKAGE}`,
			`@layer x;\n${PACKAGE}`,
		])
			expect(
				check({
					packageStylesheets: [{ file: "dist/classicy-platinum.css", css }],
				}),
			).toHaveLength(1);
	});

	it("passes a package stylesheet file that starts with the layer order", () =>
		expect(
			check({
				packageStylesheets: [
					{
						file: "dist/classicy-platinum.css",
						css: `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
					},
				],
			}),
		).toEqual([]));

	// Tamper tests: each breaks the invariant one way and must be reported.
	it("reports a package block nested inside classicy.base", () => {
		const problems = check({
			bundles: [
				{
					file: "dist/classicy.es.js",
					source: bundle(js(`@layer classicy.base {\n${PACKAGE}\n}`)),
				},
			],
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(
			/^dist\/classicy\.es\.js: .*nested inside classicy\.base/,
		);
	});

	it("reports a package block embedded after other CSS in one string", () => {
		const problems = check({
			bundles: [
				{
					file: "dist/classicy.umd.js",
					source: bundle(js(`${BASE}${PACKAGE}`)),
				},
			],
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/^dist\/classicy\.umd\.js: .*does not start/);
	});

	it("reports a package string that is not exactly one block", () => {
		const problems = check({
			bundles: [
				{
					file: "dist/classicy.es.js",
					source: bundle(js(`${PACKAGE}.leak{}`)),
				},
			],
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(
			/not exactly one @layer classicy\.package block/,
		);
	});

	it("reports package look in a base stylesheet", () => {
		for (const css of [
			`${CLASSICY_LAYER_ORDER}\n${BASE}${PACKAGE}`,
			`${CLASSICY_LAYER_ORDER}\n@layer classicy.base{.classicyDesktop[data-classicy-appearance=platinum] .a{}}`,
		]) {
			const problems = check({
				baseStylesheets: [{ file: "dist/classicy.css", css }],
			});
			expect(problems).toHaveLength(1);
			expect(problems[0]).toMatch(/^dist\/classicy\.css: .*package/);
		}
	});

	// Mandatory since 4.2 (Platinum ships its look): each entry bundle named
	// in `requiredBundles` must carry a non-empty package stylesheet.
	describe("required bundles", () => {
		const required = (file: string, literal: string | null) =>
			check({
				bundles: [
					{
						file,
						source: bundle(literal ?? js(BASE)),
					},
				],
				requiredBundles: [file],
			});
		const MISSING =
			/^dist\/classicy\.es\.js: carries no non-empty @layer classicy\.package stylesheet/;

		it("passes a bundle carrying one non-empty package block", () => {
			expect(required("dist/classicy.es.js", js(PACKAGE))).toEqual([]);
			expect(
				required("dist/classicy.umd.js", js(`${ORDER}\n${PACKAGE}`)),
			).toEqual([]);
		});

		it("reports a bundle with no package stylesheet", () => {
			const problems = required("dist/classicy.es.js", null);
			expect(problems).toHaveLength(1);
			expect(problems[0]).toMatch(MISSING);
		});

		it("reports the empty forms: a layer statement or an empty block", () => {
			for (const css of [
				"@layer classicy.package;",
				"@layer classicy.package{}",
				"@layer classicy.package {\n}",
				"@layer classicy.package{/* empty */}",
				`${ORDER}\n@layer classicy.package {}`,
			]) {
				const problems = required("dist/classicy.es.js", js(css));
				expect(problems, css).toHaveLength(1);
				expect(problems[0], css).toMatch(MISSING);
			}
		});

		it("does not count a package block nested in classicy.base", () => {
			const problems = required(
				"dist/classicy.es.js",
				js(`@layer classicy.base {\n${PACKAGE}\n}`),
			);
			expect(problems).toHaveLength(2);
			expect(problems[0]).toMatch(/nested inside classicy\.base/);
			expect(problems[1]).toMatch(MISSING);
		});

		it("does not count a package string with a stray rule", () => {
			const problems = required("dist/classicy.es.js", js(`${PACKAGE}.leak{}`));
			expect(problems).toHaveLength(2);
			expect(problems[0]).toMatch(/not exactly one @layer classicy\.package/);
			expect(problems[1]).toMatch(MISSING);
		});

		// Only a package's own stylesheet counts: one scoped under
		// `[data-classicy-appearance=…]`, not any non-empty block (a sample
		// string elsewhere in shipped code would otherwise satisfy the check).
		it("does not count a non-empty package block without the data-classicy-appearance scope", () => {
			for (const css of [
				"@layer classicy.package{.classicyButton{color:red}}",
				"@layer classicy.package{.classicyDesktop .classicyButton{color:red}}",
				`${ORDER}\n@layer classicy.package {\n  .a { color: red; }\n}`,
			]) {
				const problems = required("dist/classicy.es.js", js(css));
				expect(problems, css).toHaveLength(1);
				expect(problems[0], css).toMatch(MISSING);
			}
		});

		it("reports a required bundle that was not given", () => {
			const problems = check({ requiredBundles: ["dist/classicy.umd.js"] });
			expect(problems).toEqual([
				expect.stringMatching(
					/^dist\/classicy\.umd\.js: carries no non-empty @layer classicy\.package stylesheet/,
				),
			]);
		});
	});

	it("reports a package stylesheet file without the order statement or with extra rules", () => {
		for (const css of [
			PACKAGE,
			`${CLASSICY_LAYER_ORDER}\n${PACKAGE}.leak{}`,
			`${CLASSICY_LAYER_ORDER}\n@layer classicy.base{${PACKAGE}}`,
		]) {
			const problems = check({
				packageStylesheets: [{ file: "dist/classicy-platinum.css", css }],
			});
			expect(problems).toHaveLength(1);
			expect(problems[0]).toMatch(/^dist\/classicy-platinum\.css: /);
		}
	});
});

// check-dist-imports.mjs requires the entry bundles: by default the two in
// dist/, and with named files only the entry bundles among them.
describe("requiredClassicyPackageBundles", () => {
	const inDist = (file: string) => `dist/${file}`;

	it("names the two entry bundles", () =>
		expect(CLASSICY_ENTRY_BUNDLES).toEqual([
			"classicy.es.js",
			"classicy.umd.js",
		]));

	it("requires both entry bundles in dist/ when no file is named", () =>
		expect(requiredClassicyPackageBundles([], inDist)).toEqual([
			"dist/classicy.es.js",
			"dist/classicy.umd.js",
		]));

	it("requires only the named entry bundles, by basename, wherever they are", () => {
		expect(
			requiredClassicyPackageBundles(
				[
					"dist/classicy.es.js",
					"dist/classicy.css",
					"dist/pdf-DcHjwfzs.js",
					"fixtures\\classicy.umd.js",
				],
				inDist,
			),
		).toEqual(["dist/classicy.es.js", "fixtures\\classicy.umd.js"]);
		expect(
			requiredClassicyPackageBundles(
				["dist/fonts.js", "dist/classicy.css"],
				inDist,
			),
		).toEqual([]);
		// A name only ending like an entry bundle is not one.
		expect(
			requiredClassicyPackageBundles(["dist/my-classicy.es.js"], inDist),
		).toEqual([]);
	});
});

// R5: strict-CSP hosts link dist/classicy-platinum.css, emitted from the very
// string the entry bundles inject (the `platinum.scss?inline` module).
describe("required package stylesheet files (R5)", () => {
	const FILE = "dist/classicy-platinum.css";
	const bundles = (literal: string) =>
		["dist/classicy.es.js", "dist/classicy.umd.js"].map((file) => ({
			file,
			source: bundle(literal),
		}));
	const required = (css: string | null, literal = js(PACKAGE)) =>
		check({
			bundles: bundles(literal),
			packageStylesheets: css === null ? [] : [{ file: FILE, css }],
			requiredBundles: ["dist/classicy.es.js", "dist/classicy.umd.js"],
			requiredPackageStylesheets: [FILE],
		});

	it("passes the order statement then the bundles' own package string", () => {
		expect(required(`${ORDER}\n${PACKAGE}`)).toEqual([]);
		expect(required(`@charset "UTF-8";\n${ORDER}\n${PACKAGE}\n`)).toEqual([]);
	});

	it("reports a missing file", () =>
		expect(required(null)).toEqual([
			expect.stringMatching(/^dist\/classicy-platinum\.css: missing/),
		]));

	it("reports an empty or unscoped file", () => {
		for (const block of [
			"@layer classicy.package{}",
			"@layer classicy.package{.classicyButton{color:red}}",
		]) {
			const problems = required(`${ORDER}\n${block}`, js(block));
			expect(problems, block).toContainEqual(
				expect.stringMatching(
					/^dist\/classicy-platinum\.css: carries no non-empty/,
				),
			);
		}
	});

	it("reports a file that differs from the string the bundles inject", () => {
		const problems = required(
			`${ORDER}\n${PACKAGE.replace("color:red", "color:blue")}`,
		);
		expect(problems).toEqual([
			expect.stringMatching(
				/^dist\/classicy-platinum\.css: differs from the package stylesheet dist\/classicy\.es\.js injects/,
			),
			expect.stringMatching(
				/^dist\/classicy-platinum\.css: differs from the package stylesheet dist\/classicy\.umd\.js injects/,
			),
		]);
	});
});

describe("requiredClassicyPackageStylesheets", () => {
	const inDist = (file: string) => `dist/${file}`;

	it("names Platinum's file", () =>
		expect(CLASSICY_PACKAGE_STYLESHEETS).toEqual(["classicy-platinum.css"]));

	it("requires it in dist/ when no file is named, else only when named", () => {
		expect(requiredClassicyPackageStylesheets([], inDist)).toEqual([
			"dist/classicy-platinum.css",
		]);
		expect(
			requiredClassicyPackageStylesheets(
				["dist/classicy.es.js", "fx/classicy-platinum.css"],
				inDist,
			),
		).toEqual(["fx/classicy-platinum.css"]);
		expect(
			requiredClassicyPackageStylesheets(["dist/classicy.css"], inDist),
		).toEqual([]);
	});
});

// What injectCssPlugin emits as dist/classicy-<name>.css: the compiled text of
// each package stylesheet module (`src/Appearance/<Package>/styles/<name>.scss?inline`).
describe("classicyPackageStylesheets", () => {
	const ID = "/repo/src/Appearance/Platinum/styles/platinum.scss?inline";
	const module = (id: string, css: string) => ({
		id,
		code: `export default ${JSON.stringify(css)}`,
	});

	it("maps a package's ?inline stylesheet to classicy-<name>.css", () =>
		expect(
			classicyPackageStylesheets([
				module(ID, PACKAGE),
				module(
					"C:\\repo\\src\\Appearance\\Irix-Dark\\styles\\irix-dark.scss?inline",
					"@layer classicy.package{}",
				),
			]),
		).toEqual([
			{ fileName: "classicy-platinum.css", css: PACKAGE },
			{
				fileName: "classicy-irix-dark.css",
				css: "@layer classicy.package{}",
			},
		]));

	it("ignores every other module", () =>
		expect(
			classicyPackageStylesheets([
				module("/repo/src/Appearance/Platinum/styles/platinum.scss", ""),
				module("/repo/src/Appearance/Platinum/styles/_mixins.scss?inline", ""),
				module("/repo/src/SystemFolder/Button/ClassicyButton.scss?inline", ""),
				module(
					"/repo/node_modules/x/src/Appearance/A/styles/a.scss?inline",
					"",
				),
				{ id: "\0virtual", code: null },
			]),
		).toEqual([]));

	it("throws when a package stylesheet module is not a string export", () =>
		expect(() =>
			classicyPackageStylesheets([{ id: ID, code: "export default css" }]),
		).toThrow(/platinum\.scss\?inline/));

	it("throws when two packages would write the same file", () =>
		expect(() =>
			classicyPackageStylesheets([
				module(ID, PACKAGE),
				module(
					"/repo/src/Appearance/Other/styles/platinum.scss?inline",
					PACKAGE,
				),
			]),
		).toThrow(/classicy-platinum\.css/));
});

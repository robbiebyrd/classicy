import { describe, expect, it } from "vitest";
import {
	findClassicyPackageCssProblems,
	isSingleClassicyLayerBlock,
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

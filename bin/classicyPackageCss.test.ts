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
		expect(isSingleClassicyLayerBlock(PACKAGE, "classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(
				`@charset "UTF-8";\n${CLASSICY_LAYER_ORDER}\n${PACKAGE}\n`,
				"classicy.package",
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
			expect(isSingleClassicyLayerBlock(css, "classicy.package")).toBe(false);
	});

	it("skips braces inside strings and comments", () =>
		expect(
			isSingleClassicyLayerBlock(
				'@layer classicy.package{.a::before{content:"}\\"}"}/* } */.b{}}',
				"classicy.package",
			),
		).toBe(true));
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

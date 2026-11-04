import { describe, expect, it } from "vitest";
import {
	findClassicyPlainCssFiles,
	findClassicyUnlayeredCss,
} from "./classicyBaseCss";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

const unlayered = (css: string) =>
	findClassicyUnlayeredCss("dist/classicy.css", css, CLASSICY_LAYER_ORDER);

describe("findClassicyUnlayeredCss", () => {
	it("passes the charset, the order statement and classicy.base blocks", () => {
		expect(
			unlayered(
				`@charset "UTF-8";${CLASSICY_LAYER_ORDER}\n@layer classicy.base{.a{color:red}}/* x */@layer classicy.base {\n.b{content:"}"}\n}\n`,
			),
		).toEqual([]);
		// The injected text: the order statement first, then the charset.
		expect(
			unlayered(
				`${CLASSICY_LAYER_ORDER}\n@charset "UTF-8";@layer classicy.base{.a{color:red}}`,
			),
		).toEqual([]);
	});

	it.each([
		[
			"a rule between two blocks",
			"@layer classicy.base{.a{}}.x{color:red}@layer classicy.base{.b{}}",
			".x{color:red}",
		],
		[
			"a rule after the last block",
			"@layer classicy.base{.a{}}.x{color:red}",
			".x{color:red}",
		],
		[
			"a rule before the first block",
			".x{color:red}@layer classicy.base{.a{}}",
			".x{color:red}",
		],
		[
			"another layer's block",
			"@layer classicy.base{.a{}}@layer classicy.package{.x{}}",
			"@layer classicy.package{.x{}}",
		],
		[
			"a sublayer of classicy.base",
			"@layer classicy.base.x{.a{}}",
			"@layer classicy.base.x{.a{}}",
		],
		[
			"a look-alike layer name",
			"@layer classicy.basement{.a{}}",
			"@layer classicy.basement{.a{}}",
		],
		[
			"an unlayered @media block",
			"@media print{.x{display:none}}",
			"@media print{.x{display:none}}",
		],
		["an @import", '@import url("x.css");', '@import url("x.css");'],
		["another @layer statement", "@layer host;", "@layer host;"],
	])("fails %s", (_name, css, item) => {
		const problems = unlayered(css);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain(`"${item}"`);
		expect(problems[0]).toMatch(/^dist\/classicy\.css: unlayered CSS/);
	});
});

describe("findClassicyPlainCssFiles", () => {
	it("passes empty, blank and comment-only files", () =>
		expect(
			findClassicyPlainCssFiles([
				{ path: "src/index.css", text: "" },
				{ path: "src/a.css", text: "﻿ \n\t" },
				{ path: "src/b.css", text: "/* nothing here */\n" },
			]),
		).toEqual([]));

	it("fails a file with any CSS in it, naming it", () =>
		expect(
			findClassicyPlainCssFiles([
				{ path: "src/index.css", text: "" },
				{ path: "src/x.css", text: "/* a */ .x { color: red }" },
			]),
		).toEqual([expect.stringMatching(/^src\/x\.css: a plain \.css file/)]));
});

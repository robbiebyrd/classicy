import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ClassicyPixelLiteral,
	checkMultiplierAllowlist,
	checkPixelLiteralAllowlist,
	scanMultipliers,
	scanMultipliersInSource,
	scanPixelLiterals,
	scanPixelLiteralsInSource,
} from "./check-pixel-literals.ts";

const lit: ClassicyPixelLiteral = {
	file: "a.scss",
	line: 1,
	text: "3px",
	kind: "bare",
};

describe("scanPixelLiteralsInSource", () => {
	it("counts a bare literal beside a var() read", () =>
		expect(
			scanPixelLiteralsInSource("a { padding: var(--x) 3px; }", "f.scss"),
		).toEqual([{ file: "f.scss", line: 1, text: "3px", kind: "bare" }]));

	it("classifies a var() fallback", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { gap: var(--button-gap, 12px); }",
				"f.scss",
			)[0].kind,
		).toBe("fallback"));

	it("ignores 0px, infinity, media preludes, comments and url payloads", () =>
		expect(
			scanPixelLiteralsInSource(
				"/* 245px */\n// 4px\n@media (max-width: 480px) {\n b { bottom: max(0px, 1%); border-radius: calc(infinity * 1px); background: url(data:image/svg+xml;base64,AAAApxAAA); }\n}",
				"f.scss",
			),
		).toEqual([]));

	it("does not match inside identifiers", () =>
		expect(
			scanPixelLiteralsInSource("$cp-wheel-max: 240; .x10px { }", "f.scss"),
		).toEqual([]));

	// H-R3: a literal is a fallback only after its own var()'s comma; the
	// px-rect arguments that follow a closed var() are bare.
	it("px-rect args beside a var() are bare", () =>
		expect(
			scanPixelLiteralsInSource(
				"$a: classicy-px-rect(var(--color-white), 1px, calc(100% - 3px), 1px);",
				"f.scss",
			).map((found) => `${found.text} ${found.kind}`),
		).toEqual(["1px bare", "3px bare", "1px bare"]));

	it("classifies a literal nested inside a fallback's own call as a fallback", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { width: var(--x, calc(100% - 3px)); margin: calc(var(--y, 2px) + 4px); }",
				"f.scss",
			).map((found) => `${found.text} ${found.kind}`),
		).toEqual(["3px fallback", "2px fallback", "4px bare"]));

	it("strips multi-line block comments and keeps line numbers", () =>
		expect(
			scanPixelLiteralsInSource(
				"/* a block\n   comment 12px\n*/ a { top: 5px; }\nb { left: -6px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["3 5px", "4 -6px"]));

	it("strips // comments but spares the :// in a URL", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { top: 2px; } // 9px\nb { background: url(http://x.test/a\\(1\\)/7px.png) 3px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 2px", "2 3px"]));

	it("strips url() payloads with nested parentheses and quotes", () =>
		expect(
			scanPixelLiteralsInSource(
				'a { mask: var(--m, url(\'data:image/svg+xml,<svg width="8px" style="x:calc(1px)"/>\')) 4px; }',
				"f.scss",
			).map((found) => `${found.text} ${found.kind}`),
		).toEqual(["4px bare"]));

	// H 1.1 review, Minor 1: a url() body never swallows the rest of the file.
	it("honors backslash escapes in an unquoted url body", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { background: url(a\\(b.png) 4px; }\nb { top: 5px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 4px", "2 5px"]));

	it("ends an unquoted url body at its first unescaped )", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { background: url(a(b.png) 4px; }\nb { top: 5px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 4px", "2 5px"]));

	it("ends an unclosed url at the end of its line", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { background: url(x.png 3px;\nb { top: 5px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 5px"]));

	it("ends an unquoted url body with a stray quote at its )", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { mask: url(data:image/svg+xml,<svg>it's</svg>) 2px; }\nb { top: 5px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 2px", "2 5px"]));

	it("ends a quoted url body after its string, even with a stray quote inside", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { mask: url('data:image/svg+xml,<svg>it's</svg>) 2px; }\nb { top: 5px; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 2px", "2 5px"]));

	// Minor 2: every way CSS writes a pixel length.
	it("matches uppercase units, leading-dot decimals and exponents", () =>
		expect(
			scanPixelLiteralsInSource(
				"a { top: 4PX; left: .5px; width: 1e3px; right: -.25Px; margin: 0PX .0px 0e2px; }",
				"f.scss",
			).map((found) => found.text),
		).toEqual(["4PX", ".5px", "1e3px", "-.25Px"]));

	it("splits a subtraction written without spaces into two literals", () =>
		expect(
			scanPixelLiteralsInSource("a { top: calc(10px-3px); }", "f.scss").map(
				(found) => found.text,
			),
		).toEqual(["10px", "-3px"]));

	// Minor 4: the parenthesis stack spans lines.
	it("classifies a fallback that starts on the next line", () =>
		expect(
			scanPixelLiteralsInSource(
				"a {\n  width: var(--a,\n    4px);\n  top: 2px;\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text} ${found.kind}`),
		).toEqual(["3 4px fallback", "4 2px bare"]));

	it("counts Sass declarations, interpolation and package constants", () =>
		expect(
			scanPixelLiteralsInSource(
				"$cell: 22px;\na { width: #{$cell + 2px}; --platinum-gap: 1.5px; }",
				"src/Appearance/Platinum/styles/_x.scss",
			).map((found) => `${found.line} ${found.text} ${found.kind}`),
		).toEqual(["1 22px bare", "2 2px bare", "2 1.5px bare"]));
});

describe("checkPixelLiteralAllowlist", () => {
	it("ratchet: fewer than listed is a failure", () =>
		expect(
			checkPixelLiteralAllowlist(new Map([["a.scss", [lit]]]), {
				"a.scss": 2,
			}),
		).toEqual(["tighten the allowlist for a.scss: 1 < 2"]));

	it("ratchet: unlisted file with literals fails with file:line text", () =>
		expect(
			checkPixelLiteralAllowlist(new Map([["a.scss", [lit]]]), {}),
		).toEqual(["a.scss:1 3px"]));

	it("ratchet: an exact count passes", () =>
		expect(
			checkPixelLiteralAllowlist(new Map([["a.scss", [lit]]]), {
				"a.scss": 1,
			}),
		).toEqual([]));

	// Minor 5: an entry is a positive whole count; a file at 0 is deleted.
	it("ratchet: rejects a 0 entry and a count that is not a whole number", () =>
		expect(
			checkPixelLiteralAllowlist(new Map([["a.scss", [lit]]]), {
				"a.scss": 1,
				"gone.scss": 0,
				"b.scss": 1.5,
				"c.scss": "2",
				"d.scss": -1,
			}),
		).toEqual([
			"invalid allowlist entry for b.scss: 1.5 (a count must be a positive whole number)",
			'invalid allowlist entry for c.scss: "2" (a count must be a positive whole number)',
			"invalid allowlist entry for d.scss: -1 (a count must be a positive whole number)",
			"invalid allowlist entry for gone.scss: 0 (a file with no literals left must be removed from the list)",
		]));

	it("ratchet: a listed file that is gone must be removed", () =>
		expect(checkPixelLiteralAllowlist(new Map(), { "gone.scss": 3 })).toEqual([
			"tighten the allowlist for gone.scss: 0 < 3",
		]));
});

describe("scanPixelLiterals", () => {
	it("scanPixelLiterals skips savers", () =>
		expect(
			[...scanPixelLiterals(process.cwd()).keys()].some((f) =>
				f.includes("/savers/"),
			),
		).toBe(false));

	// H-R1: the gate runs as a test over src as well as from `pnpm lint`.
	it("the repository's SCSS matches bin/pixel-literal-allowlist.json", () =>
		expect(
			checkPixelLiteralAllowlist(
				scanPixelLiterals(process.cwd()),
				JSON.parse(readFileSync("bin/pixel-literal-allowlist.json", "utf8")),
			),
		).toEqual([]));
});

// H 6.2 (H-R6): a theme variable scaled by an unnamed number is a proportion
// with no name. Sites are held by their own ratchet, whose every entry says
// why its sites are geometry rather than a role.
describe("scanMultipliersInSource", () => {
	it("the scanner reports kind multiplier", () =>
		expect(
			scanMultipliersInSource("a { width: calc(var(--x) * 3); }", "f.scss"),
		).toEqual([
			{ file: "f.scss", line: 1, text: "var(--x) * 3", kind: "multiplier" },
		]));

	it("finds divisions, negative factors and multi-term sites", () =>
		expect(
			scanMultipliersInSource(
				"a {\n  left: calc(var(--h) / -2);\n  top: calc(50% - var(--h) / 2);\n  width: calc(100% - var(--b)*4 - var(--p));\n  margin: calc(var(--p) * .75) calc(var(--p) * -0.25);\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual([
			"2 var(--h) / -2",
			"3 var(--h) / 2",
			"4 var(--b) * 4",
			"5 var(--p) * .75",
			"5 var(--p) * -0.25",
		]));

	it("finds a parenthesized group and a number written first", () =>
		expect(
			scanMultipliersInSource(
				"a { left: calc((var(--p) * -1) / 2); top: calc(2 * var(--q)); right: calc(($a - $b) / 2); }",
				"f.scss",
			).map((found) => found.text),
		).toEqual(["(var(--p) * -1) / 2", "2 * var(--q)", "($a - $b) / 2"]));

	it("counts one site per chain, reporting the whole chain", () =>
		expect(
			scanMultipliersInSource(
				"a { padding: calc(var(--r) / 3 * 2) calc(var(--u) * 0.75 * 1.4 / 2); }",
				"f.scss",
			).map((found) => found.text),
		).toEqual(["var(--r) / 3 * 2", "var(--u) * 0.75 * 1.4 / 2"]));

	// H-R28a: a chain's factors multiply; only a product of +1 or -1 needs no
	// name.
	it("multiplies a chain's factors: a sign flip then a factor is a multiplier", () =>
		expect(
			scanMultipliersInSource(
				"a { left: calc(var(--x) * -1 / 2); top: calc(var(--x) * -1 * 2); right: calc(2 * 3 * var(--x)); bottom: calc(-1 * 2 * var(--x)); }",
				"f.scss",
			).map((found) => found.text),
		).toEqual([
			"var(--x) * -1 / 2",
			"var(--x) * -1 * 2",
			"2 * 3 * var(--x)",
			"-1 * 2 * var(--x)",
		]));

	it("does not count a chain whose factors multiply to plus or minus one", () =>
		expect(
			scanMultipliersInSource(
				"a { left: calc(var(--x) * -1); top: calc(var(--x) * 2 / 2); right: calc(var(--x) * -2 / 2); bottom: calc(var(--a) + var(--b) - var(--c)); }",
				"f.scss",
			),
		).toEqual([]));

	// H-R28a: a Sass interpolation holding a variable may hold a theme read
	// (`$thumb-w: var(--slider-thumb-width)`), so it is an operand.
	it("treats a Sass interpolation holding a variable as an operand", () =>
		expect(
			scanMultipliersInSource(
				"$h: var(--h);\na { top: calc(#{$h} / 2); left: calc(2 * #{$h}); right: calc(#{$h} * -1); width: #{1 + 2}; height: calc(#{$h} + 1px); }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 #{$h} / 2", "2 2 * #{$h}"]));

	it("reads an explicit plus sign on a factor", () =>
		expect(
			scanMultipliersInSource("a { top: calc(var(--x) * +2); }", "f.scss").map(
				(found) => found.text,
			),
		).toEqual(["var(--x) * +2"]));

	// H-R7: a sign flip needs no name.
	it("does not count sign flips", () =>
		expect(
			scanMultipliersInSource(
				"a { top: calc(var(--x) * -1); left: calc(-1 * var(--y)); right: calc((var(--a) + var(--b)) * -1); bottom: calc(var(--z) / -1); }",
				"f.scss",
			),
		).toEqual([]));

	it("ignores comments, units, ratios of variables and non-theme arithmetic", () =>
		expect(
			scanMultipliersInSource(
				"// calc(var(--a) * 4)\n/* var(--b) / 2 */\na { left: 50% + 50% * math.cos($deg * 1deg); width: calc(100% / var(--cols) * var(--aspect)); grid-area: 1 / 2; font: 12px/1.5 x; height: calc(infinity * 1px); }\n:not(.x) * { top: 1px; }",
				"f.scss",
			),
		).toEqual([]));
});

describe("checkMultiplierAllowlist", () => {
	const reason = "geometry: why these sites need no name";

	it("ratchet: one unnamed calc(var(--x) * 3) fails", () =>
		expect(
			checkMultiplierAllowlist(
				new Map([
					[
						"f.scss",
						scanMultipliersInSource(
							"a { width: calc(var(--x) * 3); }",
							"f.scss",
						),
					],
				]),
				{},
			),
		).toEqual(["f.scss:1 var(--x) * 3"]));

	it("ratchet: an exact count with reasons passes, fewer must be tightened", () => {
		const found = new Map([
			[
				"f.scss",
				scanMultipliersInSource(
					"a { width: calc(var(--x) * 3); top: calc(var(--y) / -2); }",
					"f.scss",
				),
			],
		]);
		expect(
			checkMultiplierAllowlist(found, {
				"f.scss": [
					{ count: 1, reason },
					{ count: 1, reason },
				],
			}),
		).toEqual([]);
		expect(
			checkMultiplierAllowlist(found, { "f.scss": [{ count: 3, reason }] }),
		).toEqual(["tighten the multiplier allowlist for f.scss: 2 < 3"]);
		expect(
			checkMultiplierAllowlist(new Map(), {
				"gone.scss": [{ count: 1, reason }],
			}),
		).toEqual(["tighten the multiplier allowlist for gone.scss: 0 < 1"]);
	});

	it("the allowlist's every entry carries a reason", () =>
		expect(
			checkMultiplierAllowlist(new Map(), {
				"a.scss": [{ count: 1 }],
				"b.scss": [{ count: 1, reason: "  " }],
				"c.scss": [{ count: 1, reason: "two\nlines" }],
				"d.scss": [{ count: 0, reason }],
				"e.scss": 2,
				"f.scss": [],
			}),
		).toEqual([
			"invalid multiplier allowlist entry for a.scss: each group needs a whole count of 1 or more and a one-line reason",
			"invalid multiplier allowlist entry for b.scss: each group needs a whole count of 1 or more and a one-line reason",
			"invalid multiplier allowlist entry for c.scss: each group needs a whole count of 1 or more and a one-line reason",
			"invalid multiplier allowlist entry for d.scss: each group needs a whole count of 1 or more and a one-line reason",
			"invalid multiplier allowlist entry for e.scss: each group needs a whole count of 1 or more and a one-line reason",
			"invalid multiplier allowlist entry for f.scss: each group needs a whole count of 1 or more and a one-line reason",
		]));
});

describe("scanMultipliers", () => {
	it("scanMultipliers skips savers", () =>
		expect(
			[...scanMultipliers(process.cwd()).keys()].some((f) =>
				f.includes("/savers/"),
			),
		).toBe(false));

	it("the repository's SCSS matches bin/multiplier-allowlist.json", () =>
		expect(
			checkMultiplierAllowlist(
				scanMultipliers(process.cwd()),
				JSON.parse(readFileSync("bin/multiplier-allowlist.json", "utf8")),
			),
		).toEqual([]));
});

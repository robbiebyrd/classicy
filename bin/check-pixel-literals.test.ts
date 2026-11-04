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

	// H-R29a: a unit written right after a Sass interpolation compiles to a
	// pixel length (`#{$n}px` is `12px`).
	it("counts a px unit written after a Sass interpolation", () =>
		expect(
			scanPixelLiteralsInSource(
				"$n: 12;\na { width: #{$n}px; height: #{$n + 2}PX; margin: var(--m, #{$n}px); }\nb { top: #{map.get($m, #{$k})}px; left: #{$n}pxx; }",
				"f.scss",
			).map((found) => `${found.line} ${found.text} ${found.kind}`),
		).toEqual([
			"2 #{$n}px bare",
			"2 #{$n + 2}PX bare",
			"2 #{$n}px fallback",
			"3 #{map.get($m, #{$k})}px bare",
		]));

	// H-R29a: only an at-rule's prelude is exempt, up to its `{`, not the
	// declarations written after it on the same line; a prelude may span lines.
	it("counts declarations on an @media or @container prelude's own line", () =>
		expect(
			scanPixelLiteralsInSource(
				"@media (min-width: 600px) { .a { width: 3px; } }\n@container (width > 400px) { b { top: 2px; } }\n@media (min-width: 600px) and\n  (max-width: 900px) {\n  c { left: 1px; }\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["1 3px", "2 2px", "5 1px"]));

	// A prelude may hold an interpolation (`@media #{$mq} and (…)`); its
	// lengths are still the prelude's, so they stay exempt.
	it("exempts an @media prelude that holds an interpolation", () =>
		expect(
			scanPixelLiteralsInSource(
				"$mq: screen;\n@media #{$mq} and (min-width: 600px) { .a { width: 3px; } }\n@container #{$name} (width > 400px) and\n  (max-width: #{$w}px) {\n  b { top: 2px; }\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 3px", "5 2px"]));

	// A unit after an interpolation that is part of a name (`.gap-#{$n}px`,
	// `&-#{$n}px`, `.#{$n}px`) is a selector, not a length.
	it("does not count an interpolated unit in a selector", () =>
		expect(
			scanPixelLiteralsInSource(
				"$n: 4;\n.gap-#{$n}px { gap: var(--x); }\n.b { &-#{$n}px { top: var(--y); } }\n.#{$n}px, .x#{$n}px { left: var(--z); }",
				"f.scss",
			),
		).toEqual([]));

	// The counterpart: in a declaration's value, `#{$n}px` is still a length,
	// signed or not, on the same line as an interpolated selector or not.
	it("still counts an interpolated unit in a declaration beside an interpolated selector", () =>
		expect(
			scanPixelLiteralsInSource(
				"$n: 4;\n.gap-#{$n}px { width: #{$n}px; margin: 0 -#{$n}px; }\n.b { padding:#{$n}px calc(#{$n}px + var(--x)); }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 #{$n}px", "2 #{$n}px", "3 #{$n}px", "3 #{$n}px"]));

	// Whether an interpolation is a name or a value is decided by what follows
	// it, not by what precedes it: a digit or a dot before `#{` in a value
	// still builds a pixel length (`1#{$n}px` is `15px`).
	it.each([
		["a digit", ".a { width: 1#{$n}px; }"],
		["a dot", ".a { width: .#{$n}px; }"],
		["a digit and a dot", ".a { width: 1.#{$n}px; }"],
		["an interpolation and a dot", ".a { width: #{$a}.#{$b}px }"],
	])("still counts an interpolated unit in a value after %s", (_, rule) =>
		expect(
			scanPixelLiteralsInSource(`$n: 5;\n${rule}`, "f.scss").map(
				(found) => `${found.line} ${found.kind}`,
			),
		).toEqual(["2 bare"]));

	// Sass reads `name:` and whitespace as a property, so a nested property's
	// value is a length even with a block after it.
	it.each([
		["on one line", ".a { font: #{$n}px { family: x; } }", ["2 #{$n}px"]],
		[
			"across lines",
			".a {\n  margin:\n    #{$n}px {\n    top: var(--x);\n  }\n}",
			["4 #{$n}px"],
		],
	])("still counts an interpolated unit in a nested property's value %s", (_, rule, expected) =>
		expect(
			scanPixelLiteralsInSource(`$n: 5;\n${rule}`, "f.scss").map(
				(found) => `${found.line} ${found.text}`,
			),
		).toEqual(expected));

	// A colon with no whitespace after it is a pseudo-class, so these stay
	// selectors.
	it.each([
		["a:hover .g-#{$n}px { top: var(--x); }"],
		["a:not(.g-#{$n}px) { top: var(--x); }"],
		["li:nth-child(2) .g-#{$n}px { top: var(--x); }"],
		[".a { &:hover .g-#{$n}px { top: var(--x); } }"],
	])("does not count an interpolated unit in a pseudo-class selector: %s", (rule) =>
		expect(scanPixelLiteralsInSource(`$n: 5;\n${rule}`, "f.scss")).toEqual([]));

	// An at-rule's arguments are values even when a block follows them
	// (`@include m(#{$n}px) { … }`, a content block).
	it("still counts an interpolated unit in an at-rule's arguments before its block", () =>
		expect(
			scanPixelLiteralsInSource(
				"$n: 5;\n.a { @include m(#{$n}px) { top: var(--x); } }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 #{$n}px"]));

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

	// H 6.2b review m7: `* #{1 - $tip}` with `$tip: 0.31` compiles to
	// `* 0.69`, so a file's own number constants, and plain arithmetic over
	// them in an interpolation, are factors, not operands.
	it("evaluates the file's number constants, and arithmetic over them, as factors", () =>
		expect(
			scanMultipliersInSource(
				"$tip: 0.31;\n$n: 3 !default;\n$h: var(--h);\na {\n  margin-top: calc(-1 * var(--w) * #{1 - $tip});\n  top: calc(var(--x) * #{$n});\n  left: calc(var(--x) * $n);\n  right: calc(var(--x) * #{$h});\n  bottom: calc(var(--x) * #{(4 - 2) / 2});\n  width: calc(var(--x) * #{$row});\n  height: #{$n};\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual([
			"5 -1 * var(--w) * #{1 - $tip}",
			"6 var(--x) * #{$n}",
			"7 var(--x) * $n",
		]));

	// H-R29a: a constant built from arithmetic (`math.div` included) is the
	// number it compiles to, as is one built from another constant.
	it("evaluates constants built from arithmetic", () =>
		expect(
			scanMultipliersInSource(
				"$f: 2 * 2;\n$g: math.div(1, 2);\n$h: $f - 1;\n$one: math.div(4, 4);\na {\n  top: calc(var(--x) * #{$f});\n  left: calc(var(--x) * $g);\n  right: calc(var(--x) * #{$h});\n  bottom: calc(var(--x) * $one);\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["6 var(--x) * #{$f}", "7 var(--x) * $g", "8 var(--x) * #{$h}"]));

	// H-R29a: a constant declared inside a block is a number within that
	// block only, and shadows an outer one there.
	it("resolves constants declared inside a block, within their block", () =>
		expect(
			scanMultipliersInSource(
				"$k: 2;\na {\n  $f: 3;\n  top: calc(var(--x) * #{$f});\n  $k: 1;\n  left: calc(var(--x) * $k);\n}\nb { right: calc(var(--x) * #{$f}); bottom: calc(var(--x) * $k); }\nc { $f: var(--y); width: calc(var(--x) * #{$f}); }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["4 var(--x) * #{$f}", "8 var(--x) * $k"]));

	// A mixin's or function's parameters, defaults included, shadow a
	// file constant of the same name over the body and hold whatever the
	// caller passes, so they are unresolved operands (H-R28a); past the body
	// the constant is in scope again.
	it("treats @mixin and @function parameters as unresolved over their body", () =>
		expect(
			scanMultipliersInSource(
				"$f: 1;\n$g: 1;\n$h: 1;\n@mixin m($f) {\n  width: calc(var(--x) * #{$f});\n}\n@mixin n($a, $g: 1, $k: math.div(1, 2)) {\n  top: calc(var(--x) * $g);\n}\n@function fn(\n  $h...\n) {\n  @return calc(var(--x) * $h);\n}\n.a { @include m(2); left: calc(var(--x) * $f); right: calc(var(--x) * #{$h}); }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["5 var(--x) * #{$f}", "8 var(--x) * $g", "13 var(--x) * $h"]));

	// A parameter may hold a theme read too, so scaled by a number it is a
	// site, even where a file constant of its name would make the chain a
	// number scaling a number; a lone parameter and a ratio of two
	// parameters are not sites, and a sign flip never makes one
	// (`$a * $b * -1` is still a ratio). A body variable built from a parameter
	// (itself a site, `$f * 2`) is a parameter; one holding a theme read is
	// an operand, as before.
	it("treats a parameter scaled by a number as a site, but not a sign flip or a ratio", () =>
		expect(
			scanMultipliersInSource(
				"$f: 1;\n@mixin m($f, $size, $a, $b) {\n  top: calc(#{$f} * 3);\n  left: calc($size * 2);\n  right: calc($size * -1);\n  width: calc($a / $b);\n  height: calc($a * $b * -1);\n  $g: $f * 2;\n  $v: var(--y);\n  margin: calc(var(--x) * #{$g}) calc($v * $size) calc($v * 2);\n  padding: $size;\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual([
			"3 #{$f} * 3",
			"4 $size * 2",
			"8 $f * 2",
			"10 var(--x) * #{$g}",
			"10 $v * $size",
			"10 $v * 2",
		]));

	// A default may read an earlier parameter (Sass binds them in order), so
	// there the parameter shadows a file constant too.
	it("reads an earlier parameter in a later parameter's default", () =>
		expect(
			scanMultipliersInSource(
				"$a: 1;\n@mixin m($a, $b: $a * 2, $c: var(--x) * $a) {\n  top: $b $c;\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["2 $a * 2", "2 var(--x) * $a"]));

	// A quoted parenthesis in a default does not hide the parameters after it.
	it("splits a parameter list past a quoted parenthesis", () =>
		expect(
			scanMultipliersInSource(
				'$f: 1;\n@mixin m($s: "(", $f) {\n  width: calc(var(--x) * $f);\n}',
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["3 var(--x) * $f"]));

	// Arithmetic over a parameter inside an interpolation is one site with
	// the chain it sits in, as it is over a constant; alone, it is its own.
	it("counts an interpolation over a parameter once", () =>
		expect(
			scanMultipliersInSource(
				"$c: 3;\n@mixin m($f) {\n  width: calc(var(--x) * #{$f * 2});\n  height: #{$f * 2};\n  left: calc(var(--x) * #{$c * 2});\n}",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual([
			"3 var(--x) * #{$f * 2}",
			"4 $f * 2",
			"5 var(--x) * #{$c * 2}",
		]));

	// H-R29a: a loop variable over numbers (`@each` over a map's values or a
	// list, `@for` over a range) is a factor; a site counts once, unless
	// every value it takes is +1 or -1.
	it("reads @each and @for loop variables over numbers as factors", () =>
		expect(
			scanMultipliersInSource(
				"$s: (Sm: 0.5, Md: 1);\n@each $k, $m in $s {\n  .p#{$k} { margin: calc(var(--x) * #{$m}); }\n}\n$ones: (A: 1, B: -1);\n@each $k, $m in $ones { .q#{$k} { margin: calc(var(--x) * #{$m}); } }\n@each $n in 2, 3 { .r { top: calc(var(--x) * $n); } }\n@for $i from 1 through 3 { .s { left: calc(var(--x) * #{$i}); } }\n@for $i from 1 to 2 { .t { left: calc(var(--x) * #{$i}); } }",
				"f.scss",
			).map((found) => `${found.line} ${found.text}`),
		).toEqual(["3 var(--x) * #{$m}", "7 var(--x) * $n", "8 var(--x) * #{$i}"]));

	it("reads a parenthesized number as a factor", () =>
		expect(
			scanMultipliersInSource(
				"a { top: calc(var(--x) * (2)); left: calc(var(--x) * (4 - 3)); }",
				"f.scss",
			).map((found) => found.text),
		).toEqual(["var(--x) * (2)"]));

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

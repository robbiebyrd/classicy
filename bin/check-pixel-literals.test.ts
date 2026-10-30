import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ClassicyPixelLiteral,
	checkPixelLiteralAllowlist,
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
			}),
		).toEqual([
			"invalid allowlist entry for b.scss: 1.5 (a count must be a positive whole number)",
			'invalid allowlist entry for c.scss: "2" (a count must be a positive whole number)',
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

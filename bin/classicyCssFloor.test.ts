import { describe, expect, it } from "vitest";
import {
	CLASSICY_CSS_FLOOR_FUNCTIONS,
	findClassicyCssFloorProblems,
} from "./classicyCssFloor";

const problems = (css: string) => findClassicyCssFloorProblems("x.css", css);

describe("findClassicyCssFloorProblems", () => {
	it("names the math functions newer than the floor", () =>
		expect([...CLASSICY_CSS_FLOOR_FUNCTIONS].sort()).toEqual(
			[
				"abs",
				"exp",
				"hypot",
				"log",
				"mod",
				"pow",
				"rem",
				"round",
				"sign",
				"sqrt",
			].sort(),
		));

	it("fails a declaration calling round() with no fallback", () =>
		expect(problems(".a{left:round(50%, 1px)}")).toEqual([
			"x.css: `left: round(50%, 1px)` in `.a` calls round(), which the browser floor (Chrome 120, Safari 16.2, Firefox 113) lacks, with no fallback -> declare `left` first without it (a browser that cannot parse the value keeps the earlier one), or wrap the rule in `@supports (left: round(…))`.",
		]));

	it("passes one with an earlier declaration of the property that calls none", () =>
		expect(
			problems(
				".a{left:calc(50% - 1px);left:round(50% - 1px, 1px);margin-left:round(up,calc(1px - 2px),1px)}",
			),
		).toEqual([
			expect.stringContaining("`margin-left: round(up,calc(1px - 2px),1px)`"),
		]));

	it("does not count an earlier declaration that calls one too", () =>
		expect(
			problems(".a{bottom:mod(9px, 2px);bottom:round(9px, 2px)}"),
		).toHaveLength(2));

	it("does not count a fallback declared after it", () =>
		expect(problems(".a{left:round(5px, 2px);left:5px}")).toHaveLength(1));

	it("passes one inside an @supports testing the function", () =>
		expect(
			problems(
				"@layer classicy.base{@supports (left: round(1px, 1px)){.a{left:round(5px, 2px)}}}",
			),
		).toEqual([]));

	it("fails one inside an @supports that tests something else", () =>
		expect(
			problems("@supports (display: grid){.a{left:round(5px, 2px)}}"),
		).toHaveLength(1));

	it("fails a custom property calling one, which only @supports can guard", () =>
		// The property keeps the last value whatever it holds, and a var()
		// reading an unparsable one is invalid at computed-value time.
		expect(problems(".a{--x:5px;--x:sqrt(25px)}")).toEqual([
			expect.stringContaining("`--x: sqrt(25px)`"),
		]));

	it("matches names, not substrings or other functions", () =>
		expect(
			problems(
				".a{background:url('round(x).png');transform:rotate(1deg);font-family:log,sans-serif;width:calc(1rem + 2px);animation-name:remove}",
			),
		).toEqual([]));

	// Firefox 121 and Safari 17.4 have `text-wrap`; the floor keeps a line
	// whole with `white-space`, which must come first.
	it("fails a text-wrap with no white-space before it", () =>
		expect(problems(".a{text-wrap:nowrap}")).toEqual([
			"x.css: `text-wrap: nowrap` in `.a` sets text-wrap, which the browser floor (Chrome 120, Safari 16.2, Firefox 113) lacks, with no fallback -> declare `white-space` first (a browser that cannot parse the declaration keeps it).",
		]));

	it("passes a text-wrap after a white-space", () =>
		expect(
			problems(
				".a{white-space:nowrap;text-wrap:nowrap}.b{text-wrap:nowrap;white-space:nowrap}",
			),
		).toEqual([expect.stringContaining("in `.b`")]));

	// A keyframe's declaration is dropped the same way when its value does
	// not parse, so the keyframes are held to the floor too (final review
	// r1, N1).
	it("fails a keyframe calling round() with no fallback", () =>
		expect(problems("@keyframes k { to { left: round(1px, 2px) } }")).toEqual([
			"x.css: `left: round(1px, 2px)` in `@keyframes k { to }` calls round(), which the browser floor (Chrome 120, Safari 16.2, Firefox 113) lacks, with no fallback -> declare `left` first without it (a browser that cannot parse the value keeps the earlier one), or wrap the rule in `@supports (left: round(…))`.",
		]));

	it("reads every keyframe, prefixed and layered ones included, with their fallbacks", () =>
		expect(
			problems(
				"@layer classicy.base{@-webkit-keyframes w{from{left:0}50%{left:mod(5px,2px)}}@keyframes k{0%,to{top:1px;top:round(1px,2px)}}}",
			),
		).toEqual([expect.stringContaining("in `@-webkit-keyframes w { 50% }`")]));

	it("ignores strings and comments", () =>
		expect(
			problems('.a{content:"round(1px)";/* left:round(1px, 1px) */left:0}'),
		).toEqual([]));
});

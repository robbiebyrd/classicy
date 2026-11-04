import { describe, expect, it } from "vitest";
import {
	classicyCssRules,
	classicySelectorSpecificity,
	classicySelectorSubject,
	compareClassicySpecificity,
	splitClassicySelectorList,
} from "./classicyCssCascade";

describe("classicySelectorSpecificity", () => {
	it.each([
		["*", [0, 0, 0]],
		["li", [0, 0, 1]],
		[".a", [0, 1, 0]],
		["#a", [1, 0, 0]],
		["[data-x='a b']", [0, 1, 0]],
		[".a .b > li + p ~ span", [0, 2, 3]],
		[".a:hover", [0, 2, 0]],
		[".a::before", [0, 1, 1]],
		[".a:after", [0, 1, 1]],
		[".a::-webkit-scrollbar-thumb:vertical", [0, 2, 1]],
		[":where(.a .b).c", [0, 1, 0]],
		[":is(.a, #b) .c", [1, 1, 0]],
		[".a:not(.b, li)", [0, 2, 0]],
		[".a:has(> .b .c)", [0, 3, 0]],
		["li:nth-child(2n+1)", [0, 1, 1]],
		["li:nth-child(2n of .a)", [0, 2, 1]],
		[
			'.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow',
			[0, 3, 0],
		],
		["html.x:has(#overlay) *", [1, 1, 1]],
		[".a\\:b", [0, 1, 0]],
	] as const)("%s is %j", (selector, expected) =>
		expect(classicySelectorSpecificity(selector)).toEqual(expected));

	it("compares ids, then classes, then types", () => {
		expect(compareClassicySpecificity([0, 1, 9], [0, 2, 0])).toBeLessThan(0);
		expect(compareClassicySpecificity([1, 0, 0], [0, 9, 9])).toBeGreaterThan(0);
		expect(compareClassicySpecificity([0, 2, 1], [0, 2, 1])).toBe(0);
	});
});

describe("splitClassicySelectorList", () => {
	it("splits at top-level commas only", () =>
		expect(
			splitClassicySelectorList(":where(.a, .b) .c, [x='1,2'], .d"),
		).toEqual([":where(.a, .b) .c", "[x='1,2']", ".d"]));
});

describe("classicySelectorSubject", () => {
	it("is the last compound's classes and pseudo-element", () => {
		expect(classicySelectorSubject(".a .b.c::after")).toEqual({
			classes: ["b", "c"],
			pseudoElement: "after",
		});
		expect(classicySelectorSubject(".a > :where(.b, .c).d:hover")).toEqual({
			classes: ["b", "c", "d"],
			pseudoElement: "",
		});
	});

	it("leaves out :has() and :not() arguments and descendants of :has()", () => {
		expect(classicySelectorSubject(".w:has(> .m .n) .x:not(.y)")).toEqual({
			classes: ["x"],
			pseudoElement: "",
		});
		expect(classicySelectorSubject(".w:has(.m)")).toEqual({
			classes: ["w"],
			pseudoElement: "",
		});
	});
});

describe("classicyCssRules", () => {
	it("flattens grouping at-rules, skips keyframes and keeps order", () => {
		const rules = classicyCssRules(`@charset "UTF-8";
/* a { color: red } */
@layer classicy.base {
  .a { color: red; background: url("x;y.png") }
  @media (min-width: 1px) { .b, .c { margin: 0 } }
  @keyframes k { from { opacity: 0 } to { opacity: 1 } }
}
.d { content: "}" ; }`);
		expect(rules).toEqual([
			{
				selector: ".a",
				declarations: [
					["color", "red"],
					["background", 'url("x;y.png")'],
				],
				context: ["@layer classicy.base"],
				order: 0,
			},
			{
				selector: ".b, .c",
				declarations: [["margin", "0"]],
				context: ["@layer classicy.base", "@media (min-width: 1px)"],
				order: 1,
			},
			{
				selector: ".d",
				declarations: [["content", '"}"']],
				context: [],
				order: 2,
			},
		]);
	});
});

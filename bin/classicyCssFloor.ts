// The browser floor's CSS math functions (README "Browser support": Chrome
// and Edge 120, Safari 16.2, Firefox 113). The stepped-value and exponential
// functions below came later: `round()`, `mod()` and `rem()` in Chrome 125
// and Firefox 118, `abs()` and `sign()` in Firefox 118 and Chrome 138,
// `pow()`, `sqrt()`, `hypot()`, `log()` and `exp()` in Firefox 118. A browser
// that cannot parse a declaration's value drops the whole declaration, so
// each one calling them needs a fallback: an earlier declaration of the same
// property, in the same rule, that calls none (the browser keeps the last
// declaration it parses), or an enclosing `@supports` that tests the
// function. A custom property takes neither fallback (it keeps its last value
// whatever it holds, and a `var()` reading one the browser cannot compute is
// invalid at computed-value time), so only `@supports` guards it.
//
// Properties newer than the floor fall back the same way, on an older
// property declared first: `text-wrap` (Firefox 121, Safari 17.4) on
// `white-space`, which keeps a line whole in every browser the floor has.
//
// verify:dist runs this over every stylesheet the core and each Appearance
// Package ship (core invariant 15), and ClassicyBrowserFloor.repo.test.ts
// over every compiled stylesheet in the repo.
//
// Plain erasable TypeScript: check-dist-imports.mjs imports this file through
// Node's type stripping.
import { classicyCssRules } from "./classicyCssCascade.ts";

/** CSS functions newer than the browser floor. */
export const CLASSICY_CSS_FLOOR_FUNCTIONS: ReadonlySet<string> = new Set([
	"round",
	"mod",
	"rem",
	"abs",
	"sign",
	"exp",
	"pow",
	"sqrt",
	"hypot",
	"log",
]);

/**
 * Properties newer than the floor, each with the older property that must be
 * declared before it in the same rule.
 */
export const CLASSICY_CSS_FLOOR_PROPERTIES: ReadonlyMap<string, string> =
	new Map([["text-wrap", "white-space"]]);

const FLOOR = "Chrome 120, Safari 16.2, Firefox 113";

/** A value with its strings and comments blanked out. */
const withoutStrings = (value: string): string =>
	value
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');

/** The floor functions `value` calls, in order of first call. */
const floorCalls = (value: string): string[] => {
	const calls = new Set<string>();
	for (const match of withoutStrings(value).matchAll(
		/(?<![\w-])([a-zA-Z]+)\(/g,
	)) {
		const name = match[1].toLowerCase();
		if (CLASSICY_CSS_FLOOR_FUNCTIONS.has(name)) calls.add(name);
	}
	return [...calls];
};

/** Whether one of `context`'s at-rules is an `@supports` testing `name()`. */
const supportsGuards = (context: string[], name: string): boolean =>
	context.some(
		(prelude) =>
			/^@supports\b/i.test(prelude) &&
			new RegExp(`(?<![\\w-])${name}\\(`, "i").test(withoutStrings(prelude)),
	);

/**
 * One message per declaration in `css` (a compiled stylesheet, `file` its
 * name in the messages) that calls a function newer than the browser floor
 * with no fallback.
 */
export const findClassicyCssFloorProblems = (
	file: string,
	css: string,
): string[] => {
	const problems: string[] = [];
	for (const rule of classicyCssRules(css)) {
		rule.declarations.forEach(([property, value], index) => {
			const older = CLASSICY_CSS_FLOOR_PROPERTIES.get(property);
			if (
				older &&
				!rule.context.some((prelude) => /^@supports\b/i.test(prelude)) &&
				!rule.declarations
					.slice(0, index)
					.some(([earlier]) => earlier === older)
			)
				problems.push(
					`${file}: \`${property}: ${value}\` in \`${rule.selector}\` sets ${property}, which the browser floor (${FLOOR}) lacks, with no fallback -> declare \`${older}\` first (a browser that cannot parse the declaration keeps it).`,
				);
			for (const name of floorCalls(value)) {
				if (supportsGuards(rule.context, name)) continue;
				const fallback =
					!property.startsWith("--") &&
					rule.declarations
						.slice(0, index)
						.some(
							([earlier, earlierValue]) =>
								earlier === property && floorCalls(earlierValue).length === 0,
						);
				if (fallback) continue;
				problems.push(
					`${file}: \`${property}: ${value}\` in \`${rule.selector}\` calls ${name}(), which the browser floor (${FLOOR}) lacks, with no fallback -> declare \`${property}\` first without it (a browser that cannot parse the value keeps the earlier one), or wrap the rule in \`@supports (${property}: ${name}(…))\`.`,
				);
			}
		});
	}
	return problems;
};

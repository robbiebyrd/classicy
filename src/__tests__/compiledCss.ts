import path from "node:path";
import * as sass from "sass";

/**
 * Helpers for tests that read compiled stylesheets (`sass.compile(...).css`):
 * compile a sheet, split the output into rules and merge the declarations of
 * the rules that name a selector. They tolerate the Platinum package's output,
 * whose rules sit indented inside `@layer classicy.package { … }` and are
 * scoped under the desktop root, as well as an unindented base sheet.
 */

/** The Platinum package root every package rule is scoped under. */
export const PLATINUM_ROOT =
	".classicyDesktop[data-classicy-appearance=platinum]";

/**
 * Compiles a stylesheet through the sass API (`?inline` and plain SCSS
 * imports are empty under vitest), in `expanded` style: one selector of a list
 * per line and one declaration per line. `file` is relative to the repo root,
 * which is vitest's root (jsdom leaves `import.meta.url` a non-file URL).
 */
export const compileScss = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;

/** One compiled rule: its selector list and its declaration block. */
export type CompiledCssRule = { selectors: string[]; body: string };

/** The stylesheet with one selector list per line, unindented. */
export const flattenCss = (source: string): string =>
	`\n${source}`.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");

/** Every style rule of a compiled stylesheet, in source order. */
export const parseCssRules = (source: string): CompiledCssRule[] =>
	[...flattenCss(source).matchAll(/\n([^\n{}@][^\n{}]*) \{\n([^}]*)\}/g)].map(
		([, selectors, body]) => ({ selectors: selectors.split(", "), body }),
	);

/**
 * The declarations of every rule whose selector list names `selector`, merged
 * in source order (a later rule's value wins, as it does in the cascade
 * between equal selectors). Throws `no rule for <label>` when none does.
 */
export const cssDeclarations = (
	rules: CompiledCssRule[],
	selector: string,
	label = selector,
): Record<string, string> =>
	mergeDeclarations(
		rules.filter((r) => r.selectors.includes(selector)),
		label,
	);

/**
 * The declarations of every rule headed by exactly `selector` (a rule of its
 * own, not one entry of a selector list), merged in source order. Takes the
 * compiled stylesheet itself. Throws `no rule for <selector>` when none is.
 */
export const scssRule = (
	css: string,
	selector: string,
): Record<string, string> =>
	mergeDeclarations(
		parseCssRules(css).filter(
			(r) => r.selectors.length === 1 && r.selectors[0] === selector,
		),
		selector,
	);

/** The rules' declarations merged in source order (a later value wins). */
const mergeDeclarations = (
	matched: CompiledCssRule[],
	label: string,
): Record<string, string> => {
	if (matched.length === 0) throw new Error(`no rule for ${label}`);
	const props: Record<string, string> = {};
	for (const { body } of matched)
		for (const line of body.split(";\n")) {
			const colon = line.indexOf(":");
			if (colon > 0)
				props[line.slice(0, colon).trim()] = line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
		}
	return props;
};

/**
 * A lookup of merged declarations by selector. With a `prefix` (for example
 * `PLATINUM_ROOT`), `selector` is looked up as `${prefix} ${selector}`.
 */
export const cssRuleLookup =
	(rules: CompiledCssRule[], prefix = "") =>
	(selector: string): Record<string, string> =>
		cssDeclarations(
			rules,
			prefix ? `${prefix} ${selector}` : selector,
			selector,
		);

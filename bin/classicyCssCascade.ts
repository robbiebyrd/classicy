// Static cascade helpers for the repo's stylesheet guards: selector
// specificity and a flat list of the style rules in compiled CSS. jsdom does
// no cascade, so the guards that pin which rule wins (ClassicyCascade.repo
// .test.ts) compute it from the compiled stylesheets with these.
//
// Build script, not library code. No imports and only erasable TypeScript, so
// Node runs it directly.

/** `[ids, classes + attributes + pseudo-classes, types + pseudo-elements]`. */
export type ClassicySpecificity = [number, number, number];

/** Negative when `a` is weaker than `b`, 0 when equal, positive when stronger. */
export const compareClassicySpecificity = (
	a: ClassicySpecificity,
	b: ClassicySpecificity,
): number => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// CSS 2 pseudo-elements, still accepted with a single colon.
const LEGACY_PSEUDO_ELEMENTS = new Set([
	"before",
	"after",
	"first-line",
	"first-letter",
]);
// Pseudo-classes that take the specificity of their most specific argument.
const MATCHES_ARGUMENT = new Set([
	"is",
	"not",
	"has",
	"matches",
	"-webkit-any",
]);
// The `:nth-*()` pseudo-classes, which add their `of S` selector to their own.
const NTH = /^nth-(?:last-)?child$/;

const IDENT_CHAR = /[\w\-\u0080-￿]/;

/** The index just past the identifier starting at `i` (escapes included). */
const identEnd = (s: string, i: number): number => {
	let j = i;
	while (j < s.length) {
		if (s[j] === "\\") j += 2;
		else if (IDENT_CHAR.test(s[j])) j++;
		else break;
	}
	return j;
};

/** The index of the bracket closing the one at `open`; quotes are skipped. */
const closing = (s: string, open: number): number => {
	const pairs: Record<string, string> = { "(": ")", "[": "]" };
	const stack = [pairs[s[open]]];
	for (let i = open + 1; i < s.length; i++) {
		const ch = s[i];
		if (ch === "\\") i++;
		else if (ch === '"' || ch === "'") {
			for (i++; i < s.length && s[i] !== ch; i++) if (s[i] === "\\") i++;
		} else if (ch in pairs) stack.push(pairs[ch]);
		else if (ch === stack[stack.length - 1]) {
			stack.pop();
			if (stack.length === 0) return i;
		}
	}
	return s.length;
};

/** `list` split at its top-level commas, each part trimmed. */
export const splitClassicySelectorList = (list: string): string[] => {
	const parts: string[] = [];
	let start = 0;
	for (let i = 0; i < list.length; i++) {
		const ch = list[i];
		if (ch === "\\") i++;
		else if (ch === "(" || ch === "[") i = closing(list, i);
		else if (ch === '"' || ch === "'") {
			for (i++; i < list.length && list[i] !== ch; i++)
				if (list[i] === "\\") i++;
		} else if (ch === ",") {
			parts.push(list.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(list.slice(start).trim());
	return parts.filter(Boolean);
};

const add = (
	a: ClassicySpecificity,
	b: ClassicySpecificity,
): ClassicySpecificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const strongest = (list: string): ClassicySpecificity =>
	splitClassicySelectorList(list)
		.map(classicySelectorSpecificity)
		.reduce((best, s) => (compareClassicySpecificity(s, best) > 0 ? s : best), [
			0, 0, 0,
		] as ClassicySpecificity);

/**
 * The specificity of one complex selector (no top-level commas), per
 * Selectors Level 4: `:where()` counts nothing; `:is()`, `:not()` and
 * `:has()` count their strongest argument; `:nth-child(… of S)` counts one
 * pseudo-class plus S; `::x` and the CSS 2 `:before`/`:after`/`:first-line`/
 * `:first-letter` count as types; `*` and combinators count nothing.
 */
export const classicySelectorSpecificity = (
	selector: string,
): ClassicySpecificity => {
	let spec: ClassicySpecificity = [0, 0, 0];
	const s = selector.trim();
	let i = 0;
	while (i < s.length) {
		const ch = s[i];
		if (ch === "#") {
			spec = add(spec, [1, 0, 0]);
			i = identEnd(s, i + 1);
		} else if (ch === ".") {
			spec = add(spec, [0, 1, 0]);
			i = identEnd(s, i + 1);
		} else if (ch === "[") {
			spec = add(spec, [0, 1, 0]);
			i = closing(s, i) + 1;
		} else if (ch === ":") {
			const element = s[i + 1] === ":";
			const nameStart = i + (element ? 2 : 1);
			const nameEnd = identEnd(s, nameStart);
			const name = s.slice(nameStart, nameEnd).toLowerCase();
			const args =
				s[nameEnd] === "("
					? s.slice(nameEnd + 1, closing(s, nameEnd))
					: undefined;
			i = args === undefined ? nameEnd : closing(s, nameEnd) + 1;
			if (element || LEGACY_PSEUDO_ELEMENTS.has(name))
				spec = add(spec, [0, 0, 1]);
			else if (name === "where") {
				// counts nothing
			} else if (MATCHES_ARGUMENT.has(name) && args !== undefined)
				spec = add(spec, strongest(args));
			else if (NTH.test(name) && args !== undefined && /\bof\b/.test(args))
				spec = add(
					add(spec, [0, 1, 0]),
					strongest(args.slice(args.search(/\bof\b/) + 2)),
				);
			else spec = add(spec, [0, 1, 0]);
		} else if (IDENT_CHAR.test(ch) || ch === "\\") {
			spec = add(spec, [0, 0, 1]);
			i = identEnd(s, i);
		} else i++; // `*`, `|`, combinators, whitespace
	}
	return spec;
};

/**
 * What one complex selector styles: the classes of its subject (the compound
 * after the last combinator; a `:where()`/`:is()` alternative's classes
 * count, a `:has()`/`:not()` argument's do not) and its pseudo-element (`""`
 * for the element itself).
 */
export const classicySelectorSubject = (
	selector: string,
): { classes: string[]; pseudoElement: string } => {
	const s = selector.trim();
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === "\\") i++;
		else if (ch === "(" || ch === "[") i = closing(s, i);
		else if (/[\s>+~]/.test(ch)) start = i + 1;
	}
	let subject = s.slice(start);
	for (;;) {
		const at = subject.search(/:(?:has|not)\(/i);
		if (at === -1) break;
		const open = subject.indexOf("(", at);
		subject = subject.slice(0, at) + subject.slice(closing(subject, open) + 1);
	}
	const element = /::([\w-]+)|:(before|after|first-line|first-letter)\b/i.exec(
		subject,
	);
	return {
		classes: [...subject.matchAll(/\.((?:\\.|[\w\-\u0080-￿])+)/g)].map(
			(m) => m[1],
		),
		pseudoElement: (element?.[1] ?? element?.[2] ?? "").toLowerCase(),
	};
};

/** One style rule of a stylesheet, with the at-rules it is nested in. */
export type ClassicyCssRule = {
	/** The rule's selector list, as written. */
	selector: string;
	/** Its declarations in order, as `[property, value]`. */
	declarations: [string, string][];
	/** The preludes of the enclosing at-rules, outermost first. */
	context: string[];
	/** The rule's position among all the style rules of the stylesheet. */
	order: number;
};

// At-rules whose block holds style rules; every other block (keyframes,
// font-face, property, page) is opaque.
const GROUPING_AT_RULES =
	/^@(?:media|supports|layer|container|scope|document)\b/;

const skipComment = (css: string, i: number): number => {
	const end = css.indexOf("*/", i + 2);
	return end === -1 ? css.length : end + 2;
};

/** The index of the first top-level `stop` character at or after `i`. */
const scanTo = (css: string, i: number, stop: string): number => {
	for (let j = i; j < css.length; j++) {
		const ch = css[j];
		if (ch === "\\") j++;
		else if (ch === "/" && css[j + 1] === "*") j = skipComment(css, j) - 1;
		else if (ch === '"' || ch === "'") {
			for (j++; j < css.length && css[j] !== ch; j++) if (css[j] === "\\") j++;
		} else if (ch === "(" || ch === "[") j = closing(css, j);
		else if (stop.includes(ch)) return j;
	}
	return css.length;
};

/** The index of the `}` closing the `{` at `open`. */
const blockEnd = (css: string, open: number): number => {
	let depth = 0;
	for (let j = open; j < css.length; j++) {
		const ch = css[j];
		if (ch === "\\") j++;
		else if (ch === "/" && css[j + 1] === "*") j = skipComment(css, j) - 1;
		else if (ch === '"' || ch === "'") {
			for (j++; j < css.length && css[j] !== ch; j++) if (css[j] === "\\") j++;
		} else if (ch === "{") depth++;
		else if (ch === "}" && --depth === 0) return j;
	}
	return css.length;
};

const declarationsOf = (body: string): [string, string][] => {
	const out: [string, string][] = [];
	let start = 0;
	for (;;) {
		const end = scanTo(body, start, ";");
		const text = body
			.slice(start, end)
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.trim();
		const colon = text.indexOf(":");
		if (colon > 0)
			out.push([
				text.slice(0, colon).trim().toLowerCase(),
				text.slice(colon + 1).trim(),
			]);
		if (end >= body.length) return out;
		start = end + 1;
	}
};

/**
 * Every style rule in `css` (plain CSS, as Sass compiles it), in source
 * order, flattened out of `@media`, `@supports`, `@layer` and the other
 * grouping at-rules (recorded in `context`). Keyframes, font faces and other
 * non-style blocks are skipped. Nested style rules are not supported.
 */
export const classicyCssRules = (css: string): ClassicyCssRule[] => {
	const rules: ClassicyCssRule[] = [];
	const walk = (from: number, to: number, context: string[]) => {
		let i = from;
		while (i < to) {
			while (i < to && /\s/.test(css[i])) i++;
			if (i >= to) return;
			if (css.startsWith("/*", i)) {
				i = skipComment(css, i);
				continue;
			}
			const stop = scanTo(css, i, "{;}");
			if (stop >= to || css[stop] !== "{") {
				i = stop + 1; // a statement (`@charset`, `@layer a, b;`) or stray `}`
				continue;
			}
			const prelude = css.slice(i, stop).trim();
			const end = blockEnd(css, stop);
			if (prelude.startsWith("@")) {
				if (GROUPING_AT_RULES.test(prelude))
					walk(stop + 1, end, [...context, prelude]);
			} else {
				rules.push({
					selector: prelude,
					declarations: declarationsOf(css.slice(stop + 1, end)),
					context,
					order: rules.length,
				});
			}
			i = end + 1;
		}
	};
	walk(0, css.length, []);
	return rules;
};

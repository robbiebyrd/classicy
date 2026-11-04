// The pixel-literal gate (Part H 1.1): Classicy's SCSS reads its sizes from
// theme variables, so every `Npx` literal left in src is debt, held by a
// ratchet. bin/pixel-literal-allowlist.json lists, per file, how many literals
// it may still hold; a file must hold exactly that many (fewer means the list
// must be tightened, more means a new literal), and an unlisted file none.
// The list only shrinks, and ends empty.
//
// The multiplier gate (Part H 6.2, H-R6) is its sibling: a theme variable
// scaled by a bare number (`calc(var(--x) * 3)`, `var(--h) / -2`) is a
// proportion with no name, so it becomes a named derivation or a knob. The
// sites that stay are geometry, not a role (H-R7, H-R21), and
// bin/multiplier-allowlist.json holds them per file as groups of
// `{ count, reason }`, each reason one line saying why. The same ratchet
// applies to a file's total; the list is edited by hand, since every group
// needs its reason.
//
//   node bin/check-pixel-literals.ts                    check both; exit 1 on any message
//   node bin/check-pixel-literals.ts --write-allowlist  reseed the pixel list from src
//   node bin/check-pixel-literals.ts --list-multipliers print every multiplier site
//
// A unit written after a Sass interpolation (`#{$n}px`) is a literal too.
// Exempt: `0px`, `calc(infinity * 1px)`, `@media`/`@container` preludes (up
// to their `{`, so a rule written on the same line is still read), comments,
// url() payloads, and the screen savers (ported After Dark art).
// An Appearance Package's own `--<pkg>-*: Npx` constants are NOT exempt.
//
// Build script, not library code: it reports through stdout/stderr and exit
// codes. Erasable TypeScript syntax only, so Node runs it directly.
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	blankClassicyScssComments,
	blankClassicyScssUrlPayloads,
	listClassicyScssFiles,
} from "./classicyScssSource.ts";

export type ClassicyPixelLiteral = {
	/** Path relative to the root, with `/` separators. */
	file: string;
	/** 1-based line number. */
	line: number;
	/** The literal as written, sign included (`-3px`). */
	text: string;
	/**
	 * `fallback`: after the comma of its own `var(--x, …)`. `multiplier`: a
	 * theme variable scaled by a bare number (`scanMultipliersInSource`);
	 * `text` is then the operand, operator and factor (`var(--x) * 3`).
	 */
	kind: "bare" | "fallback" | "multiplier";
};

// A pixel length as CSS writes it (`4px`, `1.5px`, `.5px`, `1e3px`, any
// case) not preceded by an identifier character, a digit's dot or a
// hyphen-joined name, so `.x10px` and `$a-3px` never match; a minus right
// after another length's unit starts a literal of its own (`10px-3px`).
const PIXEL_LITERAL =
	/(?:(?<![\w.-])|(?<=\dpx))-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?px/gi;
const ZERO = /^-?(?:0+(?:\.0+)?|\.0+)(?:e[+-]?\d+)?px$/i;
// A unit written right after a Sass interpolation (`#{$n}px` compiles to a
// pixel length); the match is the interpolation's closing brace and the unit.
const INTERPOLATED_UNIT = /\}px(?![\w-])/gi;
const INFINITY = /\binfinity\s*\*\s*1px/gi;
// An `@media`/`@container` prelude, from its at-keyword up to (not
// including) the `{` or `;` that ends it, across lines if it wraps.
const PRELUDE = /^([ \t]*)@(?:media|container)\b[^{;]*/gm;
const SAVERS = "src/SystemFolder/Extensions/ScreenSaver/savers/";

// Spaces for every character but a newline, so line numbers survive.
const blank = (text: string): string => text.replace(/[^\n]/g, " ");

/**
 * A parenthesis stack over `text`, advanced in order: `isFallbackAt(index)`
 * says whether the literal at `index` sits after the comma of its own
 * enclosing `var(--x, …)`. A var() that closed earlier
 * (`px-rect(var(--c), 1px)`) does not make what follows a fallback, and a
 * fallback may start on a later line than its var() (`var(--a,\n 4px)`).
 * Indexes must not decrease between calls.
 */
const fallbackTracker = (text: string) => {
	const stack: { isVar: boolean; afterComma: boolean }[] = [];
	let at = 0;
	return (index: number): boolean => {
		for (; at < index; at++) {
			const c = text[at];
			if (c === "(") {
				const isVar = /(?:^|[^\w-])var$/i.test(
					text.slice(Math.max(0, at - 4), at),
				);
				stack.push({ isVar, afterComma: false });
			} else if (c === ")") {
				stack.pop();
			} else if (c === "," && stack.length > 0) {
				stack[stack.length - 1].afterComma = true;
			}
		}
		return stack.some((frame) => frame.isVar && frame.afterComma);
	};
};

/** The index of the `#{` opening the interpolation that closes at `close`. */
const interpolationStart = (text: string, close: number): number => {
	for (let depth = 0, i = close; i >= 0; i--) {
		if (text[i] === "}") depth++;
		else if (text[i] === "{" && --depth === 0) {
			return text[i - 1] === "#" ? i - 1 : -1;
		}
	}
	return -1;
};

/** The pixel literals in one SCSS source; `file` is relative to the root. */
export const scanPixelLiteralsInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	// Preludes (their parentheses included, the rule after them not) and
	// `infinity * 1px` are blanked like comments, so lines and columns still
	// point into the file.
	const text = blankClassicyScssUrlPayloads(blankClassicyScssComments(source))
		.replace(PRELUDE, (prelude, indent: string) =>
			indent.concat(blank(prelude.slice(indent.length))),
		)
		.replace(INFINITY, blank);
	// Every literal as [index, text]: the plain ones, and a unit after an
	// interpolation, reported from its `#{` (`#{$n}px`).
	const literals: [number, string][] = [];
	for (const match of text.matchAll(PIXEL_LITERAL)) {
		if (!ZERO.test(match[0])) literals.push([match.index, match[0]]);
	}
	for (const match of text.matchAll(INTERPOLATED_UNIT)) {
		const start = interpolationStart(text, match.index);
		const end = match.index + match[0].length;
		if (start !== -1) literals.push([start, text.slice(start, end)]);
	}
	literals.sort(([a], [b]) => a - b);
	const isFallbackAt = fallbackTracker(text);
	const found: ClassicyPixelLiteral[] = [];
	let line = 1;
	let counted = 0;
	for (const [index, literal] of literals) {
		for (; counted < index; counted++) {
			if (text[counted] === "\n") line++;
		}
		found.push({
			file,
			line,
			text: literal.replace(/\s+/g, " "),
			kind: isFallbackAt(index) ? "fallback" : "bare",
		});
	}
	return found;
};

/**
 * Every pixel literal in `<root>/src/**\/*.scss`, keyed by repo-relative path
 * (sorted), skipping the screen savers. Files without a literal are absent.
 */
export const scanPixelLiterals = (
	root: string,
): Map<string, ClassicyPixelLiteral[]> => {
	const found = new Map<string, ClassicyPixelLiteral[]>();
	for (const full of listClassicyScssFiles(join(root, "src"))) {
		const file = relative(root, full).split(sep).join("/");
		if (file.startsWith(SAVERS)) continue;
		const literals = scanPixelLiteralsInSource(
			readFileSync(full, "utf8"),
			file,
		);
		if (literals.length > 0) found.set(file, literals);
	}
	return found;
};

// The multiplier scanner reads a source as a flat run of terms, operators
// and breaks, one parenthesis level at a time: a call, group or Sass
// interpolation is one term, and its inside is scanned in turn.
type MultiplierTerm = {
	/** `number`: a unitless number; `operand`: something that scales. */
	kind: "number" | "operand" | "other";
	text: string;
	/** A number's values: one, or one per pass of a loop variable it reads. */
	values: readonly number[];
};
/** Terms joined by operators; `at` is the first operator's index. */
type MultiplierChain = {
	links: { op: "*" | "/" | null; term: MultiplierTerm }[];
	at: number;
};
type MultiplierToken =
	| { type: "term"; term: MultiplierTerm; start: number }
	| { type: "op"; op: "*" | "/"; start: number }
	| { type: "break" };

// A number, sign included; what follows it decides whether it is unitless.
const NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i;
// An identifier or function name: `var`, `math.cos`, `--x`, `-webkit-x`.
const IDENTIFIER = /^(?:--|-?[A-Za-z_])[\w.-]*/;
const SASS_VARIABLE = /^\$[\w-]+/;
// What scales: a call, group or interpolation holding a theme read (`var(`)
// or a Sass variable (which may hold one), or a bare Sass variable.
const SCALES = /var\(|\$/;
/**
 * A Sass variable's binding: what `$name` holds from `start` (its
 * declaration, or its loop's `{`) to `end` (the end of the block it is
 * declared in, or of its loop). `values` are the unitless numbers it may
 * compile to (one for a constant, one per pass for a loop variable), or
 * `undefined` when it holds anything else; `raw` is its declared text.
 */
type SassBinding = {
	name: string;
	start: number;
	end: number;
	values: readonly number[] | undefined;
	raw: string;
};
/** The binding of `name` in scope at `at`, if any. */
type SassLookup = (name: string, at: number) => SassBinding | undefined;

// A variable declaration at a statement's start, top level or inside a
// block (`$tip: 0.31;`, `$f: math.div(1, 2) !default;`).
const DECLARATION =
	/(?:^|(?<=[;{}]))[ \t]*\$([\w-]+)[ \t]*:\s*((?:#\{[^}]*\}|[^;{}])*?)\s*((?:!(?:default|global)\s*)*);/gm;
// `@each $a, $b in <collection> {` and `@for $i from A through|to B {`.
const EACH_LOOP = /@each\s+(\$[\w-]+(?:\s*,\s*\$[\w-]+)*)\s+in\s+([^{;]+)\{/g;
const FOR_LOOP =
	/@for\s+\$([\w-]+)\s+from\s+([^{;]+?)\s+(through|to)\s+([^{;]+?)\s*\{/g;
// More passes than this and a loop variable is left unresolved.
const MAX_VALUES = 1024;

const uniqueValues = (values: number[]): number[] => [...new Set(values)];

/** `text` split at its top-level commas, each part trimmed. */
const topLevelItems = (text: string): string[] => {
	const items: string[] = [];
	let depth = 0;
	let from = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "(") depth++;
		else if (text[i] === ")") depth--;
		else if (text[i] === "," && depth === 0) {
			items.push(text.slice(from, i).trim());
			from = i + 1;
		}
	}
	items.push(text.slice(from).trim());
	return items.filter((item) => item !== "");
};

/**
 * The values of `expression`: plain arithmetic (`+ - * /`, parentheses,
 * `math.div(a, b)`) over unitless numbers and the variables in scope at `at`
 * that hold numbers, one value per combination of the values those variables
 * take, or `undefined` when it is anything else (a theme read, a unit, a
 * variable that holds no number). It reads what a Sass interpolation such as
 * `#{1 - $tip}` compiles to.
 */
const evaluateArithmetic = (
	expression: string,
	lookup: SassLookup,
	at: number,
): number[] | undefined => {
	const tokens = [
		...expression.matchAll(
			/\$[\w-]+|math\.div|(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?|[-+*/(),]|\S/gi,
		),
	].map(([token]) => token);
	if (tokens.length === 0) return undefined;
	const variables = new Map<string, readonly number[]>();
	for (const token of tokens) {
		if (!token.startsWith("$") || variables.has(token)) continue;
		const values = lookup(token.slice(1), at)?.values;
		if (values === undefined) return undefined;
		variables.set(token, values);
	}
	const evaluate = (assigned: ReadonlyMap<string, number>): number => {
		let i = 0;
		const primary = (): number => {
			const token = tokens[i++];
			if (token === "(") {
				const value = sum();
				return tokens[i++] === ")" ? value : Number.NaN;
			}
			if (token === "math.div") {
				if (tokens[i++] !== "(") return Number.NaN;
				const dividend = sum();
				if (tokens[i++] !== ",") return Number.NaN;
				const divisor = sum();
				return tokens[i++] === ")" ? dividend / divisor : Number.NaN;
			}
			if (token === "-") return -primary();
			if (token === "+") return primary();
			if (token?.startsWith("$")) return assigned.get(token) ?? Number.NaN;
			return token !== undefined && NUMBER.test(token)
				? Number(token)
				: Number.NaN;
		};
		const product = (): number => {
			let value = primary();
			while (tokens[i] === "*" || tokens[i] === "/") {
				const op = tokens[i++];
				const next = primary();
				value = op === "*" ? value * next : value / next;
			}
			return value;
		};
		const sum = (): number => {
			let value = product();
			while (tokens[i] === "+" || tokens[i] === "-") {
				const op = tokens[i++];
				const next = product();
				value = op === "+" ? value + next : value - next;
			}
			return value;
		};
		const value = sum();
		return i === tokens.length ? value : Number.NaN;
	};
	// One pass per combination of the variables' values.
	let combinations: Map<string, number>[] = [new Map()];
	for (const [name, values] of variables) {
		combinations = combinations.flatMap((assigned) =>
			values.map((value) => new Map(assigned).set(name, value)),
		);
		if (combinations.length > MAX_VALUES) return undefined;
	}
	const values = combinations.map(evaluate);
	return values.every(Number.isFinite) ? uniqueValues(values) : undefined;
};

/** The `[open, close]` index pairs of a source's blocks (not interpolations). */
const blocksOf = (text: string): [number, number][] => {
	const blocks: [number, number][] = [];
	const open: { at: number; interpolation: boolean }[] = [];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "{") {
			open.push({ at: i, interpolation: text[i - 1] === "#" });
		} else if (text[i] === "}") {
			const block = open.pop();
			if (block !== undefined && !block.interpolation) {
				blocks.push([block.at, i]);
			}
		}
	}
	for (const block of open) {
		if (!block.interpolation) blocks.push([block.at, text.length]);
	}
	return blocks;
};

/**
 * The Sass variable bindings of a (comment-blanked) source, as a lookup by
 * name and position: every declaration, top level or inside a block, in
 * scope to the end of its block (`!global` to the file's end), and the
 * variables of `@each` loops over a list or a map's values and of `@for`
 * loops, in scope over their loop. Later declarations shadow earlier ones
 * where both are in scope, as in Sass. Each binding's values are evaluated
 * against the bindings before it.
 */
const sassBindingsOf = (text: string): SassLookup => {
	const blocks = blocksOf(text);
	const blockEnd = (at: number): number => {
		let innermost = -1;
		let end = text.length;
		for (const [open, close] of blocks) {
			if (open < at && at < close && open > innermost) {
				innermost = open;
				end = close;
			}
		}
		return end;
	};
	const closeOf = (open: number): number =>
		blocks.find(([at]) => at === open)?.[1] ?? text.length;
	const bindings: SassBinding[] = [];
	const lookup: SassLookup = (name, at) => {
		for (let i = bindings.length - 1; i >= 0; i--) {
			const binding = bindings[i];
			if (binding.name === name && binding.start <= at && at < binding.end) {
				return binding;
			}
		}
		return undefined;
	};
	// The binding sources, in source order, so each is evaluated against the
	// bindings declared before it.
	const sources: { at: number; bind: () => SassBinding[] }[] = [];
	for (const match of text.matchAll(DECLARATION)) {
		const [, name, raw, flags] = match;
		const at = match.index;
		sources.push({
			at,
			bind: () => [
				{
					name,
					start: at,
					end: flags.includes("!global") ? text.length : blockEnd(at),
					values: evaluateArithmetic(raw, lookup, at),
					raw,
				},
			],
		});
	}
	for (const match of text.matchAll(EACH_LOOP)) {
		const names = match[1].split(",").map((name) => name.trim().slice(1));
		const open = match.index + match[0].length - 1;
		sources.push({
			at: match.index,
			bind: () => {
				let collection = match[2].trim();
				if (/^\$[\w-]+$/.test(collection)) {
					collection = lookup(collection.slice(1), match.index)?.raw ?? "";
				}
				if (/^\(.*\)$/s.test(collection)) {
					collection = collection.slice(1, -1);
				}
				const items = topLevelItems(collection);
				const isMap =
					items.length > 0 && items.every((item) => /^[^():]+:/.test(item));
				const valuesOf = (expressions: string[]) => {
					const all = expressions.map((expression) =>
						evaluateArithmetic(expression, lookup, match.index),
					);
					return all.every((values) => values !== undefined)
						? uniqueValues(all.flat())
						: undefined;
				};
				// A map's values bind its second variable; a list binds a lone
				// variable; anything else (keys, destructured lists) holds no
				// number.
				const valued = isMap
					? names.length === 2
						? {
								index: 1,
								values: valuesOf(
									items.map((item) => item.slice(item.indexOf(":") + 1)),
								),
							}
						: undefined
					: names.length === 1
						? { index: 0, values: valuesOf(items) }
						: undefined;
				return names.map((name, index) => ({
					name,
					start: open,
					end: closeOf(open),
					values: valued?.index === index ? valued.values : undefined,
					raw: "",
				}));
			},
		});
	}
	for (const match of text.matchAll(FOR_LOOP)) {
		const [, name, from, kind, to] = match;
		const open = match.index + match[0].length - 1;
		sources.push({
			at: match.index,
			bind: () => {
				const first = evaluateArithmetic(from, lookup, match.index);
				const last = evaluateArithmetic(to, lookup, match.index);
				let values: number[] | undefined;
				if (first?.length === 1 && last?.length === 1) {
					const [a] = first;
					const b =
						kind === "through" ? last[0] : last[0] - Math.sign(last[0] - a);
					if (
						Number.isInteger(a) &&
						Number.isInteger(b) &&
						Math.abs(b - a) < MAX_VALUES
					) {
						const step = b >= a ? 1 : -1;
						values = [];
						for (let v = a; step > 0 ? v <= b : v >= b; v += step)
							values.push(v);
					}
				}
				return [{ name, start: open, end: closeOf(open), values, raw: "" }];
			},
		});
	}
	sources.sort((a, b) => a.at - b.at);
	for (const source of sources) bindings.push(...source.bind());
	return lookup;
};

/** The index of the bracket closing the one at `open`, or the text's end. */
const closingBracket = (text: string, open: number): number => {
	const opening = text[open];
	const closing = opening === "(" ? ")" : "}";
	for (let depth = 0, i = open; i < text.length; i++) {
		if (text[i] === opening) depth++;
		else if (text[i] === closing && --depth === 0) return i;
	}
	return text.length - 1;
};

/** The index just past the quoted string opening at `start`. */
const quotedEnd = (text: string, start: number): number => {
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === "\\") i++;
		else if (text[i] === text[start] || text[i] === "\n") return i + 1;
	}
	return text.length;
};

/**
 * Tokenizes `text[from, to)` into terms, operators and breaks, and scans the
 * inside of each call, group and interpolation it meets the same way, adding
 * every multiplier chain to `sites` as `[index of its first operator, text]`.
 */
const scanMultiplierLevel = (
	text: string,
	from: number,
	to: number,
	sites: [number, string][],
	lookup: SassLookup,
): void => {
	const tokens: MultiplierToken[] = [];
	const term = (
		kind: MultiplierTerm["kind"],
		start: number,
		end: number,
		values: readonly number[] = [],
	) =>
		tokens.push({
			type: "term",
			term: { kind, text: text.slice(start, end), values },
			start,
		});
	let i = from;
	while (i < to) {
		const c = text[i];
		const rest = text.slice(i, Math.min(to, i + 256));
		if (/\s/.test(c)) {
			i++;
		} else if (c === "*" || c === "/") {
			tokens.push({ type: "op", op: c, start: i });
			i++;
		} else if (c === '"' || c === "'") {
			const end = Math.min(to, quotedEnd(text, i));
			term("other", i, end);
			i = end;
		} else if (c === "#" && text[i + 1] === "{") {
			const close = Math.min(to - 1, closingBracket(text, i + 1));
			const inner = text.slice(i + 2, close);
			const values = evaluateArithmetic(inner, lookup, i);
			if (values !== undefined) term("number", i, close + 1, values);
			else term(SCALES.test(inner) ? "operand" : "other", i, close + 1);
			scanMultiplierLevel(text, i + 2, close, sites, lookup);
			i = close + 1;
		} else if (c === "$" && SASS_VARIABLE.test(rest)) {
			const name = SASS_VARIABLE.exec(rest)?.[0] ?? c;
			const values = lookup(name.slice(1), i)?.values;
			if (values !== undefined) term("number", i, i + name.length, values);
			else term("operand", i, i + name.length);
			i += name.length;
		} else if (
			NUMBER.test(rest) &&
			(i === from || !/[\w.$-]/.test(text[i - 1]))
		) {
			const number = NUMBER.exec(rest)?.[0] ?? c;
			const unit = /^[A-Za-z%]+/.exec(text.slice(i + number.length, to));
			if (unit) {
				term("other", i, i + number.length + unit[0].length);
				i += number.length + unit[0].length;
			} else {
				term("number", i, i + number.length, [Number(number)]);
				i += number.length;
			}
		} else if (c === "(" || IDENTIFIER.test(rest)) {
			const name = c === "(" ? "" : (IDENTIFIER.exec(rest)?.[0] ?? "");
			const open = i + name.length;
			if (text[open] === "(") {
				const close = Math.min(to - 1, closingBracket(text, open));
				const whole = text.slice(i, close + 1);
				// A group or call that is plain arithmetic (`(2)`,
				// `math.div(1, 2)`) is the number it compiles to.
				const values = evaluateArithmetic(whole, lookup, i);
				if (values !== undefined) term("number", i, close + 1, values);
				else term(SCALES.test(whole) ? "operand" : "other", i, close + 1);
				scanMultiplierLevel(text, open + 1, close, sites, lookup);
				i = close + 1;
			} else {
				term("other", i, open);
				i = open;
			}
		} else {
			tokens.push({ type: "break" });
			i++;
		}
	}
	// Chains: term (op term)*. A term right after a term, or a break, starts
	// a new chain; a dangling operator is left out.
	const chains: MultiplierChain[] = [];
	let current: MultiplierChain | null = null;
	let pending: { op: "*" | "/"; start: number } | null = null;
	for (const token of tokens) {
		if (token.type === "term" && current !== null && pending !== null) {
			current.links.push({ op: pending.op, term: token.term });
			if (current.at === -1) current.at = pending.start;
			pending = null;
		} else if (token.type === "term") {
			current = { links: [{ op: null, term: token.term }], at: -1 };
			chains.push(current);
		} else if (token.type === "op" && current !== null && pending === null) {
			pending = { op: token.op, start: token.start };
		} else {
			current = null;
			pending = null;
		}
	}
	for (const { links, at } of chains) {
		const terms = links.map((link) => link.term);
		if (!terms.some((t) => t.kind === "number")) continue;
		if (!terms.some((t) => t.kind === "operand")) continue;
		// The chain's factor: its numbers multiplied, or divided after a `/`,
		// once per combination of the values its loop variables take. The
		// chain is a site unless every factor is +1 or -1.
		let products: number[] = [1];
		for (const { op, term } of links) {
			if (term.kind !== "number") continue;
			products = uniqueValues(
				products.flatMap((p) =>
					term.values.map((value) => (op === "/" ? p / value : p * value)),
				),
			);
		}
		if (products.every((p) => Math.abs(Math.abs(p) - 1) < 1e-9)) continue;
		const shown = links
			.map(({ op, term }) => {
				const part = term.text.replace(/\s+/g, " ");
				return op === null ? part : `${op} ${part}`;
			})
			.join(" ");
		sites.push([at, shown]);
	}
};

/**
 * The multipliers in one SCSS source. A site is a chain of terms joined by
 * `*` and `/` that holds something that scales (a theme read, a call, group
 * or Sass interpolation holding one or a Sass variable, or a bare Sass
 * variable) and at least one unitless number, unless the numbers multiply to
 * +1 or -1: a sign flip (`* -1`, `-1 *`, `/ -1`) is not a multiplier (H-R7),
 * but `* -1 / 2` is (H-R28a). A Sass variable that holds a number is a
 * number, bare or interpolated, since that is what it compiles to: a
 * constant (`$tip: 0.31;`, `$f: math.div(1, 2);`, `$g: $f * 2;`) declared at
 * the top level or inside a block, within its scope, and a loop variable
 * over numbers (`@each` over a list or a map's values, `@for`), which is a
 * site when any pass's factor is not +1 or -1. So are an interpolation, group
 * or call that is plain arithmetic over numbers and those variables
 * (`#{1 - $tip}`, `(2)`). Factors with a unit (`$deg * 1deg`), ratios of two
 * variables and a number scaling a number are not sites. A chain is one
 * site, reported whole (`var(--r) / 3 * 2`) at its first operator's line.
 * Comments and url() payloads are skipped, as for literals.
 */
export const scanMultipliersInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	const text = blankClassicyScssUrlPayloads(blankClassicyScssComments(source));
	const sites: [number, string][] = [];
	scanMultiplierLevel(text, 0, text.length, sites, sassBindingsOf(text));
	sites.sort(([a], [b]) => a - b);
	let line = 1;
	let counted = 0;
	return sites.map(([at, site]) => {
		for (; counted < at; counted++) {
			if (text[counted] === "\n") line++;
		}
		return { file, line, text: site, kind: "multiplier" };
	});
};

/**
 * Every multiplier in `<root>/src/**\/*.scss`, keyed by repo-relative path
 * (sorted), skipping the screen savers. Files without one are absent.
 */
export const scanMultipliers = (
	root: string,
): Map<string, ClassicyPixelLiteral[]> => {
	const found = new Map<string, ClassicyPixelLiteral[]>();
	for (const full of listClassicyScssFiles(join(root, "src"))) {
		const file = relative(root, full).split(sep).join("/");
		if (file.startsWith(SAVERS)) continue;
		const sites = scanMultipliersInSource(readFileSync(full, "utf8"), file);
		if (sites.length > 0) found.set(file, sites);
	}
	return found;
};

/** One kept group in bin/multiplier-allowlist.json. */
export type ClassicyMultiplierAllowance = { count: number; reason: string };

const isAllowance = (group: unknown): group is ClassicyMultiplierAllowance => {
	if (typeof group !== "object" || group === null) return false;
	const { count, reason } = group as Record<string, unknown>;
	return (
		typeof count === "number" &&
		Number.isInteger(count) &&
		count > 0 &&
		typeof reason === "string" &&
		reason.trim() !== "" &&
		!reason.includes("\n")
	);
};

/**
 * The multiplier ratchet: as `checkPixelLiteralAllowlist`, over a file's
 * total, where each entry is a non-empty list of `{ count, reason }` groups
 * and every reason is one non-blank line.
 */
export const checkMultiplierAllowlist = (
	found: Map<string, ClassicyPixelLiteral[]>,
	allowlist: Readonly<Record<string, unknown>>,
): string[] => {
	const files = [
		...new Set([...found.keys(), ...Object.keys(allowlist)]),
	].sort();
	return files.flatMap((file) => {
		const sites = found.get(file) ?? [];
		let listed = 0;
		if (Object.hasOwn(allowlist, file)) {
			const groups = allowlist[file];
			if (
				!Array.isArray(groups) ||
				groups.length === 0 ||
				!groups.every(isAllowance)
			) {
				return [
					`invalid multiplier allowlist entry for ${file}: each group needs a whole count of 1 or more and a one-line reason`,
				];
			}
			listed = groups.reduce((sum, group) => sum + group.count, 0);
		}
		if (sites.length < listed) {
			return [
				`tighten the multiplier allowlist for ${file}: ${sites.length} < ${listed}`,
			];
		}
		if (sites.length > listed) {
			return sites.map((site) => `${file}:${site.line} ${site.text}`);
		}
		return [];
	});
};

/**
 * The ratchet: one message per breach, empty when `found` matches the
 * allowlist exactly. An entry must be a positive whole count: a `0` entry
 * (delete it instead) or any other value is reported as invalid. A file
 * below its listed count asks for the list to be tightened; a file above it
 * (or unlisted with any literal) lists each of its literals as
 * `<file>:<line> <text>`.
 */
export const checkPixelLiteralAllowlist = (
	found: Map<string, ClassicyPixelLiteral[]>,
	allowlist: Readonly<Record<string, unknown>>,
): string[] => {
	const files = [
		...new Set([...found.keys(), ...Object.keys(allowlist)]),
	].sort();
	return files.flatMap((file) => {
		const literals = found.get(file) ?? [];
		const listed = Object.hasOwn(allowlist, file) ? allowlist[file] : 0;
		if (listed === 0 && Object.hasOwn(allowlist, file)) {
			return [
				`invalid allowlist entry for ${file}: 0 (a file with no literals left must be removed from the list)`,
			];
		}
		if (typeof listed !== "number" || !Number.isInteger(listed) || listed < 0) {
			return [
				`invalid allowlist entry for ${file}: ${JSON.stringify(listed)} (a count must be a positive whole number)`,
			];
		}
		if (literals.length < listed) {
			return [
				`tighten the allowlist for ${file}: ${literals.length} < ${listed}`,
			];
		}
		if (literals.length > listed) {
			return literals.map(
				(literal) => `${file}:${literal.line} ${literal.text}`,
			);
		}
		return [];
	});
};

function main(): void {
	// The repo root, from this file's own location (bin/..), so the check
	// does not depend on the working directory.
	const root = fileURLToPath(new URL("..", import.meta.url));
	const allowlistPath = join(root, "bin", "pixel-literal-allowlist.json");
	if (process.argv.includes("--list-multipliers")) {
		for (const sites of scanMultipliers(root).values()) {
			for (const site of sites) {
				process.stdout.write(`${site.file}:${site.line} ${site.text}\n`);
			}
		}
		return;
	}
	const found = scanPixelLiterals(root);
	if (process.argv.includes("--write-allowlist")) {
		const literals = [...found.values()].flat();
		const fallbacks = literals.filter((literal) => literal.kind === "fallback");
		const counts = Object.fromEntries(
			[...found.entries()]
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([file, inFile]) => [file, inFile.length]),
		);
		writeFileSync(allowlistPath, `${JSON.stringify(counts, null, "\t")}\n`);
		process.stdout.write(
			`wrote ${relative(root, allowlistPath)}: ${literals.length - fallbacks.length} bare + ${fallbacks.length} fallback over ${found.size} files\n`,
		);
		return;
	}
	const allowlist: Record<string, unknown> = JSON.parse(
		readFileSync(allowlistPath, "utf8"),
	);
	const messages = checkPixelLiteralAllowlist(found, allowlist);
	for (const message of messages) process.stdout.write(`${message}\n`);
	if (messages.length > 0) {
		process.stderr.write(
			"pixel literals out of step with bin/pixel-literal-allowlist.json: read a theme variable instead of a new literal, and lower a file's count when you remove one\n",
		);
	}
	const multiplierMessages = checkMultiplierAllowlist(
		scanMultipliers(root),
		JSON.parse(
			readFileSync(join(root, "bin", "multiplier-allowlist.json"), "utf8"),
		),
	);
	for (const message of multiplierMessages) {
		process.stdout.write(`${message}\n`);
	}
	if (multiplierMessages.length > 0) {
		process.stderr.write(
			"multipliers out of step with bin/multiplier-allowlist.json: name the proportion (a derivation or a knob) instead of scaling a theme variable by a bare number, and lower a file's count when you remove one\n",
		);
	}
	if (messages.length > 0 || multiplierMessages.length > 0) process.exit(1);
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main();
}

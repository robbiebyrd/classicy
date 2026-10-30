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
// Exempt: `0px`, `calc(infinity * 1px)`, `@media`/`@container` prelude lines,
// comments, url() payloads, and the screen savers (ported After Dark art).
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
const INFINITY = /\binfinity\s*\*\s*1px/gi;
const PRELUDE = /^@(media|container)\b/;
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

/** The pixel literals in one SCSS source; `file` is relative to the root. */
export const scanPixelLiteralsInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	// Prelude lines (their parentheses included) and `infinity * 1px` are
	// blanked like comments, so lines and columns still point into the file.
	const text = blankClassicyScssUrlPayloads(blankClassicyScssComments(source))
		.split("\n")
		.map((line) => (PRELUDE.test(line.trim()) ? blank(line) : line))
		.join("\n")
		.replace(INFINITY, blank);
	const isFallbackAt = fallbackTracker(text);
	const found: ClassicyPixelLiteral[] = [];
	let line = 1;
	let counted = 0;
	for (const match of text.matchAll(PIXEL_LITERAL)) {
		for (; counted < match.index; counted++) {
			if (text[counted] === "\n") line++;
		}
		if (ZERO.test(match[0])) continue;
		found.push({
			file,
			line,
			text: match[0],
			kind: isFallbackAt(match.index) ? "fallback" : "bare",
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
	value: number;
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
): void => {
	const tokens: MultiplierToken[] = [];
	const term = (
		kind: MultiplierTerm["kind"],
		start: number,
		end: number,
		value = Number.NaN,
	) =>
		tokens.push({
			type: "term",
			term: { kind, text: text.slice(start, end), value },
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
			term(SCALES.test(inner) ? "operand" : "other", i, close + 1);
			scanMultiplierLevel(text, i + 2, close, sites);
			i = close + 1;
		} else if (c === "$" && SASS_VARIABLE.test(rest)) {
			const name = SASS_VARIABLE.exec(rest)?.[0] ?? c;
			term("operand", i, i + name.length);
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
				term("number", i, i + number.length, Number(number));
				i += number.length;
			}
		} else if (c === "(" || IDENTIFIER.test(rest)) {
			const name = c === "(" ? "" : (IDENTIFIER.exec(rest)?.[0] ?? "");
			const open = i + name.length;
			if (text[open] === "(") {
				const close = Math.min(to - 1, closingBracket(text, open));
				const whole = text.slice(i, close + 1);
				term(SCALES.test(whole) ? "operand" : "other", i, close + 1);
				scanMultiplierLevel(text, open + 1, close, sites);
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
		// The chain's factor: its numbers multiplied, or divided after a `/`.
		const product = links.reduce(
			(p, { op, term }) =>
				term.kind !== "number"
					? p
					: op === "/"
						? p / term.value
						: p * term.value,
			1,
		);
		if (Math.abs(Math.abs(product) - 1) < 1e-9) continue;
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
 * but `* -1 / 2` is (H-R28a). Factors with a unit (`$deg * 1deg`), ratios of
 * two variables and a number scaling a number are not sites. A chain is one
 * site, reported whole (`var(--r) / 3 * 2`) at its first operator's line.
 * Comments and url() payloads are skipped, as for literals.
 */
export const scanMultipliersInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	const text = blankClassicyScssUrlPayloads(blankClassicyScssComments(source));
	const sites: [number, string][] = [];
	scanMultiplierLevel(text, 0, text.length, sites);
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

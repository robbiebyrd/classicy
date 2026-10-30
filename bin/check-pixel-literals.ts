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

// A factor: a unitless number, sign included, not the head of a length
// (`2px`), a percentage, a decimal's next digits or a call.
const FACTOR = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.%(])/;
// A number written before `*` (`2 * var(--x)`), read backward from the `*`.
const LEADING_FACTOR = /(?<![\w.$-])-?(?:\d+(?:\.\d+)?|\.\d+)\s*$/;
// What scales: a call or group holding a theme read (`var(`) or a Sass
// variable (which may hold one), or a bare Sass variable.
const SCALES = /var\(|\$/;

/** The index of the `(` matching the `)` at `close`, or -1. */
const openingParen = (text: string, close: number): number => {
	for (let depth = 0, i = close; i >= 0; i--) {
		if (text[i] === ")") depth++;
		else if (text[i] === "(" && --depth === 0) return i;
	}
	return -1;
};

/** The index of the `)` matching the `(` at `open`, or -1. */
const closingParen = (text: string, open: number): number => {
	for (let depth = 0, i = open; i < text.length; i++) {
		if (text[i] === "(") depth++;
		else if (text[i] === ")" && --depth === 0) return i;
	}
	return -1;
};

/** The operand that ends at `end` (inclusive), when it scales, else null. */
const operandEndingAt = (text: string, end: number): string | null => {
	if (text[end] === ")") {
		const open = openingParen(text, end);
		if (open === -1) return null;
		let start = open;
		while (start > 0 && /[\w.-]/.test(text[start - 1])) start--;
		const operand = text.slice(start, end + 1);
		return SCALES.test(operand) ? operand : null;
	}
	const name = /\$[\w-]+$/.exec(text.slice(Math.max(0, end - 63), end + 1));
	return name ? name[0] : null;
};

/** The operand that starts at `start`, when it scales, else null. */
const operandStartingAt = (text: string, start: number): string | null => {
	const name = /^(?:\$[\w-]+|[\w.-]*\()/.exec(text.slice(start, start + 64));
	if (!name) return null;
	if (name[0].startsWith("$")) return name[0];
	const close = closingParen(text, start + name[0].length - 1);
	if (close === -1) return null;
	const operand = text.slice(start, close + 1);
	return SCALES.test(operand) ? operand : null;
};

const isSignFlip = (factor: string): boolean => Number(factor) === -1;

/**
 * The multipliers in one SCSS source: every theme read (or group holding one)
 * multiplied or divided by a bare number, and every bare number multiplying
 * one. Sign flips (`* -1`, `-1 *`, `/ -1`) are not multipliers (H-R7), nor are
 * factors with a unit (`$deg * 1deg`), ratios of two variables, or a number
 * scaling a number. A chain scales its operand once (`var(--r) / 3 * 2` is
 * one site). Comments and url() payloads are skipped, as for literals.
 */
export const scanMultipliersInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	const text = blankClassicyScssUrlPayloads(blankClassicyScssComments(source));
	const found: ClassicyPixelLiteral[] = [];
	let line = 1;
	let counted = 0;
	for (let i = 0; i < text.length; i++) {
		const op = text[i];
		if (op !== "*" && op !== "/") continue;
		const before = text.slice(0, i).trimEnd();
		const after = text.slice(i + 1);
		const right = after.trimStart();
		const rightAt = i + 1 + (after.length - right.length);
		let site: string | null = null;
		const factor = FACTOR.exec(right)?.[0];
		const operand =
			factor === undefined ? null : operandEndingAt(text, before.length - 1);
		if (factor !== undefined && operand !== null) {
			if (!isSignFlip(factor)) site = `${operand} ${op} ${factor}`;
		} else if (op === "*") {
			const lead = LEADING_FACTOR.exec(before);
			const scaled = lead ? operandStartingAt(text, rightAt) : null;
			const leading = lead?.[0].trim();
			const chained = /[*/]\s*$/.test(before.slice(0, lead?.index ?? 0));
			if (leading !== undefined && scaled !== null && !chained) {
				if (!isSignFlip(leading)) site = `${leading} * ${scaled}`;
			}
		}
		if (site === null) continue;
		for (; counted < i; counted++) {
			if (text[counted] === "\n") line++;
		}
		found.push({
			file,
			line,
			text: site.replace(/\s+/g, " "),
			kind: "multiplier",
		});
	}
	return found;
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

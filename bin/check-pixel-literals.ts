// The pixel-literal gate (Part H 1.1): Classicy's SCSS reads its sizes from
// theme variables, so every `Npx` literal left in src is debt, held by a
// ratchet. bin/pixel-literal-allowlist.json lists, per file, how many literals
// it may still hold; a file must hold exactly that many (fewer means the list
// must be tightened, more means a new literal), and an unlisted file none.
// The list only shrinks, and ends empty.
//
//   node bin/check-pixel-literals.ts                    check; exit 1 on any message
//   node bin/check-pixel-literals.ts --write-allowlist  reseed the list from src
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
	/** `fallback`: after the comma of its own `var(--x, …)`. */
	kind: "bare" | "fallback";
};

// A pixel length not preceded by an identifier character, a digit's dot or a
// hyphen-joined name, so `.x10px` and `$a-3px` never match.
const PIXEL_LITERAL = /(?<![\w.-])-?\d+(\.\d+)?px/g;
const ZERO = /^-?0+(\.0+)?px$/;
const INFINITY = /\binfinity\s*\*\s*1px/gi;
const PRELUDE = /^@(media|container)\b/;
const SAVERS = "src/SystemFolder/Extensions/ScreenSaver/savers/";

const blank = (text: string): string => " ".repeat(text.length);

/**
 * Whether the literal at `index` sits after the comma of its own enclosing
 * `var(--x, …)`. A parenthesis stack, so a var() that closed earlier on the
 * line (`px-rect(var(--c), 1px)`) does not make what follows a fallback.
 */
const isFallback = (line: string, index: number): boolean => {
	const stack: { isVar: boolean; afterComma: boolean }[] = [];
	for (let i = 0; i < index; i++) {
		const c = line[i];
		if (c === "(") {
			const isVar = /(?:^|[^\w-])var$/i.test(line.slice(Math.max(0, i - 4), i));
			stack.push({ isVar, afterComma: false });
		} else if (c === ")") {
			stack.pop();
		} else if (c === "," && stack.length > 0) {
			stack[stack.length - 1].afterComma = true;
		}
	}
	return stack.some((frame) => frame.isVar && frame.afterComma);
};

/** The pixel literals in one SCSS source; `file` is relative to the root. */
export const scanPixelLiteralsInSource = (
	source: string,
	file: string,
): ClassicyPixelLiteral[] => {
	const found: ClassicyPixelLiteral[] = [];
	blankClassicyScssUrlPayloads(blankClassicyScssComments(source))
		.split("\n")
		.forEach((raw, index) => {
			if (PRELUDE.test(raw.trim())) return;
			const line = raw.replace(INFINITY, blank);
			for (const match of line.matchAll(PIXEL_LITERAL)) {
				if (ZERO.test(match[0])) continue;
				found.push({
					file,
					line: index + 1,
					text: match[0],
					kind: isFallback(line, match.index) ? "fallback" : "bare",
				});
			}
		});
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

/**
 * The ratchet: one message per breach, empty when `found` matches the
 * allowlist exactly. A file below its listed count asks for the list to be
 * tightened; a file above it (or unlisted with any literal) lists each of its
 * literals as `<file>:<line> <text>`.
 */
export const checkPixelLiteralAllowlist = (
	found: Map<string, ClassicyPixelLiteral[]>,
	allowlist: Record<string, number>,
): string[] => {
	const files = [
		...new Set([...found.keys(), ...Object.keys(allowlist)]),
	].sort();
	return files.flatMap((file) => {
		const literals = found.get(file) ?? [];
		const listed = allowlist[file] ?? 0;
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
	const allowlist: Record<string, number> = JSON.parse(
		readFileSync(allowlistPath, "utf8"),
	);
	const messages = checkPixelLiteralAllowlist(found, allowlist);
	for (const message of messages) process.stdout.write(`${message}\n`);
	if (messages.length > 0) {
		process.stderr.write(
			"pixel literals out of step with bin/pixel-literal-allowlist.json: read a theme variable instead of a new literal, and lower a file's count when you remove one\n",
		);
		process.exit(1);
	}
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main();
}

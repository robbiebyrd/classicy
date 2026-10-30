// Shared SCSS source handling for the repo's static sweeps: the literal-color
// sweep (Part G, classicyLiteralColorSweep.ts) and the pixel-literal gate
// (Part H, check-pixel-literals.ts). Both read SCSS as text, so both must
// agree on what is not a declaration value: comments and url() payloads.
//
// Every function here blanks (replaces with spaces) rather than deletes, and
// keeps each newline, so line numbers and columns still point into the file.
//
// Build script, not library code. Erasable TypeScript syntax only, so Node
// runs the importing scripts directly.
import { readdirSync } from "node:fs";
import { join } from "node:path";

const blank = (text: string): string => text.replace(/[^\n]/g, " ");

/**
 * The index just past the quoted string opening at `start`. A CSS string
 * cannot hold a raw newline, so an unterminated one ends at the line's end.
 */
const stringEnd = (source: string, start: number): number => {
	const quote = source[start];
	for (let i = start + 1; i < source.length; i++) {
		const c = source[i];
		if (c === "\\") i++;
		else if (c === quote) return i + 1;
		else if (c === "\n") return i;
	}
	return source.length;
};

/**
 * The index of the `)` matching the `(` at `open`, skipping quoted strings;
 * `source.length` when it is never closed.
 */
const closingParen = (source: string, open: number): number => {
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		const c = source[i];
		if (c === '"' || c === "'") {
			i = stringEnd(source, i) - 1;
		} else if (c === "(") {
			depth++;
		} else if (c === ")") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return source.length;
};

/** Whether a `url(` function starts at `i` (not the tail of an identifier). */
const isUrlAt = (source: string, i: number): boolean =>
	source.slice(i, i + 4).toLowerCase() === "url(" &&
	(i === 0 || !/[\w-]/.test(source[i - 1]));

/**
 * The source with every comment blanked: `/* … *\/` (across lines) and `//`
 * to the end of the line. A comment marker inside a quoted string or a url()
 * is not one, and neither is the `//` of a `://` (a URL scheme).
 */
export const blankClassicyScssComments = (source: string): string => {
	let out = "";
	let i = 0;
	while (i < source.length) {
		const c = source[i];
		let end = i + 1;
		let comment = false;
		if (c === '"' || c === "'") {
			end = stringEnd(source, i);
		} else if (isUrlAt(source, i)) {
			end = Math.min(closingParen(source, i + 3) + 1, source.length);
		} else if (source.startsWith("/*", i)) {
			const close = source.indexOf("*/", i + 2);
			end = close === -1 ? source.length : close + 2;
			comment = true;
		} else if (source.startsWith("//", i) && source[i - 1] !== ":") {
			const newline = source.indexOf("\n", i);
			end = newline === -1 ? source.length : newline;
			comment = true;
		}
		const span = source.slice(i, end);
		out += comment ? blank(span) : span;
		i = end;
	}
	return out;
};

/**
 * The source with every url() payload blanked (`url(…)` keeps its name and
 * parentheses; nested parentheses and quotes inside it are handled), and with
 * every quoted `data:` string blanked, the art a Sass variable holds before it
 * is wrapped in url(). Run it on source whose comments are already blanked.
 */
export const blankClassicyScssUrlPayloads = (source: string): string => {
	let out = "";
	let i = 0;
	while (i < source.length) {
		const c = source[i];
		let end = i + 1;
		let span = c;
		if (c === '"' || c === "'") {
			end = stringEnd(source, i);
			span = source.slice(i, end);
			if (/^["']data:/i.test(span)) span = blank(span);
		} else if (isUrlAt(source, i)) {
			const close = closingParen(source, i + 3);
			end = Math.min(close + 1, source.length);
			const payload = blank(source.slice(i + 4, close));
			span = `${source.slice(i, i + 4)}${payload}${close < source.length ? ")" : ""}`;
		}
		out += span;
		i = end;
	}
	return out;
};

/** Every `.scss` file under `dir`, recursively, sorted by name per folder. */
export const listClassicyScssFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true })
		.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
		.flatMap((entry) => {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) return listClassicyScssFiles(full);
			return entry.name.endsWith(".scss") ? [full] : [];
		});

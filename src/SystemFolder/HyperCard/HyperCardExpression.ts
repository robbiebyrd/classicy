/**
 * A small expression evaluator for HyperCard action value strings. This is NOT
 * HyperTalk — it is a compact, HyperTalk-flavoured expression language used only
 * for the value/condition strings inside declarative actions:
 *
 *   "score + 1"            arithmetic
 *   "field \"name\" & \"!\""  concatenation + field read
 *   "count > 10 and done"  comparison + boolean logic
 *
 * Operators (low→high precedence): or · and · not · comparison
 * (= == is <> ≠ != < > <= >=) · & (concat) · + - · * / mod · unary - · primary.
 * Primaries: numbers, "quoted strings", ( … ), `field <id>`, identifiers
 * (variable lookup, else the bare word as a string), and the literals
 * true / false / empty.
 *
 * Parsing is resilient: a malformed source falls back to the raw string so an
 * authoring typo degrades to literal text rather than throwing.
 */

import type { HCValue } from "@/SystemFolder/HyperCard/HyperCardModel";

export type HCEvalValue = number | string | boolean;

export interface HCEvalContext {
	getVar(name: string): HCValue | undefined;
	getField(id: string): string | undefined;
}

type Tok =
	| { t: "num"; v: number }
	| { t: "str"; v: string }
	| { t: "word"; v: string }
	| { t: "op"; v: string }
	| { t: "eof" };

const OPERATOR_RE = /^(<=|>=|<>|==|!=|≠|&&|=|<|>|&|\+|-|\*|\/|\(|\))/;

function tokenize(src: string): Tok[] {
	const toks: Tok[] = [];
	let i = 0;
	while (i < src.length) {
		const c = src[i];
		if (c === " " || c === "\t" || c === "\n" || c === "\r") {
			i++;
			continue;
		}
		if (c === '"') {
			let j = i + 1;
			let s = "";
			while (j < src.length && src[j] !== '"') {
				s += src[j];
				j++;
			}
			toks.push({ t: "str", v: s });
			i = j + 1;
			continue;
		}
		if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
			const m = src.slice(i).match(/^[0-9]*\.?[0-9]+/);
			if (m) {
				toks.push({ t: "num", v: parseFloat(m[0]) });
				i += m[0].length;
				continue;
			}
		}
		const opM = src.slice(i).match(OPERATOR_RE);
		if (opM) {
			toks.push({ t: "op", v: opM[0] });
			i += opM[0].length;
			continue;
		}
		const wM = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_.]*/);
		if (wM) {
			toks.push({ t: "word", v: wM[0] });
			i += wM[0].length;
			continue;
		}
		// Unknown character — skip it to stay resilient.
		i++;
	}
	toks.push({ t: "eof" });
	return toks;
}

const KEYWORD_OPS = new Set(["and", "or", "not", "is", "mod"]);

class Parser {
	private pos = 0;
	constructor(
		private readonly toks: Tok[],
		private readonly ctx: HCEvalContext,
	) {}

	private peek(): Tok {
		return this.toks[this.pos];
	}
	private next(): Tok {
		return this.toks[this.pos++];
	}
	private isWord(v: string): boolean {
		const t = this.peek();
		return t.t === "word" && t.v.toLowerCase() === v;
	}
	private isOp(v: string): boolean {
		const t = this.peek();
		return t.t === "op" && t.v === v;
	}

	parse(): HCEvalValue {
		const v = this.parseOr();
		if (this.peek().t !== "eof") {
			throw new Error("Unexpected trailing tokens");
		}
		return v;
	}

	private parseOr(): HCEvalValue {
		let left = this.parseAnd();
		while (this.isWord("or")) {
			this.next();
			const right = this.parseAnd();
			left = toBool(left) || toBool(right);
		}
		return left;
	}

	private parseAnd(): HCEvalValue {
		let left = this.parseNot();
		while (this.isWord("and")) {
			this.next();
			const right = this.parseNot();
			left = toBool(left) && toBool(right);
		}
		return left;
	}

	private parseNot(): HCEvalValue {
		if (this.isWord("not")) {
			this.next();
			return !toBool(this.parseNot());
		}
		return this.parseComparison();
	}

	private parseComparison(): HCEvalValue {
		let left = this.parseConcat();
		for (;;) {
			const t = this.peek();
			let op: string | undefined;
			if (
				t.t === "op" &&
				["=", "==", "<>", "!=", "≠", "<", ">", "<=", ">="].includes(t.v)
			) {
				op = t.v;
			} else if (t.t === "word" && t.v.toLowerCase() === "is") {
				op = "=";
			}
			if (!op) break;
			this.next();
			const right = this.parseConcat();
			left = compare(op, left, right);
		}
		return left;
	}

	private parseConcat(): HCEvalValue {
		let left = this.parseAdd();
		while (this.isOp("&") || this.isOp("&&")) {
			this.next();
			const right = this.parseAdd();
			left = toStr(left) + toStr(right);
		}
		return left;
	}

	private parseAdd(): HCEvalValue {
		let left = this.parseMul();
		for (;;) {
			if (this.isOp("+")) {
				this.next();
				left = toNum(left) + toNum(this.parseMul());
			} else if (this.isOp("-")) {
				this.next();
				left = toNum(left) - toNum(this.parseMul());
			} else break;
		}
		return left;
	}

	private parseMul(): HCEvalValue {
		let left = this.parseUnary();
		for (;;) {
			if (this.isOp("*")) {
				this.next();
				left = toNum(left) * toNum(this.parseUnary());
			} else if (this.isOp("/")) {
				this.next();
				left = toNum(left) / toNum(this.parseUnary());
			} else if (this.isWord("mod")) {
				this.next();
				left = toNum(left) % toNum(this.parseUnary());
			} else break;
		}
		return left;
	}

	private parseUnary(): HCEvalValue {
		if (this.isOp("-")) {
			this.next();
			return -toNum(this.parseUnary());
		}
		return this.parsePrimary();
	}

	private parsePrimary(): HCEvalValue {
		const t = this.next();
		if (t.t === "num") return t.v;
		if (t.t === "str") return t.v;
		if (t.t === "op" && t.v === "(") {
			const v = this.parseOr();
			if (!this.isOp(")")) throw new Error("Expected )");
			this.next();
			return v;
		}
		if (t.t === "word") {
			const w = t.v.toLowerCase();
			if (w === "true") return true;
			if (w === "false") return false;
			if (w === "empty") return "";
			if (w === "field" || w === "fld" || w === "card" || w === "bg") {
				// `field <id>` / `field "id"` — read a field's value.
				const idTok = this.next();
				const id =
					idTok.t === "str" || idTok.t === "word"
						? String((idTok as { v: string }).v)
						: "";
				return this.ctx.getField(id) ?? "";
			}
			if (KEYWORD_OPS.has(w)) {
				throw new Error(`Unexpected operator word "${t.v}"`);
			}
			// Bare identifier: a variable if defined, else the literal word.
			const varVal = this.ctx.getVar(t.v);
			return varVal !== undefined ? varVal : t.v;
		}
		throw new Error("Unexpected token in expression");
	}
}

function toNum(v: HCEvalValue): number {
	if (typeof v === "number") return v;
	if (typeof v === "boolean") return v ? 1 : 0;
	const n = parseFloat(v);
	return Number.isNaN(n) ? 0 : n;
}

function toStr(v: HCEvalValue): string {
	if (typeof v === "string") return v;
	if (typeof v === "boolean") return v ? "true" : "false";
	return String(v);
}

function toBool(v: HCEvalValue): boolean {
	if (typeof v === "boolean") return v;
	if (typeof v === "number") return v !== 0;
	const s = v.toLowerCase().trim();
	if (s === "true") return true;
	if (s === "false" || s === "") return false;
	const n = parseFloat(s);
	return !Number.isNaN(n) && n !== 0;
}

function looksNumeric(v: HCEvalValue): boolean {
	if (typeof v === "number") return true;
	if (typeof v === "boolean") return false;
	return v.trim() !== "" && !Number.isNaN(Number(v));
}

function compare(op: string, a: HCEvalValue, b: HCEvalValue): boolean {
	// Compare numerically when both sides look like numbers, else as strings.
	const numeric = looksNumeric(a) && looksNumeric(b);
	const x: number | string = numeric ? toNum(a) : toStr(a);
	const y: number | string = numeric ? toNum(b) : toStr(b);
	switch (op) {
		case "=":
		case "==":
			return x === y;
		case "<>":
		case "!=":
		case "≠":
			return x !== y;
		case "<":
			return x < y;
		case ">":
			return x > y;
		case "<=":
			return x <= y;
		case ">=":
			return x >= y;
	}
	return false;
}

/** Coerce an already-evaluated value to a number (booleans → 1/0, strings → parseFloat). */
export const coerceNumber = toNum;
/** Coerce an already-evaluated value to a string (booleans → "true"/"false"). */
export const coerceString = toStr;
/** Coerce an already-evaluated value to a boolean. */
export const coerceBool = toBool;

/** Evaluate an expression to its raw value. Falls back to the source string. */
export function evaluate(src: string, ctx: HCEvalContext): HCEvalValue {
	try {
		return new Parser(tokenize(src), ctx).parse();
	} catch {
		return src;
	}
}

export function evaluateToString(src: string, ctx: HCEvalContext): string {
	return toStr(evaluate(src, ctx));
}

export function evaluateToNumber(src: string, ctx: HCEvalContext): number {
	return toNum(evaluate(src, ctx));
}

export function evaluateToBool(src: string, ctx: HCEvalContext): boolean {
	return toBool(evaluate(src, ctx));
}

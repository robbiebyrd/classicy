import { describe, expect, it } from "vitest";
import {
	evaluate,
	evaluateToBool,
	evaluateToNumber,
	evaluateToString,
	type HCEvalContext,
} from "@/SystemFolder/HyperCard/HyperCardExpression";

function ctx(
	vars: Record<string, string | number> = {},
	fields: Record<string, string> = {},
): HCEvalContext {
	return {
		getVar: (n) => vars[n],
		getField: (id) => fields[id],
	};
}

describe("HyperCardExpression", () => {
	it("evaluates numeric literals and arithmetic with precedence", () => {
		expect(evaluateToNumber("2 + 3 * 4", ctx())).toBe(14);
		expect(evaluateToNumber("(2 + 3) * 4", ctx())).toBe(20);
		expect(evaluateToNumber("10 - 4 - 2", ctx())).toBe(4);
		expect(evaluateToNumber("10 / 4", ctx())).toBe(2.5);
		expect(evaluateToNumber("10 mod 3", ctx())).toBe(1);
		expect(evaluateToNumber("-5 + 2", ctx())).toBe(-3);
	});

	it("reads variables and fields", () => {
		const c = ctx({ score: 41 }, { name: "Ada" });
		expect(evaluateToNumber("score + 1", c)).toBe(42);
		expect(evaluateToString('field "name"', c)).toBe("Ada");
		expect(evaluateToString("field name", c)).toBe("Ada");
	});

	it("concatenates with &", () => {
		const c = ctx({ n: "World" });
		expect(evaluateToString('"Hello, " & n & "!"', c)).toBe("Hello, World!");
		expect(evaluateToString("1 & 2", ctx())).toBe("12");
	});

	it("compares numerically and as strings", () => {
		expect(evaluateToBool("10 > 2", ctx())).toBe(true);
		expect(evaluateToBool("2 >= 2", ctx())).toBe(true);
		expect(evaluateToBool("5 = 5", ctx())).toBe(true);
		expect(evaluateToBool("5 <> 6", ctx())).toBe(true);
		expect(evaluateToBool('"yes" is "yes"', ctx())).toBe(true);
		expect(evaluateToBool('"abc" < "abd"', ctx())).toBe(true);
	});

	it("handles boolean logic and literals", () => {
		expect(evaluateToBool("true and false", ctx())).toBe(false);
		expect(evaluateToBool("true or false", ctx())).toBe(true);
		expect(evaluateToBool("not false", ctx())).toBe(true);
		expect(evaluateToBool("count > 3 and count < 10", ctx({ count: 5 }))).toBe(
			true,
		);
		expect(evaluate("empty", ctx())).toBe("");
	});

	it("treats an unknown bare word as a literal string", () => {
		expect(evaluateToString("hello", ctx())).toBe("hello");
	});

	it("falls back to the raw source on a parse error", () => {
		expect(evaluateToString("Game Over", ctx())).toBe("Game Over");
	});

	it("coerces string numbers for comparison and math", () => {
		const c = ctx({ score: "9" });
		expect(evaluateToNumber("score + 1", c)).toBe(10);
		expect(evaluateToBool("score < 10", c)).toBe(true);
	});
});

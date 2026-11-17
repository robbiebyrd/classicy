// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	CALCULATOR_ERROR_DISPLAY,
	CALCULATOR_INITIAL_STATE,
	type CalculatorKey,
	type CalculatorState,
	formatCalculatorNumber,
	pressCalculatorKey,
} from "@/SystemFolder/Calculator/CalculatorEngine";

/** Press each character of `keys` (spaces ignored) from a cleared calculator. */
const press = (
	keys: string,
	from: CalculatorState = CALCULATOR_INITIAL_STATE,
): CalculatorState =>
	[...keys.replace(/\s/g, "")].reduce(
		(state, key) => pressCalculatorKey(state, key as CalculatorKey),
		from,
	);

const display = (keys: string) => press(keys).display;

describe("pressCalculatorKey", () => {
	it("starts at 0 and types numbers, dropping a leading zero", () => {
		expect(CALCULATOR_INITIAL_STATE.display).toBe("0");
		expect(display("007")).toBe("7");
		expect(display("123")).toBe("123");
	});

	it("types one decimal point, with a 0 before a leading one", () => {
		expect(display(".5")).toBe("0.5");
		expect(display("1.2.3")).toBe("1.23");
	});

	it("caps an entry at twelve digits", () => {
		expect(display("1234567890123")).toBe("123456789012");
	});

	it("does the four operations", () => {
		expect(display("12+30=")).toBe("42");
		expect(display("5-8=")).toBe("-3");
		expect(display("6*7=")).toBe("42");
		expect(display("1/4=")).toBe("0.25");
	});

	it("runs operations in the order typed, showing each running total", () => {
		expect(display("2+3*")).toBe("5");
		expect(display("2+3*4=")).toBe("20");
	});

	it("lets a second operator replace the first", () => {
		expect(display("6+*2=")).toBe("12");
	});

	it("uses the shown number as the right operand when none is typed", () => {
		expect(display("5+=")).toBe("10");
	});

	it("starts a new number after =", () => {
		expect(display("2+2=7")).toBe("7");
		expect(display("2+2=7+1=")).toBe("8");
	});

	it("chains from a result: an operator after = works on it", () => {
		expect(display("2+2=*3=")).toBe("12");
	});

	it("rounds away floating-point noise", () => {
		expect(display(".1+.2=")).toBe("0.3");
		// Twelve digits, the leading 0 counted, as when typing.
		expect(display("1/3=")).toBe("0.33333333333");
		expect(display("2/3=")).toBe("0.66666666667");
	});

	it("shows Error on division by zero, recovering on C or a digit", () => {
		const error = press("8/0=");
		expect(error.display).toBe(CALCULATOR_ERROR_DISPLAY);
		expect(error.error).toBe(true);
		expect(pressCalculatorKey(error, "+")).toBe(error);
		expect(pressCalculatorKey(error, "=")).toBe(error);
		expect(pressCalculatorKey(error, "C")).toEqual(CALCULATOR_INITIAL_STATE);
		expect(press("4", error).display).toBe("4");
		expect(press("9/0=3+4=").display).toBe("7");
	});

	it("shows Error when a running total divides by zero", () => {
		expect(display("8/0+")).toBe(CALCULATOR_ERROR_DISPLAY);
	});

	it("clears everything on C", () => {
		expect(press("12+3C")).toEqual(CALCULATOR_INITIAL_STATE);
		expect(display("12+3C4=")).toBe("4");
	});

	it("never changes the state it is given", () => {
		const before = press("12+");
		const snapshot = structuredClone(before);
		press("3=", before);
		expect(before).toEqual(snapshot);
	});
});

describe("formatCalculatorNumber", () => {
	it("writes integers and decimals plainly", () => {
		expect(formatCalculatorNumber(42)).toBe("42");
		expect(formatCalculatorNumber(-0.25)).toBe("-0.25");
		expect(formatCalculatorNumber(-0)).toBe("0");
	});

	it("switches to exponent form past twelve digits", () => {
		expect(formatCalculatorNumber(123456789012)).toBe("123456789012");
		expect(formatCalculatorNumber(1234567890123)).toBe("1.234568e+12");
		expect(formatCalculatorNumber(1.5e21)).toBe("1.5e+21");
		expect(formatCalculatorNumber(1e-7)).toBe("1e-7");
	});

	it("returns null for a number the display cannot show", () => {
		expect(formatCalculatorNumber(Number.POSITIVE_INFINITY)).toBeNull();
		expect(formatCalculatorNumber(Number.NaN)).toBeNull();
	});
});

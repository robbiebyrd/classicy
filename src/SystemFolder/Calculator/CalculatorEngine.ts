/**
 * The Calculator's arithmetic, as a pure reducer: `pressCalculatorKey(state,
 * key)` returns the next state, so mouse clicks, typed keys and both `=` keys
 * share one path, and the rules are testable without React.
 *
 * Operations run in the order typed, as on a pocket calculator (and the Mac
 * OS Calculator desk accessory): `2 + 3 * 4 =` is 20, not 14.
 */

export type CalculatorOperator = "+" | "-" | "*" | "/";

export type CalculatorKey =
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "."
	| CalculatorOperator
	| "="
	| "C";

export type CalculatorState = {
	/** What the display shows: the number being typed, or the last result. */
	display: string;
	/** The left operand, waiting for `pendingOperator` and a right one. */
	accumulator: number | null;
	pendingOperator: CalculatorOperator | null;
	/** The next digit starts a new number instead of extending the display. */
	startNewEntry: boolean;
	/** The operator and right operand the last `=` applied. */
	lastOperation: {
		operator: CalculatorOperator;
		operand: number;
	} | null;
	/** A division by zero (or an overflow) happened; only C or a digit recovers. */
	error: boolean;
};

/** The most digits the display holds; longer results go to exponent form. */
export const CALCULATOR_MAX_DIGITS = 12;

export const CALCULATOR_ERROR_DISPLAY = "Error";

export const CALCULATOR_INITIAL_STATE: Readonly<CalculatorState> =
	Object.freeze({
		display: "0",
		accumulator: null,
		pendingOperator: null,
		startNewEntry: true,
		lastOperation: null,
		error: false,
	});

const ERROR_STATE: Readonly<CalculatorState> = Object.freeze({
	...CALCULATOR_INITIAL_STATE,
	display: CALCULATOR_ERROR_DISPLAY,
	error: true,
});

const OPERATORS: ReadonlySet<string> = new Set(["+", "-", "*", "/"]);

export const isCalculatorOperator = (key: string): key is CalculatorOperator =>
	OPERATORS.has(key);

const isDigit = (key: string): boolean =>
	key >= "0" && key <= "9" && key.length === 1;

const digitCount = (display: string): number =>
	display.replace(/[^0-9]/g, "").length;

/**
 * A result as the display shows it: at most `CALCULATOR_MAX_DIGITS`
 * significant digits, in exponent form when it would not fit, and `null`
 * when it is not a finite number (the display shows Error).
 */
export function formatCalculatorNumber(value: number): string | null {
	if (!Number.isFinite(value)) return null;
	if (value === 0) return "0"; // -0 included
	const rounded = Number(value.toPrecision(CALCULATOR_MAX_DIGITS));
	const plain = String(rounded);
	if (!plain.includes("e")) {
		if (digitCount(plain) <= CALCULATOR_MAX_DIGITS) return plain;
		// Too long only because of the 0 or zeros before the first significant
		// digit (0.333…): give up decimals rather than go to exponent form,
		// counting digits as a typed entry does.
		const wholeDigits = digitCount(String(Math.trunc(Math.abs(rounded))));
		if (wholeDigits < CALCULATOR_MAX_DIGITS) {
			const shortened = String(
				Number(rounded.toFixed(CALCULATOR_MAX_DIGITS - wholeDigits)),
			);
			if (shortened !== "0") return shortened;
		}
	}
	// 1.500000e+21 → 1.5e+21; 1.000000e-7 → 1e-7
	return rounded.toExponential(6).replace(/\.?0+e/, "e");
}

export function applyCalculatorOperator(
	left: number,
	operator: CalculatorOperator,
	right: number,
): number {
	switch (operator) {
		case "+":
			return left + right;
		case "-":
			return left - right;
		case "*":
			return left * right;
		case "/":
			return left / right;
	}
}

/**
 * Show `value` as a finished result, merging `rest` into the state. The
 * display's rounded text, not the raw float, is what later steps read, so
 * `0.1 + 0.2` shows 0.3 and goes on as 0.3.
 */
function showResult(
	state: CalculatorState,
	value: number,
	rest: Partial<CalculatorState>,
): CalculatorState {
	const display = formatCalculatorNumber(value);
	if (display === null) return { ...ERROR_STATE };
	return { ...state, ...rest, display, startNewEntry: true };
}

/**
 * `=` pressed with no operator waiting: right after another `=`, or before
 * any operator at all. `state.lastOperation` holds the operator and right
 * operand the previous `=` applied (null when there was none).
 */
function repeatLastOperation(state: CalculatorState): CalculatorState {
	// TODO(you): decide what a repeated "=" does. See the request in chat.
	return state;
}

export function pressCalculatorKey(
	state: CalculatorState,
	key: CalculatorKey,
): CalculatorState {
	if (key === "C") return { ...CALCULATOR_INITIAL_STATE };

	if (state.error) {
		// Typing a number starts over; operators and = do nothing on Error.
		if (!isDigit(key) && key !== ".") return state;
		return pressCalculatorKey({ ...CALCULATOR_INITIAL_STATE }, key);
	}

	if (isDigit(key)) {
		if (state.startNewEntry || state.display === "0") {
			return { ...state, display: key, startNewEntry: false };
		}
		if (digitCount(state.display) >= CALCULATOR_MAX_DIGITS) return state;
		return { ...state, display: state.display + key };
	}

	if (key === ".") {
		if (state.startNewEntry) {
			return { ...state, display: "0.", startNewEntry: false };
		}
		if (state.display.includes(".")) return state;
		return { ...state, display: `${state.display}.` };
	}

	if (isCalculatorOperator(key)) {
		const entry = Number(state.display);
		if (state.pendingOperator !== null && state.accumulator !== null) {
			// Two operators in a row: the second replaces the first.
			if (state.startNewEntry) return { ...state, pendingOperator: key };
			const result = applyCalculatorOperator(
				state.accumulator,
				state.pendingOperator,
				entry,
			);
			const next = showResult(state, result, { pendingOperator: key });
			return next.error ? next : { ...next, accumulator: Number(next.display) };
		}
		return {
			...state,
			accumulator: entry,
			pendingOperator: key,
			startNewEntry: true,
		};
	}

	// key === "="
	if (state.pendingOperator !== null && state.accumulator !== null) {
		// With no new number typed, the shown one is the right operand: 5 + = is 10.
		const operand = Number(state.display);
		const operator = state.pendingOperator;
		return showResult(
			state,
			applyCalculatorOperator(state.accumulator, operator, operand),
			{
				accumulator: null,
				pendingOperator: null,
				lastOperation: { operator, operand },
			},
		);
	}
	return repeatLastOperation(state);
}

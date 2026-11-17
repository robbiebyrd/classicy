import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	Calculator,
	calculatorKeyFromKeyboard,
} from "@/SystemFolder/Calculator/Calculator";
import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

const renderOpen = () => {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: CALCULATOR_APP_ID, name: "Calculator", icon: "" },
	});
	return render(<Calculator />);
};

const displayText = () =>
	document.getElementById("classicy-calculator-display")?.textContent;

/** The keypad's buttons, in reading order, by label. */
const keyLabels = () =>
	[
		...document.querySelectorAll(
			".classicyCalculatorKeypad .classicyCalculatorKey",
		),
	].map((key) => key.textContent);

const click = (label: string) => {
	// The tall = is the last of the two; either one evaluates.
	const keys = screen.getAllByRole("button", { name: label });
	fireEvent.click(keys[keys.length - 1]);
};

afterEach(() => {
	dispatch({ type: "ClassicyAppClose", app: { id: CALCULATOR_APP_ID } });
	cleanup();
});

describe("Calculator", () => {
	it("lays out the keys as specified, = twice", () => {
		renderOpen();
		expect(keyLabels()).toEqual([
			"C",
			"=",
			"/",
			"*",
			"7",
			"8",
			"9",
			"-",
			"4",
			"5",
			"6",
			"+",
			"1",
			"2",
			"3",
			"=",
			"0",
			".",
		]);
		const keypad = document.querySelector(".classicyCalculatorKeypad");
		expect(keypad?.querySelector('[data-span="wide"]')?.textContent).toBe("0");
		expect(keypad?.querySelector('[data-span="tall"]')?.textContent).toBe("=");
	});

	it("calculates from clicks", () => {
		renderOpen();
		expect(displayText()).toBe("0");
		for (const label of ["1", "2", "+", "3", "0"]) click(label);
		expect(displayText()).toBe("30");
		click("=");
		expect(displayText()).toBe("42");
		click("C");
		expect(displayText()).toBe("0");
	});

	it("evaluates from the top-row = too", () => {
		renderOpen();
		for (const label of ["6", "*", "7"]) click(label);
		fireEvent.click(screen.getAllByRole("button", { name: "=" })[0]);
		expect(displayText()).toBe("42");
	});

	it("takes typed keys while its window is focused", () => {
		renderOpen();
		const window = getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[
				CALCULATOR_APP_ID
			],
			"Calculator_1",
		);
		expect(window?.focused).toBe(true);
		act(() => {
			for (const key of ["9", "/", "4", "Enter"]) {
				document.dispatchEvent(new KeyboardEvent("keydown", { key }));
			}
		});
		expect(displayText()).toBe("2.25");
		act(() => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		});
		expect(displayText()).toBe("0");
	});

	it("leaves Enter on a key reached with Tab to that key", () => {
		renderOpen();
		for (const label of ["1", "+", "2"]) click(label);
		const seven = screen.getByRole("button", { name: "7" });
		seven.focus();
		act(() => {
			seven.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});
		// Not evaluated: the browser clicks the focused 7 instead.
		expect(displayText()).toBe("2");
	});

	it("keeps focus off a key pressed with the mouse", () => {
		renderOpen();
		const keypad = document.querySelector(".classicyCalculatorKeypad");
		const seven = screen.getByRole("button", { name: "7" });
		const mouseDown = new MouseEvent("mousedown", {
			bubbles: true,
			cancelable: true,
		});
		seven.dispatchEvent(mouseDown);
		expect(keypad).not.toBeNull();
		expect(mouseDown.defaultPrevented).toBe(true);
	});

	it("ignores typed keys with a modifier held", () => {
		renderOpen();
		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "7", ctrlKey: true }),
			);
		});
		expect(displayText()).toBe("0");
	});
});

describe("calculatorKeyFromKeyboard", () => {
	it("maps digits, operators, Enter, Escape and the comma", () => {
		expect(calculatorKeyFromKeyboard("7")).toBe("7");
		expect(calculatorKeyFromKeyboard("*")).toBe("*");
		expect(calculatorKeyFromKeyboard("=")).toBe("=");
		expect(calculatorKeyFromKeyboard("Enter")).toBe("=");
		expect(calculatorKeyFromKeyboard("Escape")).toBe("C");
		expect(calculatorKeyFromKeyboard("c")).toBe("C");
		expect(calculatorKeyFromKeyboard(",")).toBe(".");
		expect(calculatorKeyFromKeyboard("x")).toBeUndefined();
		expect(calculatorKeyFromKeyboard("toString")).toBeUndefined();
	});
});

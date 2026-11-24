import { act, fireEvent } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import { render, userEvent } from "@/__tests__/test-utils";
import { Calculator } from "@/SystemFolder/Calculator/Calculator";
import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyApplicationSwitcher } from "./ClassicyApplicationSwitcher";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_TEAR_OFF,
} from "./ClassicyApplicationSwitcherContext";

/**
 * Review C1 and M2 of story 0231-8c6: no click on the palette makes the
 * Application Switcher the focused application or takes the keyboard from
 * the application in front. Each test checks what the keyboard reaches
 * (Calculator's display) and the focus the store keeps (`focusedAppId`, the
 * front window's `focused`), not only the menu bar's front application.
 */

const apps = () => useAppManager.getState().System.Manager.Applications;
const calculatorWindow = () =>
	getAppWindow(apps().apps[CALCULATOR_APP_ID], "Calculator_1");
const display = () =>
	document.getElementById("classicy-calculator-display")?.textContent;
// Keys go to the focused element and bubble, as a browser sends them.
const type = (keys: string[]) =>
	act(() => {
		for (const key of keys)
			(document.activeElement ?? document.body).dispatchEvent(
				new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
			);
	});
const palette = () =>
	document.querySelector<HTMLElement>(
		".classicyApplicationSwitcherPalette",
	) as HTMLElement;
const button = (name: string) =>
	document.querySelector<HTMLButtonElement>(
		`.classicyApplicationSwitcherButton[aria-label="${name}"]`,
	) as HTMLButtonElement;

/** Calculator open and in front, Finder open behind it, the palette torn off. */
const mount = () => {
	act(() => {
		useAppManager.setState((s) => {
			const next = structuredClone(s);
			next.System.Manager.Applications.apps["Finder.app"] = {
				id: "Finder.app",
				name: "Finder",
				icon: "/finder.png",
				windows: {},
				open: true,
				focused: false,
				data: {},
				lastFocusedAt: 1,
			};
			return next;
		}, true);
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: CALCULATOR_APP_ID, name: "Calculator", icon: "" },
		});
	});
	const view = render(
		<>
			<Calculator />
			<ClassicyApplicationSwitcher />
		</>,
	);
	act(() => {
		dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position: [300, 60] });
	});
	return view;
};

/** Finder in front: the desktop's click (its app focused, no window). */
const finderInFront = () =>
	act(() => {
		dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } });
	});

const expectCalculatorHasTheKeyboard = () => {
	expect(apps().focusedAppId).toBe(CALCULATOR_APP_ID);
	expect(frontAppIdOf(apps())).toBe(CALCULATOR_APP_ID);
	expect(calculatorWindow()?.focused).toBe(true);
};

describe("the Application Switcher's palette never takes the focus or the keyboard", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("switching to Calculator from the palette gives it the focus and the keys: 7 + 2 Enter shows 9", async () => {
		const user = userEvent.setup();
		mount();
		finderInFront();
		expect(apps().focusedAppId).toBe("Finder.app");
		expect(calculatorWindow()?.focused).toBe(false);
		await user.click(button("Calculator"));
		expectCalculatorHasTheKeyboard();
		// The palette's button never kept the keyboard (M2).
		expect(palette().contains(document.activeElement)).toBe(false);
		type(["Escape", "7", "+", "2", "Enter"]);
		expect(display()).toBe("9");
	});

	it("a click on the palette's drag bar, zoom box or the front application's own button leaves Calculator the keyboard", async () => {
		const user = userEvent.setup();
		mount();
		expectCalculatorHasTheKeyboard();
		type(["Escape", "4"]);

		await user.click(
			palette().querySelector(".classicyWindowTitleBar") as HTMLElement,
		);
		expectCalculatorHasTheKeyboard();
		type(["5"]);
		expect(display()).toBe("45");

		await user.click(
			palette().querySelector(".classicyWindowZoomBox") as HTMLElement,
		);
		expectCalculatorHasTheKeyboard();
		expect(palette().contains(document.activeElement)).toBe(false);
		type(["6"]);
		expect(display()).toBe("456");

		await user.click(button("Calculator"));
		expectCalculatorHasTheKeyboard();
		type(["+", "1", "Enter"]);
		expect(display()).toBe("457");
	});

	it("a press anywhere in the palette moves no focus (its default is prevented)", () => {
		mount();
		for (const target of [
			button("Finder"),
			palette().querySelector(".classicyWindowZoomBox") as HTMLElement,
			palette().querySelector(".classicyWindowTitleBar") as HTMLElement,
			palette(),
		]) {
			const press = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			act(() => {
				target.dispatchEvent(press);
			});
			expect(press.defaultPrevented).toBe(true);
		}
	});

	it("a palette button pressed from the keyboard hands the keyboard to the application it switches to", () => {
		mount();
		finderInFront();
		const calculator = button("Calculator");
		calculator.focus();
		expect(document.activeElement).toBe(calculator);
		fireEvent.click(calculator);
		expectCalculatorHasTheKeyboard();
		expect(document.activeElement).toBe(document.body);
		// Enter is Calculator's =, not the palette button's.
		type(["Escape", "7", "+", "2", "Enter"]);
		expect(display()).toBe("9");
	});

	it("closing the palette leaves Calculator in front with the keyboard", async () => {
		const user = userEvent.setup();
		mount();
		await user.click(
			palette().querySelector(".classicyWindowCloseBox") as HTMLElement,
		);
		expect(palette()).toBeNull();
		expectCalculatorHasTheKeyboard();
		type(["Escape", "8"]);
		expect(display()).toBe("8");
	});

	it("activating the switcher itself (ClassicyAppActivate, ClassicyAppFocus) only raises its palette", () => {
		mount();
		for (const type of ["ClassicyAppActivate", "ClassicyAppFocus"]) {
			act(() => {
				dispatch({ type, app: { id: APPLICATION_SWITCHER_APP_ID } });
			});
			expectCalculatorHasTheKeyboard();
			expect(apps().apps[APPLICATION_SWITCHER_APP_ID].focused).toBeFalsy();
		}
	});
});

/**
 * Integration G of the feature-review branch: Control-` hands the keyboard
 * to the application it switches to, as Command-Tab did and as the palette
 * does. In Chromium and Firefox a switch from SimpleText's document to
 * Calculator left the document focused, so "7 + 2 Enter" went into it.
 */
describe("the chord hands the keyboard to the application it switches to", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	const chord = (target: Element) =>
		act(() => {
			fireEvent.keyDown(target, {
				key: "`",
				code: "Backquote",
				ctrlKey: true,
			});
		});

	/** Calculator, Finder and Notes open, Notes in front, its text focused. */
	const mountNotes = () => {
		act(() => {
			useAppManager.setState((s) => {
				const next = structuredClone(s);
				next.System.Manager.Applications.apps["Finder.app"] = {
					id: "Finder.app",
					name: "Finder",
					icon: "/finder.png",
					windows: {},
					open: true,
					focused: false,
					data: {},
					lastFocusedAt: 1,
				};
				return next;
			}, true);
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: CALCULATOR_APP_ID, name: "Calculator", icon: "" },
			});
		});
		const view = render(
			<>
				<Calculator />
				<ClassicyApp id="Notes.app" name="Notes" icon="">
					<ClassicyWindow
						id="notes"
						appId="Notes.app"
						title="Notes"
						initialSize={[200, 200]}
						initialPosition={[400, 300]}
					>
						<textarea aria-label="Note" />
					</ClassicyWindow>
				</ClassicyApp>
				<ClassicyApplicationSwitcher />
			</>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
		});
		const note = view.getByLabelText("Note");
		act(() => {
			note.focus();
		});
		expect(frontAppIdOf(apps())).toBe("Notes.app");
		expect(document.activeElement).toBe(note);
		return note;
	};

	it("Control-` from a focused text field to Calculator: 7 + 2 Enter shows 9", () => {
		const note = mountNotes();
		// Calculator, Finder, Notes: the next after Notes wraps to Calculator.
		chord(note);
		expectCalculatorHasTheKeyboard();
		expect(document.activeElement).not.toBe(note);
		type(["Escape", "7", "+", "2", "Enter"]);
		expect(display()).toBe("9");
	});

	it("a chord that switches nothing (a dialog open) leaves the keyboard in the dialog", () => {
		mountNotes();
		// An extension's dialog over Notes holds the keyboard: Notes stays
		// the front application (0225's host rule), the dialog's button has
		// the DOM focus, and switching waits for the dialog.
		act(() => {
			useAppManager.setState(
				produce(useAppManager.getState(), (d) => {
					d.System.Manager.Applications.apps["Helper.app"] = {
						id: "Helper.app",
						name: "Helper",
						icon: "",
						open: true,
						focused: false,
						extension: true,
						data: {},
						windows: {
							dialog: {
								id: "dialog",
								closed: false,
								modal: true,
								size: [200, 100],
								position: [100, 100],
								minimumSize: [0, 0],
							},
						},
					};
				}),
				true,
			);
		});
		const dialog = document.createElement("div");
		dialog.className = "classicyWindow";
		dialog.id = "Helper.app_dialog";
		const ok = document.createElement("button");
		ok.textContent = "OK";
		dialog.append(ok);
		document.body.append(dialog);
		try {
			ok.focus();
			chord(ok);
			expect(frontAppIdOf(apps())).toBe("Notes.app");
			expect(document.activeElement).toBe(ok);
		} finally {
			dialog.remove();
		}
	});
});

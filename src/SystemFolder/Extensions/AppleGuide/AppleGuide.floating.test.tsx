import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { Calculator } from "@/SystemFolder/Calculator/Calculator";
import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { AppleGuide } from "@/SystemFolder/Extensions/AppleGuide/AppleGuide";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { KEYBOARD_SHORTCUTS_TOPIC_ID } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";

const apps = () => useAppManager.getState().System.Manager.Applications;
const display = () =>
	document.getElementById("classicy-calculator-display")?.textContent;
const type = (keys: string[]) =>
	act(() => {
		for (const key of keys)
			document.dispatchEvent(new KeyboardEvent("keydown", { key }));
	});
const show = (topicId: string) =>
	act(() => {
		dispatch({
			type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
			app: { id: APPLE_GUIDE_APP_ID },
			topicId,
		});
	});
const guideWindow = (topicId: string) =>
	document.getElementById(`${APPLE_GUIDE_APP_ID}_apple_guide_${topicId}`);

const mount = () => {
	act(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: APPLE_GUIDE_APP_ID, name: "Apple Guide", icon: "" },
		});
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: CALCULATOR_APP_ID, name: "Calculator", icon: "" },
		});
	});
	return render(
		<>
			<Calculator />
			<AppleGuide />
		</>,
	);
};

describe("Apple Guide: a floating window over the front application", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("a topic's FIRST open floats: Calculator keeps the focus and still takes typed keys", () => {
		mount();
		// No record of the guide's window exists yet: the real first-open path.
		expect(apps().apps[APPLE_GUIDE_APP_ID].windows).toEqual({});
		show(ABOUT_BALLOON_HELP_TOPIC_ID);
		expect(apps().focusedAppId).toBe(CALCULATOR_APP_ID);
		expect(
			getAppWindow(apps().apps[CALCULATOR_APP_ID], "Calculator_1")?.focused,
		).toBe(true);
		type(["9", "/", "4", "Enter"]);
		expect(display()).toBe("2.25");
	});

	it("draws a floating guide above the front app's window, and a click raises one of several topics", () => {
		mount();
		show(ABOUT_BALLOON_HELP_TOPIC_ID);
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		const z = (id: string) =>
			Number(guideWindow(id)?.style.zIndex || Number.NaN);
		// Above the active document band (300) and below the modal bands (360).
		expect(z(ABOUT_BALLOON_HELP_TOPIC_ID)).toBeGreaterThan(300);
		expect(z(KEYBOARD_SHORTCUTS_TOPIC_ID)).toBeLessThan(360);
		// The topic opened last is on top; clicking the other raises it.
		expect(z(KEYBOARD_SHORTCUTS_TOPIC_ID)).toBeGreaterThan(
			z(ABOUT_BALLOON_HELP_TOPIC_ID),
		);
		const first = guideWindow(ABOUT_BALLOON_HELP_TOPIC_ID) as HTMLElement;
		fireEvent.mouseUp(first);
		fireEvent.click(first);
		expect(z(ABOUT_BALLOON_HELP_TOPIC_ID)).toBeGreaterThan(
			z(KEYBOARD_SHORTCUTS_TOPIC_ID),
		);
		expect(apps().focusedAppId).toBe(CALCULATOR_APP_ID);
	});

	it("Enter on a button inside the guide is the button's, not Calculator's =", () => {
		mount();
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		type(["7"]);
		const button = guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID)?.querySelector(
			"button",
		) as HTMLButtonElement;
		button.focus();
		const enter = new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			button.dispatchEvent(enter);
		});
		expect(enter.defaultPrevented).toBe(false);
		expect(display()).toBe("7");
	});
});

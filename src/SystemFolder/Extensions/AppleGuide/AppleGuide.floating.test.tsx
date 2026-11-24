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
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	registerAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { KEYBOARD_SHORTCUTS_TOPIC_ID } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";

const apps = () => useAppManager.getState().System.Manager.Applications;
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

	it("draws a floating guide in the shared floating layer above the front app's window, and a click raises one of several topics", () => {
		mount();
		show(ABOUT_BALLOON_HELP_TOPIC_ID);
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		const z = (id: string) =>
			Number(guideWindow(id)?.style.zIndex || Number.NaN);
		// The layer is one stacking context above the active document band (300)
		// and the palettes (350), under the Control Strip (355) and the modals.
		const layer = guideWindow(ABOUT_BALLOON_HELP_TOPIC_ID)
			?.parentElement as HTMLElement;
		expect(layer.id).toBe("classicy-floating-layer");
		expect(Number(layer.style.zIndex)).toBe(354);
		expect(guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID)?.parentElement).toBe(layer);
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

	it("typing reaches Calculator after a click in the guide's content (Assistant focused) or on a guide button", () => {
		mount();
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		const win = guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID) as HTMLElement;
		const assistant = win.querySelector("[tabindex='0']") as HTMLElement;
		assistant.focus();
		expect(document.activeElement).toBe(assistant);
		type(["4", "2"]);
		expect(display()).toBe("42");
		const button = win.querySelector("button") as HTMLButtonElement;
		button.focus();
		type(["+", "1"]);
		expect(display()).toBe("1");
	});

	it("stacks any number of topics by recency in one layer under the Control Strip, and a raise moves no node", () => {
		const ids = Array.from({ length: 10 }, (_, i) => `many-topic-${i}`);
		for (const id of ids)
			registerAppleGuideTopic({ id, title: id, pages: [<p key={id}>{id}</p>] });
		mount();
		for (const id of ids) show(id);
		const z = (id: string) => Number(guideWindow(id)?.style.zIndex);
		const layer = guideWindow(ids[0])?.parentElement as HTMLElement;
		expect(layer.id).toBe("classicy-floating-layer");
		// One layer at 354, under the Control Strip (355); the topics are 1..10
		// by recency inside it, the newest on top.
		expect(Number(layer.style.zIndex)).toBe(354);
		expect(ids.map(z)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		// Raising the bottom one puts it on top and moves no node: a move would
		// reset its scroll offsets, blur its focus and can drop the click.
		const before = [...layer.children];
		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((r) => mutations.push(...r));
		observer.observe(layer, { childList: true });
		const bottom = guideWindow(ids[0]) as HTMLElement;
		fireEvent.mouseUp(bottom);
		fireEvent.click(bottom);
		mutations.push(...observer.takeRecords());
		observer.disconnect();
		expect(z(ids[0])).toBe(10);
		expect(z(ids[9])).toBe(9);
		expect(mutations).toEqual([]);
		expect([...layer.children]).toEqual(before);
	});

	it("a raised topic keeps its scroll offset and the focus on the button clicked in it", () => {
		mount();
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		show(ABOUT_BALLOON_HELP_TOPIC_ID);
		const lower = guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID) as HTMLElement;
		const buttons = lower.querySelectorAll("button:not(:disabled)");
		const button = buttons[buttons.length - 1] as HTMLButtonElement;
		const scroller = lower.querySelector(
			".classicyAssistantBodyViewport",
		) as HTMLElement;
		scroller.scrollTop = 40;
		act(() => {
			button.focus();
		});
		fireEvent.mouseUp(lower);
		fireEvent.click(lower);
		// Raised, with the very same nodes: scroll offset and focus untouched.
		expect(guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID)).toBe(lower);
		expect(scroller.scrollTop).toBe(40);
		expect(document.activeElement).toBe(button);
		expect(Number(lower.style.zIndex)).toBeGreaterThan(
			Number(guideWindow(ABOUT_BALLOON_HELP_TOPIC_ID)?.style.zIndex),
		);
	});
});

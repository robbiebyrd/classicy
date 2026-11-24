import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

	it("keeps any number of floating topics inside 351-354, under the Control Strip (355)", async () => {
		const ids = Array.from({ length: 10 }, (_, i) => `many-topic-${i}`);
		for (const id of ids)
			registerAppleGuideTopic({ id, title: id, pages: [<p key={id}>{id}</p>] });
		mount();
		for (const id of ids) show(id);
		// Let the topics' DOM order settle (it is applied one task later).
		await act(async () => {
			await new Promise((r) => setTimeout(r, 5));
		});
		const zs = ids.map((id) => Number(guideWindow(id)?.style.zIndex));
		for (const z of zs) {
			expect(z).toBeGreaterThanOrEqual(351);
			expect(z).toBeLessThanOrEqual(354);
		}
		// The newest is on top.
		expect(zs[9]).toBe(354);
		// Raising the bottom one puts it on top.
		const bottom = guideWindow(ids[0]) as HTMLElement;
		fireEvent.mouseUp(bottom);
		fireEvent.click(bottom);
		expect(Number(guideWindow(ids[0])?.style.zIndex)).toBe(354);
		expect(Number(guideWindow(ids[9])?.style.zIndex)).toBeLessThan(354);
		// Right after the click the DOM has not moved: a node moved between
		// mouseup and click makes Chromium drop the click.
		const ids0 = () =>
			[...document.querySelectorAll(".appleGuideWindowFrame")].map((e) =>
				e.id.replace(`${APPLE_GUIDE_APP_ID}_apple_guide_`, ""),
			);
		expect(ids0().at(-1)).toBe(ids[9]);
		// A task later it follows recency: the raised window is last, the
		// previous top one just before it.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 5));
		});
		const order = [...document.querySelectorAll(".appleGuideWindowFrame")].map(
			(e) => e.id.replace(`${APPLE_GUIDE_APP_ID}_apple_guide_`, ""),
		);
		expect(order.slice(-2)).toEqual([ids[9], ids[0]]);
		expect(order.slice(0, 3)).toEqual([ids[1], ids[2], ids[3]]);
	});

	it("a reorder on raising a topic keeps focus on the button the user clicked in it", () => {
		mount();
		show(KEYBOARD_SHORTCUTS_TOPIC_ID);
		show(ABOUT_BALLOON_HELP_TOPIC_ID);
		// Keyboard Shortcuts (three pages, an enabled pager button) is the
		// lower one; focus its button as a click does, then the click raises it
		// (the DOM reorders).
		const lower = guideWindow(KEYBOARD_SHORTCUTS_TOPIC_ID) as HTMLElement;
		// The pager's enabled arrow (the previous one is disabled on page 1).
		const buttons = lower.querySelectorAll("button:not(:disabled)");
		const button = buttons[buttons.length - 1] as HTMLButtonElement;
		act(() => {
			button.focus();
		});
		expect(document.activeElement).toBe(button);
		// jsdom keeps focus on a node that is moved; Chrome and Firefox blur it.
		// Emulate them: moving a node that holds the focused element blurs it.
		const realInsertBefore = Node.prototype.insertBefore;
		const insertBefore = vi
			.spyOn(Node.prototype, "insertBefore")
			.mockImplementation(function <T extends Node>(
				this: Node,
				node: T,
				child: Node | null,
			) {
				const active = document.activeElement;
				if (active && node.contains(active) && node.parentNode) {
					(active as HTMLElement).blur();
				}
				return realInsertBefore.call(this, node, child) as T;
			});
		const realAppendChild = Node.prototype.appendChild;
		const appendChild = vi
			.spyOn(Node.prototype, "appendChild")
			.mockImplementation(function <T extends Node>(this: Node, node: T) {
				const active = document.activeElement;
				if (active && node.contains(active) && node.parentNode) {
					(active as HTMLElement).blur();
				}
				return realAppendChild.call(this, node) as T;
			});
		try {
			fireEvent.mouseUp(lower);
			fireEvent.click(lower);
		} finally {
			insertBefore.mockRestore();
			appendChild.mockRestore();
		}
		const order = [...document.querySelectorAll(".appleGuideWindowFrame")].map(
			(e) => e.id,
		);
		expect(order.at(-1)).toBe(lower.id);
		// React restores the focus the move blurred (its commit's
		// `restoreSelection`), so the clicked button keeps the keyboard.
		expect(document.activeElement).toBe(button);
	});
});

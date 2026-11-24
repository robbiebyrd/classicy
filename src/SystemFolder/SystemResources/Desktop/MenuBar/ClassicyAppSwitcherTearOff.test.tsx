import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLICATION_SWITCHER_APP_ID,
	type ClassicyApplicationSwitcherData,
} from "@/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcherContext";
import {
	CLASSICY_APP_SWITCHER_TEAR_OFF_DISTANCE,
	classicyAppSwitcherTearOffOutline,
} from "./ClassicyAppSwitcherTearOff.internal";
import { ClassicyDesktopMenuBar } from "./ClassicyDesktopMenuBar";

const app = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: "",
	windows: {},
	open: true,
	focused: false,
	data: {},
	...extra,
});

// The open Application menu's list, as a browser lays it out: 120 x 90 from
// (600, 20), so its bottom is at 110. The title is (620, 0) to (700, 20).
const MENU = { left: 600, top: 20, width: 120, height: 90 };
const TITLE = { left: 620, top: 0, width: 80, height: 20 };
const rect = (r: typeof MENU) =>
	({
		...r,
		x: r.left,
		y: r.top,
		right: r.left + r.width,
		bottom: r.top + r.height,
		toJSON: () => r,
	}) as DOMRect;

const switcher = () =>
	document.querySelector<HTMLElement>(
		'[data-classicy-part="switcher"]',
	) as HTMLElement;
const isOpen = () => switcher().classList.contains("open");
const outline = () =>
	document.querySelector<HTMLElement>(
		".classicyApplicationSwitcherTearOffOutline",
	);
const switcherData = () =>
	useAppManager.getState().System.Manager.Applications.apps[
		APPLICATION_SWITCHER_APP_ID
	].data as ClassicyApplicationSwitcherData;

const move = (x: number, y: number, buttons = 1) =>
	act(() => {
		fireEvent.mouseMove(document, { clientX: x, clientY: y, buttons });
	});

describe("tearing off the Application menu", () => {
	beforeEach(() => {
		useAppManager.setState(
			produce(DefaultAppManagerState, (d) => {
				d.System.Manager.Applications.apps = {
					"Finder.app": app("Finder.app", { focused: true }),
					"Notes.app": app("Notes.app"),
					[APPLICATION_SWITCHER_APP_ID]: app(APPLICATION_SWITCHER_APP_ID, {
						extension: true,
					}),
				};
				d.System.Manager.Applications.focusedAppId = "Finder.app";
			}),
			true,
		);
		const original = Element.prototype.getBoundingClientRect;
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				if (this.matches('[data-classicy-part="switcher"] ul'))
					return rect(MENU);
				if (this.matches('[data-classicy-part="switcher"]')) return rect(TITLE);
				return original.call(this);
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("hangs the outline centered on the pointer, its bottom at the pointer (Mac OS 8.5)", () => {
		expect(classicyAppSwitcherTearOffOutline(500, 400, 120, 90)).toEqual({
			left: 440,
			top: 310,
			width: 120,
			height: 90,
		});
		expect(CLASSICY_APP_SWITCHER_TEAR_OFF_DISTANCE).toBe(3);
	});

	it("drags an outline past the open menu's bottom and opens the palette where it is let go", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(switcher());
		expect(isOpen()).toBe(true);
		const row = switcher().querySelector("li") as HTMLElement;
		fireEvent.mouseDown(row, { button: 0, clientX: 650, clientY: 100 });
		// Within three pixels of the bottom: still the menu.
		move(650, 112);
		expect(outline()).toBeNull();
		move(500, 400);
		expect(outline()?.style.left).toBe("440px");
		expect(outline()?.style.top).toBe("310px");
		expect(outline()?.style.width).toBe("120px");
		expect(outline()?.style.height).toBe("90px");
		act(() => {
			fireEvent.mouseUp(document.body, { clientX: 500, clientY: 400 });
		});
		expect(outline()).toBeNull();
		expect(isOpen()).toBe(false);
		// No desktop around the bar here: viewport coordinates.
		expect(switcherData()).toMatchObject({
			paletteOpen: true,
			paletteAt: [440, 310],
		});
	});

	it("takes the outline away when the pointer comes back over the menu", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(switcher());
		fireEvent.mouseDown(switcher().querySelector("li") as HTMLElement, {
			button: 0,
		});
		move(500, 400);
		expect(outline()).not.toBeNull();
		move(650, 60);
		expect(outline()).toBeNull();
		act(() => {
			fireEvent.mouseUp(document.body);
		});
		expect(switcherData()?.paletteOpen).toBeFalsy();
	});

	it("opens the closed menu when a press on its title is pulled down, then tears it off", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(isOpen()).toBe(false);
		fireEvent.mouseDown(switcher().querySelector("p") as HTMLElement, {
			button: 0,
		});
		move(660, 10);
		expect(isOpen()).toBe(false);
		move(660, 30);
		expect(isOpen()).toBe(true);
		move(660, 300);
		expect(outline()).not.toBeNull();
		act(() => {
			fireEvent.mouseUp(document.body);
		});
		expect(switcherData()?.paletteOpen).toBe(true);
	});

	it("tears nothing off on Escape, on a lost pointer stream or a release with no button", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(switcher());
		const row = () => switcher().querySelector("li") as HTMLElement;
		fireEvent.mouseDown(row(), { button: 0 });
		move(500, 400);
		act(() => {
			fireEvent.keyDown(document.body, { key: "Escape" });
		});
		expect(outline()).toBeNull();
		act(() => {
			fireEvent.mouseUp(document.body);
		});
		expect(switcherData()?.paletteOpen).toBeFalsy();

		fireEvent.mouseDown(row(), { button: 0 });
		move(500, 400);
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(outline()).toBeNull();
		act(() => {
			fireEvent.mouseUp(document.body);
		});
		expect(switcherData()?.paletteOpen).toBeFalsy();

		fireEvent.mouseDown(row(), { button: 0 });
		move(500, 400, 0);
		expect(outline()).toBeNull();
	});

	it("tears nothing off while a modal window is open, as 8.5 under an alert", () => {
		act(() => {
			useAppManager.setState(
				produce(useAppManager.getState(), (d) => {
					d.System.Manager.Applications.apps["Notes.app"].windows = {
						alert: {
							id: "alert",
							closed: false,
							modal: true,
							size: [100, 100],
							position: [0, 0],
							minimumSize: [0, 0],
						},
					};
				}),
				true,
			);
		});
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(switcher());
		fireEvent.mouseDown(switcher().querySelector("li") as HTMLElement, {
			button: 0,
		});
		move(500, 400);
		expect(outline()).toBeNull();
		act(() => {
			fireEvent.mouseUp(document.body);
		});
		expect(switcherData()?.paletteOpen).toBeFalsy();
	});

	it("ignores a press anywhere else in the bar", () => {
		render(<ClassicyDesktopMenuBar />);
		const apple = document.querySelector(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.mouseDown(apple, { button: 0 });
		move(500, 400);
		expect(outline()).toBeNull();
	});
});

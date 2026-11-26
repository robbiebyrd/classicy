import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import {
	APPLICATION_SWITCHER_APP_ID,
	type ClassicyApplicationSwitcherData,
} from "@/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcherContext";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	CLASSICY_APP_SWITCHER_TEAR_OFF_DISTANCE,
	classicyAppSwitcherTearOffOutline,
	classicyAppSwitcherTearOffPosition,
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

	it("keeps a palette torn off near an edge on the desktop", () => {
		const desktop = { left: 0, top: 0, width: 800, height: 600 };
		const outlineAt = (left: number, top: number) => ({
			left,
			top,
			width: 120,
			height: 90,
		});
		// Inside: kept as dropped.
		expect(
			classicyAppSwitcherTearOffPosition(outlineAt(200, 150), desktop, 20),
		).toEqual([200, 150]);
		// Past the left edge, above the menu bar, past the right and bottom.
		expect(
			classicyAppSwitcherTearOffPosition(outlineAt(-84, 5), desktop, 20),
		).toEqual([0, 20]);
		expect(
			classicyAppSwitcherTearOffPosition(outlineAt(750, 580), desktop, 20),
		).toEqual([680, 510]);
		// A desktop offset in the page, and one smaller than the outline.
		expect(
			classicyAppSwitcherTearOffPosition(
				outlineAt(90, 70),
				{ left: 100, top: 50, width: 800, height: 600 },
				20,
			),
		).toEqual([0, 20]);
		expect(
			classicyAppSwitcherTearOffPosition(
				outlineAt(30, 30),
				{ left: 0, top: 0, width: 100, height: 60 },
				20,
			),
		).toEqual([0, 20]);
	});

	it("stores an on-screen position for a palette dropped past the desktop's left edge", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(switcher());
		fireEvent.mouseDown(switcher().querySelector("li") as HTMLElement, {
			button: 0,
		});
		move(8, 500);
		// The outline hangs past the left edge, where the pointer put it.
		expect(outline()?.style.left).toBe("-52px");
		act(() => {
			fireEvent.mouseUp(document.body, { clientX: 8, clientY: 500 });
		});
		expect(switcherData()?.paletteAt).toEqual([0, 410]);
	});

	it("never switches applications: a release over another application's window is the tear-off's", () => {
		const windowClicks = vi.fn();
		const view = render(
			<>
				<ClassicyDesktopMenuBar />
				<ClassicyApp id="Notes.app" name="Notes" icon="">
					<ClassicyWindow
						id="notes"
						appId="Notes.app"
						title="Notes"
						initialSize={[200, 200]}
						initialPosition={[400, 300]}
					>
						<button type="button" onClick={windowClicks}>
							Inside
						</button>
					</ClassicyWindow>
				</ClassicyApp>
			</>,
		);
		// Finder in front, the Notes window behind it.
		act(() => {
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } });
		});
		const apps = () => useAppManager.getState().System.Manager.Applications;
		const notesWindow = () => getAppWindow(apps().apps["Notes.app"], "notes");
		expect(apps().focusedAppId).toBe("Finder.app");
		expect(notesWindow()?.focused).toBe(false);

		fireEvent.click(switcher());
		fireEvent.mouseDown(switcher().querySelector("li") as HTMLElement, {
			button: 0,
		});
		move(500, 400);
		expect(outline()).not.toBeNull();
		// Let go over a control inside the Notes window, then the click a
		// browser sends after the release.
		const inside = view.getByText("Inside");
		const release = new MouseEvent("mouseup", {
			bubbles: true,
			cancelable: true,
			button: 0,
			clientX: 500,
			clientY: 400,
		});
		act(() => {
			inside.dispatchEvent(release);
		});
		act(() => {
			fireEvent.click(inside);
		});
		expect(release.defaultPrevented).toBe(true);
		expect(switcherData()?.paletteOpen).toBe(true);
		expect(windowClicks).not.toHaveBeenCalled();
		expect(apps().focusedAppId).toBe("Finder.app");
		expect(frontAppIdOf(apps())).toBe("Finder.app");
		expect(notesWindow()?.focused).toBe(false);

		// Swallowed once: the next click in the window is the window's.
		act(() => {
			fireEvent.click(inside);
		});
		expect(windowClicks).toHaveBeenCalledTimes(1);
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

import { act, fireEvent, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const win = (
	id: string,
	extra: Partial<ClassicyStoreSystemAppWindow> = {},
): ClassicyStoreSystemAppWindow => ({
	id,
	closed: false,
	size: [100, 100],
	position: [0, 0],
	minimumSize: [10, 10],
	...extra,
});

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

const set = (mutate: (d: ClassicyStore) => void) =>
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});

const apps = () => useAppManager.getState().System.Manager.Applications;
const front = () => frontAppIdOf(apps());

const fileMenu = (id: string, quit?: () => void): ClassicyMenuItem[] => [
	{
		id: `${id}_file`,
		title: "File",
		menuChildren: [
			{
				id: `${id}_quit`,
				title: "Quit",
				keyboardShortcut: "⌥Q",
				onClickFunc: quit,
			},
		],
	},
];

describe("the front application", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("a floating extension window is active beside the front app's window and changes nothing else", () => {
		const menu = fileMenu("Calc");
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app"),
				"Calculator.app": app("Calculator.app", {
					focused: true,
					lastFocusedAt: 5,
					windows: { main: win("main", { focused: true, menuBar: menu }) },
				}),
				"AppleGuide.app": app("AppleGuide.app", {
					extension: true,
					windows: { guide: win("guide", { menuBar: [] }) },
				}),
			};
			d.System.Manager.Applications.focusedAppId = "Calculator.app";
			d.System.Manager.Desktop.appMenu = menu;
		});
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "AppleGuide.app" },
				window: { id: "guide", menuBar: [] },
			});
		});
		const a = apps();
		expect(a.focusedAppId).toBe("Calculator.app");
		expect(a.apps["Calculator.app"].focused).toBe(true);
		expect(a.apps["Calculator.app"].windows.main.focused).toBe(true);
		expect(a.apps["AppleGuide.app"].windows.guide.focused).toBe(true);
		expect(useAppManager.getState().System.Manager.Desktop.appMenu).toBe(menu);

		// Focusing the front app's window again leaves the floating one active.
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "Calculator.app" },
				window: { id: "main" },
			});
		});
		expect(apps().apps["AppleGuide.app"].windows.guide.focused).toBe(true);
		expect(apps().focusedAppId).toBe("Calculator.app");
	});

	it("Hide hides the front app and hands the bar on while an extension holds the focus flag", () => {
		// A hand-built or older state: the extension holds the flag.
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", { lastFocusedAt: 1 }),
				"Calculator.app": app("Calculator.app", { lastFocusedAt: 5 }),
				"AppleGuide.app": app("AppleGuide.app", {
					extension: true,
					focused: true,
					windows: { g: win("g", { focused: true, menuBar: [] }) },
				}),
			};
			d.System.Manager.Applications.focusedAppId = "AppleGuide.app";
		});
		expect(front()).toBe("Calculator.app");
		act(() => {
			dispatch({ type: "ClassicyAppHide", app: { id: "Calculator.app" } });
		});
		expect(apps().apps["Calculator.app"].hidden).toBe(true);
		expect(front()).toBe("Finder.app");
		expect(apps().focusedAppId).toBe("Finder.app");
	});

	it("Hide on a floating-guide state (front app still focused) hands the bar on", () => {
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", { lastFocusedAt: 1 }),
				"Calculator.app": app("Calculator.app", {
					focused: true,
					lastFocusedAt: 5,
				}),
				"AppleGuide.app": app("AppleGuide.app", { extension: true }),
			};
			d.System.Manager.Applications.focusedAppId = "Calculator.app";
		});
		act(() => {
			dispatch({ type: "ClassicyAppHide", app: { id: "Calculator.app" } });
		});
		expect(front()).toBe("Finder.app");
		expect(apps().apps["Calculator.app"].hidden).toBe(true);
	});

	it("an extension window that publishes menus is the front application, named by the bar and keyed in the chord scope", () => {
		const extQuit = vi.fn();
		const extMenu = fileMenu("Ext", extQuit);
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app"),
				"Calculator.app": app("Calculator.app", {
					focused: true,
					lastFocusedAt: 5,
				}),
				"Ext.app": app("Ext.app", {
					extension: true,
					windows: { w: win("w", { menuBar: extMenu }) },
				}),
			};
			d.System.Manager.Applications.focusedAppId = "Calculator.app";
			d.System.Manager.Desktop.appMenu = fileMenu("Calc");
		});
		render(<ClassicyDesktopMenuBar />);
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "Ext.app" },
				window: { id: "w", menuBar: extMenu },
			});
		});
		expect(front()).toBe("Ext.app");
		const s = useAppManager.getState().System.Manager;
		expect(s.Desktop.appMenu).toBe(extMenu);
		expect(s.Keyboard.app["Ext.app"]).toEqual(["option+q"]);
		const entries = appSwitcherAppsFrom(
			s.Applications.apps,
			undefined,
			"Ext.app",
		);
		expect(entries.find((e) => e.focused)?.id).toBe("Ext.app");
		// The Application menu's title names the same app as the menus.
		expect(
			document.querySelector("#app-switcher")?.textContent ?? "",
		).toContain("Ext");
		fireEvent.keyDown(document, { key: "q", code: "KeyQ", altKey: true });
		expect(extQuit).toHaveBeenCalledTimes(1);
		expect(screen.getByText("File")).toBeInTheDocument();
	});

	it("closing the last window of an extension that held the bar hands focus on", () => {
		const extMenu = fileMenu("Ext");
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", { lastFocusedAt: 1 }),
				"Calculator.app": app("Calculator.app", { lastFocusedAt: 5 }),
				"Ext.app": app("Ext.app", {
					extension: true,
					focused: true,
					windows: { w: win("w", { focused: true, menuBar: extMenu }) },
				}),
			};
			d.System.Manager.Applications.focusedAppId = "Ext.app";
		});
		expect(front()).toBe("Ext.app");
		act(() => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: "Ext.app" },
				window: { id: "w" },
			});
		});
		expect(apps().focusedAppId).toBe("Calculator.app");
	});

	it("an extension with a menu window and a menuless one hands focus on when the menu window closes", () => {
		const extMenu = fileMenu("Ext");
		set((d) => {
			d.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", { lastFocusedAt: 1 }),
				"Calculator.app": app("Calculator.app", { lastFocusedAt: 5 }),
				"Ext.app": app("Ext.app", {
					extension: true,
					focused: true,
					windows: {
						w: win("w", { focused: true, menuBar: extMenu }),
						float: win("float", { menuBar: [] }),
					},
				}),
			};
			d.System.Manager.Applications.focusedAppId = "Ext.app";
		});
		act(() => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: "Ext.app" },
				window: { id: "w" },
			});
		});
		expect(apps().focusedAppId).toBe("Calculator.app");
	});
});

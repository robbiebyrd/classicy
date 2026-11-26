import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_CLOSE,
	APPLICATION_SWITCHER_CYCLE,
	APPLICATION_SWITCHER_PALETTE_ID,
	APPLICATION_SWITCHER_SET_CYCLING,
	APPLICATION_SWITCHER_SET_PALETTE,
	APPLICATION_SWITCHER_SWITCH,
	APPLICATION_SWITCHER_TEAR_OFF,
	type ClassicyApplicationSwitcherData,
	classicyApplicationSwitcherSettings,
} from "./ClassicyApplicationSwitcherContext";

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
	useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
const apps = () => useAppManager.getState().System.Manager.Applications;
const front = () => frontAppIdOf(apps());
const data = () =>
	apps().apps[APPLICATION_SWITCHER_APP_ID]
		.data as ClassicyApplicationSwitcherData;

/** Finder, Notes and Calc open (Notes in front), and the switcher. */
const threeApps = (extra: (d: ClassicyStore) => void = () => {}) =>
	set((d) => {
		d.System.Manager.Applications.apps = {
			"Finder.app": app("Finder.app", { name: "Finder" }),
			"Notes.app": app("Notes.app", { focused: true, lastFocusedAt: 3 }),
			"Calc.app": app("Calc.app", { lastFocusedAt: 2 }),
			[APPLICATION_SWITCHER_APP_ID]: app(APPLICATION_SWITCHER_APP_ID, {
				name: "Application Switcher",
				extension: true,
			}),
		};
		d.System.Manager.Applications.focusedAppId = "Notes.app";
		extra(d);
	});

describe("the Application Switcher's reducer", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("registers a described manifest", () => {
		expect(getAppManifest(APPLICATION_SWITCHER_APP_ID)?.description).toMatch(
			/palette/,
		);
	});

	it("defaults: palette closed, names, small icons, vertical, keyboard switching on Control-`", () => {
		expect(classicyApplicationSwitcherSettings(undefined)).toEqual({
			paletteOpen: false,
			showNames: true,
			iconSize: "small",
			orientation: "vertical",
			keyboardCycling: true,
			cyclingShortcut: "⌃`",
		});
		// A stored chord it cannot use falls back to the default.
		expect(
			classicyApplicationSwitcherSettings({ cyclingShortcut: "⌃⇧`" })
				.cyclingShortcut,
		).toBe("⌃`");
	});

	describe("tearing off", () => {
		it("opens the palette where it was dropped", () => {
			threeApps();
			dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position: [40.4, 60.6] });
			expect(data().paletteOpen).toBe(true);
			expect(data().paletteAt).toEqual([40, 61]);
		});

		it("moves a palette torn off again to the new place: one copy at a time (HIG7 p.93)", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps[
					APPLICATION_SWITCHER_APP_ID
				].windows = {
					[APPLICATION_SWITCHER_PALETTE_ID]: win(
						APPLICATION_SWITCHER_PALETTE_ID,
						{ position: [5, 5] },
					),
				};
			});
			dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position: [300, 200] });
			expect(
				apps().apps[APPLICATION_SWITCHER_APP_ID].windows[
					APPLICATION_SWITCHER_PALETTE_ID
				].position,
			).toEqual([300, 200]);
		});

		it("closes, and keeps its open state and position through persistence", () => {
			threeApps();
			dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position: [10, 20] });
			const saved = sanitizeStateForPersistence(useAppManager.getState());
			const savedData = saved.System.Manager.Applications.apps[
				APPLICATION_SWITCHER_APP_ID
			].data as ClassicyApplicationSwitcherData;
			expect(savedData.paletteOpen).toBe(true);
			expect(savedData.paletteAt).toEqual([10, 20]);
			dispatch({ type: APPLICATION_SWITCHER_CLOSE });
			expect(data().paletteOpen).toBe(false);
		});
	});

	it("sets the palette's options, ignoring values it does not know", () => {
		threeApps();
		dispatch({
			type: APPLICATION_SWITCHER_SET_PALETTE,
			showNames: false,
			iconSize: "large",
			orientation: "horizontal",
		});
		expect(data()).toMatchObject({
			showNames: false,
			iconSize: "large",
			orientation: "horizontal",
		});
		dispatch({
			type: APPLICATION_SWITCHER_SET_PALETTE,
			iconSize: "huge",
			orientation: "diagonal",
			showNames: "yes",
		});
		expect(data()).toMatchObject({
			showNames: false,
			iconSize: "large",
			orientation: "horizontal",
		});
	});

	it("turns keyboard switching off and on, and takes only a usable chord", () => {
		threeApps();
		dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, enabled: false });
		expect(data().keyboardCycling).toBe(false);
		dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, shortcut: "⌥J" });
		expect(data().cyclingShortcut).toBe("⌥J");
		dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, shortcut: "⌥⇧J" });
		dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, shortcut: "J" });
		expect(data().cyclingShortcut).toBe("⌥J");
	});

	describe("cycling", () => {
		it("goes through the open applications in the Application menu's (alphabetical) order, wrapping", () => {
			threeApps();
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Calc.app");
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Finder.app");
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Notes.app");
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: -1 });
			expect(front()).toBe("Finder.app");
		});

		it("shows a hidden application it switches to, as Command-Tab did in 8.5", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps["Calc.app"].hidden = true;
			});
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Calc.app");
			expect(apps().apps["Calc.app"].hidden).toBeFalsy();
		});

		it("never stops at an extension or a closed application", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps["Calc.app"].open = false;
				d.System.Manager.Applications.apps["Guide.app"] = app("Guide.app", {
					extension: true,
				});
			});
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Finder.app");
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Notes.app");
		});

		it("waits while a modal window is open anywhere", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps["Calc.app"].windows = {
					dialog: win("dialog", { modal: true }),
				};
			});
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Notes.app");
		});

		it("does nothing while keyboard switching is off, or for another direction", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps[APPLICATION_SWITCHER_APP_ID].data = {
					keyboardCycling: false,
				};
			});
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 1 });
			expect(front()).toBe("Notes.app");
			dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, enabled: true });
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction: 2 });
			expect(front()).toBe("Notes.app");
		});
	});

	describe("switching from the palette", () => {
		it("brings the application forward, showing it when hidden", () => {
			threeApps((d) => {
				d.System.Manager.Applications.apps["Calc.app"].hidden = true;
			});
			dispatch({
				type: APPLICATION_SWITCHER_SWITCH,
				app: { id: "Calc.app" },
			});
			expect(front()).toBe("Calc.app");
			expect(apps().apps["Calc.app"].hidden).toBeFalsy();
			expect(apps().apps["Notes.app"].hidden).toBeFalsy();
		});

		it("with Option, hides the application that was in front", () => {
			threeApps();
			dispatch({
				type: APPLICATION_SWITCHER_SWITCH,
				app: { id: "Calc.app" },
				hideFront: true,
			});
			expect(front()).toBe("Calc.app");
			expect(apps().apps["Notes.app"].hidden).toBe(true);
		});

		it("hides nothing for an Option-click on the front application", () => {
			threeApps();
			dispatch({
				type: APPLICATION_SWITCHER_SWITCH,
				app: { id: "Notes.app" },
				hideFront: true,
			});
			expect(front()).toBe("Notes.app");
			expect(apps().apps["Notes.app"].hidden).toBeFalsy();
		});

		it("refuses an extension, an unknown app and a switch under a modal window", () => {
			threeApps();
			dispatch({
				type: APPLICATION_SWITCHER_SWITCH,
				app: { id: APPLICATION_SWITCHER_APP_ID },
			});
			dispatch({ type: APPLICATION_SWITCHER_SWITCH, app: { id: "Nope.app" } });
			expect(front()).toBe("Notes.app");
			set((d) => {
				d.System.Manager.Applications.apps = {
					...apps().apps,
					"Calc.app": app("Calc.app", {
						windows: { alert: win("alert", { modal: true }) },
					}),
				};
				d.System.Manager.Applications.focusedAppId = "Notes.app";
			});
			dispatch({ type: APPLICATION_SWITCHER_SWITCH, app: { id: "Calc.app" } });
			expect(front()).toBe("Notes.app");
		});
	});
});

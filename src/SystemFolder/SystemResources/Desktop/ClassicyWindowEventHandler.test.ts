import { afterEach, describe, expect, it, vi } from "vitest";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopStateEventReducer } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	countAppWindows,
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { classicyWindowEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

function makeStore(
	overrides: Partial<{
		minDateTime: string | null;
		maxDateTime: string | null;
		boundaryLocked: boolean;
		paused: boolean;
		dateTime: string;
	}> = {},
): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					dateTimeLocked: false,
					syncTimeOnly: false,
					...overrides,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					focusedAppId: "Finder.app",
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: {},
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map((type) => [
							type,
							"Finder.app",
						]),
					) as Record<ClassicyFileSystemEntryFileType, string>,
				},
				Appearance: {
					packageId: "platinum",
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	};
}

function makeStoreWithWindows() {
	const ds = makeStore();
	ds.System.Manager.Applications.apps.TestApp = {
		id: "TestApp",
		name: "Test",
		icon: "",
		open: true,
		focused: false,
		windows: windowsRecord(
			{
				id: "w1",
				closed: false,
				collapsed: false,
				dragging: false,
				moving: false,
				resizing: false,
				zoomed: false,
				focused: false,
				size: [400, 300],
				position: [100, 100],
				minimumSize: [100, 100],
			},
			{
				id: "w2",
				closed: false,
				collapsed: false,
				dragging: false,
				moving: false,
				resizing: false,
				zoomed: false,
				focused: true,
				size: [600, 400],
				position: [200, 200],
				minimumSize: [100, 100],
			},
		),
		data: {},
	};
	return ds;
}

describe("ClassicyWindowOpen", () => {
	it("adds a new window to the app", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w3",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [150, 150],
			},
		});
		const windows = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(windows).toHaveLength(3);
		expect(windows.find((w) => w.id === "w3")).toBeDefined();
	});

	it("is a no-op when the window id already exists", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [999, 999],
				position: [50, 50],
			},
		});
		const windows = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(windows).toHaveLength(2);
		// Original size is unchanged
		expect(windows.find((w) => w.id === "w1")?.size).toEqual([400, 300]);
	});

	// G18: [0, 0] is a real position (a top-left window under window
	// placement), so a new window that asks for it opens there.
	it("opens a new window at [0, 0] when it asks for [0, 0]", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w3",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [0, 0],
			},
		});
		const w3 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w3");
		expect(w3?.position).toEqual([0, 0]);
	});

	// G18: only a window that supplied no position is cascaded, by the number
	// of windows the app already has: autoPosition, or no position at all.
	it("cascades a window that supplied no position: [30, 30], then [40, 40]", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps.EmptyApp = {
			id: "EmptyApp",
			name: "Empty",
			icon: "",
			open: true,
			focused: false,
			windows: {},
		};
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "EmptyApp" },
			window: {
				id: "first",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [200, 200],
				autoPosition: true,
			},
		});
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "EmptyApp" },
			window: { id: "second", minimumSize: [100, 100], size: [500, 350] },
		});
		const app = ds.System.Manager.Applications.apps.EmptyApp;
		expect(getAppWindow(app, "first")?.position).toEqual([30, 30]);
		expect(getAppWindow(app, "second")?.position).toEqual([40, 40]);
	});

	it("is a no-op when the app is not registered", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "NonExistentApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [100, 100],
			},
		});
		expect(ds.System.Manager.Applications.apps.NonExistentApp).toBeUndefined();
	});
});

describe("ClassicyWindowFocus", () => {
	it("sets the target window focused=true and all others focused=false", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1", menuBar: [] },
		});
		const windows = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(windows.find((w) => w.id === "w1")?.focused).toBe(true);
		expect(windows.find((w) => w.id === "w2")?.focused).toBe(false);
	});

	it("marks the app itself as focused", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1", menuBar: [] },
		});
		expect(ds.System.Manager.Applications.apps.TestApp.focused).toBe(true);
	});

	it("updates appMenu when menuBar is provided on the window", () => {
		const ds = makeStoreWithWindows();
		const menu = [{ id: "file", title: "File" }];
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1", menuBar: menu },
		});
		expect(ds.System.Manager.Desktop.appMenu).toBe(menu);
	});

	it("updates appMenu when appMenu is provided on the app action", () => {
		const ds = makeStoreWithWindows();
		const menu = [{ id: "edit", title: "Edit" }];
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp", appMenu: menu },
			window: { id: "w1", menuBar: [] },
		});
		expect(ds.System.Manager.Desktop.appMenu).toBe(menu);
	});
});

describe("ClassicyWindowClose", () => {
	it("sets closed=true on the target window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.closed,
		).toBe(true);
	});

	it("does not close other windows", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")?.closed,
		).toBe(false);
	});
});

describe("ClassicyWindowDestroy", () => {
	it("removes the window from the array", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		const windows = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(windows).toHaveLength(1);
		expect(windows.find((w) => w.id === "w1")).toBeUndefined();
	});

	it("leaves other windows intact", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2"),
		).toBeDefined();
	});
});

describe("ClassicyWindowMenu", () => {
	it("sets ds.System.Manager.Desktop.appMenu to the provided menuBar", () => {
		const ds = makeStoreWithWindows();
		const menu = [{ id: "view", title: "View" }];
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowMenu",
			menuBar: menu,
		});
		expect(ds.System.Manager.Desktop.appMenu).toBe(menu);
	});
});

describe("ClassicyWindowSetMenuBar", () => {
	it("refreshes the stored window record's menuBar", () => {
		const ds = makeStoreWithWindows();
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[0].menuBar = [];
		const menu = [{ id: "file", title: "File" }];
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowSetMenuBar",
			app: { id: "TestApp" },
			windowId: "w1",
			menuBar: menu,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.menuBar,
		).toBe(menu);
	});

	it("is a no-op for an unknown windowId", () => {
		const ds = makeStoreWithWindows();
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[0].menuBar = [];
		const menu = [{ id: "file", title: "File" }];
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowSetMenuBar",
			app: { id: "TestApp" },
			windowId: "does-not-exist",
			menuBar: menu,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.menuBar,
		).toEqual([]);
	});
});

describe("ClassicyWindowResize", () => {
	it("updates the window size and resizing flag", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowResize",
			app: { id: "TestApp" },
			window: { id: "w1" },
			resizing: true,
			size: [800, 600],
		});
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1?.size).toEqual([800, 600]);
		expect(w1?.resizing).toBe(true);
	});

	it("clears resizing flag when set to false", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowResize",
			app: { id: "TestApp" },
			window: { id: "w1" },
			resizing: false,
			size: [400, 300],
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.resizing,
		).toBe(false);
	});
});

describe("ClassicyWindowDrag", () => {
	it("sets dragging=true on the target window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDrag",
			app: { id: "TestApp" },
			window: { id: "w1" },
			dragging: true,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.dragging,
		).toBe(true);
	});

	it("clears dragging flag when set to false", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDrag",
			app: { id: "TestApp" },
			window: { id: "w1" },
			dragging: false,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.dragging,
		).toBe(false);
	});
});

describe("ClassicyWindowZoom", () => {
	it("sets zoomed=true on the target window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowZoom",
			app: { id: "TestApp" },
			window: { id: "w1" },
			zoomed: true,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.zoomed,
		).toBe(true);
	});

	it("clears zoomed flag when set to false", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowZoom",
			app: { id: "TestApp" },
			window: { id: "w1" },
			zoomed: false,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.zoomed,
		).toBe(false);
	});

	// Plan 0020-w98 §5, "Maximize and restore": a window maximized under
	// `window.zoom: "maximize"` sends the rect it returns to, stored as its
	// record's `restoreRect` so Restore survives a reload.
	describe("the restore rect", () => {
		const w1 = (ds: ClassicyStore) =>
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		const zoom = (
			ds: ClassicyStore,
			zoomed: boolean,
			restore?: unknown,
		): ClassicyStore =>
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowZoom",
				app: { id: "TestApp" },
				window: { id: "w1" },
				zoomed,
				...(restore === undefined ? {} : { restore }),
			});

		it("writes only `zoomed` for a zoom without one, as before", () => {
			const ds = makeStoreWithWindows();
			const before = { ...w1(ds) };
			zoom(ds, true);
			expect(w1(ds)).toEqual({ ...before, zoomed: true });
			expect("restoreRect" in (w1(ds) ?? {})).toBe(false);
			zoom(ds, false);
			expect(w1(ds)).toEqual({ ...before, zoomed: false });
		});

		it("stores the rect a maximize sends, as a copy", () => {
			const ds = makeStoreWithWindows();
			const restore = { position: [100, 100], size: [400, 300] };
			zoom(ds, true, restore);
			expect(w1(ds)).toMatchObject({
				zoomed: true,
				restoreRect: { position: [100, 100], size: [400, 300] },
			});
			restore.position[0] = 5;
			expect(w1(ds)?.restoreRect?.position).toEqual([100, 100]);
		});

		it("refuses a zoom whose rect is malformed, writing nothing", () => {
			const ds = makeStoreWithWindows();
			const before = { ...w1(ds) };
			zoom(ds, true, { position: [Number.NaN, 0], size: [400, 300] });
			zoom(ds, true, { position: [1, 2] });
			zoom(ds, true, "maximized");
			expect(w1(ds)).toEqual(before);
		});

		it("keeps the rect through a zoom without one, and deletes it on un-zoom", () => {
			const ds = makeStoreWithWindows();
			zoom(ds, true, { position: [100, 100], size: [400, 300] });
			zoom(ds, true);
			expect(w1(ds)?.restoreRect).toEqual({
				position: [100, 100],
				size: [400, 300],
			});
			zoom(ds, false);
			expect(w1(ds)?.zoomed).toBe(false);
			expect("restoreRect" in (w1(ds) ?? {})).toBe(false);
		});
	});
});

describe("ClassicyWindowCollapse", () => {
	it("sets collapsed=true on the target window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowCollapse",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")
				?.collapsed,
		).toBe(true);
	});

	it("does not collapse other windows", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowCollapse",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")
				?.collapsed,
		).toBe(false);
	});
});

describe("ClassicyWindowExpand", () => {
	it("sets collapsed=false on a previously collapsed window", () => {
		const ds = makeStoreWithWindows();
		// First collapse w1
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[0].collapsed =
			true;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowExpand",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")
				?.collapsed,
		).toBe(false);
	});

	it("does not affect other windows", () => {
		const ds = makeStoreWithWindows();
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[0].collapsed =
			true;
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[1].collapsed =
			true;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowExpand",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")
				?.collapsed,
		).toBe(true);
	});
});

describe("ClassicyWindowMove", () => {
	it("updates position and moving flag on the target window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowMove",
			app: { id: "TestApp" },
			window: { id: "w1" },
			position: [300, 250],
			moving: true,
		});
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1?.position).toEqual([300, 250]);
		expect(w1?.moving).toBe(true);
	});

	it("clears moving flag when set to false", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowMove",
			app: { id: "TestApp" },
			window: { id: "w1" },
			position: [300, 250],
			moving: false,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1")?.moving,
		).toBe(false);
	});

	it("does not update other windows", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowMove",
			app: { id: "TestApp" },
			window: { id: "w1" },
			position: [300, 250],
			moving: true,
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")?.position,
		).toEqual([200, 200]);
	});
});

describe("ClassicyWindowPosition", () => {
	it("updates position only without touching moving flag", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowPosition",
			app: { id: "TestApp" },
			window: { id: "w1" },
			position: [450, 350],
		});
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1?.position).toEqual([450, 350]);
		expect(w1?.moving).toBe(false);
	});

	it("does not update other windows", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowPosition",
			app: { id: "TestApp" },
			window: { id: "w1" },
			position: [450, 350],
		});
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")?.position,
		).toEqual([200, 200]);
	});
});

describe("ClassicyWindowFocus — global invariant", () => {
	it("defocuses other apps and their windows in a single action", () => {
		const ds = makeStoreWithWindows();
		// Finder starts focused with a focused window (cross-app state)
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].windows = windowsRecord({
			id: "finder-w",
			closed: false,
			collapsed: false,
			dragging: false,
			moving: false,
			resizing: false,
			zoomed: false,
			focused: true,
			size: [400, 300],
			position: [0, 0],
			minimumSize: [100, 100],
		});

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Finder.app"].focused).toBe(false);
		expect(listAppWindows(apps["Finder.app"])[0].focused).toBe(false);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		const focusedWindows = Object.values(apps)
			.flatMap((a) => listAppWindows(a))
			.filter((w) => w.focused);
		expect(focusedWindows).toHaveLength(1);
		expect(focusedWindows[0].id).toBe("w1");
	});

	it("records lastAccessedWindowId on the app", () => {
		const ds = makeStoreWithWindows();

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});

		expect(
			ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId,
		).toBe("w1");
	});
});

describe("ClassicyWindowOpen — focus of new windows", () => {
	it("focuses a genuinely new window and defocuses everything else", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.focusedAppId = "Finder.app";

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w3",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [150, 150],
			},
		});

		const apps = ds.System.Manager.Applications.apps;
		expect(getAppWindow(apps.TestApp, "w3")?.focused).toBe(true);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		expect(apps["Finder.app"].focused).toBe(false);
		// w2 was focused in the fixture; the new window took over
		expect(getAppWindow(apps.TestApp, "w2")?.focused).toBe(false);
	});

	it("does NOT steal focus when re-registering an existing window", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.focusedAppId = "Finder.app";

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [999, 999],
				position: [50, 50],
			},
		});

		// w2 keeps its focus from the fixture; focusedAppId untouched
		expect(
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2")?.focused,
		).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});

describe("ClassicyWindowClose — focus promotion", () => {
	function makeCloseStore() {
		const ds = makeStoreWithWindows();
		const testApp = ds.System.Manager.Applications.apps.TestApp;
		testApp.focused = true;
		listAppWindows(testApp)[0].zOrder = 1000; // w1
		listAppWindows(testApp)[1].zOrder = 2000; // w2 (focused in fixture)
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		return ds;
	}

	it("promotes the highest-zOrder sibling via focusWindow when the focused app closes a window", () => {
		const ds = makeCloseStore();

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});

		const testApp = ds.System.Manager.Applications.apps.TestApp;
		expect(getAppWindow(testApp, "w2")?.closed).toBe(true);
		expect(getAppWindow(testApp, "w1")?.focused).toBe(true);
		// Promotion goes through focusWindow, so recency bookkeeping updates too
		expect(testApp.lastAccessedWindowId).toBe("w1");
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});

	it("does NOT steal global focus when a background app's window closes", () => {
		const ds = makeStoreWithWindows();
		// Finder is the focused app; TestApp is in the background
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.apps.TestApp.focused = false;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});

		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
		// No TestApp window was promoted to focused
		expect(
			listAppWindows(ds.System.Manager.Applications.apps.TestApp).some(
				(w) => w.focused,
			),
		).toBe(false);
	});
});

describe("ClassicyWindowOpen persists windowType", () => {
	it("stores windowType on a newly opened utility window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "palette",
				minimumSize: [100, 100],
				size: [180, 220],
				position: [150, 150],
				windowType: "utility",
			},
		});
		const win = getAppWindow(
			ds.System.Manager.Applications.apps.TestApp,
			"palette",
		);
		expect(win?.windowType).toBe("utility");
	});

	// Pins the reducer-level contract: the reducer invents no default, so a
	// window dispatched without windowType stays undefined. (At runtime the
	// ClassicyWindow component defaults the prop to "document" and always sends
	// it — but both undefined and "document" are succession-eligible, since
	// every consumer filters on `!== "utility"`.)
	it("leaves windowType undefined for a plain document window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "doc",
				minimumSize: [100, 100],
				size: [400, 300],
				position: [150, 150],
			},
		});
		const win = getAppWindow(
			ds.System.Manager.Applications.apps.TestApp,
			"doc",
		);
		expect(win?.windowType).toBeUndefined();
	});
});

// #278: collapse-all reads these flags off the store record.
describe("ClassicyWindowOpen persists collapsable and modal", () => {
	const findWin = (ds: ReturnType<typeof makeStoreWithWindows>, id: string) =>
		getAppWindow(ds.System.Manager.Applications.apps.TestApp, id);

	it("stores collapsable and modal on a newly opened window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "dialog",
				minimumSize: [100, 100],
				size: [300, 200],
				position: [150, 150],
				collapsable: false,
				modal: true,
			},
		});
		const win = findWin(ds, "dialog");
		expect(win?.collapsable).toBe(false);
		expect(win?.modal).toBe(true);
	});

	it("updates the flags when an existing record re-registers", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [400, 300],
				position: [100, 100],
				collapsable: false,
				modal: false,
			},
		});
		const win = findWin(ds, "w1");
		expect(win?.collapsable).toBe(false);
		expect(win?.modal).toBe(false);
	});

	it("ignores non-boolean flags", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "odd",
				minimumSize: [100, 100],
				size: [300, 200],
				position: [150, 150],
				collapsable: "no",
				modal: 1,
			},
		});
		const win = findWin(ds, "odd");
		expect(win).toBeDefined();
		expect(win?.collapsable).toBeUndefined();
		expect(win?.modal).toBeUndefined();
	});
});

describe("ClassicyWindowDestroy", () => {
	function makeFocusedApp() {
		const ds = makeStoreWithWindows();
		// makeStoreWithWindows leaves Finder holding global focus; modal
		// succession only runs for the app that actually owns focus.
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		ds.System.Manager.Applications.apps.TestApp.focused = true;
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;
		return ds;
	}

	it("removes the window record", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const windows = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(windows).toHaveLength(1);
		expect(windows.find((w) => w.id === "w2")).toBeUndefined();
	});

	it("focuses a surviving sibling when the destroyed window held focus", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1?.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});

	it("leaves focus alone when the destroyed window did not hold it", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		const w2 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2");
		expect(w2?.focused).toBe(true);
	});

	it("does not steal focus when the app is not the focused app", () => {
		const ds = makeStoreWithWindows(); // Finder holds focus
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});

	it("leaves the app focused with no focused window when none survive", () => {
		const ds = makeFocusedApp();
		ds.System.Manager.Applications.apps.TestApp.windows = windowsRecord(
			...listAppWindows(ds.System.Manager.Applications.apps.TestApp).filter(
				(w) => w.id === "w2",
			),
		);
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		expect(ds.System.Manager.Applications.apps.TestApp.focused).toBe(true);
		expect(countAppWindows(ds.System.Manager.Applications.apps.TestApp)).toBe(
			0,
		);
	});

	it("does not choose a utility window as the successor", () => {
		const ds = makeFocusedApp();
		listAppWindows(ds.System.Manager.Applications.apps.TestApp)[0].windowType =
			"utility";
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1?.focused).toBe(false);
	});

	it("clears lastAccessedWindowId when it named the destroyed window", () => {
		const ds = makeFocusedApp();
		// w1 does not hold focus (w2 does, per makeStoreWithWindows), so
		// destroying it triggers no succession — isolating the clear itself
		// from focusApp's own lastAccessedWindowId write.
		ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId = "w1";
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId,
		).toBeUndefined();
	});

	it("leaves lastAccessedWindowId alone when it names a surviving window", () => {
		const ds = makeFocusedApp();
		ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId = "w1";
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		expect(
			ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId,
		).toBe("w1");
	});

	it("refocuses a modal on every reopen, not just the first (#222)", () => {
		const ds = makeFocusedApp();
		// Give w1/w2 explicit, distinct zOrder so pickWindowToRestore's
		// highest-zOrder succession branch is what selects w2 below — without
		// this, neither window carries a zOrder and the picker falls through to
		// the last-registered candidate, which also happens to be w2 but only
		// because of its registration order, not because it was the actual
		// focus successor.
		const w1 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		const w2 = getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w2");
		if (w1) w1.zOrder = 10;
		if (w2) w2.zOrder = 20;
		const openDialog = () =>
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowOpen",
				app: { id: "TestApp" },
				window: {
					id: "dialog",
					minimumSize: [100, 100],
					size: [360, 120],
					position: [0, 0],
				},
			});
		const closeDialog = () =>
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowDestroy",
				app: { id: "TestApp" },
				window: { id: "dialog" },
			});
		const focusedId = () =>
			listAppWindows(ds.System.Manager.Applications.apps.TestApp).find(
				(w) => w.focused,
			)?.id;

		openDialog();
		expect(focusedId()).toBe("dialog");
		closeDialog();
		expect(focusedId()).toBe("w2");

		// Before the fix this second open hit the known-id branch and never
		// focused, leaving w2 active behind a visible modal.
		openDialog();
		expect(focusedId()).toBe("dialog");
		closeDialog();
		expect(focusedId()).toBe("w2");
	});
});

describe("ClassicyWindowClose skips utility windows when promoting a sibling", () => {
	function makeFocusedAppWithUtility() {
		const ds = makeStore();
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		ds.System.Manager.Applications.apps.TestApp = {
			id: "TestApp",
			name: "Test",
			icon: "",
			open: true,
			focused: true,
			windows: windowsRecord(
				{
					id: "doc",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: true,
					size: [400, 300],
					position: [100, 100],
					minimumSize: [100, 100],
					zOrder: 10,
				},
				{
					id: "doc2",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: false,
					size: [400, 300],
					position: [120, 120],
					minimumSize: [100, 100],
					zOrder: 20,
				},
				{
					id: "palette",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: false,
					size: [180, 220],
					position: [300, 100],
					minimumSize: [100, 100],
					zOrder: 99,
					windowType: "utility",
				},
			),
			data: {},
		};
		return ds;
	}

	it("promotes the highest-zOrder non-utility sibling, not the utility window", () => {
		const ds = makeFocusedAppWithUtility();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc" },
		});
		const wins = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		// "palette" has the highest zOrder but is utility → "doc2" wins.
		expect(wins.find((w) => w.id === "doc2")?.focused).toBe(true);
		expect(wins.find((w) => w.id === "palette")?.focused).toBe(false);
	});

	it("leaves no window focused when only a utility window remains", () => {
		const ds = makeFocusedAppWithUtility();
		// Close both document windows; only the utility palette stays open.
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc" },
		});
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc2" },
		});
		const wins = listAppWindows(ds.System.Manager.Applications.apps.TestApp);
		expect(wins.some((w) => w.focused === true)).toBe(false);
		// App keeps focus / menu-bar ownership.
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});
});

describe("ClassicyWindowOpen — reopening a window closed this session", () => {
	const reopen = (ds: ClassicyStore) =>
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [400, 300],
				position: [100, 100],
			},
		});

	it("brings the reopened window to the front and focuses it", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		const w1 = () =>
			getAppWindow(ds.System.Manager.Applications.apps.TestApp, "w1");
		expect(w1()?.closedThisSession).toBe(true);

		reopen(ds);

		const testApp = ds.System.Manager.Applications.apps.TestApp;
		expect(w1()?.closed).toBe(false);
		expect(w1()?.closedThisSession).toBe(false);
		expect(w1()?.focused).toBe(true);
		expect(getAppWindow(testApp, "w2")?.focused).toBe(false);
		expect(
			ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId,
		).toBe("w1");
	});

	it("does NOT steal focus for a closed window re-registering after a reload", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		// Persisted as closed, but the session marker was stripped on save.
		const testApp = ds.System.Manager.Applications.apps.TestApp;
		const persisted = getAppWindow(testApp, "w1");
		if (persisted) persisted.closed = true;

		reopen(ds);

		expect(getAppWindow(testApp, "w1")?.closed).toBe(false);
		expect(getAppWindow(testApp, "w1")?.focused).toBe(false);
		expect(getAppWindow(testApp, "w2")?.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});

describe("focus recency within a single millisecond", () => {
	it("promotes the most recently focused sibling even when focuses share a timestamp", () => {
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);
		try {
			const ds = makeStoreWithWindows();
			const focus = (id: string) =>
				classicyWindowEventHandler(ds, {
					type: "ClassicyWindowFocus",
					app: { id: "TestApp" },
					window: { id },
				});
			focus("w1");
			focus("w2");
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowOpen",
				app: { id: "TestApp" },
				window: {
					id: "w3",
					minimumSize: [100, 100],
					size: [300, 200],
					position: [10, 10],
				},
			});
			const testApp = ds.System.Manager.Applications.apps.TestApp;
			const z = (id: string) => getAppWindow(testApp, id)?.zOrder ?? 0;
			expect(z("w2")).toBeGreaterThan(z("w1"));
			expect(z("w3")).toBeGreaterThan(z("w2"));

			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowClose",
				app: { id: "TestApp" },
				window: { id: "w3" },
			});

			expect(getAppWindow(testApp, "w2")?.focused).toBe(true);
			expect(getAppWindow(testApp, "w1")?.focused).toBe(false);
		} finally {
			nowSpy.mockRestore();
		}
	});
});

// Plan 0020-w98 §5, "Minimize": under `window.collapse: "minimize"` a
// collapse takes the window off the screen and passes focus on, and a close
// or a modal's destroy passes it on the same way; under every other package
// all three are as they always were.
describe("minimize (window.collapse)", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
	});

	const win = (
		id: string,
		overrides: Partial<ClassicyStoreSystemAppWindow> = {},
	): ClassicyStoreSystemAppWindow => ({
		id,
		closed: false,
		collapsed: false,
		focused: false,
		zoomed: false,
		size: [100, 100],
		position: [0, 0],
		minimumSize: [0, 0],
		...overrides,
	});

	const app = (
		id: string,
		windows: ClassicyStoreSystemAppWindow[],
		overrides: Partial<ClassicyStoreSystemApp> = {},
	): ClassicyStoreSystemApp => ({
		id,
		name: id.replace(/\.app$/, ""),
		icon: "",
		windows: windowsRecord(...windows),
		open: true,
		focused: false,
		data: {},
		...overrides,
	});

	// A.app holds focus (its window `focused` is the focused window); B.app
	// is in the background. `minimize` decides the drawing package.
	const shell = (
		minimize: boolean,
		aWindows: ClassicyStoreSystemAppWindow[],
		bWindows: ClassicyStoreSystemAppWindow[] = [],
	) => {
		const ds = makeStore();
		if (minimize) {
			registerTestTaskbarPackage(
				TEST_MINIMIZE_LAYOUT,
				TEST_MINIMIZE_PACKAGE_ID,
			);
			ds.System.Manager.Appearance.packageId = TEST_MINIMIZE_PACKAGE_ID;
		}
		const apps = ds.System.Manager.Applications.apps;
		apps["Finder.app"].focused = false;
		apps["A.app"] = app("A.app", aWindows, { focused: true });
		if (bWindows.length > 0) apps["B.app"] = app("B.app", bWindows);
		ds.System.Manager.Applications.focusedAppId = "A.app";
		return ds;
	};

	const reduce = (
		ds: ClassicyStore,
		type: string,
		appId: string,
		windowId: string,
	) =>
		classicyWindowEventHandler(ds, {
			type,
			app: { id: appId },
			window: { id: windowId },
		});

	const recordOf = (ds: ClassicyStore, appId: string, windowId: string) =>
		getAppWindow(ds.System.Manager.Applications.apps[appId], windowId);

	const focusOf = (ds: ClassicyStore) => ({
		focusedAppId: ds.System.Manager.Applications.focusedAppId,
		focusedWindows: Object.values(ds.System.Manager.Applications.apps).flatMap(
			(a) =>
				listAppWindows(a)
					.filter((w) => w.focused)
					.map((w) => `${a.id}/${w.id}`),
		),
	});

	describe("ClassicyWindowCollapse", () => {
		it("without the flag, collapses and keeps the focus where it is", () => {
			const ds = shell(false, [
				win("front", { focused: true, zOrder: 9 }),
				win("back", { zOrder: 3 }),
			]);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "front");
			expect(recordOf(ds, "A.app", "front")).toMatchObject({
				collapsed: true,
				focused: true,
			});
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/front"]);
		});

		it("minimizes, and passes focus to the app's front shown window", () => {
			const ds = shell(true, [
				win("front", { focused: true, zOrder: 9 }),
				win("back", { zOrder: 3 }),
				win("middle", { zOrder: 6 }),
				win("min", { collapsed: true, zOrder: 8 }),
				win("tools", { windowType: "utility", zOrder: 10 }),
			]);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "front");
			expect(recordOf(ds, "A.app", "front")).toMatchObject({
				collapsed: true,
				focused: false,
			});
			expect(focusOf(ds)).toEqual({
				focusedAppId: "A.app",
				focusedWindows: ["A.app/middle"],
			});
			expect(recordOf(ds, "A.app", "min")?.collapsed).toBe(true);
		});

		it("passes focus across apps when the app has no other shown window", () => {
			const ds = shell(
				true,
				[win("only", { focused: true, zOrder: 9 })],
				[win("doc", { zOrder: 2 })],
			);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "only");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "B.app",
				focusedWindows: ["B.app/doc"],
			});
			expect(ds.System.Manager.Applications.apps["A.app"].focused).toBe(false);
		});

		it("passes focus to the desktop when no window is left on screen", () => {
			const ds = shell(
				true,
				[win("only", { focused: true, zOrder: 9 })],
				[win("min", { collapsed: true, zOrder: 2 })],
			);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "only");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "Finder.app",
				focusedWindows: [],
			});
			expect(recordOf(ds, "B.app", "min")?.collapsed).toBe(true);
		});

		it("moves no focus when a window that did not hold it minimizes", () => {
			const ds = shell(true, [
				win("front", { focused: true, zOrder: 9 }),
				win("back", { zOrder: 3 }),
			]);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "back");
			expect(recordOf(ds, "A.app", "back")?.collapsed).toBe(true);
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/front"]);
		});

		it("passes the focus on when the app's last shown window minimizes under its focused palette", () => {
			const ds = shell(
				true,
				[
					win("doc", { zOrder: 3 }),
					win("tools", { windowType: "utility", focused: true, zOrder: 9 }),
				],
				[win("other", { zOrder: 2 })],
			);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "doc");
			// The palette goes with its app's last shown window, and so does
			// the focus it held.
			expect(focusOf(ds)).toEqual({
				focusedAppId: "B.app",
				focusedWindows: ["B.app/other"],
			});
			expect(recordOf(ds, "A.app", "tools")).toMatchObject({
				focused: false,
			});
			expect(recordOf(ds, "A.app", "tools")?.collapsed).not.toBe(true);
		});

		it("leaves the focus with a palette whose app still shows a window", () => {
			const ds = shell(true, [
				win("doc", { zOrder: 3 }),
				win("other", { zOrder: 2 }),
				win("tools", { windowType: "utility", focused: true, zOrder: 9 }),
			]);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "doc");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "A.app",
				focusedWindows: ["A.app/tools"],
			});
		});

		it("refuses a palette's or a modal's collapse: neither has a taskbar button", () => {
			const ds = shell(true, [
				win("doc", { zOrder: 1 }),
				win("tools", { windowType: "utility", focused: true, zOrder: 9 }),
				win("dialog", { modal: true, zOrder: 5 }),
			]);
			const before = structuredClone(ds.System.Manager.Applications);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "tools");
			reduce(ds, "ClassicyWindowCollapse", "A.app", "dialog");
			expect(ds.System.Manager.Applications).toEqual(before);
		});

		it("is a no-op for an unknown window", () => {
			const ds = shell(true, [win("doc", { focused: true })]);
			const before = structuredClone(ds.System.Manager.Applications);
			reduce(ds, "ClassicyWindowCollapse", "A.app", "nope");
			expect(ds.System.Manager.Applications).toEqual(before);
		});
	});

	describe("ClassicyWindowClose", () => {
		it("without the flag, promotes the highest-zOrder sibling, minimized or not", () => {
			const ds = shell(false, [
				win("closing", { focused: true, zOrder: 9 }),
				win("shaded", { collapsed: true, zOrder: 8 }),
				win("back", { zOrder: 3 }),
			]);
			reduce(ds, "ClassicyWindowClose", "A.app", "closing");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/shaded"]);
			expect(recordOf(ds, "A.app", "shaded")?.collapsed).toBe(true);
		});

		it("skips a minimized sibling, and never restores it", () => {
			const ds = shell(true, [
				win("closing", { focused: true, zOrder: 9 }),
				win("min", { collapsed: true, zOrder: 8 }),
				win("back", { zOrder: 3 }),
			]);
			reduce(ds, "ClassicyWindowClose", "A.app", "closing");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/back"]);
			expect(recordOf(ds, "A.app", "min")?.collapsed).toBe(true);
		});

		it("passes focus to another app, else the desktop, when only minimized siblings are left", () => {
			const toB = shell(
				true,
				[
					win("closing", { focused: true, zOrder: 9 }),
					win("min", { collapsed: true, zOrder: 8 }),
				],
				[win("doc", { zOrder: 2 })],
			);
			reduce(toB, "ClassicyWindowClose", "A.app", "closing");
			expect(focusOf(toB)).toEqual({
				focusedAppId: "B.app",
				focusedWindows: ["B.app/doc"],
			});

			const toDesktop = shell(true, [
				win("closing", { focused: true, zOrder: 9 }),
				win("min", { collapsed: true, zOrder: 8 }),
			]);
			reduce(toDesktop, "ClassicyWindowClose", "A.app", "closing");
			expect(focusOf(toDesktop)).toEqual({
				focusedAppId: "Finder.app",
				focusedWindows: [],
			});
			expect(recordOf(toDesktop, "A.app", "min")?.collapsed).toBe(true);
		});

		it("leaves the focus with the app's dialog that holds it", () => {
			const ds = shell(true, [
				win("closing", { zOrder: 9 }),
				win("dialog", { modal: true, focused: true, zOrder: 10 }),
				win("back", { zOrder: 3 }),
			]);
			reduce(ds, "ClassicyWindowClose", "A.app", "closing");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/dialog"]);
		});

		it("does not steal focus when a background app's window closes", () => {
			const ds = shell(
				true,
				[win("front", { focused: true, zOrder: 9 })],
				[win("closing", { zOrder: 2 }), win("other", { zOrder: 1 })],
			);
			reduce(ds, "ClassicyWindowClose", "B.app", "closing");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/front"]);
		});
	});

	describe("ClassicyWindowDestroy", () => {
		it("without the flag, refocuses the app's last-accessed window, minimized or not", () => {
			const ds = shell(false, [
				win("dialog", { modal: true, focused: true, zOrder: 10 }),
				win("shaded", { collapsed: true, zOrder: 8 }),
				win("back", { zOrder: 3 }),
			]);
			ds.System.Manager.Applications.apps["A.app"].lastAccessedWindowId =
				"shaded";
			reduce(ds, "ClassicyWindowDestroy", "A.app", "dialog");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/shaded"]);
			expect(recordOf(ds, "A.app", "shaded")?.collapsed).toBe(true);
		});

		it("skips a minimized window, so a dialog's going never restores one", () => {
			const ds = shell(
				true,
				[
					win("dialog", { modal: true, focused: true, zOrder: 10 }),
					win("min", { collapsed: true, zOrder: 8 }),
				],
				[win("doc", { zOrder: 2 })],
			);
			ds.System.Manager.Applications.apps["A.app"].lastAccessedWindowId = "min";
			reduce(ds, "ClassicyWindowDestroy", "A.app", "dialog");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "B.app",
				focusedWindows: ["B.app/doc"],
			});
			expect(recordOf(ds, "A.app", "min")?.collapsed).toBe(true);
		});

		it("refocuses the dialog's owner when it is on screen", () => {
			const ds = shell(true, [
				win("dialog", { modal: true, focused: true, zOrder: 10 }),
				win("owner", { zOrder: 8 }),
			]);
			reduce(ds, "ClassicyWindowDestroy", "A.app", "dialog");
			expect(focusOf(ds).focusedWindows).toEqual(["A.app/owner"]);
		});
	});

	it("ClassicyWindowExpand and ClassicyWindowFocus restore a minimized window", () => {
		const ds = shell(true, [
			win("a", { collapsed: true, zOrder: 2 }),
			win("b", { collapsed: true, zOrder: 1 }),
		]);
		reduce(ds, "ClassicyWindowExpand", "A.app", "a");
		expect(recordOf(ds, "A.app", "a")?.collapsed).toBe(false);
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "A.app" },
			window: { id: "b", menuBar: [] },
		});
		expect(recordOf(ds, "A.app", "b")).toMatchObject({
			collapsed: false,
			focused: true,
		});
	});
});

// Plan 0020-w98 E3 (the shell addendum's B17; WIG Ch.10 "Message
// Notification", p.212): under the Windows shell an inactive app asks for
// attention (`ClassicyAppRequestAttention`, and a modal it opens in the
// background), its front primary window's taskbar button flashing until the
// app is activated. Under a package without a taskbar nothing changes.
describe("the attention signal (ClassicyAppRequestAttention)", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
	});

	const win = (
		id: string,
		overrides: Partial<ClassicyStoreSystemAppWindow> = {},
	): ClassicyStoreSystemAppWindow => ({
		id,
		closed: false,
		focused: false,
		size: [100, 100],
		position: [0, 0],
		minimumSize: [0, 0],
		...overrides,
	});

	// A.app holds focus; B.app is in the background with two documents, the
	// front one minimized. `taskbar` decides the drawing package.
	const shell = (taskbar: boolean) => {
		const ds = makeStore();
		if (taskbar) {
			registerTestTaskbarPackage();
			ds.System.Manager.Appearance.packageId = TEST_TASKBAR_PACKAGE_ID;
		}
		const apps = ds.System.Manager.Applications.apps;
		apps["Finder.app"].focused = false;
		apps["A.app"] = {
			id: "A.app",
			name: "A",
			icon: "",
			open: true,
			focused: true,
			data: {},
			windows: windowsRecord(win("doc", { focused: true, zOrder: 50 })),
		};
		apps["B.app"] = {
			id: "B.app",
			name: "B",
			icon: "",
			open: true,
			focused: false,
			data: {},
			windows: windowsRecord(
				win("back", { zOrder: 10 }),
				win("front", { zOrder: 20, collapsed: true }),
				win("palette", { zOrder: 30, windowType: "utility" }),
			),
		};
		ds.System.Manager.Applications.focusedAppId = "A.app";
		return ds;
	};
	const b = (ds: ClassicyStore, id: string) =>
		getAppWindow(ds.System.Manager.Applications.apps["B.app"], id);
	const attention = (ds: ClassicyStore) =>
		Object.values(ds.System.Manager.Applications.apps).flatMap((a) =>
			listAppWindows(a)
				.filter((w) => w.attention)
				.map((w) => `${a.id}:${w.id}`),
		);
	const request = (ds: ClassicyStore, window?: { id: string }) =>
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppRequestAttention",
			app: { id: "B.app" },
			...(window ? { window } : {}),
		});
	const openModal = (ds: ClassicyStore, background: boolean) =>
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "B.app" },
			window: {
				id: "alert",
				position: [10, 10],
				size: [200, 100],
				minimumSize: [0, 0],
				modal: true,
				...(background ? { background: true } : {}),
			},
		});

	it("flags the app's front primary window, a minimized one included, never a palette", () => {
		const ds = request(shell(true));
		expect(attention(ds)).toEqual(["B.app:front"]);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("A.app");
	});

	it("flags the window it names, when that is an open primary window", () => {
		expect(attention(request(shell(true), { id: "back" }))).toEqual([
			"B.app:back",
		]);
		expect(attention(request(shell(true), { id: "palette" }))).toEqual([
			"B.app:front",
		]);
	});

	it("does nothing for the focused app, a closed app or an app with no primary window", () => {
		const ds = shell(true);
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppRequestAttention",
			app: { id: "A.app" },
		});
		expect(attention(ds)).toEqual([]);
		const closed = shell(true);
		closed.System.Manager.Applications.apps["B.app"].open = false;
		expect(attention(request(closed))).toEqual([]);
		const palettesOnly = shell(true);
		palettesOnly.System.Manager.Applications.apps["B.app"].windows =
			windowsRecord(win("palette", { windowType: "utility" }));
		expect(attention(request(palettesOnly))).toEqual([]);
	});

	it("does nothing under a package without a taskbar", () => {
		expect(attention(request(shell(false)))).toEqual([]);
	});

	it("is not open to untrusted actions (a stack script's)", () => {
		const ds = shell(true);
		classicyDesktopStateEventReducer(
			ds,
			{ type: "ClassicyAppRequestAttention", app: { id: "B.app" } },
			"untrusted",
		);
		expect(attention(ds)).toEqual([]);
	});

	it("is cleared when the app is activated, by any window or the app itself", () => {
		const byWindow = request(shell(true));
		classicyWindowEventHandler(byWindow, {
			type: "ClassicyWindowFocus",
			app: { id: "B.app" },
			window: { id: "back" },
		});
		expect(attention(byWindow)).toEqual([]);
		const byApp = request(shell(true));
		classicyDesktopStateEventReducer(byApp, {
			type: "ClassicyAppFocus",
			app: { id: "B.app" },
		});
		expect(attention(byApp)).toEqual([]);
	});

	it("is cleared when its window closes", () => {
		const ds = request(shell(true));
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "B.app" },
			window: { id: "front" },
		});
		expect(b(ds, "front")?.attention).toBeUndefined();
	});

	it("is never persisted", () => {
		const ds = request(shell(true));
		expect(
			b(sanitizeStateForPersistence(ds), "front")?.attention,
		).toBeUndefined();
	});

	describe("a modal opened in the background", () => {
		it("opens without focus under the shell, the app's button flashing", () => {
			const ds = openModal(shell(true), true);
			expect(b(ds, "alert")?.focused).not.toBe(true);
			expect(b(ds, "alert")?.closed).toBe(false);
			expect(ds.System.Manager.Applications.focusedAppId).toBe("A.app");
			expect(attention(ds)).toEqual(["B.app:front"]);
		});

		it("opens focused when it is not marked background", () => {
			const ds = openModal(shell(true), false);
			expect(b(ds, "alert")?.focused).toBe(true);
			expect(ds.System.Manager.Applications.focusedAppId).toBe("B.app");
			expect(attention(ds)).toEqual([]);
		});

		it("opens focused under a package without a taskbar, background or not", () => {
			const ds = openModal(shell(false), true);
			expect(b(ds, "alert")?.focused).toBe(true);
			expect(ds.System.Manager.Applications.focusedAppId).toBe("B.app");
			expect(attention(ds)).toEqual([]);
		});

		it("opens focused when its app has no window with a button to flash", () => {
			const ds = shell(true);
			ds.System.Manager.Applications.apps["B.app"].windows = {};
			openModal(ds, true);
			expect(b(ds, "alert")?.focused).toBe(true);
			expect(ds.System.Manager.Applications.focusedAppId).toBe("B.app");
		});

		it("opens focused when its app is the focused one", () => {
			const ds = shell(true);
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowOpen",
				app: { id: "A.app" },
				window: {
					id: "alert",
					position: [10, 10],
					size: [200, 100],
					minimumSize: [0, 0],
					modal: true,
					background: true,
				},
			});
			expect(
				getAppWindow(ds.System.Manager.Applications.apps["A.app"], "alert")
					?.focused,
			).toBe(true);
			expect(attention(ds)).toEqual([]);
		});

		it("takes focus, and the flash stops, once the user activates it", () => {
			const ds = openModal(shell(true), true);
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowFocus",
				app: { id: "B.app" },
				window: { id: "alert" },
			});
			expect(b(ds, "alert")?.focused).toBe(true);
			expect(attention(ds)).toEqual([]);
		});
	});
});

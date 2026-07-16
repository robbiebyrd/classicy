import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
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
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: [],
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
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
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
		windows: [
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
		],
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
		const windows = ds.System.Manager.Applications.apps.TestApp.windows;
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
		const windows = ds.System.Manager.Applications.apps.TestApp.windows;
		expect(windows).toHaveLength(2);
		// Original size is unchanged
		expect(windows.find((w) => w.id === "w1")?.size).toEqual([400, 300]);
	});

	it("pads position when position is [0, 0]", () => {
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
		const w3 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w3",
		);
		expect(w3?.position[0]).toBeGreaterThan(0);
		expect(w3?.position[1]).toBeGreaterThan(0);
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
		const windows = ds.System.Manager.Applications.apps.TestApp.windows;
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.closed,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.closed,
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
		const windows = ds.System.Manager.Applications.apps.TestApp.windows;
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			),
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
		const w1 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w1",
		);
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.resizing,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.dragging,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.dragging,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.zoomed,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.zoomed,
		).toBe(false);
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.collapsed,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.collapsed,
		).toBe(false);
	});
});

describe("ClassicyWindowExpand", () => {
	it("sets collapsed=false on a previously collapsed window", () => {
		const ds = makeStoreWithWindows();
		// First collapse w1
		ds.System.Manager.Applications.apps.TestApp.windows[0].collapsed = true;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowExpand",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.collapsed,
		).toBe(false);
	});

	it("does not affect other windows", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.apps.TestApp.windows[0].collapsed = true;
		ds.System.Manager.Applications.apps.TestApp.windows[1].collapsed = true;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowExpand",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		expect(
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.collapsed,
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
		const w1 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w1",
		);
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w1",
			)?.moving,
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.position,
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
		const w1 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w1",
		);
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.position,
		).toEqual([200, 200]);
	});
});

describe("ClassicyWindowFocus — global invariant", () => {
	it("defocuses other apps and their windows in a single action", () => {
		const ds = makeStoreWithWindows();
		// Finder starts focused with a focused window (cross-app state)
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
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
			},
		];

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		const focusedWindows = Object.values(apps)
			.flatMap((a) => a.windows)
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
		expect(apps.TestApp.windows.find((w) => w.id === "w3")?.focused).toBe(true);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		expect(apps["Finder.app"].focused).toBe(false);
		// w2 was focused in the fixture; the new window took over
		expect(apps.TestApp.windows.find((w) => w.id === "w2")?.focused).toBe(
			false,
		);
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
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.focused,
		).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});

describe("ClassicyWindowClose — focus promotion", () => {
	function makeCloseStore() {
		const ds = makeStoreWithWindows();
		const testApp = ds.System.Manager.Applications.apps.TestApp;
		testApp.focused = true;
		testApp.windows[0].zOrder = 1000; // w1
		testApp.windows[1].zOrder = 2000; // w2 (focused in fixture)
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
		expect(testApp.windows.find((w) => w.id === "w2")?.closed).toBe(true);
		expect(testApp.windows.find((w) => w.id === "w1")?.focused).toBe(true);
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
			ds.System.Manager.Applications.apps.TestApp.windows.some(
				(w) => w.focused,
			),
		).toBe(false);
	});
});

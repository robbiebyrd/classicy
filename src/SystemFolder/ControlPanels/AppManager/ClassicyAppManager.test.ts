import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type {
	ClassicyStore,
	DeepPartial,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	activateApp,
	classicyAppEventHandler,
	classicyDesktopStateEventReducer,
	closeApp,
	deFocusApps,
	focusApp,
	focusWindow,
	loadApp,
	mergeClassicyState,
	openApp,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
// Side-effect imports: register app plugins so ClassicyAppFinder* and
// ClassicyAppMoviePlayer* events are handled by classicyDesktopStateEventReducer.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
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
							windows: [],
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
							handlesFileTypes: Object.values(ClassicyFileSystemEntryFileType),
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

describe("deFocusApps", () => {
	it("defocuses the tracked focused app and its windows", () => {
		const ds = makeStore();
		// focusedAppId is "Finder.app" in makeStore; set its window as focused
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "w1",
				closed: false,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
				focused: true,
			},
		];

		deFocusApps(ds);

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			false,
		);
		expect(
			ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused,
		).toBe(false);
		expect(ds.System.Manager.Applications.focusedAppId).toBeUndefined();
	});
});

describe("focusApp", () => {
	it("sets the target app as focused and others as unfocused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			false,
		);
	});

	it("focuses the default non-closed window and does NOT reopen closed windows", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: false,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "secondary",
					closed: true,
					default: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "main")?.focused).toBe(true);
		// Closed windows are never reopened by activation
		expect(windows.find((w) => w.id === "secondary")?.closed).toBe(true);
		expect(windows.find((w) => w.id === "secondary")?.focused).toBeFalsy();
	});

	it("activates the app with NO focused window when all its windows are closed", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: true,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.every((w) => !w.focused)).toBe(true);
		expect(windows.every((w) => w.closed)).toBe(true);
	});

	it("focuses the last window when no default window exists and multiple windows are present", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "first",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "second",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "last",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const lastWindow = ds.System.Manager.Applications.apps[
			"Notes.app"
		].windows.find((w) => w.id === "last");
		expect(lastWindow?.closed).toBe(false);
		expect(lastWindow?.focused).toBe(true);
	});

	it("does not throw when app does not exist", () => {
		const ds = makeStore();
		expect(() => focusApp(ds, "Nonexistent.app")).not.toThrow();
	});
});

describe("openApp", () => {
	it("creates a new app entry when app is not registered", () => {
		const ds = makeStore();
		openApp(ds, "Calculator.app", "Calculator", "calc-icon.png");
		expect(ds.System.Manager.Applications.apps["Calculator.app"]).toBeDefined();
		expect(ds.System.Manager.Applications.apps["Calculator.app"].open).toBe(
			true,
		);
	});

	it("sets open=true and reopens windows for an existing app", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: false,
			focused: false,
			windows: [
				{
					id: "main",
					closed: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		openApp(ds, "Notes.app", "Notes", "notes-icon.png");

		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(true);
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].windows[0].closed,
		).toBe(false);
	});
});

describe("closeApp", () => {
	it("sets open=false and closes all windows", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [
				{
					id: "main",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		closeApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(false);
		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(
			false,
		);
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].windows[0].closed,
		).toBe(true);
	});
});

describe("ClassicyAppClose — focus transfer", () => {
	it("focuses another open app when one exists after closing", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [],
			data: {},
		};

		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppClose",
			app: { id: "Notes.app" },
		});

		// Notes.app is now closed and unfocused
		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(false);
		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(
			false,
		);

		// The remaining open app (Finder) becomes focused
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
	});

	it("does not crash and leaves no focused app when no other app is open", () => {
		const ds = makeStore();
		// Close Finder so there are no open apps after closing Notes
		ds.System.Manager.Applications.apps["Finder.app"].open = false;
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [],
			data: {},
		};

		expect(() =>
			classicyDesktopStateEventReducer(ds, {
				type: "ClassicyAppClose",
				app: { id: "Notes.app" },
			}),
		).not.toThrow();

		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(false);
		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(
			false,
		);
		// No app should be focused
		const anyFocused = Object.values(ds.System.Manager.Applications.apps).some(
			(app) => app.focused,
		);
		expect(anyFocused).toBe(false);
	});
});

describe("activateApp", () => {
	it("marks the target app as focused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};

		activateApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
	});

	it("marks all other apps as unfocused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;

		activateApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			false,
		);
	});

	it("unfocuses windows of other apps", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "w1",
				closed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};

		activateApp(ds, "Notes.app");

		expect(
			ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused,
		).toBe(false);
	});

	it("updates focusedAppId to the newly activated app", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};

		activateApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
	});

	it("defocuses windows of other apps", () => {
		const ds = makeStore();
		// Finder.app is the previously focused app (focusedAppId = "Finder.app")
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "finder-w1",
				closed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};
		// A third app that is also not focused — its windows must not be touched
		ds.System.Manager.Applications.apps["Calculator.app"] = {
			id: "Calculator.app",
			name: "Calculator",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "calc-w1",
					closed: false,
					focused: false,
					size: [300, 200],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		activateApp(ds, "Notes.app");

		// Previously focused app's windows are defocused
		expect(
			ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused,
		).toBe(false);
		expect(
			ds.System.Manager.Applications.apps["Calculator.app"].windows[0].focused,
		).toBe(false);
	});

	it("is an alias of focusApp", () => {
		expect(activateApp).toBe(focusApp);
	});
});

describe("deFocusApps — focusedAppId tracking", () => {
	it("clears focusedAppId after defocusing", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;

		deFocusApps(ds);

		expect(ds.System.Manager.Applications.focusedAppId).toBeUndefined();
	});

	it("only defocuses the previously-focused app and its windows", () => {
		const ds = makeStore();
		// Finder.app is the focused app
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "w1",
				closed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];
		// Another unfocused app
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "notes-w1",
					closed: false,
					focused: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		deFocusApps(ds);

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			false,
		);
		expect(
			ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused,
		).toBe(false);
		// Notes.app was already defocused — no state change needed there
		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(
			false,
		);
	});

	it("is a no-op when focusedAppId is undefined", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.focusedAppId = undefined;
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;

		// Should not throw and should leave state intact
		expect(() => deFocusApps(ds)).not.toThrow();
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			false,
		);
	});
});

describe("focusApp — focusedAppId tracking", () => {
	it("updates focusedAppId when focusing an app", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
	});
});

describe("loadApp", () => {
	it("registers an unknown app with open=false", () => {
		const ds = makeStore();
		loadApp(ds, "Calculator.app", "Calculator", "calc-icon.png");
		const app = ds.System.Manager.Applications.apps["Calculator.app"];
		expect(app).toBeDefined();
		expect(app.open).toBe(false);
		expect(app.id).toBe("Calculator.app");
		expect(app.name).toBe("Calculator");
	});

	it("is a no-op when the app is already registered", () => {
		const ds = makeStore();
		// Pre-register with open=true and custom name to verify state is not reset
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Original Name",
			icon: "original-icon.png",
			open: true,
			focused: true,
			windows: [
				{
					id: "w1",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: { custom: "value" },
		};

		loadApp(ds, "Notes.app", "New Name", "new-icon.png");

		const app = ds.System.Manager.Applications.apps["Notes.app"];
		expect(app.open).toBe(true);
		expect(app.name).toBe("Original Name");
		expect(app.windows).toHaveLength(1);
	});
});

describe("ClassicyAppLoad — app contextMenu", () => {
	it("stores contextMenu on a newly loaded app", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "App Item" }],
		});
		expect(ds.System.Manager.Applications.apps["Menu.app"].contextMenu).toEqual(
			[{ id: "m1", title: "App Item" }],
		);
	});

	it("refreshes contextMenu on an already-loaded app (persisted state is stale)", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "Old Item" }],
		});
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m2", title: "New Item" }],
		});
		expect(ds.System.Manager.Applications.apps["Menu.app"].contextMenu).toEqual(
			[{ id: "m2", title: "New Item" }],
		);
	});

	it("clears contextMenu when the app no longer declares one", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "Old Item" }],
		});
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
		});
		expect(
			ds.System.Manager.Applications.apps["Menu.app"].contextMenu,
		).toBeUndefined();
	});
});

describe("focusApp — appMenu propagation", () => {
	it("sets ds.System.Manager.Desktop.appMenu when the focused window has menuBar and is the default window", () => {
		const ds = makeStore();
		const menu = [{ id: "file", title: "File" }];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: false,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
					menuBar: menu,
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Desktop.appMenu).toBe(menu);
	});

	it("does not set ds.System.Manager.Desktop.appMenu when the focused window has no menuBar", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.appMenu = [];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: false,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Desktop.appMenu).toEqual([]);
	});
});

describe("generic OpenFile / CloseFile", () => {
	it("stores the path in app.data.openFiles on OpenFile", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: false,
			windows: [],
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppNotesOpenFile",
			app: { id: "Notes.app" },
			path: "Macintosh HD:Documents:readme.txt",
		});

		expect(
			ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles,
		).toEqual(["Macintosh HD:Documents:readme.txt"]);
		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(true);
	});

	it("does not duplicate paths on repeated OpenFile", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			windows: [],
			data: { openFiles: ["Macintosh HD:Documents:readme.txt"] },
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppNotesOpenFile",
			app: { id: "Notes.app" },
			path: "Macintosh HD:Documents:readme.txt",
		});

		expect(
			ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles,
		).toEqual(["Macintosh HD:Documents:readme.txt"]);
	});

	it("removes the path from app.data.openFiles on CloseFile", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			windows: [],
			data: {
				openFiles: [
					"Macintosh HD:Documents:readme.txt",
					"Macintosh HD:Documents:notes.txt",
				],
			},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppNotesCloseFile",
			app: { id: "Notes.app" },
			path: "Macintosh HD:Documents:readme.txt",
		});

		expect(
			ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles,
		).toEqual(["Macintosh HD:Documents:notes.txt"]);
	});

	it("is a no-op when the app does not exist", () => {
		const ds = makeStore();

		expect(() =>
			classicyAppEventHandler(ds, {
				type: "ClassicyAppGhostOpenFile",
				app: { id: "Ghost.app" },
				path: "Macintosh HD:test",
			}),
		).not.toThrow();
	});
});

describe("file type registration", () => {
	it("registers file types on an app and updates fileTypeHandlers", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppRegisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [
				ClassicyFileSystemEntryFileType.File,
				ClassicyFileSystemEntryFileType.Shortcut,
			],
		});

		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].handlesFileTypes,
		).toEqual([
			ClassicyFileSystemEntryFileType.File,
			ClassicyFileSystemEntryFileType.Shortcut,
		]);
		// fileTypeHandlers should now point to SimpleText for these types
		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.File
			],
		).toBe("SimpleText.app");
		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.Shortcut
			],
		).toBe("SimpleText.app");
	});

	it("does not override fileTypeHandlers if a non-Finder app already owns the type", () => {
		const ds = makeStore();
		// Pre-set a custom handler
		ds.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.File
		] = "ExistingEditor.app";
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppRegisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [ClassicyFileSystemEntryFileType.File],
		});

		// Should not override the existing non-Finder handler
		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.File
			],
		).toBe("ExistingEditor.app");
	});

	it("does not duplicate file types on repeated registration", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
			handlesFileTypes: [ClassicyFileSystemEntryFileType.File],
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppRegisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [
				ClassicyFileSystemEntryFileType.File,
				ClassicyFileSystemEntryFileType.Directory,
			],
		});

		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].handlesFileTypes,
		).toEqual([
			ClassicyFileSystemEntryFileType.File,
			ClassicyFileSystemEntryFileType.Directory,
		]);
	});

	it("unregisters file types via ClassicyAppUnregisterFileTypes", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
			handlesFileTypes: [
				ClassicyFileSystemEntryFileType.File,
				ClassicyFileSystemEntryFileType.Shortcut,
			],
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppUnregisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [ClassicyFileSystemEntryFileType.Shortcut],
		});

		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].handlesFileTypes,
		).toEqual([ClassicyFileSystemEntryFileType.File]);
	});

	it("resets fileTypeHandlers to Finder.app when the unregistering app owned the mapping", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
			handlesFileTypes: [
				ClassicyFileSystemEntryFileType.File,
				ClassicyFileSystemEntryFileType.Shortcut,
			],
		};
		ds.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.Shortcut
		] = "SimpleText.app";

		classicyAppEventHandler(ds, {
			type: "ClassicyAppUnregisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [ClassicyFileSystemEntryFileType.Shortcut],
		});

		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.Shortcut
			],
		).toBe("Finder.app");
	});

	it("does not touch fileTypeHandlers entries owned by other apps on unregister", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			open: false,
			windows: [],
			data: {},
			handlesFileTypes: [ClassicyFileSystemEntryFileType.File],
		};
		ds.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.File
		] = "OtherEditor.app";

		classicyAppEventHandler(ds, {
			type: "ClassicyAppUnregisterFileTypes",
			app: { id: "SimpleText.app" },
			fileTypes: [ClassicyFileSystemEntryFileType.File],
		});

		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.File
			],
		).toBe("OtherEditor.app");
	});

	it("sets a default file type handler via ClassicyAppSetDefaultFileTypeHandler", () => {
		const ds = makeStore();

		classicyAppEventHandler(ds, {
			type: "ClassicyAppSetDefaultFileTypeHandler",
			app: { id: "SimpleText.app" },
			fileType: ClassicyFileSystemEntryFileType.File,
		});

		expect(
			ds.System.Manager.Applications.fileTypeHandlers[
				ClassicyFileSystemEntryFileType.File
			],
		).toBe("SimpleText.app");
	});

	it("defaults all file types to Finder.app in initial state", () => {
		const ds = makeStore();

		for (const fileType of Object.values(ClassicyFileSystemEntryFileType)) {
			expect(ds.System.Manager.Applications.fileTypeHandlers[fileType]).toBe(
				"Finder.app",
			);
		}
	});
});

describe("ClassicyAppFinderOpenFile — QuickTime malformed JSON", () => {
	it("calls console.warn with context when _data is malformed JSON", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = makeStore();

		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: { _creator: "QuickTime", _data: "{ not valid json {{" },
		});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("ClassicyFinder"),
			expect.objectContaining({ error: expect.any(SyntaxError) }),
		);
		warnSpy.mockRestore();
	});

	it("does not call console.warn when _data is valid JSON", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = makeStore();

		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_creator: "QuickTime",
				_data: JSON.stringify({ url: "https://example.com/video.mp4" }),
			},
		});

		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe("registerAppEventHandler — idempotency", () => {
	it("does not register the same prefix twice — second call is a no-op", () => {
		// Register with a unique prefix so we don't collide with other tests.
		// Register twice; without the guard the handler would be invoked twice.
		const handler = vi.fn((ds: ClassicyStore) => ds);
		const uniquePrefix = `ClassicyAppIdempotencyTest_${Date.now()}`;

		registerAppEventHandler(uniquePrefix, handler);
		registerAppEventHandler(uniquePrefix, handler);

		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, { type: `${uniquePrefix}Action` });

		expect(handler).toHaveBeenCalledTimes(1);
	});
});

describe("classicyDesktopStateEventReducer", () => {
	it("returns unchanged state for unrecognized action type", () => {
		const ds = makeStore();
		const original = ds;
		const result = classicyDesktopStateEventReducer(ds, {
			type: "UnknownAction",
		});
		expect(result).toBe(original);
	});

	it("returns state with the new app registered for ClassicyAppOpen", () => {
		const ds = makeStore();
		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppOpen",
			app: { id: "Calculator.app", name: "Calculator", icon: "" },
		});
		expect(
			result.System.Manager.Applications.apps["Calculator.app"],
		).toBeDefined();
		expect(result.System.Manager.Applications.apps["Calculator.app"].open).toBe(
			true,
		);
	});

	it("routes ClassicyWindowFocus: sets the target window and app as focused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "w1",
				closed: false,
				focused: false,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
			{
				id: "w2",
				closed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "Finder.app" },
			window: { id: "w1" },
		});

		// The target app is now focused
		expect(result.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);

		// The target window is focused; the other window is not
		const w1 = result.System.Manager.Applications.apps[
			"Finder.app"
		].windows.find((w) => w.id === "w1");
		const w2 = result.System.Manager.Applications.apps[
			"Finder.app"
		].windows.find((w) => w.id === "w2");
		expect(w1?.focused).toBe(true);
		expect(w2?.focused).toBe(false);
	});

	it("emits console.warn for unhandled actions in development", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, { type: "UnknownXYZAction" });
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Unhandled action type"),
			expect.objectContaining({ type: "UnknownXYZAction" }),
		);
		warnSpy.mockRestore();
	});
});

describe("mergeClassicyState", () => {
	it("merges a nested primitive without touching siblings", () => {
		const base = makeStore();
		const merged = mergeClassicyState(base, {
			System: {
				Manager: { DateAndTime: { dateTime: "2001-09-11T12:40:00.000Z" } },
			},
		});
		expect(merged.System.Manager.DateAndTime.dateTime).toBe(
			"2001-09-11T12:40:00.000Z",
		);
		// sibling fields retained from base
		expect(merged.System.Manager.DateAndTime.show).toBe(
			base.System.Manager.DateAndTime.show,
		);
		expect(merged.System.Manager.DateAndTime.militaryTime).toBe(
			base.System.Manager.DateAndTime.militaryTime,
		);
		// unrelated managers retained
		expect(merged.System.Manager.Sound.volume).toBe(
			base.System.Manager.Sound.volume,
		);
	});

	it("replaces arrays wholesale rather than concatenating", () => {
		const base = makeStore();
		base.System.Manager.Desktop.systemMenu = [{ id: "a" }, { id: "b" }];
		const merged = mergeClassicyState(base, {
			System: { Manager: { Desktop: { systemMenu: [{ id: "z" }] } } },
		} as DeepPartial<ClassicyStore>);
		expect(merged.System.Manager.Desktop.systemMenu).toEqual([{ id: "z" }]);
	});

	it("override primitive wins over base", () => {
		const base = makeStore();
		const merged = mergeClassicyState(base, {
			System: { Manager: { Sound: { volume: 25 } } },
		});
		expect(merged.System.Manager.Sound.volume).toBe(25);
	});

	it("skips override keys whose value is undefined", () => {
		const base = makeStore();
		base.System.Manager.DateAndTime.timeZoneOffset = "-5";
		const merged = mergeClassicyState(base, {
			System: { Manager: { DateAndTime: { timeZoneOffset: undefined } } },
		});
		expect(merged.System.Manager.DateAndTime.timeZoneOffset).toBe("-5");
	});

	it("does not mutate the base argument", () => {
		const base = makeStore();
		const before = base.System.Manager.DateAndTime.dateTime;
		mergeClassicyState(base, {
			System: {
				Manager: { DateAndTime: { dateTime: "2001-09-11T12:40:00.000Z" } },
			},
		});
		expect(base.System.Manager.DateAndTime.dateTime).toBe(before);
	});
});

function makeWindow(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		closed: false,
		focused: false,
		size: [400, 300] as [number, number],
		position: [0, 0] as [number, number],
		minimumSize: [100, 100] as [number, number],
		...overrides,
	};
}

describe("deFocusApps — global sweep", () => {
	it("clears focus flags on ALL apps and windows, even when focusedAppId is stale", () => {
		const ds = makeStore();
		// Corrupted state: two apps and two windows focused, pointer already cleared
		ds.System.Manager.Applications.focusedAppId = undefined;
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			makeWindow("fw", { focused: true }),
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [makeWindow("nw", { focused: true })],
			data: {},
		};

		deFocusApps(ds);

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		expect(apps["Notes.app"].focused).toBe(false);
		expect(apps["Notes.app"].windows[0].focused).toBe(false);
		expect(ds.System.Manager.Applications.focusedAppId).toBeUndefined();
	});
});

describe("focusWindow", () => {
	function makeTwoAppStore() {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			makeWindow("fw1", { focused: true }),
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [makeWindow("nw1"), makeWindow("nw2")],
			data: {},
		};
		return ds;
	}

	it("focuses the target window and app and defocuses everything else globally", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "nw2");

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		expect(apps["Notes.app"].windows.find((w) => w.id === "nw2")?.focused).toBe(
			true,
		);
		expect(apps["Notes.app"].windows.find((w) => w.id === "nw1")?.focused).toBe(
			false,
		);
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		// Global invariant: exactly one focused window across the whole store
		const focusedCount = Object.values(apps)
			.flatMap((a) => a.windows)
			.filter((w) => w.focused).length;
		expect(focusedCount).toBe(1);
	});

	it("stamps zOrder on the window and lastAccessedWindowId on the app", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "nw1");

		const app = ds.System.Manager.Applications.apps["Notes.app"];
		expect(app.lastAccessedWindowId).toBe("nw1");
		expect(app.windows.find((w) => w.id === "nw1")?.zOrder).toBeTypeOf(
			"number",
		);
	});

	it("prefers the provided menuBar over the window's stored menuBar", () => {
		const ds = makeTwoAppStore();
		const storedMenu = [{ id: "stored", title: "Stored" }];
		const freshMenu = [{ id: "fresh", title: "Fresh" }];
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].menuBar =
			storedMenu;

		focusWindow(ds, "Notes.app", "nw1", freshMenu);

		expect(ds.System.Manager.Desktop.appMenu).toBe(freshMenu);
	});

	it("falls back to the window's stored menuBar when no menuBar is provided", () => {
		const ds = makeTwoAppStore();
		const storedMenu = [{ id: "stored", title: "Stored" }];
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].menuBar =
			storedMenu;

		focusWindow(ds, "Notes.app", "nw1");

		expect(ds.System.Manager.Desktop.appMenu).toBe(storedMenu);
	});

	it("leaves Desktop.appMenu unchanged when neither menu is available", () => {
		const ds = makeTwoAppStore();
		const existingMenu = [{ id: "existing", title: "Existing" }];
		ds.System.Manager.Desktop.appMenu = existingMenu;

		focusWindow(ds, "Notes.app", "nw1");

		expect(ds.System.Manager.Desktop.appMenu).toBe(existingMenu);
	});

	it("does not change closed or collapsed flags", () => {
		const ds = makeTwoAppStore();
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].collapsed =
			true;

		focusWindow(ds, "Notes.app", "nw1");

		const nw1 = ds.System.Manager.Applications.apps["Notes.app"].windows[0];
		expect(nw1.collapsed).toBe(true);
		expect(nw1.closed).toBe(false);
		expect(nw1.focused).toBe(true);
	});

	it("still focuses the app when the window id is unknown", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "does-not-exist");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		const anyWindowFocused = Object.values(ds.System.Manager.Applications.apps)
			.flatMap((a) => a.windows)
			.some((w) => w.focused);
		expect(anyWindowFocused).toBe(false);
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId,
		).toBeUndefined();
	});

	it("does not throw and changes nothing when the app does not exist", () => {
		const ds = makeTwoAppStore();

		expect(() => focusWindow(ds, "Nope.app", "w")).not.toThrow();

		// Pre-existing focus is untouched
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});

describe("focusApp — restoration chain", () => {
	function makeChainStore() {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				makeWindow("older", { zOrder: 1000 }),
				makeWindow("newer", { zOrder: 2000 }),
				makeWindow("untouched", { default: true }),
			],
			data: {},
		};
		return ds;
	}

	it("prefers lastAccessedWindowId over zOrder and default", () => {
		const ds = makeChainStore();
		ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId =
			"older";

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "older")?.focused).toBe(true);
	});

	it("falls back to the highest-zOrder non-closed window when lastAccessedWindowId is stale", () => {
		const ds = makeChainStore();
		ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId =
			"gone-window";

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "newer")?.focused).toBe(true);
	});

	it("skips a closed lastAccessedWindowId and falls back to zOrder", () => {
		const ds = makeChainStore();
		const app = ds.System.Manager.Applications.apps["Notes.app"];
		app.lastAccessedWindowId = "older";
		const older = app.windows.find((w) => w.id === "older");
		if (older) older.closed = true;

		focusApp(ds, "Notes.app");

		expect(app.windows.find((w) => w.id === "newer")?.focused).toBe(true);
		expect(app.windows.find((w) => w.id === "older")?.closed).toBe(true);
	});

	it("falls back to the default window when no window has a zOrder", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [makeWindow("plain"), makeWindow("main", { default: true })],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "main")?.focused).toBe(true);
	});

	it("focuses a collapsed last-accessed window without expanding it", () => {
		const ds = makeChainStore();
		const app = ds.System.Manager.Applications.apps["Notes.app"];
		app.lastAccessedWindowId = "older";
		const older = app.windows.find((w) => w.id === "older");
		if (older) older.collapsed = true;

		focusApp(ds, "Notes.app");

		expect(app.windows.find((w) => w.id === "older")?.focused).toBe(true);
		expect(app.windows.find((w) => w.id === "older")?.collapsed).toBe(true);
	});

	it("updates lastAccessedWindowId to the restored window", () => {
		const ds = makeChainStore();

		focusApp(ds, "Notes.app");

		// "newer" wins via zOrder, and becomes the new last-accessed window
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId,
		).toBe("newer");
	});
});

describe("ClassicyAppLoad — extensions", () => {
	it("creates an extension entry open and unfocused", () => {
		const ds = makeStore();
		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
			extension: true,
		});

		const app = ds.System.Manager.Applications.apps["ClockExt.app"];
		expect(app.extension).toBe(true);
		expect(app.open).toBe(true);
		expect(app.focused).toBe(false);
		// Loading an extension must not steal focus from the focused app
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});

	it("still creates regular apps closed and without the flag", () => {
		const ds = makeStore();
		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "TV.app", name: "TV", icon: "/icons/tv.png" },
		});

		const app = ds.System.Manager.Applications.apps["TV.app"];
		expect(app.open).toBe(false);
		expect(app.extension).toBeUndefined();
	});

	it("revives a persisted extension entry that was closed", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["ClockExt.app"] = {
			id: "ClockExt.app",
			name: "Clock",
			icon: "/icons/clock.png",
			windows: [],
			open: false,
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
			extension: true,
		});

		const app = ds.System.Manager.Applications.apps["ClockExt.app"];
		expect(app.extension).toBe(true);
		expect(app.open).toBe(true);
	});

	it("clears the extension flag when a persisted extension remounts as a regular app", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["ClockExt.app"] = {
			id: "ClockExt.app",
			name: "Clock",
			icon: "/icons/clock.png",
			windows: [],
			open: true,
			extension: true,
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
		});

		expect(
			ds.System.Manager.Applications.apps["ClockExt.app"].extension,
		).toBeUndefined();
	});

	it("resets a stale focused flag when reviving a persisted extension", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["ClockExt.app"] = {
			id: "ClockExt.app",
			name: "Clock",
			icon: "/icons/clock.png",
			windows: [],
			open: false,
			focused: true,
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
			extension: true,
		});

		const app = ds.System.Manager.Applications.apps["ClockExt.app"];
		expect(app.extension).toBe(true);
		expect(app.open).toBe(true);
		expect(app.focused).toBe(false);
	});
});

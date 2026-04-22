import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	activateApp,
	classicyAppEventHandler,
	classicyDesktopStateEventReducer,
	closeApp,
	deFocusApps,
	focusApp,
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

function makeStore(): ClassicyStore {
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
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
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
							handlesFileTypes: Object.values(
								ClassicyFileSystemEntryFileType,
							),
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map(
							(type) => [type, "Finder.app"],
						),
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
	it("marks all apps and their windows as unfocused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps.TestApp = {
			id: "TestApp",
			name: "Test",
			icon: "",
			open: true,
			focused: true,
			windows: [
				{
					id: "w1",
					closed: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
					focused: true,
				},
			],
			data: {},
		};

		deFocusApps(ds);

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(false);
		expect(ds.System.Manager.Applications.apps.TestApp.focused).toBe(false);
		expect(ds.System.Manager.Applications.apps.TestApp.windows[0].focused).toBe(false);
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
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(false);
	});

	it("opens and focuses the default window when one exists", () => {
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

		const mainWindow = ds.System.Manager.Applications.apps["Notes.app"].windows.find(
			(w) => w.id === "main",
		);
		expect(mainWindow?.closed).toBe(false);
		expect(mainWindow?.focused).toBe(true);
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
					closed: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "second",
					closed: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "last",
					closed: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const lastWindow = ds.System.Manager.Applications.apps["Notes.app"].windows.find(
			(w) => w.id === "last",
		);
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
		expect(ds.System.Manager.Applications.apps["Calculator.app"].open).toBe(true);
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
		expect(ds.System.Manager.Applications.apps["Notes.app"].windows[0].closed).toBe(
			false,
		);
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
		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(false);
		expect(ds.System.Manager.Applications.apps["Notes.app"].windows[0].closed).toBe(
			true,
		);
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

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(false);
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

		expect(ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused).toBe(
			false,
		);
	});

	it("does NOT change the windows of the target app (unlike focusApp)", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "w1",
					closed: false,
					focused: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		activateApp(ds, "Notes.app");

		// activateApp only sets app.focused — it does not touch the target app's windows
		expect(ds.System.Manager.Applications.apps["Notes.app"].windows[0].focused).toBe(
			false,
		);
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

		expect(ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles).toEqual([
			"Macintosh HD:Documents:readme.txt",
		]);
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

		expect(ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles).toEqual([
			"Macintosh HD:Documents:readme.txt",
		]);
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

		expect(ds.System.Manager.Applications.apps["Notes.app"].data?.openFiles).toEqual([
			"Macintosh HD:Documents:notes.txt",
		]);
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
			expect(
				ds.System.Manager.Applications.fileTypeHandlers[fileType],
			).toBe("Finder.app");
		}
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
		expect(result.System.Manager.Applications.apps["Calculator.app"]).toBeDefined();
		expect(result.System.Manager.Applications.apps["Calculator.app"].open).toBe(true);
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
		expect(result.System.Manager.Applications.apps["Finder.app"].focused).toBe(true);

		// The target window is focused; the other window is not
		const w1 = result.System.Manager.Applications.apps["Finder.app"].windows.find(
			(w) => w.id === "w1",
		);
		const w2 = result.System.Manager.Applications.apps["Finder.app"].windows.find(
			(w) => w.id === "w2",
		);
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

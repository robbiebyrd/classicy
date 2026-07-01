import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopStateEventReducer } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyFinderEventHandler,
	isFinderData,
} from "@/SystemFolder/Finder/FinderContext";
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

// Helper to get Finder's openPaths from a store
function openPaths(ds: ClassicyStore): string[] {
	const data = ds.System.Manager.Applications.apps["Finder.app"]?.data ?? {};
	return isFinderData(data) ? (data.openPaths ?? []) : [];
}

describe("classicyFinderEventHandler — guard", () => {
	it("returns ds unchanged when Finder.app is not registered", () => {
		const ds = makeStore();
		delete ds.System.Manager.Applications.apps["Finder.app"];

		const result = classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/test",
		});

		expect(result).toBe(ds);
		expect(ds.System.Manager.Applications.apps["Finder.app"]).toBeUndefined();
	});
});

describe("classicyFinderEventHandler — ClassicyAppFinderOpenFolder", () => {
	it("adds path when openPaths does not exist yet", () => {
		const ds = makeStore();
		// data starts as {} — no openPaths key

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/test",
		});

		expect(openPaths(ds)).toEqual(["/Users/test"]);
	});

	it("adds path to existing openPaths", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/existing"],
		};

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/new",
		});

		expect(openPaths(ds)).toContain("/Users/existing");
		expect(openPaths(ds)).toContain("/Users/new");
		expect(openPaths(ds)).toHaveLength(2);
	});

	it("deduplicates when the same path is added twice", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/test"],
		};

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/test",
		});

		expect(openPaths(ds)).toEqual(["/Users/test"]);
		expect(openPaths(ds)).toHaveLength(1);
	});
});

describe("classicyFinderEventHandler — ClassicyAppFinderOpenFolders", () => {
	it("merges multiple paths into openPaths", () => {
		const ds = makeStore();

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolders",
			paths: ["/Users/a", "/Users/b"],
		});

		expect(openPaths(ds)).toEqual(
			expect.arrayContaining(["/Users/a", "/Users/b"]),
		);
		expect(openPaths(ds)).toHaveLength(2);
	});

	it("deduplicates across existing paths and new paths", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/a"],
		};

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolders",
			paths: ["/Users/a", "/Users/b"],
		});

		expect(openPaths(ds)).toEqual(
			expect.arrayContaining(["/Users/a", "/Users/b"]),
		);
		expect(openPaths(ds)).toHaveLength(2);
	});

	it("handles empty appData gracefully", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data =
			null as unknown as Record<string, unknown>;

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolders",
			paths: ["/Users/c"],
		});

		expect(openPaths(ds)).toEqual(["/Users/c"]);
	});
});

describe("classicyFinderEventHandler — ClassicyAppFinderCloseFolder", () => {
	it("removes the specified path from openPaths", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/a", "/Users/b"],
		};

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderCloseFolder",
			path: "/Users/a",
		});

		expect(openPaths(ds)).toEqual(["/Users/b"]);
	});

	it("is a no-op when the path is not in openPaths", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/a"],
		};

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderCloseFolder",
			path: "/Users/nonexistent",
		});

		expect(openPaths(ds)).toEqual(["/Users/a"]);
	});

	it("handles missing openPaths key gracefully", () => {
		const ds = makeStore();
		// data exists but no openPaths key

		expect(() =>
			classicyFinderEventHandler(ds, {
				type: "ClassicyAppFinderCloseFolder",
				path: "/Users/a",
			}),
		).not.toThrow();

		expect(openPaths(ds)).toEqual([]);
	});

	it("marks the matching window as closed and unfocused", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/a"],
		};
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{ id: "/Users/a", closed: false, focused: true } as never,
		];

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderCloseFolder",
			path: "/Users/a",
		});

		const win = ds.System.Manager.Applications.apps["Finder.app"].windows[0];
		expect(win.closed).toBe(true);
		expect(win.focused).toBe(false);
	});

	it("does not modify windows when no window matches the closed path", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].data = {
			openPaths: ["/Users/a", "/Users/b"],
		};
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{ id: "/Users/b", closed: false, focused: false } as never,
		];

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderCloseFolder",
			path: "/Users/a",
		});

		const win = ds.System.Manager.Applications.apps["Finder.app"].windows[0];
		expect(win.closed).toBe(false);
	});
});

describe("classicyDesktopStateEventReducer routes ClassicyAppFinder* events", () => {
	it("routes ClassicyAppFinderOpenFolder via the reducer", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/routed",
		});

		expect(openPaths(result)).toContain("/Users/routed");
	});
});

describe("classicyFinderEventHandler — no-op actions", () => {
	it("ClassicyAppFinderEmptyTrash does not throw and returns ds", () => {
		const ds = makeStore();

		expect(() =>
			classicyFinderEventHandler(ds, { type: "ClassicyAppFinderEmptyTrash" }),
		).not.toThrow();
	});

	it("ClassicyAppFinderOpenFile does not throw and returns ds", () => {
		const ds = makeStore();

		expect(() =>
			classicyFinderEventHandler(ds, {
				type: "ClassicyAppFinderOpenFile",
				path: "/Users/file.txt",
			}),
		).not.toThrow();
	});
});

describe("classicyFinderEventHandler — ClassicyAppFinderOpenFile with a system file", () => {
	it("shows the system-file error dialog and does not route to any handler", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["SimpleText.app"] = {
			id: "SimpleText.app",
			name: "SimpleText",
			icon: "",
			windows: [],
			open: false,
			focused: false,
			data: {},
		};
		ds.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.TextFile
		] = "SimpleText.app";

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFile",
			path: "Macintosh HD:System Folder:Finder",
			file: {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_system: true,
			},
		});

		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			message:
				"This file is used by the system software. It cannot be opened.",
		});
		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].data?.openFiles,
		).toBeUndefined();
	});

	it("blocks a system file even when the file type resolves to a registered handler", () => {
		const ds = makeStore();
		// makeStore's default fileTypeHandlers maps every type to "Finder.app",
		// so without the guard this would route straight through to Finder's
		// own openFiles list instead of showing the system-file error.
		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFile",
			path: "Macintosh HD:System Folder:System",
			file: {
				_type: ClassicyFileSystemEntryFileType.File,
				_system: true,
			},
		});

		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			message:
				"This file is used by the system software. It cannot be opened.",
		});
		expect(
			ds.System.Manager.Applications.apps["Finder.app"].data?.openFiles,
		).toBeUndefined();
	});

	it("does not affect non-system files with no registered handler for their type", () => {
		const ds = makeStore();
		delete ds.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.File
		];

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFile",
			path: "Macintosh HD:Utilities:Terminal.app",
			file: { _type: ClassicyFileSystemEntryFileType.File },
		});

		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			message: "Finder cannot open the file type you requested.",
		});
	});
});

import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyFinderEventHandler } from "@/SystemFolder/Finder/FinderContext";

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
				},
				App: {
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
	return ds.System.Manager.App.apps["Finder.app"]?.data?.openPaths ?? [];
}

describe("classicyFinderEventHandler — guard", () => {
	it("returns ds unchanged when Finder.app is not registered", () => {
		const ds = makeStore();
		delete ds.System.Manager.App.apps["Finder.app"];

		const result = classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "/Users/test",
		});

		expect(result).toBe(ds);
		expect(ds.System.Manager.App.apps["Finder.app"]).toBeUndefined();
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
		ds.System.Manager.App.apps["Finder.app"].data = {
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
		ds.System.Manager.App.apps["Finder.app"].data = {
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
		ds.System.Manager.App.apps["Finder.app"].data = { openPaths: ["/Users/a"] };

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
		ds.System.Manager.App.apps["Finder.app"].data = null as unknown as Record<
			string,
			unknown
		>;

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
		ds.System.Manager.App.apps["Finder.app"].data = {
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
		ds.System.Manager.App.apps["Finder.app"].data = { openPaths: ["/Users/a"] };

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

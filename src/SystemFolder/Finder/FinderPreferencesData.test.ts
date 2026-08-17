import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyFinderEventHandler,
	FINDER_PREFERENCES_WINDOW_ID,
	type FinderData,
	resolveStandardViews,
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
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	};
}

const finderData = (ds: ClassicyStore): FinderData =>
	ds.System.Manager.Applications.apps["Finder.app"].data as FinderData;

describe("Finder preferences reducers", () => {
	it("opens and closes the Preferences window", () => {
		let ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderPreferencesOpen",
		});
		expect(finderData(ds).showPreferences).toBe(true);

		ds = classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderPreferencesClose",
		});
		expect(finderData(ds).showPreferences).toBe(false);
	});

	it("exports a stable window id", () => {
		expect(FINDER_PREFERENCES_WINDOW_ID).toBe("finder_preferences");
	});

	it("writes a top-level standard-view option", () => {
		const ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "icons",
			option: "arrangement",
			value: "grid",
		});
		expect(resolveStandardViews(finderData(ds)).icons.arrangement).toBe("grid");
	});

	it("writes a nested column flag WITHOUT clobbering its siblings", () => {
		const ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "list",
			option: "columns.created",
			value: true,
		});
		const columns = resolveStandardViews(finderData(ds)).list.columns;
		expect(columns.created).toBe(true);
		// The six flags the write did not name must keep their defaults.
		expect(columns.modified).toBe(true);
		expect(columns.size).toBe(true);
		expect(columns.kind).toBe(true);
		expect(columns.label).toBe(false);
		expect(columns.comments).toBe(false);
		expect(columns.version).toBe(false);
	});

	it("rejects an invalid value rather than writing it", () => {
		const ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "icons",
			option: "arrangement",
			value: "diagonally",
		});
		expect(resolveStandardViews(finderData(ds)).icons.arrangement).toBe("none");
	});

	it("rejects a path deeper than one level", () => {
		const ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "list",
			option: "columns.created.extra",
			value: true,
		});
		expect(resolveStandardViews(finderData(ds)).list.columns.created).toBe(
			false,
		);
	});

	it("records a per-folder view as a sparse map entry", () => {
		const ds = classicyFinderEventHandler(makeStore(), {
			type: "ClassicyAppFinderSetFolderView",
			path: "Macintosh HD:Documents",
			viewType: "icons",
		});
		expect(finderData(ds).folderViews).toEqual({
			"Macintosh HD:Documents": "icons",
		});
	});

	it("resolves defaults for absent preference state", () => {
		const views = resolveStandardViews({});
		expect(views.icons.iconSize).toBe("large");
		expect(views.list.iconSize).toBe("medium");
		expect(views.list.useRelativeDate).toBe(true);
		expect(views.list.calculateFolderSizes).toBe(false);
	});
});

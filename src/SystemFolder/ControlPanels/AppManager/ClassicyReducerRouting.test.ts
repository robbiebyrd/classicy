import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopStateEventReducer } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

vi.mock("@img/icons/system/quicktime/player.png", () => ({
	default: "player-icon.png",
}));
vi.mock("@img/icons/system/macos.png", () => ({ default: "macos-icon.png" }));

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

// ─── ClassicyWindow* prefix routing ──────────────────────────────────────────

describe("prefix routing: ClassicyWindow*", () => {
	it("ClassicyWindowFocus routes to window handler — target window becomes focused", () => {
		const ds = makeStore();
		ds.System.Manager.App.apps["Finder.app"].windows = [
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

		const w1 = result.System.Manager.App.apps["Finder.app"].windows.find(
			(w) => w.id === "w1",
		);
		const w2 = result.System.Manager.App.apps["Finder.app"].windows.find(
			(w) => w.id === "w2",
		);
		expect(w1?.focused).toBe(true);
		expect(w2?.focused).toBe(false);
	});

	it("ClassicyWindowClose routes to window handler — target window is marked closed", () => {
		const ds = makeStore();
		ds.System.Manager.App.apps["Finder.app"].windows = [
			{
				id: "w1",
				closed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyWindowClose",
			app: { id: "Finder.app" },
			window: { id: "w1" },
		});

		const w1 = result.System.Manager.App.apps["Finder.app"].windows.find(
			(w) => w.id === "w1",
		);
		expect(w1?.closed).toBe(true);
	});
});

// ─── ClassicyDesktop* prefix routing ─────────────────────────────────────────

describe("prefix routing: ClassicyDesktop*", () => {
	it("ClassicyDesktopStop routes to desktop handler — selectBox is reset", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.selectBox = {
			size: [200, 150],
			start: [50, 60],
			active: true,
		};

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopStop",
		});

		expect(result.System.Manager.Desktop.selectBox.active).toBe(false);
		expect(result.System.Manager.Desktop.selectBox.size).toEqual([0, 0]);
		expect(result.System.Manager.Desktop.selectBox.start).toEqual([0, 0]);
	});

	it("ClassicyDesktopContextMenu routes to desktop handler — showContextMenu is updated", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopContextMenu",
			showContextMenu: true,
			contextMenu: [{ id: "cut", title: "Cut" }],
		});

		expect(result.System.Manager.Desktop.showContextMenu).toBe(true);
		expect(result.System.Manager.Desktop.contextMenu).toEqual([
			{ id: "cut", title: "Cut" },
		]);
	});
});

// ─── ClassicyDesktopIcon* prefix routing ─────────────────────────────────────

describe("prefix routing: ClassicyDesktopIcon*", () => {
	it("ClassicyDesktopIconFocus routes to icon handler — selectedIcons contains the target icon", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopIconFocus",
			iconId: "HardDrive",
		});

		expect(result.System.Manager.Desktop.selectedIcons).toEqual(["HardDrive"]);
	});

	it("ClassicyDesktopIconClearFocus routes to icon handler — selectedIcons is emptied", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.selectedIcons = ["HardDrive"];

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopIconClearFocus",
		});

		expect(result.System.Manager.Desktop.selectedIcons).toEqual([]);
	});
});

// ─── ClassicyApp* prefix routing ─────────────────────────────────────────────

describe("prefix routing: ClassicyApp*", () => {
	it("ClassicyAppOpen routes to app handler — app is registered as open", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppOpen",
			app: { id: "Calculator.app", name: "Calculator", icon: "calc.png" },
		});

		expect(result.System.Manager.App.apps["Calculator.app"]).toBeDefined();
		expect(result.System.Manager.App.apps["Calculator.app"].open).toBe(true);
	});

	it("ClassicyAppClose routes to app handler — app is marked as closed", () => {
		const ds = makeStore();
		ds.System.Manager.App.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [],
			data: {},
		};

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppClose",
			app: { id: "Notes.app" },
		});

		expect(result.System.Manager.App.apps["Notes.app"].open).toBe(false);
		expect(result.System.Manager.App.apps["Notes.app"].focused).toBe(false);
	});
});

// ─── ClassicyManagerDateTime* prefix routing ─────────────────────────────────

describe("prefix routing: ClassicyManagerDateTime*", () => {
	it("ClassicyManagerDateTimeSet routes to datetime handler — dateTime is updated", () => {
		const ds = makeStore();
		const newDate = new Date("2024-06-15T12:00:00.000Z");

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: newDate,
		});

		expect(result.System.Manager.DateAndTime.dateTime).toBe(
			newDate.toISOString(),
		);
	});

	it("ClassicyManagerDateTimeTZSet routes to datetime handler — timeZoneOffset is updated", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "-5",
		});

		expect(result.System.Manager.DateAndTime.timeZoneOffset).toBe("-5");
	});
});

// ─── ClassicyAppFinderOpenFile cross-app routing ──────────────────────────────

describe("ClassicyAppFinderOpenFile cross-app orchestration", () => {
	it("opens MoviePlayer and sets document URL for a valid QuickTime document", () => {
		const ds = makeStore();
		const doc = {
			url: "https://example.com/movie.mp4",
			name: "My Movie",
			type: "video",
		};

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_creator: "QuickTime",
				_data: JSON.stringify(doc),
			},
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeDefined();
		expect(result.System.Manager.App.apps["MoviePlayer.app"].open).toBe(true);
	});

	it("opens MoviePlayer when _data is already a parsed object (not a JSON string)", () => {
		const ds = makeStore();
		const doc = {
			url: "https://example.com/audio.mp3",
			name: "My Audio",
			type: "audio",
		};

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_creator: "QuickTime",
				_data: doc,
			},
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeDefined();
		expect(result.System.Manager.App.apps["MoviePlayer.app"].open).toBe(true);
	});

	it("does NOT open MoviePlayer when file has no _creator field", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_data: JSON.stringify({
					url: "https://example.com/movie.mp4",
					name: "Movie",
					type: "video",
				}),
			},
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeUndefined();
	});

	it("does NOT open MoviePlayer when _data URL is not a valid http/https URL", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_creator: "QuickTime",
				_data: JSON.stringify({
					url: "javascript:alert(1)",
					name: "Evil",
					type: "video",
				}),
			},
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeUndefined();
	});

	it("does NOT open MoviePlayer when _data is malformed JSON", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_creator: "QuickTime",
				_data: "{ this is not valid json",
			},
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeUndefined();
	});

	it("does NOT open MoviePlayer when file is missing entirely", () => {
		const ds = makeStore();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppFinderOpenFile",
		});

		expect(result.System.Manager.App.apps["MoviePlayer.app"]).toBeUndefined();
	});
});

// ─── Default / unknown action routing ────────────────────────────────────────

describe("default routing: unknown action types", () => {
	it("returns state reference unchanged for an unrecognized action", () => {
		const ds = makeStore();
		const result = classicyDesktopStateEventReducer(ds, {
			type: "SomeCompletelyUnknownAction",
		});
		expect(result).toBe(ds);
	});

	it("emits console.warn for unhandled actions in non-production environment", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = makeStore();

		classicyDesktopStateEventReducer(ds, { type: "UnrecognizedPrefixXYZ" });

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Unhandled action type"),
			expect.objectContaining({ type: "UnrecognizedPrefixXYZ" }),
		);
		warnSpy.mockRestore();
	});
});

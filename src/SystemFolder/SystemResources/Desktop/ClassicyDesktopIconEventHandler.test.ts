import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopIconEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
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
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	};
}

function makeStoreForDesktop(): ClassicyStore {
	const ds = makeStore();
	ds.System.Manager.Appearance.activeTheme = {
		id: "test-theme",
		name: "Test",
		color: {
			outline: 0,
			select: 0,
			highlight: 0,
			black: 0,
			white: 0xffffff,
			alert: 0,
			error: 0,
			system: [0, 0, 0, 0, 0, 0, 0],
			theme: [0, 0, 0, 0, 0, 0, 0],
			window: {
				border: 0,
				borderOutset: 0,
				borderInset: 0,
				frame: 0,
				title: 0,
				document: 0,
			},
		},
		typography: {
			ui: "Geneva",
			uiSize: 12,
			header: "Geneva",
			headerSize: 14,
			body: "Geneva",
			bodySize: 12,
			mono: "Monaco",
			monoSize: 12,
			digital: "VCR OSD Mono",
			digitalSize: 12,
		},
		measurements: {
			window: {
				borderSize: 1,
				controlSize: 12,
				paddingSize: 4,
				scrollbarSize: 16,
			},
		},
		desktop: {
			iconSize: 32,
			iconFontSize: 10,
			backgroundImage: "",
			backgroundColor: 0,
			backgroundSize: "auto",
			backgroundRepeat: "no-repeat",
			backgroundPosition: "center",
		},
		sound: { name: "platinum", disabled: [] },
	};
	ds.System.Manager.Appearance.availableThemes = [
		ds.System.Manager.Appearance.activeTheme,
	];
	return ds;
}

function makeStoreWithIcons(): ClassicyStore {
	const ds = makeStoreForDesktop();
	ds.System.Manager.Desktop.icons = [
		{
			appId: "Notes.app",
			appName: "Notes",
			icon: "notes.png",
			kind: "app",
			location: [100, 200],
		},
		{
			appId: "Calculator.app",
			appName: "Calculator",
			icon: "calc.png",
			kind: "app",
			location: [150, 250],
		},
	];
	return ds;
}

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconFocus", () => {
	it("sets selectedIcons to the single focused icon id", () => {
		const ds = makeStoreWithIcons();
		ds.System.Manager.Desktop.selectedIcons = ["Calculator.app"];

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconFocus",
			iconId: "Notes.app",
		});

		expect(ds.System.Manager.Desktop.selectedIcons).toEqual(["Notes.app"]);
	});

	it("replaces any prior selection", () => {
		const ds = makeStoreWithIcons();
		ds.System.Manager.Desktop.selectedIcons = ["Notes.app", "Calculator.app"];

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconFocus",
			iconId: "Notes.app",
		});

		expect(ds.System.Manager.Desktop.selectedIcons).toHaveLength(1);
		expect(ds.System.Manager.Desktop.selectedIcons[0]).toBe("Notes.app");
	});

	it("focuses Finder.app and defocuses the previously-focused app", () => {
		const ds = makeStoreWithIcons();
		ds.System.Manager.Applications.apps["SomeApp"] = {
			id: "SomeApp",
			name: "Some App",
			icon: "",
			windows: [],
			open: true,
			focused: true,
			noDesktopIcon: false,
			data: {},
		};
		// Set SomeApp as the tracked focused app (matches real usage via focusApp/activateApp)
		ds.System.Manager.Applications.focusedAppId = "SomeApp";
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconFocus",
			iconId: "Notes.app",
		});

		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
		expect(ds.System.Manager.Applications.apps["SomeApp"].focused).toBe(false);
	});
});

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconClearFocus", () => {
	it("sets selectedIcons to an empty array", () => {
		const ds = makeStoreWithIcons();
		ds.System.Manager.Desktop.selectedIcons = ["Notes.app"];

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconClearFocus",
		});

		expect(ds.System.Manager.Desktop.selectedIcons).toEqual([]);
	});
});

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconAdd", () => {
	it("adds a new icon when the appId is not already present", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "SimpleText.app", name: "SimpleText", icon: "simpletext.png" },
			kind: "app",
			location: [200, 300],
		});

		expect(ds.System.Manager.Desktop.icons).toHaveLength(1);
		expect(ds.System.Manager.Desktop.icons[0].appId).toBe("SimpleText.app");
		expect(ds.System.Manager.Desktop.icons[0].appName).toBe("SimpleText");
	});

	it("is a no-op when an icon with the same appId already exists", () => {
		const ds = makeStoreWithIcons();
		const countBefore = ds.System.Manager.Desktop.icons.length;

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Notes.app", name: "Notes Duplicate", icon: "notes2.png" },
			kind: "app",
		});

		expect(ds.System.Manager.Desktop.icons).toHaveLength(countBefore);
		// The existing icon name must not be overwritten
		expect(
			ds.System.Manager.Desktop.icons.find((i) => i.appId === "Notes.app")
				?.appName,
		).toBe("Notes");
	});

	it("assigns the provided kind to the new icon", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Disk.img", name: "Disk", icon: "disk.png" },
			kind: "disk",
			location: [0, 0],
		});

		expect(ds.System.Manager.Desktop.icons[0].kind).toBe("disk");
	});

	it("defaults kind to 'icon' when not specified", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Widget.app", name: "Widget", icon: "widget.png" },
			location: [0, 0],
		});

		expect(ds.System.Manager.Desktop.icons[0].kind).toBe("icon");
	});

	it("stores the hidden flag when the action carries hidden: true", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "DriveSetup.app", name: "Drive Setup", icon: "disk.png" },
			kind: "app_shortcut",
			hidden: true,
		});

		expect(ds.System.Manager.Desktop.icons[0].hidden).toBe(true);
	});

	it("leaves hidden undefined for a normal icon add", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "SimpleText.app", name: "SimpleText", icon: "st.png" },
			kind: "app_shortcut",
		});

		expect(ds.System.Manager.Desktop.icons[0].hidden).toBeUndefined();
	});

	it("does not reserve a desktop grid slot for a hidden icon (no visible gap), but keeps it in the store", () => {
		const withHidden = makeStoreForDesktop();
		withHidden.System.Manager.Desktop.icons = [
			{ appId: "A.app", appName: "A", icon: "a.png", kind: "app_shortcut" },
			{
				appId: "H.app",
				appName: "H",
				icon: "h.png",
				kind: "app_shortcut",
				hidden: true,
			},
			{ appId: "B.app", appName: "B", icon: "b.png", kind: "app_shortcut" },
		];
		classicyDesktopIconEventHandler(withHidden, {
			type: "ClassicyDesktopIconCleanup",
		});

		const withoutHidden = makeStoreForDesktop();
		withoutHidden.System.Manager.Desktop.icons = [
			{ appId: "A.app", appName: "A", icon: "a.png", kind: "app_shortcut" },
			{ appId: "B.app", appName: "B", icon: "b.png", kind: "app_shortcut" },
		];
		classicyDesktopIconEventHandler(withoutHidden, {
			type: "ClassicyDesktopIconCleanup",
		});

		const find = (ds: ClassicyStore, id: string) =>
			ds.System.Manager.Desktop.icons.find((i) => i.appId === id);

		// The visible icon after the hidden one lands where it would if the
		// hidden icon weren't there — no gap.
		expect(find(withHidden, "B.app")?.location).toEqual(
			find(withoutHidden, "B.app")?.location,
		);
		// The hidden icon is still stored (so the Applications folder lists it).
		expect(find(withHidden, "H.app")).toBeDefined();
	});

	it("refreshes an existing icon's contextMenu on re-add instead of skipping it", () => {
		const ds = makeStoreForDesktop();

		// Simulate an icon persisted before the contextMenu feature existed.
		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Finder.app", name: "Macintosh HD", icon: "drive.png" },
			kind: "drive",
		});

		expect(
			ds.System.Manager.Desktop.icons.find(
				(i) => i.appId === "Finder.app" && i.appName === "Macintosh HD",
			)?.contextMenu,
		).toBeUndefined();

		// Re-add (e.g. Finder re-mounting) now ships a contextMenu.
		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Finder.app", name: "Macintosh HD", icon: "drive.png" },
			kind: "drive",
			contextMenu: [{ id: "x", title: "Initialize…" }],
		});

		expect(ds.System.Manager.Desktop.icons).toHaveLength(1);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "Finder.app" && i.appName === "Macintosh HD",
		);
		expect(icon?.contextMenu).toEqual([{ id: "x", title: "Initialize…" }]);
	});

	it("does not wipe an existing contextMenu when re-added without one", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Finder.app", name: "Macintosh HD", icon: "drive.png" },
			kind: "drive",
			contextMenu: [{ id: "x", title: "Initialize…" }],
		});

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Finder.app", name: "Macintosh HD", icon: "drive.png" },
			kind: "drive",
		});

		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "Finder.app" && i.appName === "Macintosh HD",
		);
		expect(icon?.contextMenu).toEqual([{ id: "x", title: "Initialize…" }]);
	});
});

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconRemove", () => {
	it("removes the icon matching the given appId", () => {
		const ds = makeStoreWithIcons();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconRemove",
			app: { id: "Notes.app" },
		});

		expect(
			ds.System.Manager.Desktop.icons.find((i) => i.appId === "Notes.app"),
		).toBeUndefined();
		expect(ds.System.Manager.Desktop.icons).toHaveLength(1);
	});

	it("is a no-op when the appId does not exist", () => {
		const ds = makeStoreWithIcons();
		const countBefore = ds.System.Manager.Desktop.icons.length;

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconRemove",
			app: { id: "Unknown.app" },
		});

		expect(ds.System.Manager.Desktop.icons).toHaveLength(countBefore);
	});
});

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconMove", () => {
	it("updates the location of the matching icon", () => {
		const ds = makeStoreWithIcons();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "Notes.app" },
			location: [500, 600],
		});

		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "Notes.app",
		);
		expect(icon?.location).toEqual([500, 600]);
	});

	it("does not modify other icons when moving one", () => {
		const ds = makeStoreWithIcons();
		const originalCalcLocation = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "Calculator.app",
		)?.location;

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "Notes.app" },
			location: [500, 600],
		});

		const calcIcon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "Calculator.app",
		);
		expect(calcIcon?.location).toEqual(originalCalcLocation);
	});

	it("is a no-op when the appId does not exist", () => {
		const ds = makeStoreWithIcons();
		const iconsBefore = ds.System.Manager.Desktop.icons.map((i) => ({ ...i }));

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "Unknown.app" },
			location: [999, 999],
		});

		ds.System.Manager.Desktop.icons.forEach((icon, idx) => {
			expect(icon.location).toEqual(iconsBefore[idx].location);
		});
	});
});

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconOpen", () => {
	it("sets selectedIcons to the opened icon and registers the app as open", () => {
		const ds = makeStoreWithIcons();

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconOpen",
			iconId: "Notes.app",
			app: { id: "Notes.app", name: "Notes", icon: "notes.png" },
		});

		expect(ds.System.Manager.Desktop.selectedIcons).toEqual(["Notes.app"]);
		expect(ds.System.Manager.Applications.apps["Notes.app"]).toBeDefined();
		expect(ds.System.Manager.Applications.apps["Notes.app"].open).toBe(true);
	});
});

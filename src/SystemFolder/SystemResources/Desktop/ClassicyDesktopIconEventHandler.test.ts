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

	it("does not duplicate an icon with the same appId, but refreshes its name", () => {
		const ds = makeStoreWithIcons();
		const countBefore = ds.System.Manager.Desktop.icons.length;

		classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Notes.app", name: "Notes Duplicate", icon: "notes2.png" },
			kind: "app",
		});

		expect(ds.System.Manager.Desktop.icons).toHaveLength(countBefore);
		// appName is code-derived, like event/eventData/noLaunch/contextMenu
		// below — not user state like location/label — so it refreshes on
		// every re-add the same way they do.
		expect(
			ds.System.Manager.Desktop.icons.find((i) => i.appId === "Notes.app")
				?.appName,
		).toBe("Notes Duplicate");
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

describe("classicyDesktopIconEventHandler — ClassicyDesktopIconAdd new fields", () => {
	const addAction = (extra: Record<string, unknown> = {}) => ({
		type: "ClassicyDesktopIconAdd",
		app: { id: "TV.app", name: "TV", icon: "/icons/tv.png" },
		kind: "app_shortcut",
		...extra,
	});

	const findIcon = (ds: ClassicyStore, appId: string) =>
		ds.System.Manager.Desktop.icons.find((i) => i.appId === appId);

	it("persists inApplications: false", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction({ inApplications: false }),
		);
		expect(findIcon(ds, "TV.app")?.inApplications).toBe(false);
	});

	it("leaves inApplications undefined when not supplied", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction(),
		);
		expect(findIcon(ds, "TV.app")?.inApplications).toBeUndefined();
	});

	it("persists balloonHelp", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction({
				balloonHelp: { title: "TV", content: "Watch TV.", delay: 250 },
			}),
		);
		expect(findIcon(ds, "TV.app")?.balloonHelp).toEqual({
			title: "TV",
			content: "Watch TV.",
			position: undefined,
			delay: 250,
		});
	});

	it("ignores a malformed balloonHelp payload", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction({ balloonHelp: { title: "TV" } }),
		);
		expect(findIcon(ds, "TV.app")?.balloonHelp).toBeUndefined();
	});

	it("refreshes inApplications, hidden and balloonHelp on re-add", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction({ balloonHelp: { content: "Old text." } }),
		);
		ds = classicyDesktopIconEventHandler(
			ds,
			addAction({
				hidden: true,
				inApplications: false,
				balloonHelp: { content: "New text." },
			}),
		);
		const icon = findIcon(ds, "TV.app");
		expect(icon?.hidden).toBe(true);
		expect(icon?.inApplications).toBe(false);
		expect(icon?.balloonHelp?.content).toBe("New text.");
	});

	// appId alone is identity everywhere else an icon is looked up (Move
	// matches on appId alone; Remove treats appName as optional), so the
	// update lookup requiring appId && appName was the outlier: an add whose
	// appName had changed took the "already exists" branch (the presence
	// check above also filters on appId alone) but then found no `existing`,
	// silently updating nothing.
	it("updates an existing icon on re-add even when appName changed", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction(),
		);
		ds = classicyDesktopIconEventHandler(
			ds,
			addAction({
				app: { id: "TV.app", name: "Television", icon: "/icons/tv.png" },
				hidden: true,
			}),
		);
		const icons = ds.System.Manager.Desktop.icons.filter(
			(i) => i.appId === "TV.app",
		);
		// Still exactly one record — the re-add updated it in place rather than
		// either duplicating it or (the bug) leaving it untouched.
		expect(icons).toHaveLength(1);
		expect(icons[0].hidden).toBe(true);
		// The name itself must refresh too — it's code-derived like the other
		// fields updated above, not user state. Leaving it stale here would be
		// a new half-updated state that the appId-only lookup fix made
		// reachable (previously this branch was never entered for a changed
		// appName at all, so nothing updated, name included).
		expect(icons[0].appName).toBe("Television");
	});

	it("preserves a user-moved location across a re-add", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addAction(),
		);
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "TV.app" },
			location: [42, 84],
		});
		ds = classicyDesktopIconEventHandler(
			ds,
			addAction({ balloonHelp: { content: "New text." } }),
		);
		expect(findIcon(ds, "TV.app")?.location).toEqual([42, 84]);
	});

	it("re-flows the desktop grid when hidden changes on re-add", () => {
		// Named so the icon being hidden sorts first: cleanup lays icons out in
		// array order, so hiding the first one must pull the second up.
		const alpha = {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Alpha.app", name: "Alpha", icon: "/icons/a.png" },
			kind: "app_shortcut",
		};
		let ds = classicyDesktopIconEventHandler(makeStoreForDesktop(), alpha);
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "Beta.app", name: "Beta", icon: "/icons/b.png" },
			kind: "app_shortcut",
		});
		const betaBefore = findIcon(ds, "Beta.app")?.location;

		ds = classicyDesktopIconEventHandler(ds, { ...alpha, hidden: true });

		expect(findIcon(ds, "Beta.app")?.location).not.toEqual(betaBefore);
	});
});

describe("shortcut desktop icons", () => {
	const addShortcut = (url: string) => ({
		type: "ClassicyDesktopIconAdd",
		app: { id: "shortcut_press", name: "Press Room", icon: "icon.png" },
		kind: "shortcut",
		noLaunch: true,
		event: "ClassicyDesktopOpenUrl",
		eventData: { url, disposition: "browser-new" },
	});

	it("stores noLaunch, event and eventData", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addShortcut("/press"),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "shortcut_press",
		);
		expect(icon?.noLaunch).toBe(true);
		expect(icon?.kind).toBe("shortcut");
		expect(icon?.event).toBe("ClassicyDesktopOpenUrl");
		expect(icon?.eventData).toEqual({
			url: "/press",
			disposition: "browser-new",
		});
	});

	// Icons persist to localStorage, so a target that changed between releases
	// would otherwise stay stale forever for a returning visitor.
	it("refreshes event and eventData when an icon is re-added", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addShortcut("/press"),
		);
		ds = classicyDesktopIconEventHandler(ds, addShortcut("/press-room"));
		const icons = ds.System.Manager.Desktop.icons.filter(
			(i) => i.appId === "shortcut_press",
		);
		expect(icons).toHaveLength(1);
		expect(icons[0].eventData).toEqual({
			url: "/press-room",
			disposition: "browser-new",
		});
	});

	// A shortcut converted into a real app under the same appId must not keep
	// firing the old URL alongside launching the app.
	it("clears event, eventData and noLaunch on re-add when the action omits them", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addShortcut("/press"),
		);
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "shortcut_press", name: "Press Room", icon: "icon.png" },
			kind: "app",
		});
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "shortcut_press",
		);
		expect(icon?.event).toBeUndefined();
		expect(icon?.eventData).toBeUndefined();
		expect(icon?.noLaunch).toBeUndefined();
	});

	// location is user state — a re-add must not yank a dragged icon back.
	it("leaves a user-moved location alone on re-add", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addShortcut("/press"),
		);
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "shortcut_press" },
			location: [111, 222],
		});
		ds = classicyDesktopIconEventHandler(ds, addShortcut("/press"));
		expect(
			ds.System.Manager.Desktop.icons.find((i) => i.appId === "shortcut_press")
				?.location,
		).toEqual([111, 222]);
	});

	// The case above only covers hidden staying unchanged (undefined both
	// times), which is why the location survives — hiddenChanged is false, so
	// cleanupDesktopIcons never runs. Flipping hidden DOES re-run it, and
	// cleanupDesktopIcons assigns every now-visible icon a fresh grid position
	// unconditionally (it has no notion of "user already moved this"), so
	// un-hiding an icon silently overwrites wherever it had been dragged. This
	// documents the current (surprising) behavior; it is not an assertion that
	// this is desirable.
	it("relocates a user-moved icon when a re-add un-hides it", () => {
		// Reference point: cleanupDesktopIcons assigns grid slots by walking the
		// icons array in order, so a lone non-hidden icon always lands on the
		// same first slot. Asserting equality against this — not just
		// inequality against the dragged location — pins down WHAT the icon
		// becomes, not just that it stopped being [111, 222]; `undefined` (an
		// icon that lost its location outright) would also satisfy a bare
		// `not.toEqual([111, 222])` but is a different bug than this test means
		// to document.
		const reference = classicyDesktopIconEventHandler(
			makeStoreForDesktop(),
			addShortcut("/press"),
		);
		const freshSlotLocation = reference.System.Manager.Desktop.icons.find(
			(i) => i.appId === "shortcut_press",
		)?.location;
		expect(freshSlotLocation).toBeDefined();

		let ds = classicyDesktopIconEventHandler(makeStoreForDesktop(), {
			...addShortcut("/press"),
			hidden: true,
		});
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "shortcut_press" },
			location: [111, 222],
		});
		expect(
			ds.System.Manager.Desktop.icons.find((i) => i.appId === "shortcut_press")
				?.location,
		).toEqual([111, 222]);

		// Re-add omitting `hidden` flips it true -> undefined.
		ds = classicyDesktopIconEventHandler(ds, addShortcut("/press"));
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "shortcut_press",
		);
		expect(icon?.hidden).toBeUndefined();
		// Not just "no longer [111, 222]" — specifically back to the same slot a
		// brand-new icon would get, proving cleanupDesktopIcons overwrote it
		// rather than, say, clearing it.
		expect(icon?.location).toEqual(freshSlotLocation);
	});
});

import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
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

describe("classicyDesktopEventHandler — ClassicyDesktopAppMenuAdd", () => {
	it("adds a new menu item to systemMenu", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuAdd",
			app: { id: "Notes.app", name: "Notes", icon: "notes.png" },
		});

		expect(ds.System.Manager.Desktop.systemMenu).toHaveLength(1);
		expect(ds.System.Manager.Desktop.systemMenu[0].id).toBe(
			"system_menu_Notes.app",
		);
		expect(ds.System.Manager.Desktop.systemMenu[0].title).toBe("Notes");
	});

	it("updates an existing menu item rather than duplicating it", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuAdd",
			app: { id: "Notes.app", name: "Notes", icon: "notes.png" },
		});
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuAdd",
			app: { id: "Notes.app", name: "Notes Updated", icon: "notes2.png" },
		});

		expect(ds.System.Manager.Desktop.systemMenu).toHaveLength(1);
		expect(ds.System.Manager.Desktop.systemMenu[0].title).toBe("Notes Updated");
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopAppMenuRemove", () => {
	it("removes an existing menu item by app id", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuAdd",
			app: { id: "Notes.app", name: "Notes", icon: "notes.png" },
		});
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuRemove",
			app: { id: "Notes.app" },
		});

		expect(ds.System.Manager.Desktop.systemMenu).toHaveLength(0);
	});

	it("is a no-op when the app id is not in systemMenu", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopAppMenuRemove",
			app: { id: "Unknown.app" },
		});

		expect(ds.System.Manager.Desktop.systemMenu).toHaveLength(0);
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopStop", () => {
	it("resets selectBox to inactive with zeroed size and start", () => {
		const ds = makeStoreForDesktop();
		ds.System.Manager.Desktop.selectBox = {
			active: true,
			size: [100, 200],
			start: [50, 60],
		};

		classicyDesktopEventHandler(ds, { type: "ClassicyDesktopStop" });

		expect(ds.System.Manager.Desktop.selectBox.active).toBe(false);
		expect(ds.System.Manager.Desktop.selectBox.size).toEqual([0, 0]);
		expect(ds.System.Manager.Desktop.selectBox.start).toEqual([0, 0]);
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopContextMenu", () => {
	it("sets showContextMenu to true", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopContextMenu",
			showContextMenu: true,
		});

		expect(ds.System.Manager.Desktop.showContextMenu).toBe(true);
	});

	it("sets showContextMenu to false", () => {
		const ds = makeStoreForDesktop();
		ds.System.Manager.Desktop.showContextMenu = true;
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopContextMenu",
			showContextMenu: false,
		});

		expect(ds.System.Manager.Desktop.showContextMenu).toBe(false);
	});

	it("sets the contextMenu array when provided", () => {
		const ds = makeStoreForDesktop();
		const menu = [{ id: "item1", title: "Item 1" }];
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopContextMenu",
			showContextMenu: true,
			contextMenu: menu,
		});

		expect(ds.System.Manager.Desktop.contextMenu).toBe(menu);
	});

	it("does not overwrite contextMenu when none is provided", () => {
		const ds = makeStoreForDesktop();
		const existing = [{ id: "existing", title: "Existing" }];
		ds.System.Manager.Desktop.contextMenu = existing;
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopContextMenu",
			showContextMenu: false,
		});

		expect(ds.System.Manager.Desktop.contextMenu).toBe(existing);
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeTheme", () => {
	it("switches activeTheme to the found theme", () => {
		const ds = makeStoreForDesktop();
		const altTheme = {
			...ds.System.Manager.Appearance.activeTheme,
			id: "alt-theme",
			name: "Alt",
		};
		if (!ds.System.Manager.Appearance.availableThemes)	{
			ds.System.Manager.Appearance.availableThemes = [];
		}
		ds.System.Manager.Appearance.availableThemes.push(altTheme);

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "alt-theme",
		});

		expect(ds.System.Manager.Appearance.activeTheme.id).toBe("alt-theme");
	});

	it("does not change activeTheme for an unknown theme id", () => {
		const ds = makeStoreForDesktop();
		const originalId = ds.System.Manager.Appearance.activeTheme.id;

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "nonexistent-theme",
		});

		expect(ds.System.Manager.Appearance.activeTheme.id).toBe(originalId);
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeBackground", () => {
	it("sets backgroundImage and resets backgroundSize to 'auto'", () => {
		const ds = makeStoreForDesktop();
		ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize = "cover";

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeBackground",
			backgroundImage: "wallpaper.jpg",
		});

		expect(
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundImage,
		).toBe("wallpaper.jpg");
		expect(
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize,
		).toBe("auto");
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeBackgroundPosition", () => {
	it("sets backgroundPosition", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeBackgroundPosition",
			backgroundPosition: "top left",
		});

		expect(
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundPosition,
		).toBe("top left");
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeBackgroundRepeat", () => {
	it("sets backgroundRepeat", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeBackgroundRepeat",
			backgroundRepeat: "repeat-x",
		});

		expect(
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundRepeat,
		).toBe("repeat-x");
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeBackgroundSize", () => {
	it("sets backgroundSize", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeBackgroundSize",
			backgroundSize: "cover",
		});

		expect(
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize,
		).toBe("cover");
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopChangeFont", () => {
	it("sets body font", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "body",
			font: "Chicago",
		});

		expect(ds.System.Manager.Appearance.activeTheme.typography.body).toBe(
			"Chicago",
		);
	});

	it("sets ui font", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "ui",
			font: "Monaco",
		});

		expect(ds.System.Manager.Appearance.activeTheme.typography.ui).toBe(
			"Monaco",
		);
	});

	it("sets header font", () => {
		const ds = makeStoreForDesktop();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "header",
			font: "Charcoal",
		});

		expect(ds.System.Manager.Appearance.activeTheme.typography.header).toBe(
			"Charcoal",
		);
	});
});

describe("classicyDesktopEventHandler — ClassicyDesktopLoadThemes", () => {
	it("replaces availableThemes with the provided list", () => {
		const ds = makeStoreForDesktop();
		const newThemes = [
			{ ...ds.System.Manager.Appearance.activeTheme, id: "a" },
			{ ...ds.System.Manager.Appearance.activeTheme, id: "b" },
		];

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopLoadThemes",
			availableThemes: newThemes,
		});

		expect(ds.System.Manager.Appearance.availableThemes).toBe(newThemes);
		expect(ds.System.Manager.Appearance.availableThemes).toHaveLength(2);
	});
});

describe("classicyDesktopEventHandler — error dialog", () => {
	it("ClassicyDesktopShowErrorDialog stores the message and title", () => {
		const ds = makeStoreForDesktop();

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopShowErrorDialog",
			title: "Oops",
			message: "Something went wrong.",
		});

		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			title: "Oops",
			message: "Something went wrong.",
		});
	});

	it("ClassicyDesktopCloseErrorDialog clears the dialog", () => {
		const ds = makeStoreForDesktop();
		ds.System.Manager.Desktop.errorDialog = { message: "Existing error" };

		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopCloseErrorDialog",
		});

		expect(ds.System.Manager.Desktop.errorDialog).toBeNull();
	});
});

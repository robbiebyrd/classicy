import { describe, expect, it, vi } from "vitest";
import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import {
	APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	type ClassicyStartMenuItemsInput,
	classicyStartMenuItems,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenuItems.internal";

// Plan 0020-w98 §3, "Items", and E2: the Start menu as data, from the Apple
// menu's entries, the derived Applications folder's records, the session's
// documents, the Help topic, the Special menu and the shell's Run, Log Off
// and Shut Down.

const appleEntry = (appId: string, name: string): ClassicyMenuItem => ({
	id: `system_menu_${appId}`,
	title: name,
	image: `${appId}.png`,
	event: "ClassicyAppOpen",
	eventData: { app: { id: appId, name, icon: `${appId}.png` } },
});

const ABOUT: ClassicyMenuItem = {
	id: "about",
	title: "About This Computer",
	event: "ClassicyAppFinderAboutThisComputerOpen",
	eventData: {},
};

const shortcut = (
	appId: string,
	appName: string,
	overrides: Partial<ClassicyStoreSystemDesktopManagerIcon> = {},
): ClassicyStoreSystemDesktopManagerIcon => ({
	appId,
	appName,
	icon: `${appId}.png`,
	kind: "app_shortcut",
	...overrides,
});

const IMAGES = {
	about: "about.png",
	programs: "programs.png",
	controlPanel: "control-panel.png",
	help: "help.png",
	emptyTrash: "trash.png",
	resetPram: "switch-on.png",
	documents: "documents.png",
	run: "run.png",
	logOff: "key.png",
	shutDown: "switch-off.png",
};

const input = (
	overrides: Partial<ClassicyStartMenuItemsInput> = {},
): ClassicyStartMenuItemsInput => ({
	systemMenu: [
		ABOUT,
		{ id: "spacer" },
		appleEntry("Sound.app", "Sound"),
		appleEntry("Calculator.app", "Calculator"),
		appleEntry("Appearance.app", "Appearance"),
	],
	icons: [
		shortcut("TextEdit.app", "TextEdit"),
		shortcut("Calculator.app", "Calculator", { hidden: true }),
		shortcut("Appearance.app", "Appearance", { inApplications: false }),
		shortcut("Movie.app", "Movie Player"),
		{ appId: "Macintosh HD", appName: "Macintosh HD", icon: "", kind: "drive" },
	],
	mountedApps: new Set([
		"TextEdit.app",
		"Calculator.app",
		"Appearance.app",
		"Movie.app",
		"Sound.app",
	]),
	overrides: CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	disableBalloonHelp: false,
	images: IMAGES,
	dispatch: vi.fn(),
	...overrides,
});

const titles = (items: ClassicyMenuItem[] | undefined) =>
	(items ?? []).map((item) => (item.id === "spacer" ? "—" : item.title));
const child = (items: ClassicyMenuItem[], title: string) => {
	const found = items.find((item) => item.title === title);
	if (!found) throw new Error(`no item "${title}"`);
	return found;
};

describe("classicyStartMenuItems", () => {
	it("lists About, Programs, Documents, Settings, Help, Run, the Special menu's two commands, then Shut Down", () => {
		expect(titles(classicyStartMenuItems(input()))).toEqual([
			"About This Computer",
			"—",
			"Programs",
			"Documents",
			"Settings",
			"Help",
			"Run...",
			"—",
			"Empty Trash",
			"Reset PRAM",
			"—",
			"Shut Down...",
		]);
	});

	it("adds Log Off <name>... above Shut Down only with a user name", () => {
		const items = classicyStartMenuItems(input({ userName: " Ada " }));
		expect(titles(items).slice(-3)).toEqual([
			"—",
			"Log Off Ada...",
			"Shut Down...",
		]);
		expect(child(items, "Log Off Ada...")).toMatchObject({
			id: "start-menu_log-off",
			image: "key.png",
		});
		expect(
			titles(classicyStartMenuItems(input({ userName: "  " }))),
		).not.toContain("Log Off ...");
		expect(
			titles(classicyStartMenuItems(input({ userName: "" }))).some((title) =>
				title?.startsWith("Log Off"),
			),
		).toBe(false);
	});

	it("opens the shell's dialogs from Run..., Log Off... and Shut Down...", () => {
		const dispatch = vi.fn();
		const items = classicyStartMenuItems(input({ dispatch, userName: "Ada" }));
		child(items, "Run...").onClickFunc?.();
		child(items, "Log Off Ada...").onClickFunc?.();
		child(items, "Shut Down...").onClickFunc?.();
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "run" },
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "logOff" },
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "shutDown" },
		]);
		expect(child(items, "Run...")).toMatchObject({
			id: "start-menu_run",
			image: "run.png",
		});
		expect(child(items, "Shut Down...")).toMatchObject({
			id: "start-menu_shut-down",
			image: "switch-off.png",
		});
	});

	it("has no Favorites and no Find: Classicy keeps no favorites and has no search", () => {
		const shown = titles(classicyStartMenuItems(input()));
		expect(shown).not.toContain("Favorites");
		expect(shown).not.toContain("Find");
	});

	describe("Documents", () => {
		const documents = (over: Partial<ClassicyStartMenuItemsInput> = {}) =>
			child(classicyStartMenuItems(input(over)), "Documents").menuChildren ??
			[];

		it("lists the session's documents by name, sorted, each with its icon", () => {
			const listed = documents({
				documents: [
					{ path: "HD:b.txt", name: "b.txt", icon: "text.png" },
					{ path: "HD:Docs:A.md", name: "A.md", icon: "md.png" },
				],
			});
			expect(titles(listed)).toEqual(["A.md", "b.txt"]);
			expect(listed.map((item) => item.image)).toEqual(["md.png", "text.png"]);
			expect(child(classicyStartMenuItems(input()), "Documents").image).toBe(
				"documents.png",
			);
		});

		it("opens a document through openDocument with its path", () => {
			const openDocument = vi.fn();
			const [doc] = documents({
				documents: [{ path: "HD:b.txt", name: "b.txt", icon: "text.png" }],
				openDocument,
			});
			doc.onClickFunc?.();
			expect(openDocument).toHaveBeenCalledWith("HD:b.txt");
			expect(doc.id).toBe("start-menu_documents_0");
		});

		it('shows a disabled "(Empty)" when no document was opened', () => {
			expect(documents()).toEqual([
				{
					id: "start-menu_documents_empty",
					title: "(Empty)",
					disabled: true,
				},
			]);
			expect(documents({ documents: [] })).toHaveLength(1);
		});
	});

	it("draws each first-level item with its image and no keyboard equivalent", () => {
		const items = classicyStartMenuItems(
			input({
				systemMenu: [{ ...ABOUT, keyboardShortcut: "⌃S" }],
			}),
		).filter((item) => item.id !== "spacer");
		expect(items.map((item) => item.image)).toEqual([
			"about.png",
			"programs.png",
			"documents.png",
			"control-panel.png",
			"help.png",
			"run.png",
			"trash.png",
			"switch-on.png",
			"switch-off.png",
		]);
		expect(items.every((item) => item.keyboardShortcut === undefined)).toBe(
			true,
		);
	});

	it("keeps the Apple menu's About This Computer action, and leaves it out when the Apple menu has none", () => {
		const [about] = classicyStartMenuItems(input());
		expect(about).toMatchObject({
			id: "start-menu_about",
			title: "About This Computer",
			event: "ClassicyAppFinderAboutThisComputerOpen",
			eventData: {},
		});
		expect(
			titles(classicyStartMenuItems(input({ systemMenu: [] }))).slice(0, 2),
		).toEqual(["Programs", "Documents"]);
	});

	describe("Programs", () => {
		const programs = (over: Partial<ClassicyStartMenuItemsInput> = {}) =>
			child(classicyStartMenuItems(input(over)), "Programs").menuChildren ?? [];

		it("lists the Applications folder's mounted apps, sorted by name", () => {
			expect(titles(programs())).toEqual([
				"Calculator",
				"Movie Player",
				"TextEdit",
			]);
		});

		it("leaves out an app opted out of Applications, an unmounted app and other kinds", () => {
			const listed = programs({
				mountedApps: new Set(["TextEdit.app", "Appearance.app"]),
			});
			expect(titles(listed)).toEqual(["TextEdit"]);
		});

		it("opens an app with its internal identity, drawn by its display identity", () => {
			const renamed: ClassicyAppIdentityOverrides = {
				"TextEdit.app": { name: "Notepad", icon: "notepad.png" },
			};
			const notepad = child(programs({ overrides: renamed }), "Notepad");
			expect(notepad).toMatchObject({
				id: "start-menu_programs_TextEdit.app",
				image: "notepad.png",
				event: "ClassicyAppOpen",
				eventData: {
					app: {
						id: "TextEdit.app",
						name: "TextEdit",
						icon: "TextEdit.app.png",
					},
				},
			});
			// Sorted by the name shown.
			expect(titles(programs({ overrides: renamed }))).toEqual([
				"Calculator",
				"Movie Player",
				"Notepad",
			]);
		});

		it("lists an app once, whatever its records", () => {
			expect(
				titles(
					programs({
						icons: [
							shortcut("TextEdit.app", "TextEdit"),
							shortcut("TextEdit.app", "TextEdit"),
						],
					}),
				),
			).toEqual(["TextEdit"]);
		});

		it('shows a disabled "(Empty)" when no app is listed', () => {
			expect(programs({ icons: [] })).toEqual([
				{
					id: "start-menu_programs_empty",
					title: "(Empty)",
					disabled: true,
				},
			]);
		});
	});

	describe("Settings", () => {
		const settings = (over: Partial<ClassicyStartMenuItemsInput> = {}) =>
			child(classicyStartMenuItems(input(over)), "Settings").menuChildren ?? [];
		const controlPanel = (over: Partial<ClassicyStartMenuItemsInput> = {}) =>
			child(settings(over), "Control Panel").menuChildren ?? [];

		it("holds Control Panel, a divider and the balloon toggle", () => {
			expect(titles(settings())).toEqual([
				"Control Panel",
				"—",
				"Hide Balloons",
			]);
			expect(child(settings(), "Control Panel").image).toBe(
				"control-panel.png",
			);
		});

		it("lists the Apple menu's entries for mounted apps Applications does not list, sorted", () => {
			// Calculator is in Applications (a hidden desktop icon still lists
			// it), so it is under Programs only; Appearance opted out.
			expect(titles(controlPanel())).toEqual(["Appearance", "Sound"]);
			const sound = child(controlPanel(), "Sound");
			expect(sound).toMatchObject({
				id: "start-menu_control-panel_Sound.app",
				image: "Sound.app.png",
				event: "ClassicyAppOpen",
				eventData: {
					app: { id: "Sound.app", name: "Sound", icon: "Sound.app.png" },
				},
			});
			expect(
				titles(controlPanel({ mountedApps: new Set(["Sound.app"]) })),
			).toEqual(["Sound"]);
		});

		it("shows each control panel by its display name", () => {
			const renamed: ClassicyAppIdentityOverrides = {
				"Sound.app": { name: "Audio" },
			};
			expect(titles(controlPanel({ overrides: renamed }))).toEqual([
				"Appearance",
				"Audio",
			]);
		});

		it('shows a disabled "(Empty)" when there is no control panel', () => {
			expect(controlPanel({ systemMenu: [ABOUT] })).toEqual([
				{
					id: "start-menu_control-panel_empty",
					title: "(Empty)",
					disabled: true,
				},
			]);
		});

		it("titles the balloon toggle by the store's flag, with ⌥H, setting the other value", () => {
			const toggle = (disableBalloonHelp: boolean) =>
				child(
					settings({ disableBalloonHelp }),
					disableBalloonHelp ? "Show Balloons" : "Hide Balloons",
				);
			expect(toggle(false)).toMatchObject({
				id: "start-menu_balloons",
				keyboardShortcut: "⌥H",
				event: "ClassicyDesktopSetBalloonHelp",
				eventData: { disableBalloonHelp: true },
			});
			expect(toggle(true)).toMatchObject({
				event: "ClassicyDesktopSetBalloonHelp",
				eventData: { disableBalloonHelp: false },
			});
		});
	});

	it("opens Apple Guide's Help topic from Help", () => {
		expect(child(classicyStartMenuItems(input()), "Help")).toMatchObject({
			id: "start-menu_help",
			event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
			eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
		});
	});

	// Hand-off C7 (the remaining chapters' audit's 12.21): under WinHelp's
	// topic window (`help.topicWindow` "winhelp", which the Start menu
	// passes as `helpTopics`) Help opens the Help Topics browser.
	it("opens the Help Topics browser from Help with helpTopics", () => {
		const help = child(
			classicyStartMenuItems(input({ helpTopics: true })),
			"Help",
		);
		expect(help).toMatchObject({
			id: "start-menu_help",
			event: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
			eventData: {},
		});
	});

	// The titles carry no ellipsis: each item `confirms`, and the menu adds
	// one only where the package's `layout.menu.confirmEllipsis` asks for it
	// (Windows 98 does not: WIG Ch.7 "Types of Menu Items", pp.107-108).
	it("runs the Special menu's dialogs from Empty Trash and Reset PRAM, each confirming", () => {
		const dispatch = vi.fn();
		const items = classicyStartMenuItems(input({ dispatch }));
		expect(child(items, "Empty Trash").confirms).toBe(true);
		expect(child(items, "Reset PRAM").confirms).toBe(true);
		child(items, "Empty Trash").onClickFunc?.();
		child(items, "Reset PRAM").onClickFunc?.();
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" },
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "resetPram" },
		]);
		expect(child(items, "Empty Trash").id).toBe("start_special_empty_trash");
	});

	it("gives no item an id a menu bar uses", () => {
		const ids: string[] = [];
		const walk = (list: ClassicyMenuItem[]) => {
			for (const item of list) {
				if (item.id !== "spacer") ids.push(item.id);
				walk(item.menuChildren ?? []);
			}
		};
		walk(
			classicyStartMenuItems(
				input({
					userName: "Ada",
					documents: [{ path: "HD:a", name: "a", icon: "" }],
				}),
			),
		);
		expect(ids.every((id) => /^start(-menu)?_/.test(id))).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

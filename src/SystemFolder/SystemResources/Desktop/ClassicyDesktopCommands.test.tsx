import { act, cleanup, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import "@/SystemFolder/SimpleText/SimpleTextManifest";
// Finder's reducer, which its folder opens and Delete's confirmation reach.
import "@/SystemFolder/Finder/FinderContext";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import {
	type ClassicyDesktopCommands,
	useClassicyDesktopCommands,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopCommands.internal";
import {
	classicyDesktopFreeIconLocation,
	classicyDesktopIconGridPosition,
	classicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import {
	classicyDesktopIconRenaming,
	resetClassicyDesktopIconRenameForTests,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import {
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
	setClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopItemIconAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// Hand-off C1 (the remaining chapters' audit's 5.23, 5.39, 5.40, 10.3 and
// A.4; Windows 98 SE's desktop menus, shell32.dll): the desktop's Explorer
// commands, built for the shell to wire, acting on the desktop's selection.

const DESKTOP_FOLDER = "Macintosh HD:Desktop Folder";

let commands: ClassicyDesktopCommands = {};
const Harness = () => {
	commands = useClassicyDesktopCommands();
	return null;
};

const titles = (items: ClassicyMenuItem[] | undefined) =>
	(items ?? []).map((item) =>
		item.id === "spacer" ? "—" : [item.title, item.accessKey],
	);
const child = (items: ClassicyMenuItem[] | undefined, title: string) =>
	(items ?? []).find((item) => item.title === title);
const desktop = () => useAppManager.getState().System.Manager.Desktop;

let restorePackage: (() => void) | null = null;
const useWindowsLayout = () => {
	restorePackage = activateTestWindowsKeysPackage({
		menu: { keys: "windows", accessKeys: "auto" },
	});
};

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	resetClassicyDesktopIconRenameForTests();
});

afterEach(() => {
	cleanup();
	restorePackage?.();
	restorePackage = null;
	resetClassicyDesktopIconRenameForTests();
	clearClassicyFileClipboard();
});

describe("useClassicyDesktopCommands", () => {
	it("gives nothing without Explorer's commands (Mac OS 8's desktop keeps its own)", () => {
		render(<Harness />);
		expect(commands.barMenu).toBeUndefined();
		expect(commands.whiteSpaceMenu).toBeUndefined();
	});

	it("gives the desktop's File, Edit and View menus and its white space's, in Windows 98's order", () => {
		useWindowsLayout();
		render(<Harness />);
		const [file, edit, view] = commands.barMenu ?? [];
		expect([file.id, edit.id, view.id]).toEqual([
			"finder_file",
			"finder_edit",
			"finder_view",
		]);
		expect(titles(file.menuChildren)).toEqual([
			["Open", "o"],
			"—",
			["New", "w"],
			"—",
			["Create Shortcut", "S"],
			["Delete", "D"],
			["Rename", "m"],
			["Properties", "r"],
		]);
		expect(child(file.menuChildren, "Open")?.keyboardShortcut).toBe("⌘O");
		expect(child(file.menuChildren, "Delete")).toMatchObject({
			keyboardShortcut: "⌦",
			nativeShortcut: true,
		});
		// Explorer's Edit menu (shell32.dll; 5.28): Cut Ctrl+X, Copy Ctrl+C,
		// Paste Ctrl+V, Paste Shortcut, then Select All; the transfer keys
		// native (the hook takes them on the desktop itself), Paste and Paste
		// Shortcut dimmed with nothing to paste.
		expect(titles(edit.menuChildren)).toEqual([
			["Cut", "t"],
			["Copy", "C"],
			["Paste", "P"],
			["Paste Shortcut", "S"],
			"—",
			["Select All", "a"],
		]);
		for (const [title, shortcut] of [
			["Cut", "⌘X"],
			["Copy", "⌘C"],
			["Paste", "⌘V"],
		])
			expect(child(edit.menuChildren, title)).toMatchObject({
				keyboardShortcut: shortcut,
				nativeShortcut: true,
			});
		expect(child(edit.menuChildren, "Paste")?.disabled).toBe(true);
		expect(child(edit.menuChildren, "Paste Shortcut")?.disabled).toBe(true);
		expect(titles(view.menuChildren)).toEqual([
			["Arrange Icons", "I"],
			["Line Up Icons", "U"],
		]);
		expect(
			titles(child(view.menuChildren, "Arrange Icons")?.menuChildren),
		).toEqual([
			["by Name", "N"],
			["by Type", "T"],
		]);
		expect(titles(commands.whiteSpaceMenu?.([10, 10]))).toEqual([
			["Arrange Icons", "I"],
			["Line Up Icons", "U"],
			"—",
			["Paste", "P"],
			["Paste Shortcut", "S"],
			"—",
			["New", "w"],
			"—",
			["Properties", "r"],
		]);
		// The white space's Paste shows no key (Explorer's pop-up menus show
		// none).
		expect(
			child(commands.whiteSpaceMenu?.([10, 10]), "Paste")?.keyboardShortcut,
		).toBeUndefined();
	});

	it("lists the mounted apps' document types in New", () => {
		useWindowsLayout();
		const release = markClassicyAppMounted("SimpleText.app");
		try {
			render(<Harness />);
			const newMenu = child(commands.whiteSpaceMenu?.([0, 0]), "New");
			expect(titles(newMenu?.menuChildren)).toEqual([
				["Folder", "F"],
				"—",
				["Text Document", "T"],
			]);
		} finally {
			release();
		}
		// Unmounted, SimpleText's type is not offered.
		cleanup();
		render(<Harness />);
		expect(
			titles(child(commands.whiteSpaceMenu?.([0, 0]), "New")?.menuChildren),
		).toEqual([["Folder", "F"]]);
	});

	it("makes a New Folder in the Desktop Folder at the menu's point, selected, its name edited", () => {
		useWindowsLayout();
		render(<Harness />);
		const newMenu = child(commands.whiteSpaceMenu?.([140, 90]), "New");
		act(() => {
			child(newMenu?.menuChildren, "Folder")?.onClickFunc?.();
		});
		const fs = new ClassicyFileSystem();
		expect(fs.resolve(DESKTOP_FOLDER)?._invisible).toBe(true);
		expect(fs.resolve(`${DESKTOP_FOLDER}:New Folder`)?._type).toBe("directory");
		const iconId = `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${DESKTOP_FOLDER}:New Folder`;
		const icon = desktop().icons.find((i) => i.appId === iconId);
		expect(icon?.location).toEqual([140, 90]);
		expect(desktop().selectedIcons).toEqual([iconId]);
		expect(classicyDesktopIconRenaming()).toBe(iconId);
		// Again from the bar: "New Folder (2)", at the first free cell.
		const freeCell = classicyDesktopFreeIconLocation(
			useAppManager.getState().System.Manager.Appearance.activeTheme,
			desktop().icons,
		);
		const fileNew = child(commands.barMenu?.[0].menuChildren, "New");
		act(() => {
			child(fileNew?.menuChildren, "Folder")?.onClickFunc?.();
		});
		const second = desktop().icons.find(
			(i) =>
				i.appId ===
				`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${DESKTOP_FOLDER}:New Folder (2)`,
		);
		expect(second?.location).toEqual(freeCell);
	});

	it("makes a New Text Document.txt from SimpleText's declared type", () => {
		useWindowsLayout();
		const release = markClassicyAppMounted("SimpleText.app");
		try {
			render(<Harness />);
			const newMenu = child(commands.whiteSpaceMenu?.([20, 20]), "New");
			act(() => {
				child(newMenu?.menuChildren, "Text Document")?.onClickFunc?.();
			});
			expect(
				new ClassicyFileSystem().resolve(
					`${DESKTOP_FOLDER}:New Text Document.txt`,
				)?._type,
			).toBe("text_file");
		} finally {
			release();
		}
	});

	describe("on the desktop's selection", () => {
		const seedItem = (name: string, folder = false) => {
			const fs = new ClassicyFileSystem();
			const path = `${DESKTOP_FOLDER}:${name}`;
			if (folder) fs.mkDir(path);
			else fs.writeFile(path, "x");
			const action = classicyDesktopItemIconAction(fs, path, [10, 10]);
			if (action) act(() => dispatch(action));
			return `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`;
		};
		const select = (ids: string[]) =>
			act(() =>
				useAppManager.setState(
					produce(useAppManager.getState(), (draft) => {
						draft.System.Manager.Desktop.selectedIcons = ids;
					}),
				),
			);
		const fileItem = (title: string) =>
			child(commands.barMenu?.[0].menuChildren, title);

		it("opens a selected folder in Finder", () => {
			useWindowsLayout();
			render(<Harness />);
			const id = seedItem("Projects", true);
			select([id]);
			act(() => fileItem("Open")?.onClickFunc?.());
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						"Finder.app"
					]?.data as { openPaths?: string[] }
				)?.openPaths,
			).toContain(`${DESKTOP_FOLDER}:Projects`);
		});

		it("renames the one selected item in place, never two", () => {
			useWindowsLayout();
			render(<Harness />);
			const a = seedItem("a.txt");
			const b = seedItem("b.txt");
			select([a, b]);
			act(() => fileItem("Rename")?.onClickFunc?.());
			expect(classicyDesktopIconRenaming()).toBeNull();
			select([a]);
			act(() => fileItem("Rename")?.onClickFunc?.());
			expect(classicyDesktopIconRenaming()).toBe(a);
		});

		it("deletes after Windows 98's confirmation while Finder is mounted, at once otherwise", () => {
			useWindowsLayout();
			render(<Harness />);
			const a = seedItem("a.txt");
			select([a]);
			const release = markClassicyAppMounted("Finder.app");
			act(() => fileItem("Delete")?.onClickFunc?.());
			release();
			expect(
				new ClassicyFileSystem().resolve(`${DESKTOP_FOLDER}:a.txt`),
			).toBeDefined();
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						"Finder.app"
					]?.data as { confirmDelete?: unknown }
				)?.confirmDelete,
			).toEqual({ paths: [`${DESKTOP_FOLDER}:a.txt`], trust: "trusted" });
			// No Finder to ask: it goes to the Trash.
			act(() => fileItem("Delete")?.onClickFunc?.());
			expect(
				new ClassicyFileSystem().resolve(`${DESKTOP_FOLDER}:a.txt`),
			).toBeUndefined();
		});

		// The remaining chapters' audit's 10.6: Create Shortcut makes
		// "Shortcut to <name>" beside a Desktop Folder item, on the desktop
		// and selected; for a drive (at the root of the tree, which takes
		// none) it asks Finder to offer the desktop, as Windows 98 SE does.
		it("makes a shortcut beside a selected item, its icon placed and selected", () => {
			useWindowsLayout();
			render(<Harness />);
			const a = seedItem("a.txt");
			select([a]);
			act(() => fileItem("Create Shortcut")?.onClickFunc?.());
			const path = `${DESKTOP_FOLDER}:Shortcut to a.txt`;
			expect(new ClassicyFileSystem().resolve(path)).toMatchObject({
				_type: "file_shortcut",
				_targetPath: `${DESKTOP_FOLDER}:a.txt`,
			});
			const id = `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`;
			const icon = desktop().icons.find((i) => i.appId === id);
			// An alias kind: the desktop badges it and italicizes its label.
			expect(icon?.kind).toBe("file_shortcut");
			expect(icon?.location).toBeDefined();
			expect(desktop().selectedIcons).toEqual([id]);
			// Again: numbered, as Windows 98 numbers it.
			select([a]);
			act(() => fileItem("Create Shortcut")?.onClickFunc?.());
			expect(
				new ClassicyFileSystem().resolve(
					`${DESKTOP_FOLDER}:Shortcut (2) to a.txt`,
				),
			).toBeDefined();
		});

		it("asks Finder to offer the desktop for a selected drive, and skips an app's icon", () => {
			useWindowsLayout();
			render(<Harness />);
			new ClassicyFileSystem();
			act(() =>
				dispatch({
					type: "ClassicyDesktopIconAdd",
					app: { id: "Finder.app", name: "Macintosh HD", icon: "" },
					kind: "drive",
					filePath: "Macintosh HD",
					event: "ClassicyAppFinderOpenFolder",
					eventData: { path: "Macintosh HD" },
				}),
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopIconAdd",
					app: { id: "TV.app", name: "TV", icon: "" },
					kind: "app_shortcut",
				}),
			);
			const drive = desktop().icons.find((i) => i.kind === "drive")?.appId;
			select([drive as string, "TV.app"]);
			act(() => fileItem("Create Shortcut")?.onClickFunc?.());
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						"Finder.app"
					]?.data as { desktopShortcutOffer?: unknown }
				)?.desktopShortcutOffer,
			).toEqual({ paths: ["Macintosh HD"] });
			expect(
				new ClassicyFileSystem().resolve(
					`${DESKTOP_FOLDER}:Shortcut to Macintosh HD`,
				),
			).toBeUndefined();
		});

		// The remaining chapters' audit's 2.2 / 5.27 (WIG Ch.2 pp.12-13; Ch.5
		// "Properties", p.51): Properties last, on the selection's sheet, else
		// on Display Properties, the Appearance panel's Desktop tab.
		const finderProperties = () =>
			(
				useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
					?.data as { properties?: unknown }
			)?.properties;
		const loadAppearancePanel = () =>
			act(() =>
				dispatch({
					type: "ClassicyAppLoad",
					app: {
						id: "AppearanceManager.app",
						name: "Appearance Manager",
						icon: "",
					},
				}),
			);
		const appearancePanel = () =>
			useAppManager.getState().System.Manager.Applications.apps[
				"AppearanceManager.app"
			];

		it("shows the selected items' sheet from File ▸ Properties", () => {
			useWindowsLayout();
			render(<Harness />);
			const a = seedItem("a.txt");
			const b = seedItem("b.txt");
			select([a, b]);
			act(() => fileItem("Properties")?.onClickFunc?.());
			expect(finderProperties()).toEqual([
				{
					key: `${DESKTOP_FOLDER}:a.txt::${DESKTOP_FOLDER}:b.txt`,
					paths: [`${DESKTOP_FOLDER}:a.txt`, `${DESKTOP_FOLDER}:b.txt`],
				},
			]);
		});

		it("shows an app icon's sheet, and Display Properties with nothing selected", () => {
			useWindowsLayout();
			render(<Harness />);
			loadAppearancePanel();
			act(() =>
				dispatch({
					type: "ClassicyDesktopIconAdd",
					app: { id: "TV.app", name: "TV", icon: "" },
					kind: "app_shortcut",
				}),
			);
			select(["TV.app"]);
			act(() => fileItem("Properties")?.onClickFunc?.());
			expect(finderProperties()).toEqual([{ key: ":TV.app", appId: "TV.app" }]);
			select([]);
			act(() => fileItem("Properties")?.onClickFunc?.());
			expect(appearancePanel()?.open).toBe(true);
			expect(appearancePanel()?.session?.tabs?.main).toBe(3);
		});

		it("opens the Appearance panel on its Desktop tab from the white space, and keeps an open panel's tab", () => {
			useWindowsLayout();
			render(<Harness />);
			loadAppearancePanel();
			const properties = child(commands.whiteSpaceMenu?.([0, 0]), "Properties");
			act(() => properties?.onClickFunc?.());
			expect(appearancePanel()?.open).toBe(true);
			expect(appearancePanel()?.session?.tabs?.main).toBe(3);
			// Open on another page, it is brought forward as it stands, as
			// Windows activates an open control panel.
			act(() =>
				dispatch({
					type: "ClassicyAppRememberTab",
					app: { id: "AppearanceManager.app" },
					tabs: "main",
					index: 5,
				}),
			);
			act(() => properties?.onClickFunc?.());
			expect(appearancePanel()?.session?.tabs?.main).toBe(5);
		});

		it("selects every drawn icon, arranges by name and lines the icons up", () => {
			useWindowsLayout();
			render(<Harness />);
			const b = seedItem("b.txt");
			const a = seedItem("a.txt");
			act(() =>
				child(
					commands.barMenu?.[1].menuChildren,
					"Select All",
				)?.onClickFunc?.(),
			);
			expect(desktop().selectedIcons).toEqual(
				desktop()
					.icons.filter((i) => !i.hidden)
					.map((i) => i.appId),
			);
			const view = commands.barMenu?.[2].menuChildren;
			act(() =>
				child(
					child(view, "Arrange Icons")?.menuChildren,
					"by Name",
				)?.onClickFunc?.(),
			);
			const order = desktop().icons.map((i) => i.appId);
			expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
			act(() =>
				useAppManager.setState(
					produce(useAppManager.getState(), (draft) => {
						for (const icon of draft.System.Manager.Desktop.icons)
							if (icon.appId === a) icon.location = [3, 300];
					}),
				),
			);
			act(() => child(view, "Line Up Icons")?.onClickFunc?.());
			const metrics = classicyDesktopIconMetrics(
				useAppManager.getState().System.Manager.Appearance.activeTheme,
			);
			const lined = desktop().icons.find((i) => i.appId === a)?.location;
			const cells = Array.from({ length: 400 }, (_, i) =>
				classicyDesktopIconGridPosition(
					metrics,
					1 + Math.floor(i / 20),
					i % 20,
				),
			).map((c) => c.join(","));
			expect(cells).toContain(lined?.join(","));
		});

		// The remaining chapters' audit's 5.28 (WIG Ch.5 "Command Method",
		// pp.59-61): the desktop's Cut, Copy, Paste and Paste Shortcut, on the
		// selected Desktop Folder items and into the Desktop Folder.
		describe("Cut, Copy and Paste", () => {
			const edit = (title: string) =>
				child(commands.barMenu?.[1].menuChildren, title);
			const whiteSpace = (title: string, at: [number, number]) =>
				child(commands.whiteSpaceMenu?.(at), title);
			const iconOf = (path: string) =>
				desktop().icons.find(
					(i) => i.appId === `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`,
				);

			it("copies the selection, and pastes it as Copy of, at the next free cell, selected, again and again", () => {
				useWindowsLayout();
				render(<Harness />);
				const a = seedItem("a.txt");
				select([a]);
				act(() => edit("Copy")?.onClickFunc?.());
				expect(getClassicyFileClipboard()).toMatchObject({
					op: "copy",
					paths: [`${DESKTOP_FOLDER}:a.txt`],
				});
				// The bar's Paste follows the clipboard.
				expect(edit("Paste")?.disabled).toBe(false);
				expect(edit("Paste Shortcut")?.disabled).toBe(false);
				const freeCell = classicyDesktopFreeIconLocation(
					useAppManager.getState().System.Manager.Appearance.activeTheme,
					desktop().icons,
				);
				act(() => edit("Paste")?.onClickFunc?.());
				const copy = `${DESKTOP_FOLDER}:Copy of a.txt`;
				expect(new ClassicyFileSystem().resolve(copy)?._data).toBe("x");
				expect(iconOf(copy)?.location).toEqual(freeCell);
				expect(desktop().selectedIcons).toEqual([
					`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${copy}`,
				]);
				// A Copy stays on the clipboard: Paste again.
				act(() => edit("Paste")?.onClickFunc?.());
				expect(
					new ClassicyFileSystem().resolve(
						`${DESKTOP_FOLDER}:Copy (2) of a.txt`,
					),
				).toBeDefined();
				expect(getClassicyFileClipboard()?.op).toBe("copy");
			});

			it("pastes a Cut at the white space's point, moving it out of its folder and emptying the clipboard", () => {
				useWindowsLayout();
				render(<Harness />);
				const fs = new ClassicyFileSystem();
				fs.writeFile("Macintosh HD:Plan.txt", "plan");
				setClassicyFileClipboard("cut", ["Macintosh HD:Plan.txt"]);
				act(() => whiteSpace("Paste", [140, 90])?.onClickFunc?.());
				const moved = `${DESKTOP_FOLDER}:Plan.txt`;
				expect(fs.resolve("Macintosh HD:Plan.txt")).toBeUndefined();
				expect(fs.resolve(moved)?._data).toBe("plan");
				expect(iconOf(moved)?.location).toEqual([140, 90]);
				expect(desktop().selectedIcons).toEqual([
					`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${moved}`,
				]);
				expect(getClassicyFileClipboard()).toBeNull();
				// Nothing left to paste: both dim.
				expect(whiteSpace("Paste", [0, 0])?.disabled).toBe(true);
				expect(whiteSpace("Paste Shortcut", [0, 0])?.disabled).toBe(true);
			});

			it("dims Paste Shortcut after a Cut, and makes shortcuts after a Copy", () => {
				useWindowsLayout();
				render(<Harness />);
				const fs = new ClassicyFileSystem();
				fs.writeFile("Macintosh HD:Plan.txt", "plan");
				setClassicyFileClipboard("cut", ["Macintosh HD:Plan.txt"]);
				expect(whiteSpace("Paste", [0, 0])?.disabled).toBe(false);
				expect(whiteSpace("Paste Shortcut", [0, 0])?.disabled).toBe(true);
				setClassicyFileClipboard("copy", ["Macintosh HD:Plan.txt"]);
				act(() => whiteSpace("Paste Shortcut", [60, 70])?.onClickFunc?.());
				const shortcut = `${DESKTOP_FOLDER}:Shortcut to Plan.txt`;
				expect(fs.resolve(shortcut)).toMatchObject({
					_type: "file_shortcut",
					_targetPath: "Macintosh HD:Plan.txt",
				});
				expect(iconOf(shortcut)?.location).toEqual([60, 70]);
				expect(desktop().selectedIcons).toEqual([
					`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${shortcut}`,
				]);
				// The original stays, and so does the clipboard.
				expect(fs.resolve("Macintosh HD:Plan.txt")).toBeDefined();
				expect(getClassicyFileClipboard()?.op).toBe("copy");
			});

			it("cuts only Desktop Folder items, never a drive or the Trash", () => {
				useWindowsLayout();
				render(<Harness />);
				const a = seedItem("a.txt");
				act(() =>
					dispatch({
						type: "ClassicyDesktopIconAdd",
						app: { id: "Trash", name: "Trash", icon: "" },
						kind: "trash",
						filePath: "Trash",
						noLaunch: true,
					}),
				);
				select(["Trash"]);
				act(() => edit("Cut")?.onClickFunc?.());
				expect(getClassicyFileClipboard()).toBeNull();
				select([a, "Trash"]);
				act(() => edit("Cut")?.onClickFunc?.());
				expect(getClassicyFileClipboard()).toEqual({
					op: "cut",
					paths: [`${DESKTOP_FOLDER}:a.txt`],
					storageKey: "classicyStorage",
				});
			});

			it("takes Ctrl+X, Ctrl+C and Ctrl+V on the desktop and its icons, never in a field or a window", () => {
				useWindowsLayout();
				const root = document.createElement("div");
				root.id = "classicyDesktop";
				const icon = document.createElement("div");
				icon.className = "classicyDesktopIcon";
				const field = document.createElement("input");
				const win = document.createElement("div");
				win.className = "classicyWindow";
				const inWindow = document.createElement("div");
				inWindow.className = "classicyDesktopIcon";
				win.append(inWindow);
				root.append(icon, field, win);
				document.body.append(root);
				try {
					render(<Harness />);
					const a = seedItem("a.txt");
					select([a]);
					const key = (target: Element, letter: string) => {
						const event = new KeyboardEvent("keydown", {
							key: letter,
							code: `Key${letter.toUpperCase()}`,
							ctrlKey: true,
							bubbles: true,
							cancelable: true,
						});
						act(() => {
							target.dispatchEvent(event);
						});
						return event.defaultPrevented;
					};
					expect(key(field, "c")).toBe(false);
					expect(key(inWindow, "c")).toBe(false);
					expect(getClassicyFileClipboard()).toBeNull();
					expect(key(icon, "c")).toBe(true);
					expect(getClassicyFileClipboard()?.op).toBe("copy");
					expect(key(root, "x")).toBe(true);
					expect(getClassicyFileClipboard()?.op).toBe("cut");
					setClassicyFileClipboard("copy", [`${DESKTOP_FOLDER}:a.txt`]);
					expect(key(root, "v")).toBe(true);
					expect(
						new ClassicyFileSystem().resolve(`${DESKTOP_FOLDER}:Copy of a.txt`),
					).toBeDefined();
				} finally {
					root.remove();
				}
			});

			it("takes no key without Explorer's commands", () => {
				const root = document.createElement("div");
				root.id = "classicyDesktop";
				document.body.append(root);
				try {
					render(<Harness />);
					const a = seedItem("a.txt");
					select([a]);
					const event = new KeyboardEvent("keydown", {
						key: "c",
						ctrlKey: true,
						bubbles: true,
						cancelable: true,
					});
					act(() => {
						root.dispatchEvent(event);
					});
					expect(event.defaultPrevented).toBe(false);
					expect(getClassicyFileClipboard()).toBeNull();
				} finally {
					root.remove();
				}
			});
		});
	});
});

import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode, RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { FinderData } from "@/SystemFolder/Finder/FinderContext";
import type { ClassicyFileBrowserCommands } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import {
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import system7 from "../../../packages/appearance/system7/src/system7.json";
import windows98 from "../../../packages/appearance/windows98/src/windows98.json";

// Captures the `appMenu` each window is handed, keyed by window id. Mocking
// ClassicyWindow (rather than ClassicyFileBrowser, as Finder.folderView does)
// is what makes the menu bar itself observable: appMenu never reaches the DOM
// from here, it is handed to the window shell.
const capturedMenuByWindow: Record<string, ClassicyMenuItem[] | undefined> = {};

// The ref Finder hands each folder window's browser. Captured so the Edit menu
// can be driven end to end: the menu item closes over this ref, so a Finder
// that stopped passing it would leave the item wired to a handle nothing ever
// fills — the exact silent failure this file exists to catch.
const capturedSelectionRefByPath: Record<
	string,
	RefObject<ClassicyTableSelectionApi | null> | undefined
> = {};

// #270: the window's initialFocusRef and the browser's focusTargetRef must be
// the SAME ref object, or the window focuses a handle the list never fills.
const capturedInitialFocusRefByWindow: Record<
	string,
	RefObject<HTMLElement | null> | undefined
> = {};
const capturedFocusTargetRefByPath: Record<
	string,
	RefObject<HTMLDivElement | null> | undefined
> = {};

// The browser's commands handle and its white space's menu (Explorer's
// commands, `layout.finder.commands` "windows").
const capturedCommandsRefByPath: Record<
	string,
	RefObject<ClassicyFileBrowserCommands | null> | undefined
> = {};
const capturedBackgroundMenuByPath: Record<
	string,
	((at: [number, number]) => ClassicyMenuItem[] | undefined) | undefined
> = {};
// The browser's Ctrl+X, Ctrl+C and Ctrl+V handler (Explorer's commands).
const capturedClipboardCommandByPath: Record<
	string,
	((command: "cut" | "copy" | "paste", paths: string[]) => void) | undefined
> = {};

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		id,
		appMenu,
		initialFocusRef,
		children,
	}: {
		id: string;
		appMenu?: ClassicyMenuItem[];
		initialFocusRef?: RefObject<HTMLElement | null>;
		children?: ReactNode;
	}) => {
		capturedMenuByWindow[id] = appMenu;
		capturedInitialFocusRefByWindow[id] = initialFocusRef;
		return <div data-testid={`classicy-window-${id}`}>{children}</div>;
	},
}));

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({
		path,
		selectionApiRef,
		focusTargetRef,
		commandsRef,
		backgroundContextMenu,
		onClipboardCommand,
	}: {
		path: string;
		selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
		focusTargetRef?: RefObject<HTMLDivElement | null>;
		commandsRef?: RefObject<ClassicyFileBrowserCommands | null>;
		backgroundContextMenu?: (
			at: [number, number],
		) => ClassicyMenuItem[] | undefined;
		onClipboardCommand?: (
			command: "cut" | "copy" | "paste",
			paths: string[],
		) => void;
	}) => {
		capturedSelectionRefByPath[path] = selectionApiRef;
		capturedFocusTargetRefByPath[path] = focusTargetRef;
		capturedCommandsRefByPath[path] = commandsRef;
		capturedBackgroundMenuByPath[path] = backgroundContextMenu;
		capturedClipboardCommandByPath[path] = onClipboardCommand;
		return <div data-testid={`classicy-file-browser-${path}`} />;
	},
}));

// Stubbed so this file stays about the menu bar: the real Preferences window
// pulls in the whole Views tab, and one of these tests opens it.
vi.mock("@/SystemFolder/Finder/FinderPreferences", () => ({
	FinderPreferences: () => <div data-testid={"finder-preferences"} />,
}));

import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";
import { Finder } from "./Finder";

const DOCUMENTS_PATH = "Macintosh HD:Documents";

const finderData = (): FinderData =>
	(useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
		?.data ?? {}) as FinderData;

const folderMenu = (): ClassicyMenuItem[] =>
	capturedMenuByWindow[DOCUMENTS_PATH] ?? [];

const menuNamed = (title: string): ClassicyMenuItem | undefined =>
	folderMenu().find((m) => m.title === title);

const editItem = (title: string): ClassicyMenuItem | undefined =>
	menuNamed("Edit")?.menuChildren?.find((m) => m.title === title);

afterEach(() => {
	cleanup();
	for (const key of Object.keys(capturedMenuByWindow)) {
		delete capturedMenuByWindow[key];
	}
	for (const key of Object.keys(capturedSelectionRefByPath)) {
		delete capturedSelectionRefByPath[key];
	}
	for (const key of Object.keys(capturedInitialFocusRefByWindow)) {
		delete capturedInitialFocusRefByWindow[key];
	}
	for (const key of Object.keys(capturedFocusTargetRefByPath)) {
		delete capturedFocusTargetRefByPath[key];
	}
	for (const key of Object.keys(capturedClipboardCommandByPath)) {
		delete capturedClipboardCommandByPath[key];
	}
	clearClassicyFileClipboard();
	dispatch({ type: "ClassicyAppFinderPreferencesClose" });
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS_PATH });
});

const openDocuments = async () => {
	dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS_PATH });
	render(<Finder />);
	await waitFor(() => {
		expect(capturedMenuByWindow[DOCUMENTS_PATH]).toBeDefined();
	});
};

describe("Finder folder-window menu bar", () => {
	it("puts an Edit menu between File and View", async () => {
		await openDocuments();
		expect(folderMenu().map((m) => m.title)).toEqual([
			"File",
			"Edit",
			"View",
			"Special",
			"Help",
		]);
	});

	it("gives the Edit menu Select All and Preferences…", async () => {
		await openDocuments();
		expect(
			menuNamed("Edit")
				?.menuChildren?.map((m) => m.title)
				.filter((t): t is string => typeof t === "string"),
		).toEqual(["Select All", "Preferences…"]);
		expect(editItem("Select All")?.keyboardShortcut).toBe("⌘A");
	});

	it("opens the Preferences window from Edit → Preferences…", async () => {
		await openDocuments();
		expect(finderData().showPreferences).not.toBe(true);

		act(() => {
			editItem("Preferences…")?.onClickFunc?.();
		});

		expect(finderData().showPreferences).toBe(true);
	});

	it("drives the folder's own selection handle from Edit → Select All", async () => {
		await openDocuments();
		const selectionRef = capturedSelectionRefByPath[DOCUMENTS_PATH];
		// Finder must have handed the browser a ref at all; the assertion below
		// would pass on a menu item wired to an unrelated ref without this.
		expect(selectionRef).toBeDefined();

		const selectAll = vi.fn();
		act(() => {
			if (selectionRef) selectionRef.current = { selectAll };
		});

		act(() => {
			editItem("Select All")?.onClickFunc?.();
		});

		expect(selectAll).toHaveBeenCalledTimes(1);
	});

	// The icon view keeps one selection too (ClassicyFileBrowserViewIcons),
	// so Select All acts in either view, as Mac OS 8's Finder's did.
	it("keeps Select All live in both views", async () => {
		await openDocuments();
		// No stored entry: the window opens in list, so the command is live.
		expect(editItem("Select All")?.disabled).toBeFalsy();

		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "icons",
			});
		});
		await waitFor(() => {
			expect(
				menuNamed("View")?.menuChildren?.find(
					(m) => m.title === "View as Icons",
				)?.checked,
			).toBe(true);
		});
		expect(editItem("Select All")?.disabled).toBeFalsy();
	});

	// Plan 0020-w98 §4: the toggle is an event item, so the screen bar's
	// Help merge knows it for the system's own Show/Hide Balloons and drops
	// it. Its id and title are unchanged, so a window bar draws it as before.
	it("makes Help's balloon toggle an event item that flips the flag", async () => {
		await openDocuments();
		const balloon = () =>
			menuNamed("Help")?.menuChildren?.find((m) =>
				m.id.endsWith("_help_balloon"),
			);
		expect(balloon()).toEqual({
			id: `Finder.app_${DOCUMENTS_PATH}_help_balloon`,
			title: "Hide Balloon Help",
			event: "ClassicyDesktopSetBalloonHelp",
			eventData: { disableBalloonHelp: true },
		});
		// About follows it, as before.
		expect(menuNamed("Help")?.menuChildren?.map((m) => m.id)).toEqual([
			`Finder.app_${DOCUMENTS_PATH}_help_balloon`,
			"Finder.app_about",
		]);

		act(() => {
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: true,
			});
		});
		await waitFor(() => {
			expect(balloon()?.title).toBe("Show Balloon Help");
		});
		expect(balloon()?.eventData).toEqual({ disableBalloonHelp: false });
		act(() => {
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: false,
			});
		});
	});
});

describe("Finder folder-window keyboard focus (#270)", () => {
	it("hands the window and the browser the same focus-target ref", async () => {
		await openDocuments();
		const initialFocusRef = capturedInitialFocusRefByWindow[DOCUMENTS_PATH];
		const focusTargetRef = capturedFocusTargetRefByPath[DOCUMENTS_PATH];

		expect(initialFocusRef).toBeDefined();
		expect(focusTargetRef).toBe(initialFocusRef);
	});
});

// The remaining chapters' audit's 4.12 (WIG Appendix B Table B.5, p.360):
// under a package with access keys the folder window's menus carry Windows
// 98's letters (File F, Close C, Edit E, Select All A, View V, Help H,
// About A; Special S, its first letter); under Platinum, none.
describe("Finder folder-window menus' access keys", () => {
	const keysOf = () =>
		folderMenu().map((menu) => [
			menu.title,
			menu.accessKey,
			(menu.menuChildren ?? [])
				.filter((item) => item.id !== "spacer")
				.map((item) => [item.title, item.accessKey]),
		]);

	it("gives the bundled letters under the Windows layout", async () => {
		const restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		try {
			await openDocuments();
			const [file, edit, view, special, help] = keysOf();
			expect(file.slice(0, 2)).toEqual(["File", "f"]);
			// Explorer's File menu (the test package's `finder.commands`
			// "windows"; shell32.dll's letters).
			expect(file[2]).toEqual([
				["Open", "o"],
				["New", "w"],
				["Create Shortcut", "S"],
				["Delete", "D"],
				["Rename", "m"],
				["Properties", "r"],
				["Close", "c"],
			]);
			expect(edit.slice(0, 2)).toEqual(["Edit", "e"]);
			expect(edit[2]).toContainEqual(["Select All", "a"]);
			expect(view.slice(0, 2)).toEqual(["View", "v"]);
			expect(view[2]).toEqual([
				["Large Icons", "g"],
				["Details", "D"],
				["Arrange Icons", "I"],
				["Line Up Icons", "U"],
			]);
			expect(special.slice(0, 2)).toEqual(["Special", "s"]);
			expect(help.slice(0, 2)).toEqual(["Help", "h"]);
			expect(help[2]).toContainEqual([expect.stringMatching(/^About/), "a"]);
		} finally {
			restore();
		}
	});

	it("gives none by default (Platinum)", async () => {
		await openDocuments();
		expect(JSON.stringify(folderMenu())).not.toContain("accessKey");
		for (const [, key, items] of keysOf()) {
			expect(key).toBeUndefined();
			for (const [, itemKey] of items as [string, string | undefined][])
				expect(itemKey).toBeUndefined();
		}
	});
});

// The user's own shortcuts (the remaining chapters' audit's 4.15; WIG Ch.4
// "Shortcut Keys", p.27): under `layout.keyboard.editableShortcuts` a folder
// window's items carry the chord stored for their shortcut id, shared with
// the desktop's; without the key a stored one is ignored.
describe("Finder folder-window menus' editable shortcuts (layout.keyboard.editableShortcuts)", () => {
	const fileItem = (title: string) =>
		menuNamed("File")?.menuChildren?.find((m) => m.title === title);
	const setOverrides = (overrides: Record<string, string> | undefined) =>
		act(() => {
			useAppManager.setState((state) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Desktop: {
							...state.System.Manager.Desktop,
							shortcutOverrides: overrides,
						},
					},
				},
			}));
		});
	afterEach(() => setOverrides(undefined));

	it("carries the stored chords under the key, and follows a change", async () => {
		const restore = activateTestWindowsKeysPackage({
			keyboard: { contextMenuKey: true, editableShortcuts: true },
		});
		try {
			act(() => {
				dispatch({
					type: "ClassicyDesktopSetShortcutOverride",
					itemId: "finder_edit_select_all",
					shortcut: "⌃⌘A",
				});
			});
			await openDocuments();
			expect(editItem("Select All")?.keyboardShortcut).toBe("⌃⌘A");
			expect(fileItem("Open")?.keyboardShortcut).toBe("⌘O");
			act(() => {
				dispatch({
					type: "ClassicyDesktopSetShortcutOverride",
					itemId: "finder_file_open",
					shortcut: "⌘K",
				});
			});
			await waitFor(() =>
				expect(fileItem("Open")?.keyboardShortcut).toBe("⌘K"),
			);
			act(() => {
				dispatch({ type: "ClassicyDesktopResetShortcutOverrides" });
			});
			await waitFor(() =>
				expect(editItem("Select All")?.keyboardShortcut).toBe("⌘A"),
			);
		} finally {
			restore();
		}
	});

	it("ignores a stored chord without the key (Platinum)", async () => {
		setOverrides({ finder_edit_select_all: "control+command+a" });
		await openDocuments();
		expect(editItem("Select All")?.keyboardShortcut).toBe("⌘A");
	});
});

// The remaining chapters' audit's 1.21, 5.23, 5.39, 5.40, 10.3 and A.4
// (WIG Ch.1 "Understanding Users", p.8; Ch.5 pp.45, 61, 67, 69; App. A
// Table A.1 note 3, p.350): under Explorer's commands
// (`layout.finder.commands` "windows") a folder window's File menu is
// Windows 98 SE Explorer's (shell32.dll): Open ⌃O, New ▸, Create Shortcut
// (10.6), Delete (Del), Rename, Close; its View menu the views, Arrange Icons ▸ and Line Up Icons;
// its white space the same, with New. Platinum's and System 7's are as
// they were.
describe("Finder folder-window menus under Explorer's commands", () => {
	const titlesOf = (items: ClassicyMenuItem[] | undefined) =>
		(items ?? []).map((item) => (item.id === "spacer" ? "—" : item.title));
	const fileItems = () => menuNamed("File")?.menuChildren;
	const fileItem = (title: string) =>
		fileItems()?.find((item) => item.title === title);
	const fakeCommands = (selected: string[]) => {
		const commands = {
			selectedPaths: () => selected,
			select: vi.fn(),
			rename: vi.fn(),
			place: vi.fn(),
			arrange: vi.fn(),
			lineUp: vi.fn(),
			display: () => "list" as const,
		};
		const ref = capturedCommandsRefByPath[DOCUMENTS_PATH];
		if (ref) ref.current = commands;
		return commands;
	};

	it("gives Explorer's File and View menus and the white space's", async () => {
		const restore = activateTestWindowsKeysPackage();
		try {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "list",
			});
			await openDocuments();
			expect(titlesOf(fileItems())).toEqual([
				"Open",
				"—",
				"New",
				"—",
				"Create Shortcut",
				"Delete",
				"Rename",
				"Properties",
				"—",
				"Close",
			]);
			expect(fileItem("Open")?.keyboardShortcut).toBe("⌘O");
			expect(fileItem("Delete")).toMatchObject({
				keyboardShortcut: "⌦",
				nativeShortcut: true,
			});
			expect(titlesOf(fileItem("New")?.menuChildren)).toContain("Folder");
			const view = menuNamed("View")?.menuChildren;
			expect(titlesOf(view)).toEqual([
				"Large Icons",
				"Details",
				"—",
				"Arrange Icons",
				"Line Up Icons",
			]);
			// The list view (a folder opens in it): its shown columns' orders,
			// and no Line Up Icons.
			expect(
				titlesOf(view?.find((i) => i.title === "Arrange Icons")?.menuChildren),
			).toEqual(["by Name", "by Type", "by Size", "by Date"]);
			expect(view?.find((i) => i.title === "Line Up Icons")?.disabled).toBe(
				true,
			);
			expect(
				titlesOf(capturedBackgroundMenuByPath[DOCUMENTS_PATH]?.([1, 2])),
			).toEqual([
				"View",
				"—",
				"Arrange Icons",
				"Line Up Icons",
				"—",
				"Paste",
				"Paste Shortcut",
				"—",
				"New",
				"—",
				"Properties",
			]);
			// Explorer's Edit menu (5.28): Cut, Copy, Paste and Paste Shortcut
			// before Select All, the transfer keys native (the browser takes
			// them), Paste dimmed with nothing to paste.
			expect(titlesOf(menuNamed("Edit")?.menuChildren)).toEqual([
				"Cut",
				"Copy",
				"Paste",
				"Paste Shortcut",
				"—",
				"Select All",
				"—",
				"Preferences…",
			]);
			for (const [title, shortcut] of [
				["Cut", "⌘X"],
				["Copy", "⌘C"],
				["Paste", "⌘V"],
			])
				expect(editItem(title)).toMatchObject({
					keyboardShortcut: shortcut,
					nativeShortcut: true,
				});
			expect(editItem("Paste")?.disabled).toBe(true);
			expect(editItem("Paste Shortcut")?.disabled).toBe(true);
			expect(capturedClipboardCommandByPath[DOCUMENTS_PATH]).toBeDefined();
		} finally {
			restore();
		}
	});

	// C9 (the remaining chapters' audit's 5.44): under Windows 98's own
	// layout a folder window's File runs from Open to Properties and Close,
	// and its Edit carries the file commands.
	it("gives a folder window Explorer's File and Edit under Windows 98's layout", async () => {
		const restore = activateTestWindowsKeysPackage(
			windows98.layout as unknown as Partial<ClassicyAppearanceLayout>,
		);
		try {
			await openDocuments();
			const file = titlesOf(fileItems());
			expect(file[0]).toBe("Open");
			expect(file.slice(-3)).toEqual(["Properties", "—", "Close"]);
			expect(titlesOf(menuNamed("Edit")?.menuChildren).slice(0, 4)).toEqual([
				"Cut",
				"Copy",
				"Paste",
				"Paste Shortcut",
			]);
		} finally {
			restore();
		}
	});

	// Shell addendum B1: drawn in its window bar under Windows 98's layout
	// (a taskbar), a folder window's File ends with a divider and Close and
	// no Special menu is drawn; Empty Recycle Bin stays on the Trash's own
	// menu and Empty Trash and Reset PRAM in the Start menu.
	it("draws a folder window's bar under Windows 98's layout with File ending in Close and no Special", async () => {
		const restore = activateTestWindowsKeysPackage(
			windows98.layout as unknown as Partial<ClassicyAppearanceLayout>,
		);
		try {
			await openDocuments();
			render(
				<ClassicyWindowMenuBar
					appId="Finder.app"
					windowId={DOCUMENTS_PATH}
					menuItems={folderMenu()}
				/>,
			);
			const bar = document.querySelector(".classicyWindowMenuBar");
			const barTitles = Array.from(
				bar?.querySelectorAll(":scope > .classicyMenuWrapper > ul > li") ?? [],
			).map((li) => li.querySelector(":scope > p")?.textContent);
			expect(barTitles).toEqual(["File", "Edit", "View", "Help"]);
			const fileId = menuNamed("File")?.id as string;
			const rows = Array.from(
				document.querySelectorAll(
					`[id="${fileId}"] > .classicyMenuWrapper > ul > *`,
				),
			).map((row) =>
				row.tagName === "HR"
					? "—"
					: (row.querySelector(":scope > p")?.textContent ?? "").trim(),
			);
			expect(rows.slice(-2)).toEqual(["—", "Close"]);
		} finally {
			restore();
		}
	});

	it("runs Open, Rename, Arrange Icons and New on the window's browser", async () => {
		const restore = activateTestWindowsKeysPackage();
		const { ClassicyFileSystem } = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
		);
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS_PATH}:Projects`);
		try {
			await openDocuments();
			const commands = fakeCommands([`${DOCUMENTS_PATH}:Projects`]);
			act(() => fileItem("Open")?.onClickFunc?.());
			expect(finderData().openPaths).toContain(`${DOCUMENTS_PATH}:Projects`);
			act(() => fileItem("Rename")?.onClickFunc?.());
			expect(commands.rename).toHaveBeenCalledWith(
				`${DOCUMENTS_PATH}:Projects`,
			);
			const arrange = menuNamed("View")?.menuChildren?.find(
				(i) => i.title === "Arrange Icons",
			);
			act(() =>
				arrange?.menuChildren
					?.find((i) => i.title === "by Size")
					?.onClickFunc?.(),
			);
			expect(commands.arrange).toHaveBeenCalledWith("size");
			const newMenu = capturedBackgroundMenuByPath[DOCUMENTS_PATH]?.([
				30, 40,
			])?.find((i) => i.title === "New");
			act(() =>
				newMenu?.menuChildren
					?.find((i) => i.title === "Folder")
					?.onClickFunc?.(),
			);
			const made = `${DOCUMENTS_PATH}:New Folder`;
			expect(commands.place).toHaveBeenCalledWith(made, [30, 40]);
			expect(commands.select).toHaveBeenCalledWith([made]);
			expect(commands.rename).toHaveBeenLastCalledWith(made);
			expect(fs.resolve(made)?._type).toBe("directory");
			fs.rmDir(made);
		} finally {
			fs.rmDir(`${DOCUMENTS_PATH}:Projects`);
			dispatch({
				type: "ClassicyAppFinderCloseFolder",
				path: `${DOCUMENTS_PATH}:Projects`,
			});
			restore();
		}
	});

	// The remaining chapters' audit's 10.6: File ▸ Create Shortcut makes
	// "Shortcut to <name>" beside each selected item, in the first free cell
	// of the window's view and selected there.
	it("runs Create Shortcut on the window's browser", async () => {
		const restore = activateTestWindowsKeysPackage();
		const { ClassicyFileSystem } = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
		);
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS_PATH}:Plan.txt`, "a");
		const made = `${DOCUMENTS_PATH}:Shortcut to Plan.txt`;
		try {
			await openDocuments();
			const commands = fakeCommands([`${DOCUMENTS_PATH}:Plan.txt`]);
			expect(fileItem("Create Shortcut")?.accessKey).toBeUndefined();
			act(() => fileItem("Create Shortcut")?.onClickFunc?.());
			expect(commands.place).toHaveBeenCalledWith(made);
			expect(commands.select).toHaveBeenCalledWith([made]);
			expect(commands.rename).not.toHaveBeenCalled();
			expect(fs.resolve(made)).toMatchObject({
				_type: "file_shortcut",
				_targetPath: `${DOCUMENTS_PATH}:Plan.txt`,
			});
		} finally {
			fs.rmDir(made);
			fs.rmDir(`${DOCUMENTS_PATH}:Plan.txt`);
			restore();
		}
	});

	it("keeps Platinum's File and View menus, with no white-space menu", async () => {
		await openDocuments();
		expect(titlesOf(fileItems())).toEqual([
			"Close Window",
			"Close All Windows",
			"—",
			"Move To Trash",
		]);
		expect(titlesOf(menuNamed("View")?.menuChildren)).toEqual([
			"View as Icons",
			"View as List",
		]);
		expect(capturedBackgroundMenuByPath[DOCUMENTS_PATH]).toBeUndefined();
		// No Cut, Copy or Paste of files, and no keys for them (5.28).
		expect(titlesOf(menuNamed("Edit")?.menuChildren)).toEqual([
			"Select All",
			"—",
			"Preferences…",
		]);
		expect(capturedClipboardCommandByPath[DOCUMENTS_PATH]).toBeUndefined();
	});

	it("keeps System 7's too", async () => {
		const restore = activateTestWindowsKeysPackage({
			...(system7.layout as unknown as Partial<ClassicyAppearanceLayout>),
			finder: undefined,
			menu: undefined,
			keyboard: undefined,
		});
		try {
			await openDocuments();
			expect(titlesOf(fileItems())).toEqual([
				"Close Window",
				"Close All Windows",
				"—",
				"Move To Trash",
			]);
			expect(titlesOf(menuNamed("View")?.menuChildren)).toEqual([
				"View as Icons",
				"View as List",
			]);
			expect(capturedBackgroundMenuByPath[DOCUMENTS_PATH]).toBeUndefined();
			expect(titlesOf(menuNamed("Edit")?.menuChildren)).toEqual([
				"Select All",
				"—",
				"Preferences…",
			]);
			expect(capturedClipboardCommandByPath[DOCUMENTS_PATH]).toBeUndefined();
		} finally {
			restore();
		}
	});

	// The remaining chapters' audit's 5.28 (WIG Ch.5 "Command Method",
	// pp.59-61; "Command Method Transfers", p.66): Explorer's Cut, Copy,
	// Paste and Paste Shortcut in the folder window, on its browser's
	// selection and into its folder.
	describe("Cut, Copy and Paste", () => {
		const paste = (title: "Paste" | "Paste Shortcut", at: [number, number]) =>
			capturedBackgroundMenuByPath[DOCUMENTS_PATH]?.(at)?.find(
				(i) => i.title === title,
			);

		it("copies the selection and pastes Copy of into the folder, placed at the menu's point and selected, again and again", async () => {
			const restore = activateTestWindowsKeysPackage();
			const { ClassicyFileSystem } = await import(
				"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
			);
			const fs = new ClassicyFileSystem();
			fs.writeFile(`${DOCUMENTS_PATH}:Plan.txt`, "a");
			try {
				await openDocuments();
				const commands = fakeCommands([`${DOCUMENTS_PATH}:Plan.txt`]);
				act(() => editItem("Copy")?.onClickFunc?.());
				expect(getClassicyFileClipboard()).toMatchObject({
					op: "copy",
					paths: [`${DOCUMENTS_PATH}:Plan.txt`],
				});
				// The menus follow the clipboard.
				await waitFor(() => expect(editItem("Paste")?.disabled).toBe(false));
				expect(paste("Paste Shortcut", [0, 0])?.disabled).toBe(false);
				act(() => paste("Paste", [30, 40])?.onClickFunc?.());
				const copy = `${DOCUMENTS_PATH}:Copy of Plan.txt`;
				expect(fs.resolve(copy)?._data).toBe("a");
				expect(commands.place).toHaveBeenCalledWith(copy, [30, 40]);
				expect(commands.select).toHaveBeenCalledWith([copy]);
				// A Copy stays on the clipboard: Paste again, from the bar.
				act(() => editItem("Paste")?.onClickFunc?.());
				expect(
					fs.resolve(`${DOCUMENTS_PATH}:Copy (2) of Plan.txt`),
				).toBeDefined();
				expect(fs.resolve(`${DOCUMENTS_PATH}:Plan.txt`)).toBeDefined();
			} finally {
				for (const name of [
					"Plan.txt",
					"Copy of Plan.txt",
					"Copy (2) of Plan.txt",
				])
					fs.rmDir(`${DOCUMENTS_PATH}:${name}`);
				restore();
			}
		});

		it("cuts an item, pastes it into the folder, moving it and emptying the clipboard", async () => {
			const restore = activateTestWindowsKeysPackage();
			const { ClassicyFileSystem } = await import(
				"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
			);
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Loose.txt", "l");
			try {
				await openDocuments();
				const commands = fakeCommands(["Macintosh HD:Loose.txt"]);
				act(() => editItem("Cut")?.onClickFunc?.());
				expect(getClassicyFileClipboard()?.op).toBe("cut");
				// Paste Shortcut follows a Copy only.
				await waitFor(() => expect(editItem("Paste")?.disabled).toBe(false));
				expect(editItem("Paste Shortcut")?.disabled).toBe(true);
				act(() => paste("Paste", [5, 6])?.onClickFunc?.());
				const moved = `${DOCUMENTS_PATH}:Loose.txt`;
				expect(fs.resolve("Macintosh HD:Loose.txt")).toBeUndefined();
				expect(fs.resolve(moved)?._data).toBe("l");
				expect(commands.place).toHaveBeenCalledWith(moved, [5, 6]);
				expect(commands.select).toHaveBeenCalledWith([moved]);
				expect(getClassicyFileClipboard()).toBeNull();
			} finally {
				fs.rmDir(`${DOCUMENTS_PATH}:Loose.txt`);
				fs.rmDir("Macintosh HD:Loose.txt");
				restore();
			}
		});

		it("makes a shortcut to each copied item with Paste Shortcut", async () => {
			const restore = activateTestWindowsKeysPackage();
			const { ClassicyFileSystem } = await import(
				"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
			);
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Target.txt", "t");
			const shortcut = `${DOCUMENTS_PATH}:Shortcut to Target.txt`;
			try {
				await openDocuments();
				const commands = fakeCommands(["Macintosh HD:Target.txt"]);
				act(() => editItem("Copy")?.onClickFunc?.());
				act(() => paste("Paste Shortcut", [7, 8])?.onClickFunc?.());
				expect(fs.resolve(shortcut)).toMatchObject({
					_type: "file_shortcut",
					_targetPath: "Macintosh HD:Target.txt",
				});
				expect(commands.place).toHaveBeenCalledWith(shortcut, [7, 8]);
				expect(commands.select).toHaveBeenCalledWith([shortcut]);
				expect(getClassicyFileClipboard()?.op).toBe("copy");
			} finally {
				fs.rmDir(shortcut);
				fs.rmDir("Macintosh HD:Target.txt");
				restore();
			}
		});

		it("runs Ctrl+X, Ctrl+C and Ctrl+V from the browser on its selection and folder", async () => {
			const restore = activateTestWindowsKeysPackage();
			const { ClassicyFileSystem } = await import(
				"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
			);
			const fs = new ClassicyFileSystem();
			fs.writeFile(`${DOCUMENTS_PATH}:Keys.txt`, "k");
			try {
				await openDocuments();
				const commands = fakeCommands([]);
				const onKey = capturedClipboardCommandByPath[DOCUMENTS_PATH];
				act(() => onKey?.("cut", [`${DOCUMENTS_PATH}:Keys.txt`]));
				expect(getClassicyFileClipboard()?.op).toBe("cut");
				act(() => onKey?.("copy", [`${DOCUMENTS_PATH}:Keys.txt`]));
				expect(getClassicyFileClipboard()?.op).toBe("copy");
				act(() => onKey?.("paste", []));
				expect(fs.resolve(`${DOCUMENTS_PATH}:Copy of Keys.txt`)).toBeDefined();
				expect(commands.select).toHaveBeenCalledWith([
					`${DOCUMENTS_PATH}:Copy of Keys.txt`,
				]);
			} finally {
				fs.rmDir(`${DOCUMENTS_PATH}:Keys.txt`);
				fs.rmDir(`${DOCUMENTS_PATH}:Copy of Keys.txt`);
				restore();
			}
		});

		it("opens the folder's own sheet from the white space's Properties", async () => {
			const restore = activateTestWindowsKeysPackage();
			try {
				await openDocuments();
				const properties = capturedBackgroundMenuByPath[DOCUMENTS_PATH]?.([
					0, 0,
				])?.at(-1);
				expect(properties?.title).toBe("Properties");
				act(() => properties?.onClickFunc?.());
				expect((finderData() as { properties?: unknown }).properties).toEqual([
					{ key: DOCUMENTS_PATH, paths: [DOCUMENTS_PATH] },
				]);
			} finally {
				dispatch({
					type: "ClassicyAppFinderPropertiesClose",
					key: DOCUMENTS_PATH,
				});
				restore();
			}
		});
	});
});

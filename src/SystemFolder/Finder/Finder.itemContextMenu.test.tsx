import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { CLASSICY_DESKTOP_ITEM_ICON_PREFIX } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The item menu each open folder window's ClassicyFileBrowser receives, by
// the window's path: the menu a right-click on one of its items shows.
const itemMenus: Record<
	string,
	(path: string, selected: string[]) => ClassicyMenuItem[] | undefined
> = {};

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({
		path,
		itemContextMenu,
	}: {
		path: string;
		itemContextMenu: (
			path: string,
			selected: string[],
		) => ClassicyMenuItem[] | undefined;
	}) => {
		itemMenus[path] = itemContextMenu;
		return null;
	},
}));

import { Finder } from "./Finder";

const DOCUMENTS = "Macintosh HD:Documents";

afterEach(() => {
	cleanup();
	for (const key of Object.keys(itemMenus)) delete itemMenus[key];
	for (const path of [...(finderData().openPaths ?? [])]) {
		dispatch({ type: "ClassicyAppFinderCloseFolder", path });
	}
});

const finderData = () =>
	(useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
		?.data ?? {}) as { openPaths?: string[] };

const desktopIcon = (path: string) =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find(
			(i) => i.appId === `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`,
		);
const NOTES = "Macintosh HD:Desktop Folder:Notes.txt";
const titles = (menu: ClassicyMenuItem[] | undefined) =>
	(menu ?? []).map((item) => (item.id === "spacer" ? "—" : item.title));

// Mac OS 8's Finder sets no default item in a contextual menu (HIGOS8
// "Contextual Menus", pp.94-95: "you should not set a default item"): with
// no `layout.finder.commands` (the core's default layout, Mac OS 8's), the
// item menus are what they were, and a desktop file stores none.
describe("Finder item menus under Mac OS 8's commands (no layout.finder.commands)", () => {
	it("keeps Move To Trash alone, Restore alone in the Trash, and nothing deeper in it", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS}:Projects`);
		fs.mkDir(`${DOCUMENTS}:Old`);
		fs.mkDir(`${DOCUMENTS}:Old:Inner`);
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Trash" });
		render(<Finder />);
		await waitFor(() => expect(itemMenus.Trash).toBeDefined());
		const menu = itemMenus[DOCUMENTS](`${DOCUMENTS}:Projects`, []) ?? [];
		expect(menu.map((item) => item.title)).toEqual(["Move To Trash"]);
		expect(menu.some((item) => item.isDefault)).toBe(false);
		fs.move(`${DOCUMENTS}:Old`, "Trash", {
			metadata: { _trashed: true, _trashedFrom: DOCUMENTS },
		});
		expect(
			(itemMenus.Trash("Trash:Old", []) ?? []).map((item) => item.title),
		).toEqual(["Restore"]);
		expect(itemMenus.Trash("Trash:Old:Inner", [])).toBeUndefined();
	});

	it("stores no menu with a desktop file icon", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir("Macintosh HD:Desktop Folder");
		fs.writeFile(NOTES, "hello");
		render(<Finder />);
		await waitFor(() => expect(desktopIcon(NOTES)).toBeDefined());
		expect(desktopIcon(NOTES)?.contextMenu).toBeUndefined();
	});
});

// Windows' icon pop-up menus lead with Open (WIG Ch.7 "Icon Pop-up Menus",
// pp.102-103), the command a double-click runs, drawn bold where the package
// draws a default item, under `layout.finder.commands` "windows" (Windows
// 98).
describe("Finder item menus lead with Open under Explorer's commands (layout.finder.commands windows)", () => {
	let restore: () => void;
	beforeEach(() => {
		restore = activateTestWindowsKeysPackage();
	});
	afterEach(() => restore());

	it("puts Open, the default item, before Delete and Rename, and opens a folder with it", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS}:Projects`);
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());

		const menu = itemMenus[DOCUMENTS](`${DOCUMENTS}:Projects`, []) ?? [];
		// Windows 98 SE Explorer's item menu (shell32.dll): Open, then Create
		// Shortcut, Delete and Rename (the audit's 1.21, 5.39, 10.3 and 10.6).
		expect(titles(menu)).toEqual([
			"Open",
			"—",
			"Create Shortcut",
			"Delete",
			"Rename",
		]);
		expect(menu[0].isDefault).toBe(true);
		expect(menu.slice(1).some((item) => item.isDefault)).toBe(false);

		act(() => menu[0].onClickFunc?.());
		expect(finderData().openPaths).toContain(`${DOCUMENTS}:Projects`);
	});

	it("leads the Trash's items with Open too, before Restore", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS}:Old`);
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Trash" });
		render(<Finder />);
		await waitFor(() => expect(itemMenus.Trash).toBeDefined());
		fs.move(`${DOCUMENTS}:Old`, "Trash", {
			metadata: { _trashed: true, _trashedFrom: DOCUMENTS },
		});
		const menu = itemMenus.Trash("Trash:Old", []) ?? [];
		expect(menu.map((item) => item.title)).toEqual(["Open", "Restore"]);
		expect(menu[0].isDefault).toBe(true);
	});

	it("gives a desktop file icon the same menu, stored with its icon, and takes it away under Mac OS 8's", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir("Macintosh HD:Desktop Folder");
		fs.writeFile(NOTES, "hello");
		render(<Finder />);
		await waitFor(() => {
			const icon = desktopIcon(NOTES);
			expect(titles(icon?.contextMenu)).toEqual([
				"Open",
				"—",
				"Create Shortcut",
				"Delete",
				"Rename",
			]);
			expect(icon?.contextMenu?.[0].isDefault).toBe(true);
		});
		// The package goes: the stored menu goes with it.
		restore();
		restore = () => {};
		await waitFor(() =>
			expect(desktopIcon(NOTES)?.contextMenu).toBeUndefined(),
		);
	});
});

// The remaining chapters' audit's 5.39 and 9.3 (WIG Ch.5 "Specialized
// Transfer Commands", p.67; Ch.9 p.176; Windows 98 SE, shell32.dll): under
// Explorer's commands Delete asks first in Windows 98's box, Rename is for one
// item that may be renamed, and an Extension's menu leads with Properties,
// its control panel.
describe("Explorer's Delete, Rename and Properties in Finder's item menus", () => {
	let restore: () => void;
	beforeEach(() => {
		restore = activateTestWindowsKeysPackage();
	});
	afterEach(() => {
		restore();
		dispatch({ type: "ClassicyAppFinderConfirmDeleteClose" });
	});

	const confirmDelete = () =>
		(
			useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
				?.data as { confirmDelete?: { paths: string[] } } | undefined
		)?.confirmDelete;

	it("dims Rename for two items or one that may not be renamed", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS}:a.txt`, "a");
		fs.writeFile(`${DOCUMENTS}:b.txt`, "b");
		fs.writeFile(`${DOCUMENTS}:locked.txt`, "c", { _readOnly: true });
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
		const rename = (path: string, selected: string[]) =>
			itemMenus[DOCUMENTS](path, selected)?.find(
				(item) => item.title === "Rename",
			);
		expect(rename(`${DOCUMENTS}:a.txt`, [])?.disabled).toBe(false);
		expect(
			rename(`${DOCUMENTS}:a.txt`, [`${DOCUMENTS}:a.txt`, `${DOCUMENTS}:b.txt`])
				?.disabled,
		).toBe(true);
		expect(rename(`${DOCUMENTS}:locked.txt`, [])?.disabled).toBe(true);
	});

	it("asks Windows 98's question before Delete moves anything; Yes moves, No does not", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS}:Plan.txt`, "a");
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
		const del = () =>
			itemMenus[DOCUMENTS](`${DOCUMENTS}:Plan.txt`, [])?.find(
				(item) => item.title === "Delete",
			);
		act(() => del()?.onClickFunc?.());
		expect(fs.resolve(`${DOCUMENTS}:Plan.txt`)).toBeDefined();
		expect(confirmDelete()?.paths).toEqual([`${DOCUMENTS}:Plan.txt`]);
		expect(
			await screen.findByText(
				"Are you sure you want to send 'Plan.txt' to the Trash?",
			),
		).toBeTruthy();
		expect(screen.getAllByText("Confirm File Delete").length).toBeGreaterThan(
			0,
		);
		fireEvent.click(screen.getByRole("button", { name: "No" }));
		await waitFor(() => expect(confirmDelete()).toBeUndefined());
		expect(fs.resolve(`${DOCUMENTS}:Plan.txt`)).toBeDefined();

		act(() => del()?.onClickFunc?.());
		fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
		await waitFor(() => expect(confirmDelete()).toBeUndefined());
		expect(fs.resolve(`${DOCUMENTS}:Plan.txt`)).toBeUndefined();
		expect(fs.resolve("Trash:Plan.txt")).toBeDefined();
	});

	it("leads an Extension's menu with Properties, which opens its control panel", async () => {
		const fs = new ClassicyFileSystem();
		const saver = `${DOCUMENTS}:Screen Saver`;
		fs.writeFile(saver, "", {
			_type: "extension",
			_creator: "ScreenSaver.app",
		} as never);
		dispatch({
			type: "ClassicyAppLoad",
			app: { id: "ScreenSaverManager.app", name: "Screen Saver", icon: "" },
		});
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
		const menu = itemMenus[DOCUMENTS](saver, []) ?? [];
		expect(titles(menu)[0]).toBe("Properties");
		expect(menu[0].isDefault).toBe(true);
		act(() => menu[0].onClickFunc?.());
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				"ScreenSaverManager.app"
			]?.open,
		).toBe(true);
		expect(
			useAppManager.getState().System.Manager.Desktop.errorDialog,
		).toBeFalsy();
	});
});

/** Makes `appId` the app text files open with. */
const setTextHandler = (appId: string) =>
	act(() =>
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Applications.fileTypeHandlers.text_file = appId;
			}),
		),
	);

// The remaining chapters' audit's 10.6 (WIG Ch.10 "Registering Commands",
// pp.200-201, and "System Naming Conventions", p.210; Windows 98 SE,
// shell32.dll): under Explorer's commands an item's menu lists its
// handler's verbs after Open, and Create Shortcut makes "Shortcut to
// <name>" beside the item, or offers the desktop where none may be made.
describe("Explorer's Create Shortcut and verbs in Finder's item menus", () => {
	let restore: () => void;
	beforeEach(() => {
		restore = activateTestWindowsKeysPackage();
	});
	afterEach(() => {
		restore();
		dispatch({ type: "ClassicyAppFinderOfferDesktopShortcutClose" });
	});

	const offer = () =>
		(
			useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
				?.data as { desktopShortcutOffer?: { paths: string[] } } | undefined
		)?.desktopShortcutOffer;
	const createShortcut = (path: string, selected: string[] = []) =>
		itemMenus[DOCUMENTS](path, selected)?.find(
			(item) => item.title === "Create Shortcut",
		);

	it("makes a shortcut beside each item, numbered on a clash", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS}:Plan.txt`, "a");
		fs.mkDir(`${DOCUMENTS}:Projects`);
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
		const both = [`${DOCUMENTS}:Plan.txt`, `${DOCUMENTS}:Projects`];
		act(() => createShortcut(`${DOCUMENTS}:Plan.txt`, both)?.onClickFunc?.());
		expect(fs.resolve(`${DOCUMENTS}:Shortcut to Plan.txt`)).toMatchObject({
			_type: "file_shortcut",
			_targetPath: `${DOCUMENTS}:Plan.txt`,
		});
		expect(fs.resolve(`${DOCUMENTS}:Shortcut to Projects`)?._targetPath).toBe(
			`${DOCUMENTS}:Projects`,
		);
		act(() => createShortcut(`${DOCUMENTS}:Plan.txt`)?.onClickFunc?.());
		expect(fs.resolve(`${DOCUMENTS}:Shortcut (2) to Plan.txt`)).toBeDefined();
		expect(offer()).toBeUndefined();
	});

	it("offers the desktop where no shortcut may be made; Yes makes it there, No does not", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS}:Locked`);
		fs.writeFile(`${DOCUMENTS}:Locked:Memo.txt`, "m");
		fs.setMetadata(`${DOCUMENTS}:Locked`, { _readOnly: true });
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		render(<Finder />);
		await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
		const memo = `${DOCUMENTS}:Locked:Memo.txt`;
		act(() => createShortcut(memo)?.onClickFunc?.());
		expect(offer()).toEqual({ paths: [memo] });
		expect(
			await screen.findByText(
				/Windows cannot create a shortcut here\.\s+Do you want the shortcut to be placed on the desktop instead\?/,
			),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "No" }));
		await waitFor(() => expect(offer()).toBeUndefined());
		expect(
			fs.resolve("Macintosh HD:Desktop Folder:Shortcut to Memo.txt"),
		).toBeUndefined();

		act(() => createShortcut(memo)?.onClickFunc?.());
		fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
		await waitFor(() => expect(offer()).toBeUndefined());
		const made = "Macintosh HD:Desktop Folder:Shortcut to Memo.txt";
		expect(fs.resolve(made)?._targetPath).toBe(memo);
		await waitFor(() => {
			const icon = desktopIcon(made);
			expect(icon?.kind).toBe("file_shortcut");
			expect(icon?.location).toBeDefined();
		});
		expect(
			useAppManager.getState().System.Manager.Desktop.selectedIcons,
		).toEqual([`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${made}`]);
	});

	it("offers no Create Shortcut on the Trash's items", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCUMENTS}:Old`);
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Trash" });
		render(<Finder />);
		await waitFor(() => expect(itemMenus.Trash).toBeDefined());
		fs.move(`${DOCUMENTS}:Old`, "Trash", {
			metadata: { _trashed: true, _trashedFrom: DOCUMENTS },
		});
		expect(titles(itemMenus.Trash("Trash:Old", []))).not.toContain(
			"Create Shortcut",
		);
	});

	it("gives a desktop file icon Create Shortcut, beside it on the desktop", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir("Macintosh HD:Desktop Folder");
		fs.writeFile(NOTES, "hello");
		render(<Finder />);
		await waitFor(() =>
			expect(titles(desktopIcon(NOTES)?.contextMenu)).toContain(
				"Create Shortcut",
			),
		);
		act(() =>
			desktopIcon(NOTES)
				?.contextMenu?.find((item) => item.title === "Create Shortcut")
				?.onClickFunc?.(),
		);
		const made = "Macintosh HD:Desktop Folder:Shortcut to Notes.txt";
		expect(fs.resolve(made)?._targetPath).toBe(NOTES);
		await waitFor(() => expect(desktopIcon(made)?.kind).toBe("file_shortcut"));
	});

	it("lists the handler's verbs after Open, and runs each on the items of its type", async () => {
		const ran: ActionMessage[] = [];
		registerApp({
			id: "VerbPad.app",
			description: "Prints notes.",
			prefix: "ClassicyAppVerbPad",
			handler: (ds, action) => {
				ran.push(action);
				return ds;
			},
			actions: {
				ClassicyAppVerbPadPrint: { description: "Print a note." },
			},
			verbs: [
				{
					id: "print",
					title: "Print",
					action: "ClassicyAppVerbPadPrint",
					accessKey: "P",
				},
			],
		});
		const release = markClassicyAppMounted("VerbPad.app");
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS}:a.txt`, "a");
		fs.writeFile(`${DOCUMENTS}:b.txt`, "b");
		fs.mkDir(`${DOCUMENTS}:Folder`);
		dispatch({
			type: "ClassicyAppLoad",
			app: { id: "VerbPad.app", name: "VerbPad", icon: "" },
		});
		setTextHandler("VerbPad.app");
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		try {
			render(<Finder />);
			await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
			const targets = [
				`${DOCUMENTS}:a.txt`,
				`${DOCUMENTS}:b.txt`,
				`${DOCUMENTS}:Folder`,
			];
			await waitFor(() =>
				expect(titles(itemMenus[DOCUMENTS](targets[0], targets))).toEqual([
					"Open",
					"Print",
					"—",
					"Create Shortcut",
					"Delete",
					"Rename",
				]),
			);
			const print = itemMenus[DOCUMENTS](targets[0], targets)?.[1];
			expect(print?.isDefault).toBeFalsy();
			act(() => print?.onClickFunc?.());
			expect(
				ran
					.filter((a) => a.type === "ClassicyAppVerbPadPrint")
					.map((a) => [a.app, a.path]),
			).toEqual([
				[{ id: "VerbPad.app" }, `${DOCUMENTS}:a.txt`],
				[{ id: "VerbPad.app" }, `${DOCUMENTS}:b.txt`],
			]);
			// A folder's menu lists none.
			expect(titles(itemMenus[DOCUMENTS](targets[2], []))).not.toContain(
				"Print",
			);
		} finally {
			release();
			setTextHandler("Finder.app");
		}
	});
});

describe("Finder item menus without Explorer's commands", () => {
	it("list no verbs and no Create Shortcut (Mac OS 8's Finder)", async () => {
		registerApp({
			id: "MacVerbPad.app",
			description: "Prints notes.",
			verbs: [{ id: "print", title: "Print", action: "ClassicyAppMacPrint" }],
		});
		const release = markClassicyAppMounted("MacVerbPad.app");
		setTextHandler("MacVerbPad.app");
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCUMENTS}:a.txt`, "a");
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		try {
			render(<Finder />);
			await waitFor(() => expect(itemMenus[DOCUMENTS]).toBeDefined());
			expect(titles(itemMenus[DOCUMENTS](`${DOCUMENTS}:a.txt`, []))).toEqual([
				"Move To Trash",
			]);
		} finally {
			release();
			setTextHandler("Finder.app");
		}
	});
});

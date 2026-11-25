import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch as storeDispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyFileDropTarget } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	activateClassicyDropWindow,
	copyClassicyFileSystemItems,
	moveClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The remaining chapters' audit's 5.28 (`copyClassicyFileSystemItems`, the
// desktop placement of a Paste) and 5.31 (`activateClassicyDropWindow`,
// WIG Ch.5 "Direct Manipulation Method", p.62).

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-file-transfer-${++counter}`, {
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Plan.txt": {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "p",
				},
				"Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
			Archive: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Notes.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
			Locked: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				_readOnly: true,
			},
		},
	});

const types = (dispatch: ReturnType<typeof vi.fn>) =>
	dispatch.mock.calls.map(([a]) => a.type);

describe("copyClassicyFileSystemItems", () => {
	it("copies into a folder, keeping the originals and telling Finder nothing moved", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		const copies = copyClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents:Notes.txt"],
			{ kind: "folder", path: "Macintosh HD:Archive" },
			dispatch,
		);
		expect(copies).toEqual([
			{
				from: "Macintosh HD:Documents:Plan.txt",
				to: "Macintosh HD:Archive:Plan.txt",
			},
			{
				from: "Macintosh HD:Documents:Notes.txt",
				to: "Macintosh HD:Archive:Copy of Notes.txt",
			},
		]);
		expect(fs.resolve("Macintosh HD:Documents:Plan.txt")).toBeDefined();
		expect(fs.resolve("Macintosh HD:Archive:Plan.txt")?._data).toBe("p");
		expect(types(dispatch)).toEqual([]);
	});

	it("copies onto the desktop: the Desktop Folder made, icons placed at the point, stepping down", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		copyClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents:Notes.txt"],
			{ kind: "desktop" },
			dispatch,
			{ desktopLocation: [100, 50] },
		);
		expect(fs.resolve("Macintosh HD:Desktop Folder")?._invisible).toBe(true);
		const adds = dispatch.mock.calls
			.map(([a]) => a)
			.filter((a) => a.type === "ClassicyDesktopIconAdd");
		expect(adds.map((a) => [a.filePath, a.location])).toEqual([
			["Macintosh HD:Desktop Folder:Plan.txt", [100, 50]],
			["Macintosh HD:Desktop Folder:Notes.txt", [100, 122]],
		]);
	});

	it("asks desktopLocationFor where each icon goes when no point is given", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		const where = vi.fn((index: number): [number, number] => [index * 70, 9]);
		copyClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt", "Macintosh HD:Documents:Notes.txt"],
			{ kind: "desktop" },
			dispatch,
			{ desktopLocationFor: where },
		);
		expect(where.mock.calls.map(([i]) => i)).toEqual([0, 1]);
		expect(
			dispatch.mock.calls
				.map(([a]) => a)
				.filter((a) => a.type === "ClassicyDesktopIconAdd")
				.map((a) => a.location),
		).toEqual([
			[0, 9],
			[70, 9],
		]);
	});

	it("tells the first refusal in an alert and copies the rest", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			copyClassicyFileSystemItems(
				fs,
				["Macintosh HD:Documents:Plan.txt"],
				{ kind: "folder", path: "Macintosh HD:Locked" },
				dispatch,
			),
		).toEqual([]);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message:
				"“Plan.txt” can’t be copied, because it or “Locked” is locked or used by the system software.",
		});
		dispatch.mockClear();
		const copies = copyClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents", "Macintosh HD:Documents:Plan.txt"],
			{ kind: "folder", path: "Macintosh HD:Documents" },
			dispatch,
		);
		// A folder copied into itself is refused; the file is copied beside
		// itself.
		expect(copies.map(({ to }) => to)).toEqual([
			"Macintosh HD:Documents:Copy of Plan.txt",
		]);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopShowErrorDialog",
			message: "“Documents” can’t be copied into itself.",
		});
	});
});

describe("moveClassicyFileSystemItems's desktop placement", () => {
	it("asks desktopLocationFor too, when no point is given", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt"],
			{ kind: "desktop" },
			dispatch,
			{ desktopLocationFor: () => [5, 6] },
		);
		expect(
			dispatch.mock.calls
				.map(([a]) => a)
				.find((a) => a.type === "ClassicyDesktopIconAdd")?.location,
		).toEqual([5, 6]);
	});

	it("still lays the desktop out afresh with neither (no location)", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		moveClassicyFileSystemItems(
			fs,
			["Macintosh HD:Documents:Plan.txt"],
			{ kind: "desktop" },
			dispatch,
		);
		expect(
			dispatch.mock.calls
				.map(([a]) => a)
				.find((a) => a.type === "ClassicyDesktopIconAdd"),
		).not.toHaveProperty("location");
	});
});

describe("activateClassicyDropWindow", () => {
	const DOCUMENTS = "Macintosh HD:Documents";
	const ARCHIVE = "Macintosh HD:Archive";
	let restore: (() => void) | null = null;
	let root: HTMLElement;

	const openWindow = (id: string) =>
		act(() =>
			storeDispatch({
				type: "ClassicyWindowOpen",
				app: { id: "Finder.app" },
				window: {
					id,
					position: [10, 10],
					size: [200, 200],
					minimumSize: [100, 100],
				},
			}),
		);
	const focused = (id: string) =>
		getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps["Finder.app"],
			id,
		)?.focused;

	/** A Finder window's DOM: the window root, its browser's root, a folder icon in it. */
	const windowDom = (
		folder: string,
		{ active = false, appId = "Finder.app" } = {},
	) => {
		const win = document.createElement("div");
		win.className = `classicyWindow${active ? " active" : ""}`;
		win.id = [appId, folder].join("_");
		const fill = document.createElement("div");
		fill.className = "classicyFileBrowserFill";
		fill.setAttribute("data-classicy-drop-folder", folder);
		const icon = document.createElement("div");
		icon.setAttribute("data-classicy-drop-folder", `${folder}:Inner`);
		fill.append(icon);
		win.append(fill);
		root.append(win);
		return { fill, icon };
	};
	const targetOn = (
		element: Element,
		path: string,
	): ClassicyFileDropTarget => ({
		destination: { kind: "folder", path },
		element,
	});

	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		root = document.createElement("div");
		document.body.append(root);
		openWindow(DOCUMENTS);
		openWindow(ARCHIVE);
	});
	afterEach(() => {
		root.remove();
		restore?.();
		restore = null;
	});

	it("focuses the inactive Finder window a drop landed in, its folder icons included", () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { activateDropWindow: true },
		});
		expect(focused(DOCUMENTS)).toBe(false);
		const { icon, fill } = windowDom(DOCUMENTS);
		const dispatch = vi.fn(storeDispatch);
		expect(
			activateClassicyDropWindow(
				targetOn(icon, `${DOCUMENTS}:Inner`),
				dispatch,
			),
		).toBe(true);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: expect.objectContaining({ id: DOCUMENTS }),
			}),
		);
		expect(focused(DOCUMENTS)).toBe(true);
		// The browser's root itself works the same.
		expect(activateClassicyDropWindow(targetOn(fill, ARCHIVE), vi.fn())).toBe(
			true,
		);
	});

	it("does nothing for the active window, the desktop, another app's window or no target", () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { activateDropWindow: true },
		});
		const dispatch = vi.fn();
		const active = windowDom(ARCHIVE, { active: true });
		expect(
			activateClassicyDropWindow(targetOn(active.fill, ARCHIVE), dispatch),
		).toBe(false);
		const desktop = document.createElement("div");
		desktop.setAttribute("data-classicy-drop-desktop", "");
		root.append(desktop);
		expect(
			activateClassicyDropWindow(
				{ destination: { kind: "desktop" }, element: desktop },
				dispatch,
			),
		).toBe(false);
		// A file dialog's browser for the same folder: not Finder's window.
		const dialog = windowDom(DOCUMENTS, { appId: "SimpleText.app" });
		expect(
			activateClassicyDropWindow(targetOn(dialog.fill, DOCUMENTS), dispatch),
		).toBe(false);
		// A Finder window with no record (closed meanwhile).
		const gone = windowDom("Macintosh HD:Gone");
		expect(
			activateClassicyDropWindow(
				targetOn(gone.fill, "Macintosh HD:Gone"),
				dispatch,
			),
		).toBe(false);
		expect(activateClassicyDropWindow(null, dispatch)).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("does nothing without the key (Mac OS 8's Finder)", () => {
		const { icon } = windowDom(DOCUMENTS);
		const dispatch = vi.fn();
		expect(
			activateClassicyDropWindow(
				targetOn(icon, `${DOCUMENTS}:Inner`),
				dispatch,
			),
		).toBe(false);
		restore = activateTestWindowsKeysPackage({
			transfer: { activateDropWindow: false },
		});
		expect(
			activateClassicyDropWindow(
				targetOn(icon, `${DOCUMENTS}:Inner`),
				dispatch,
			),
		).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
		expect(focused(DOCUMENTS)).toBe(false);
	});
});

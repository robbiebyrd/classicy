// The Finder's reveal (story 0227-815): Find File's Open Enclosing Folder
// brings the item's folder to the front in a Finder window with the item
// selected, or selects it on the desktop; invisible places are refused.
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	setAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import "@/SystemFolder/Finder/FinderContext";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { CLASSICY_DESKTOP_ITEM_ICON_PREFIX } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	openClassicyFileSystemPath,
	revealClassicyFileSystemPath,
} from "@/SystemFolder/SystemResources/File/ClassicyFileOpen";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType as T } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const FINDER = "Finder.app";
const store = (): ClassicyStore => structuredClone(DefaultAppManagerState);
const finder = (ds: ClassicyStore) =>
	ds.System.Manager.Applications.apps[FINDER];
const data = (ds: ClassicyStore) =>
	finder(ds).data as {
		openPaths?: string[];
		reveal?: { path: string; seq: number };
	};
const reduce = (ds: ClassicyStore, action: Record<string, unknown>) =>
	classicyDesktopStateEventReducer(ds, action as never);

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-reveal-${++counter}`, {
		"Macintosh HD": {
			_type: T.Drive,
			Documents: {
				_type: T.Directory,
				"Plan.txt": { _type: T.TextFile },
				"Read Me.txt": { _type: T.TextFile },
			},
			"Desktop Folder": {
				_type: T.Directory,
				_invisible: true,
				"Note.txt": { _type: T.TextFile },
			},
			Secret: {
				_type: T.Directory,
				_invisible: true,
				"Key.txt": { _type: T.TextFile },
			},
		},
		Trash: {
			_type: T.Directory,
			_invisible: true,
			"Old.txt": { _type: T.TextFile },
		},
	});

describe("ClassicyAppFinderRevealItem", () => {
	it("opens the item's folder, puts the Finder in front and asks for the item", () => {
		const ds = reduce(store(), {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD:Documents:Plan.txt",
		});
		expect(data(ds).openPaths).toContain("Macintosh HD:Documents");
		expect(data(ds).reveal).toEqual({
			path: "Macintosh HD:Documents:Plan.txt",
			seq: 1,
		});
		expect(ds.System.Manager.Applications.focusedAppId).toBe(FINDER);
		const again = reduce(ds, {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD:Documents:Read Me.txt",
		});
		expect(data(again).reveal?.seq).toBe(2);
		expect(
			data(again).openPaths?.filter((p) => p === "Macintosh HD:Documents"),
		).toHaveLength(1);
	});

	it("focuses the folder's window when it is already open", () => {
		const ds = store();
		setAppWindow(finder(ds), {
			id: "Macintosh HD:Documents",
			closed: false,
			focused: false,
		} as never);
		reduce(ds, {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD:Documents:Plan.txt",
		});
		expect(getAppWindow(finder(ds), "Macintosh HD:Documents")?.focused).toBe(
			true,
		);
	});

	it("selects an item on the desktop by its icon, opening no window", () => {
		const ds = store();
		const iconId = `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}Macintosh HD:Desktop Folder:Note.txt`;
		ds.System.Manager.Desktop.icons.push({
			appId: iconId,
			appName: "Note.txt",
			icon: "",
		} as never);
		reduce(ds, {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD:Desktop Folder:Note.txt",
		});
		expect(ds.System.Manager.Desktop.selectedIcons).toEqual([iconId]);
		expect(ds.System.Manager.Applications.focusedAppId).toBe(FINDER);
		expect(data(ds).openPaths ?? []).not.toContain(
			"Macintosh HD:Desktop Folder",
		);
	});

	it("ignores a disk, which has no folder", () => {
		const ds = reduce(store(), {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD",
		});
		expect(data(ds).reveal).toBeUndefined();
	});

	it("is never saved: a reload selects nothing again", () => {
		const ds = reduce(store(), {
			type: "ClassicyAppFinderRevealItem",
			path: "Macintosh HD:Documents:Plan.txt",
		});
		const saved = sanitizeStateForPersistence(ds);
		expect(
			(saved.System.Manager.Applications.apps[FINDER].data as object) ?? {},
		).not.toHaveProperty("reveal");
		expect(data(ds).reveal).toBeDefined();
	});
});

describe("ClassicyAppFinderOpenFolder with focus", () => {
	it("brings an open folder's window forward only when asked", () => {
		const ds = store();
		setAppWindow(finder(ds), {
			id: "Macintosh HD:Documents",
			closed: false,
			focused: false,
		} as never);
		reduce(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "Macintosh HD:Documents",
		});
		expect(getAppWindow(finder(ds), "Macintosh HD:Documents")?.focused).toBe(
			false,
		);
		reduce(ds, {
			type: "ClassicyAppFinderOpenFolder",
			path: "Macintosh HD:Documents",
			focus: true,
		});
		expect(getAppWindow(finder(ds), "Macintosh HD:Documents")?.focused).toBe(
			true,
		);
	});
});

describe("revealClassicyFileSystemPath and openClassicyFileSystemPath", () => {
	it("reveals a visible item, and the desktop's", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			revealClassicyFileSystemPath(
				fs,
				"Macintosh HD:Documents:Plan.txt",
				dispatch,
			),
		).toBe("revealed");
		expect(
			revealClassicyFileSystemPath(
				fs,
				"Macintosh HD:Desktop Folder:Note.txt",
				dispatch,
			),
		).toBe("revealed");
		expect(dispatch.mock.calls.map(([a]) => a)).toEqual([
			{
				type: "ClassicyAppFinderRevealItem",
				path: "Macintosh HD:Documents:Plan.txt",
			},
			{
				type: "ClassicyAppFinderRevealItem",
				path: "Macintosh HD:Desktop Folder:Note.txt",
			},
		]);
	});

	it("refuses an invisible item or one inside an invisible folder, the Trash too", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			revealClassicyFileSystemPath(fs, "Macintosh HD:Secret:Key.txt", dispatch),
		).toBe("invisible");
		expect(
			revealClassicyFileSystemPath(fs, "Macintosh HD:Secret", dispatch),
		).toBe("invisible");
		expect(revealClassicyFileSystemPath(fs, "Trash:Old.txt", dispatch)).toBe(
			"invisible",
		);
		expect(
			revealClassicyFileSystemPath(fs, "Macintosh HD:Gone.txt", dispatch),
		).toBe("missing");
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("opens a folder in front", () => {
		const fs = makeFs();
		const dispatch = vi.fn();
		expect(
			openClassicyFileSystemPath(fs, "Macintosh HD:Documents", dispatch),
		).toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderOpenFolder",
			path: "Macintosh HD:Documents",
			focus: true,
		});
	});
});

describe("ClassicyFileBrowser's reveal", () => {
	const selectedRows = () =>
		Array.from(
			document.querySelectorAll(
				'tr[data-selected="true"] [data-classicy-file-path]',
			),
			(el) => el.getAttribute("data-classicy-file-path"),
		);
	const selectedIcons = () =>
		Array.from(document.querySelectorAll(".classicyIcon.selected"), (el) =>
			el.getAttribute("data-classicy-file-path"),
		);

	it("selects the item in the list view, and again for each new key", () => {
		const fs = makeFs();
		const { rerender } = render(
			<ClassicyFileBrowser
				fs={fs}
				appId={FINDER}
				path="Macintosh HD:Documents"
				display="list"
				reveal={{ paths: ["Macintosh HD:Documents:Plan.txt"], key: 1 }}
			/>,
		);
		expect(selectedRows()).toEqual(["Macintosh HD:Documents:Plan.txt"]);
		rerender(
			<ClassicyFileBrowser
				fs={fs}
				appId={FINDER}
				path="Macintosh HD:Documents"
				display="list"
				reveal={{ paths: ["Macintosh HD:Documents:Read Me.txt"], key: 2 }}
			/>,
		);
		expect(selectedRows()).toEqual(["Macintosh HD:Documents:Read Me.txt"]);
		// The user's own click still selects afterwards.
		fireEvent.click(screen.getByText("Plan.txt"));
		expect(selectedRows()).toEqual(["Macintosh HD:Documents:Plan.txt"]);
	});

	it("selects the item in the icon view, alone, and clicks still toggle", () => {
		const fs = makeFs();
		render(
			<ClassicyFileBrowser
				fs={fs}
				appId={FINDER}
				path="Macintosh HD:Documents"
				display="icons"
				reveal={{ paths: ["Macintosh HD:Documents:Read Me.txt"], key: 7 }}
			/>,
		);
		expect(selectedIcons()).toEqual(["Macintosh HD:Documents:Read Me.txt"]);
		const plan = document.querySelector(
			'.classicyIcon[data-classicy-file-path="Macintosh HD:Documents:Plan.txt"]',
		) as HTMLElement;
		act(() => {
			fireEvent.click(plan);
		});
		expect(selectedIcons().sort()).toEqual([
			"Macintosh HD:Documents:Plan.txt",
			"Macintosh HD:Documents:Read Me.txt",
		]);
		act(() => {
			fireEvent.click(plan);
		});
		expect(selectedIcons()).toEqual(["Macintosh HD:Documents:Read Me.txt"]);
	});

	it("leaves the icons their own selection without a reveal", () => {
		const fs = makeFs();
		render(
			<ClassicyFileBrowser
				fs={fs}
				appId={FINDER}
				path="Macintosh HD:Documents"
				display="icons"
			/>,
		);
		expect(selectedIcons()).toEqual([]);
		const plan = document.querySelector(
			'.classicyIcon[data-classicy-file-path="Macintosh HD:Documents:Plan.txt"]',
		) as HTMLElement;
		fireEvent.click(plan);
		expect(selectedIcons()).toEqual(["Macintosh HD:Documents:Plan.txt"]);
	});
});

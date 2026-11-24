// Shared fixtures for the Recent Items reducer tests (story 0226-a6f).
import { produce } from "immer";
import { afterEach, beforeEach, vi } from "vitest";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyRecentItem,
	classicyRecentItemsOf,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
// Side effects: the reducers and manifests, as the package barrel loads them.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/HyperCard/HyperCardContext";
import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import "@/SystemFolder/ControlPanels/AppleMenuOptions/ClassicyAppleMenuOptionsManifest";

export const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

export const reduceAll = (ds: ClassicyStore, actions: ActionMessage[]) =>
	actions.reduce((state, action) => reduce(state, action), ds);

/** The default store with loaded (closed) app records, SimpleText handling text. */
export const base = (): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		const add = (id: string, name: string, extra = {}) => {
			draft.System.Manager.Applications.apps[id] = {
				id,
				name,
				icon: `${id}.png`,
				windows: {},
				open: false,
				data: {},
				...extra,
			};
		};
		add("SimpleText.app", "SimpleText");
		add("Calculator.app", "Calculator");
		add("PictureViewer.app", "Picture Viewer");
		add("AppearanceManager.app", "Appearance");
		add("ScreenSaver.app", "Screen Saver", { extension: true });
		add("MoviePlayer.app", "Movie Player");
		add("PDFViewer.app", "PDF Viewer");
		add("HyperCard.app", "HyperCard");
		// A record a save kept for an app the host no longer mounts.
		add("Removed.app", "Removed");
		draft.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.TextFile
		] = "SimpleText.app";
		draft.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.Image
		] = "PictureViewer.app";
	});

export const open = (id: string): ActionMessage => ({
	type: "ClassicyAppOpen",
	app: { id, name: id, icon: "" },
});

export const finderOpen = (
	path: string,
	type = ClassicyFileSystemEntryFileType.TextFile,
): ActionMessage => ({
	type: "ClassicyAppFinderOpenFile",
	file: { _type: type },
	path,
});

export const items = (ds: ClassicyStore): ClassicyRecentItem[] =>
	classicyRecentItemsOf(ds).items;
export const targets = (ds: ClassicyStore, kind: ClassicyRecentItem["kind"]) =>
	items(ds)
		.filter((i) => i.kind === kind)
		.map((i) => i.appId ?? i.path);

/** The apps whose ClassicyApp is mounted in these tests (really there). */
export const MOUNTED = [
	"SimpleText.app",
	"Calculator.app",
	"PictureViewer.app",
	"MoviePlayer.app",
	"PDFViewer.app",
	"HyperCard.app",
	"AppearanceManager.app",
	"AppleMenuOptions.app",
	"ScreenSaver.app",
	"Finder.app",
];

/** The files these tests open (each names a file in the file system). */
export const FILES: [string, ClassicyFileSystemEntryFileType][] = [
	["Macintosh HD:Notes:Plan.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:Other.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:A.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:B.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:1.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:2.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:3.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:4.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:Gone.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:Kept.txt", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:Read Me", ClassicyFileSystemEntryFileType.TextFile],
	["Macintosh HD:Pictures:Cat.png", ClassicyFileSystemEntryFileType.Image],
	["Macintosh HD:Docs:Manual.pdf", ClassicyFileSystemEntryFileType.Pdf],
	["Macintosh HD:Movies:Clip.mov", ClassicyFileSystemEntryFileType.Video],
	["Macintosh HD:Stacks:Home.stack", ClassicyFileSystemEntryFileType.Stack],
];

/**
 * Each test: a clock a millisecond on per use, the apps mounted (really
 * there) and the files written (each names a file).
 */
export function setUpRecentItemsFixtures(): void {
	let now = 1_000;
	const unmounts: (() => void)[] = [];
	beforeEach(() => {
		now = 1_000;
		// Each use a millisecond later than the last, so order is by use.
		vi.spyOn(Date, "now").mockImplementation(() => {
			now += 1;
			return now;
		});
		for (const id of MOUNTED) unmounts.push(markClassicyAppMounted(id));
		const fs = new ClassicyFileSystem();
		for (const [path, type] of FILES) fs.writeFile(path, "", { _type: type });
	});
	afterEach(() => {
		vi.restoreAllMocks();
		for (const unmount of unmounts.splice(0)) unmount();
	});
}

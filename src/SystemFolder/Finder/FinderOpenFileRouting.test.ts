import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import type { HyperCardData } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import windows98 from "../../../packages/appearance/windows98/src/windows98.json";
// Side-effect imports: each app's reducer registers itself, as the package
// barrel does in the real app.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/HyperCard/HyperCardContext";

// Every type the kernel's generic app handler is handed from outside the
// kernel (Finder and the open-file router call it through this module). An
// app's own OpenFile case never shows up here; the generic fallback does.
const genericTypes = vi.hoisted((): string[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager")
			>();
		const classicyAppEventHandler: typeof actual.classicyAppEventHandler = (
			ds,
			action,
		) => {
			genericTypes.push(action.type);
			return actual.classicyAppEventHandler(ds, action);
		};
		return { ...actual, classicyAppEventHandler };
	},
);

const apps = (ds: ClassicyStore) => ds.System.Manager.Applications.apps;

const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

/** The default store plus one record for `id`, the handler for `fileType`. */
const storeWith = (
	id: string,
	name: string,
	fileType: ClassicyFileSystemEntryFileType,
	data: Record<string, unknown> = {},
): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps[id] = {
			id,
			name,
			icon: "",
			windows: {},
			open: false,
			data,
		};
		draft.System.Manager.Applications.fileTypeHandlers[fileType] = id;
	});

const finderOpen = (
	ds: ClassicyStore,
	fileType: ClassicyFileSystemEntryFileType,
	path: string,
	trust: ClassicyActionTrust = "trusted",
) =>
	reduce(
		ds,
		{ type: "ClassicyAppFinderOpenFile", file: { _type: fileType }, path },
		trust,
	);

const openFileTypes = () => genericTypes.filter((t) => t.endsWith("OpenFile"));

beforeEach(() => {
	genericTypes.length = 0;
});

// The QuickTime players and PDF Viewer reject a malformed `data` and start a
// fresh `{ openFiles: [] }`; the generic handler would keep the stray key and
// append. So the state after the open tells which case ran.
describe.each([
	{
		label: "Movie Player",
		id: "MoviePlayer.app",
		name: "Movie Player",
		fileType: ClassicyFileSystemEntryFileType.Video,
		path: "Macintosh HD:Videos:clip.mp4",
	},
	{
		label: "Picture Viewer",
		id: "PictureViewer.app",
		name: "Picture Viewer",
		fileType: ClassicyFileSystemEntryFileType.Image,
		path: "Macintosh HD:Pictures:photo.png",
	},
	{
		label: "PDF Viewer",
		id: "PDFViewer.app",
		name: "PDF Viewer",
		fileType: ClassicyFileSystemEntryFileType.Pdf,
		path: "Macintosh HD:Documents:manual.pdf",
	},
])("Finder opens a file in $label", ({ id, name, fileType, path }) => {
	it("reaches the app's own OpenFile case", () => {
		const ds = storeWith(id, name, fileType, {
			openFiles: "corrupt",
			stray: true,
		});

		const result = finderOpen(ds, fileType, path);

		expect(apps(result)[id].data).toEqual({ openFiles: [path] });
		expect(apps(result)[id].open).toBe(true);
		expect(openFileTypes()).toEqual([]);
	});

	it("brings the app forward when the file is already open", () => {
		let ds = storeWith(id, name, fileType);
		ds = finderOpen(ds, fileType, path);
		ds = produce(ds, (draft) => {
			draft.System.Manager.Applications.apps[id].focused = false;
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});

		const result = finderOpen(ds, fileType, path);

		expect(apps(result)[id].data?.openFiles).toEqual([path]);
		expect(result.System.Manager.Applications.focusedAppId).toBe(id);
	});
});

const demoStack: HCStack = {
	name: "Demo",
	variables: {},
	cards: [{ id: "c1", name: "One", parts: [] }],
};

describe("Finder opens a stack in HyperCard", () => {
	it("reaches HyperCard's own OpenFile case, which focuses an open stack", () => {
		const path = "Macintosh HD:Stacks:Demo.stack";
		let ds = storeWith(
			"HyperCard.app",
			"HyperCard",
			ClassicyFileSystemEntryFileType.Stack,
		);
		ds = reduce(ds, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: path,
			stackSource: path,
			stack: demoStack,
		});
		ds = produce(ds, (draft) => {
			(
				draft.System.Manager.Applications.apps["HyperCard.app"]
					.data as unknown as HyperCardData
			).activeStackId = undefined;
		});

		const result = finderOpen(ds, ClassicyFileSystemEntryFileType.Stack, path);

		const data = apps(result)["HyperCard.app"].data as unknown as HyperCardData;
		// The generic handler would queue the path again; HyperCard's own case
		// focuses the stack that is already open from it.
		expect(data.activeStackId).toBe(path);
		expect(data.openFiles ?? []).toEqual([]);
		expect(openFileTypes()).toEqual([]);
	});
});

// A host app whose internal name differs from its prefix, so only its
// manifest can say where its OpenFile goes.
const HOST_ID = "NotePad.app";
registerApp({
	id: HOST_ID,
	description: "A host note pad.",
	prefix: "ClassicyAppNotePad",
	handler: (ds, action) => {
		if (action.type === "ClassicyAppNotePadOpenFile") {
			const app = ds.System.Manager.Applications.apps[HOST_ID];
			app.data = { ...app.data, lastOpened: action.path };
		}
		return ds;
	},
	actions: {
		ClassicyAppNotePadOpenFile: {
			description: "Open a note from the file system.",
		},
	},
});

// Registered with a reducer but no declared OpenFile: Finder cannot know the
// reducer handles it, so the open stays generic.
registerApp({
	id: "Ledger.app",
	description: "A host ledger with no OpenFile case.",
	prefix: "ClassicyAppLedger",
	handler: (ds) => ds,
});

// A shorter prefix registered first claims every `ClassicyAppShadow…` type,
// so `ClassicyAppShadowedOpenFile` would never reach the app that declares it.
registerApp({
	id: "Shadow.app",
	description: "Claims a prefix another app's types also start with.",
	prefix: "ClassicyAppShadow",
	handler: (ds) => ds,
});
registerApp({
	id: "Shadowed.app",
	description: "Declares an OpenFile the kernel routes elsewhere.",
	prefix: "ClassicyAppShadowed",
	handler: (ds) => ds,
	actions: {
		ClassicyAppShadowedOpenFile: { description: "Never reached." },
	},
});

// A plugin prefix inside a built-in route: the kernel sends every
// `ClassicyDesktop…` type to the desktop handler before any plugin, so the
// declared OpenFile would be dropped.
registerApp({
	id: "DesktopFoo.app",
	description: "Registers a prefix the kernel's desktop route takes first.",
	prefix: "ClassicyDesktopFoo",
	handler: (ds) => ds,
	actions: {
		ClassicyDesktopFooOpenFile: { description: "Never reached." },
	},
});

describe("Finder opens a file in a host app", () => {
	const path = "Macintosh HD:Documents:Notes.txt";
	const text = ClassicyFileSystemEntryFileType.TextFile;

	it("reaches a host app's registered OpenFile reducer case", () => {
		const ds = storeWith(HOST_ID, "Note Pad", text);

		const result = finderOpen(ds, text, path);

		expect(apps(result)[HOST_ID].data).toEqual({ lastOpened: path });
		expect(openFileTypes()).toEqual([]);
	});

	it("gives an app with no handler the generic OpenFile, by its record name", () => {
		const ds = storeWith("TV.app", "TV", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppTVOpenFile"]);
		expect(apps(result)["TV.app"].data?.openFiles).toEqual([path]);
		expect(apps(result)["TV.app"].open).toBe(true);
	});

	it("keeps the generic OpenFile for a reducer that declares no OpenFile", () => {
		const ds = storeWith("Ledger.app", "Ledger", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppLedgerOpenFile"]);
		expect(apps(result)["Ledger.app"].data?.openFiles).toEqual([path]);
	});

	it("keeps the generic OpenFile when the kernel would route the declared type to another app", () => {
		const ds = storeWith("Shadowed.app", "Shadowed", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppShadowedOpenFile"]);
		expect(apps(result)["Shadowed.app"].data?.openFiles).toEqual([path]);
	});

	it("keeps the generic OpenFile when a built-in route would take the declared type", () => {
		const ds = storeWith("DesktopFoo.app", "DesktopFoo", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppDesktopFooOpenFile"]);
		expect(apps(result)["DesktopFoo.app"].data?.openFiles).toEqual([path]);
	});
});

// Opening a document or folder that is already open (the WIG audit's 5.24 /
// 9.2; WIG Ch.6 "Opening and Closing Windows", pp.94-95: "Activates the
// existing window of the object and displays it at the top of the window Z
// order"; Ch.5 "View Operations", p.46; Ch.9 "Single Document Window
// Interface", p.175). Under Windows 98's `document.reopenActivates` the
// object's own window comes forward; under the default layout the app comes
// forward with its last-focused window, as before.
describe("reopening an open document or folder", () => {
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-reopen",
			name: "Windows Reopen",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-reopen-default",
				package: "windows-reopen",
			},
			layout: windows98.layout as never,
		});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
	});

	/** `ds` with two windows on `appId`: `target`, and `other`, last focused. */
	const withTwoWindows = (
		ds: ClassicyStore,
		appId: string,
		target: string,
		other: string,
	) =>
		produce(ds, (draft) => {
			const app = draft.System.Manager.Applications.apps[appId];
			const win = (id: string, zOrder: number) => ({
				id,
				closed: false,
				size: [200, 200] as [number, number],
				position: [0, 0] as [number, number],
				minimumSize: [0, 0] as [number, number],
				zOrder,
				focused: false,
			});
			app.windows = { [target]: win(target, 1), [other]: win(other, 2) };
			app.lastAccessedWindowId = other;
			app.focused = false;
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});

	const focusedWindowOf = (ds: ClassicyStore, appId: string) =>
		Object.values(apps(ds)[appId].windows).find((w) => w.focused)?.id;

	describe.each([
		{
			label: "Movie Player",
			id: "MoviePlayer.app",
			name: "Movie Player",
			fileType: ClassicyFileSystemEntryFileType.Video,
			path: "Macintosh HD:Videos:clip.mp4",
			windowId: (p: string) => `MoviePlayer.app_MoviePlayer_${p}`,
		},
		{
			label: "Picture Viewer",
			id: "PictureViewer.app",
			name: "Picture Viewer",
			fileType: ClassicyFileSystemEntryFileType.Image,
			path: "Macintosh HD:Pictures:photo.png",
			windowId: (p: string) => `PictureViewer.app_PictureViewer_${p}`,
		},
		{
			label: "PDF Viewer",
			id: "PDFViewer.app",
			name: "PDF Viewer",
			fileType: ClassicyFileSystemEntryFileType.Pdf,
			path: "Macintosh HD:Documents:manual.pdf",
			windowId: (p: string) => `PDFViewer.app_file_${p}`,
		},
		{
			label: "the generic OpenFile route",
			id: "TV.app",
			name: "TV",
			fileType: ClassicyFileSystemEntryFileType.TextFile,
			path: "Macintosh HD:Documents:Notes.txt",
			windowId: (p: string) => `TV.app_file_${p}`,
		},
	])("in $label", ({ id, name, fileType, path, windowId }) => {
		const reopened = () => {
			let ds = storeWith(id, name, fileType);
			ds = finderOpen(ds, fileType, path);
			ds = withTwoWindows(ds, id, windowId(path), `${id}_other`);
			return finderOpen(ds, fileType, path);
		};

		it("brings the document's own window forward under Windows 98's layout", () => {
			useWindowsLayout();
			const result = reopened();

			expect(result.System.Manager.Applications.focusedAppId).toBe(id);
			expect(focusedWindowOf(result, id)).toBe(windowId(path));
			expect(apps(result)[id].lastAccessedWindowId).toBe(windowId(path));
			const windows = apps(result)[id].windows;
			expect(windows[windowId(path)].zOrder ?? 0).toBeGreaterThan(
				windows[`${id}_other`].zOrder ?? 0,
			);
		});

		it("brings the app forward with its last-focused window under the default layout", () => {
			const result = reopened();

			expect(result.System.Manager.Applications.focusedAppId).toBe(id);
			expect(focusedWindowOf(result, id)).toBe(`${id}_other`);
		});

		it("leaves a first open to the window's own registration", () => {
			useWindowsLayout();
			let ds = storeWith(id, name, fileType);
			ds = withTwoWindows(ds, id, windowId(path), `${id}_other`);
			const result = finderOpen(ds, fileType, path);

			// The path was not open: the app's last-focused window comes
			// forward, and the document's window focuses itself when it mounts.
			expect(focusedWindowOf(result, id)).toBe(`${id}_other`);
		});
	});

	describe("a Finder folder", () => {
		const FOLDER = "Macintosh HD:Documents";
		const reopened = () => {
			let ds = produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Applications.apps["Finder.app"].data = {
					openPaths: [FOLDER],
				};
			});
			ds = withTwoWindows(ds, "Finder.app", FOLDER, "Macintosh HD");
			return reduce(ds, { type: "ClassicyAppFinderOpenFolder", path: FOLDER });
		};

		it("brings its window forward under Windows 98's layout, as from a desktop icon", () => {
			useWindowsLayout();
			const result = reopened();

			expect(focusedWindowOf(result, "Finder.app")).toBe(FOLDER);
			expect(result.System.Manager.Applications.focusedAppId).toBe(
				"Finder.app",
			);
			expect(
				(apps(result)["Finder.app"].data as { openPaths?: string[] }).openPaths,
			).toEqual([FOLDER]);
		});

		it("changes no window under the default layout", () => {
			const result = reopened();

			expect(focusedWindowOf(result, "Finder.app")).toBeUndefined();
		});

		it("leaves a closed folder window to its own registration", () => {
			useWindowsLayout();
			let ds = produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Applications.apps["Finder.app"].data = {
					openPaths: [FOLDER],
				};
			});
			ds = withTwoWindows(ds, "Finder.app", FOLDER, "Macintosh HD");
			ds = produce(ds, (draft) => {
				draft.System.Manager.Applications.apps["Finder.app"].windows[
					FOLDER
				].closed = true;
			});
			const result = reduce(ds, {
				type: "ClassicyAppFinderOpenFolder",
				path: FOLDER,
			});

			expect(focusedWindowOf(result, "Finder.app")).toBeUndefined();
		});
	});
});

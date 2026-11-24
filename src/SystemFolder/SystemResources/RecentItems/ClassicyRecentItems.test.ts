// Recent Items (story 0226-a6f): what the kernel remembers, and the Apple
// Menu Options actions. Reference: Mac OS 8.1 and System 7.5.3 on Infinite
// Mac (10 of each by default, 0-99, most recent kept, off forgets all).
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_RECENT_ITEMS_DEFAULT_COUNT,
	type ClassicyRecentItem,
	classicyRecentItemMissingMessage,
	classicyRecentItemsOf,
	normalizeClassicyRecentItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
// Side effects: the reducers and manifests, as the package barrel loads them.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import "@/SystemFolder/ControlPanels/AppleMenuOptions/ClassicyAppleMenuOptionsManifest";

const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

const reduceAll = (ds: ClassicyStore, actions: ActionMessage[]) =>
	actions.reduce((state, action) => reduce(state, action), ds);

/** The default store with loaded (closed) app records, SimpleText handling text. */
const base = (): ClassicyStore =>
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
		draft.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.TextFile
		] = "SimpleText.app";
		draft.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.Image
		] = "PictureViewer.app";
	});

const open = (id: string): ActionMessage => ({
	type: "ClassicyAppOpen",
	app: { id, name: id, icon: "" },
});

const finderOpen = (
	path: string,
	type = ClassicyFileSystemEntryFileType.TextFile,
): ActionMessage => ({
	type: "ClassicyAppFinderOpenFile",
	file: { _type: type },
	path,
});

const items = (ds: ClassicyStore): ClassicyRecentItem[] =>
	classicyRecentItemsOf(ds).items;
const targets = (ds: ClassicyStore, kind: ClassicyRecentItem["kind"]) =>
	items(ds)
		.filter((i) => i.kind === kind)
		.map((i) => i.appId ?? i.path);

let now = 1_000;
beforeEach(() => {
	now = 1_000;
	// Each use a millisecond later than the last, so order is by use.
	vi.spyOn(Date, "now").mockImplementation(() => {
		now += 1;
		return now;
	});
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe("defaults", () => {
	it("remembers 10 documents and 10 applications, tracking on, nothing yet", () => {
		expect(DefaultAppManagerState.System.Manager.Desktop.recentItems).toEqual({
			enabled: true,
			counts: { application: 10, document: 10 },
			items: [],
		});
		expect(CLASSICY_RECENT_ITEMS_DEFAULT_COUNT).toBe(10);
	});
});

describe("recording", () => {
	it("records an app open by its id and internal name, most recent first", () => {
		const ds = reduceAll(base(), [
			open("SimpleText.app"),
			open("Calculator.app"),
		]);
		expect(items(ds)).toEqual([
			expect.objectContaining({
				kind: "application",
				appId: "Calculator.app",
				name: "Calculator",
			}),
			expect.objectContaining({
				kind: "application",
				appId: "SimpleText.app",
				name: "SimpleText",
			}),
		]);
	});

	it("records a launch from a desktop icon too", () => {
		const ds = reduce(base(), {
			type: "ClassicyDesktopIconOpen",
			iconId: "Calculator.app",
			app: { id: "Calculator.app", name: "Calculator", icon: "" },
		});
		expect(targets(ds, "application")).toEqual(["Calculator.app"]);
	});

	it("never records the Finder, an extension, a control panel or an app nothing loaded", () => {
		const ds = reduceAll(base(), [
			open("Finder.app"),
			open("ScreenSaver.app"),
			open("AppearanceManager.app"),
			open("AppleMenuOptions.app"),
			open("Phantom.app"),
		]);
		expect(items(ds)).toEqual([]);
	});

	it("records a document opened through the Finder's generic queue, and its app", () => {
		const ds = reduce(base(), finderOpen("Macintosh HD:Notes:Plan.txt"));
		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].data?.openFiles,
		).toEqual(["Macintosh HD:Notes:Plan.txt"]);
		expect(items(ds)).toEqual([
			expect.objectContaining({
				kind: "document",
				path: "Macintosh HD:Notes:Plan.txt",
				name: "Plan.txt",
			}),
			expect.objectContaining({ kind: "application", appId: "SimpleText.app" }),
		]);
	});

	it("records a document an app's own OpenFile case received through Finder's routing", () => {
		const ds = reduce(
			base(),
			finderOpen(
				"Macintosh HD:Pictures:Cat.png",
				ClassicyFileSystemEntryFileType.Image,
			),
		);
		expect(targets(ds, "document")).toEqual(["Macintosh HD:Pictures:Cat.png"]);
	});

	it("records a generic OpenFile dispatched directly", () => {
		const ds = reduce(base(), {
			type: "ClassicyAppSimpleTextOpenFile",
			app: { id: "SimpleText.app" },
			path: "Macintosh HD:Read Me",
		});
		expect(targets(ds, "document")).toEqual(["Macintosh HD:Read Me"]);
	});

	it("does not record an open the trust gate refused", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = reduce(
			base(),
			finderOpen(
				"Macintosh HD:Pictures:Cat.png",
				ClassicyFileSystemEntryFileType.Image,
			),
			"untrusted",
		);
		expect(items(ds)).toEqual([]);
	});

	it("keeps one entry per document, moved to the front with its newest time", () => {
		const ds = reduceAll(base(), [
			finderOpen("Macintosh HD:A.txt"),
			finderOpen("Macintosh HD:B.txt"),
			finderOpen("Macintosh HD:A.txt"),
		]);
		expect(targets(ds, "document")).toEqual([
			"Macintosh HD:A.txt",
			"Macintosh HD:B.txt",
		]);
		const [a, b] = items(ds).filter((i) => i.kind === "document");
		expect(a.at).toBeGreaterThan(b.at);
	});

	it("keeps the newest items up to the count, per kind", () => {
		let ds = reduce(base(), {
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "document",
			count: 3,
		});
		ds = reduceAll(ds, [
			finderOpen("Macintosh HD:1.txt"),
			finderOpen("Macintosh HD:2.txt"),
			finderOpen("Macintosh HD:3.txt"),
			finderOpen("Macintosh HD:4.txt"),
		]);
		expect(targets(ds, "document")).toEqual([
			"Macintosh HD:4.txt",
			"Macintosh HD:3.txt",
			"Macintosh HD:2.txt",
		]);
		// The application list keeps its own count.
		expect(targets(ds, "application")).toEqual(["SimpleText.app"]);
	});

	it("follows a document the Finder moves, and one inside a moved folder", () => {
		let ds = reduceAll(base(), [
			finderOpen("Macintosh HD:Notes:Plan.txt"),
			finderOpen("Macintosh HD:Other.txt"),
		]);
		ds = reduce(ds, {
			type: "ClassicyAppFinderPathsMoved",
			moves: [{ from: "Macintosh HD:Notes", to: "Trash:Notes" }],
		});
		expect(targets(ds, "document")).toEqual([
			"Macintosh HD:Other.txt",
			"Trash:Notes:Plan.txt",
		]);
		expect(items(ds).find((i) => i.path === "Trash:Notes:Plan.txt")?.name).toBe(
			"Plan.txt",
		);
	});
});

describe("the Apple Menu Options actions", () => {
	it("turning tracking off forgets every item and records nothing; on again starts empty", () => {
		let ds = reduceAll(base(), [
			open("SimpleText.app"),
			finderOpen("Macintosh HD:A.txt"),
		]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetEnabled",
			enabled: false,
		});
		expect(classicyRecentItemsOf(ds)).toMatchObject({
			enabled: false,
			items: [],
		});
		ds = reduceAll(ds, [
			open("Calculator.app"),
			finderOpen("Macintosh HD:B.txt"),
		]);
		expect(items(ds)).toEqual([]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetEnabled",
			enabled: true,
		});
		expect(items(ds)).toEqual([]);
		ds = reduce(ds, open("Calculator.app"));
		expect(targets(ds, "application")).toEqual(["Calculator.app"]);
	});

	it("clamps a count to 0-99 (999 typed is stored as 99) and trims what is past it", () => {
		let ds = reduceAll(base(), [
			finderOpen("Macintosh HD:1.txt"),
			finderOpen("Macintosh HD:2.txt"),
			finderOpen("Macintosh HD:3.txt"),
		]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "document",
			count: 999,
		});
		expect(classicyRecentItemsOf(ds).counts.document).toBe(99);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "document",
			count: 1,
		});
		expect(targets(ds, "document")).toEqual(["Macintosh HD:3.txt"]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "document",
			count: -4,
		});
		expect(classicyRecentItemsOf(ds).counts.document).toBe(0);
		expect(targets(ds, "document")).toEqual([]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "document",
			count: "x",
		});
		expect(classicyRecentItemsOf(ds).counts.document).toBe(0);
	});

	it("a missing document is forgotten, with the Finder's alias alert", () => {
		let ds = reduceAll(base(), [
			finderOpen("Macintosh HD:Gone.txt"),
			finderOpen("Macintosh HD:Kept.txt"),
		]);
		ds = reduce(ds, {
			type: "ClassicyDesktopRecentItemsMissing",
			kind: "document",
			path: "Macintosh HD:Gone.txt",
		});
		expect(targets(ds, "document")).toEqual(["Macintosh HD:Kept.txt"]);
		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			message:
				"The alias “Gone.txt” could not be opened, because the original item could not be found.",
		});
		expect(classicyRecentItemMissingMessage("X")).toBe(
			"The alias “X” could not be opened, because the original item could not be found.",
		);
	});

	it("ignores the actions from an untrusted dispatch (ClassicyDesktop* is the floor)", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = reduce(
			base(),
			{ type: "ClassicyDesktopRecentItemsSetEnabled", enabled: false },
			"untrusted",
		);
		expect(classicyRecentItemsOf(ds).enabled).toBe(true);
	});
});

describe("persistence", () => {
	it("is saved with the desktop, whole", () => {
		const ds = reduceAll(base(), [
			open("SimpleText.app"),
			finderOpen("Macintosh HD:A.txt"),
		]);
		const saved = JSON.parse(JSON.stringify(sanitizeStateForPersistence(ds)));
		expect(saved.System.Manager.Desktop.recentItems).toEqual(
			ds.System.Manager.Desktop.recentItems,
		);
	});

	it("reads any stored shape: defaults for what is missing, bad items dropped", () => {
		expect(normalizeClassicyRecentItems(undefined)).toEqual({
			enabled: true,
			counts: { application: 10, document: 10 },
			items: [],
		});
		expect(
			normalizeClassicyRecentItems({
				enabled: "yes",
				counts: { document: 250, application: 2.7 },
				items: [
					{ kind: "document", path: "A", name: "A", at: 2 },
					{ kind: "server", path: "B", name: "B", at: 3 },
					{ kind: "document", name: "no path", at: 4 },
					{ kind: "application", appId: "X.app", name: "X", at: "late" },
					{ kind: "document", path: "A", name: "A", at: 1 },
					null,
				],
			}),
		).toEqual({
			enabled: true,
			counts: { application: 2, document: 99 },
			items: [{ kind: "document", path: "A", name: "A", at: 2 }],
		});
	});
});

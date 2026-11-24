// Recent Items (story 0226-a6f): what the kernel remembers, and the Apple
// Menu Options actions. Reference: Mac OS 8.1 and System 7.5.3 on Infinite
// Mac (10 of each by default, 0-99, most recent kept, off forgets all).
import { produce } from "immer";
import { describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	base,
	finderOpen,
	items,
	open,
	reduce,
	reduceAll,
	setUpRecentItemsFixtures,
	targets,
} from "@/SystemFolder/SystemResources/RecentItems/__tests__/recentItemsStore";
import {
	CLASSICY_RECENT_ITEMS_DEFAULT_COUNT,
	classicyRecentItemMissingMessage,
	classicyRecentItemsOf,
	normalizeClassicyRecentItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";

setUpRecentItemsFixtures();

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

describe("only what is really there (review I3, M3)", () => {
	it("never remembers an app nothing loaded, however often it is opened, trusted or not", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		let ds = reduceAll(base(), [
			open("Phantom.app"),
			open("Phantom.app"),
			open("Removed.app"),
			open("Removed.app"),
		]);
		// ClassicyAppOpen is on the default untrusted allowlist: a stack
		// script can name any id and any name.
		for (const id of ["Script Made.app", "Script Made.app", "Removed.app"])
			ds = reduce(
				ds,
				{ type: "ClassicyAppOpen", app: { id, name: "Anything", icon: "" } },
				"untrusted",
			);
		expect(items(ds)).toEqual([]);
		// A script opening an app that is there is a real use.
		ds = reduce(ds, open("Calculator.app"), "untrusted");
		expect(targets(ds, "application")).toEqual(["Calculator.app"]);
	});

	// Fix round 2: an app on neither the desktop nor in the Applications
	// folder (no app-shortcut icon; Web Viewer, opened only by its pages) has
	// nothing to show when chosen on its own, so it is not listed.
	it("never remembers an app the user cannot find (no desktop icon, not in Applications)", () => {
		const hidden = produce(base(), (draft) => {
			draft.System.Manager.Desktop.icons =
				draft.System.Manager.Desktop.icons.filter(
					(i) => i.appId !== "Calculator.app",
				);
		});
		const ds = reduceAll(hidden, [
			open("Calculator.app"),
			open("PDFViewer.app"),
		]);
		expect(targets(ds, "application")).toEqual(["PDFViewer.app"]);
	});

	it("remembers a generic-queue path only when it names a file", () => {
		const ds = reduceAll(base(), [
			{
				type: "ClassicyAppSimpleTextOpenFile",
				app: { id: "SimpleText.app" },
				path: "https://example.com/clip.mp4",
			},
			{
				type: "ClassicyAppSimpleTextOpenFile",
				app: { id: "SimpleText.app" },
				path: "Macintosh HD:Nowhere.txt",
			},
			{
				type: "ClassicyAppSimpleTextOpenFile",
				app: { id: "SimpleText.app" },
				path: "Macintosh HD:Notes",
			},
		]);
		// Queued as before, but none is a file.
		expect(
			ds.System.Manager.Applications.apps["SimpleText.app"].data?.openFiles,
		).toHaveLength(3);
		expect(targets(ds, "document")).toEqual([]);
	});
});

describe("a trashed document (review M4)", () => {
	it("follows its file into the Trash and back out on Restore", () => {
		let ds = reduce(base(), finderOpen("Macintosh HD:Notes:Plan.txt"));
		ds = reduce(ds, {
			type: "ClassicyAppFinderPathsMoved",
			moves: [{ from: "Macintosh HD:Notes:Plan.txt", to: "Trash:Plan.txt" }],
		});
		expect(targets(ds, "document")).toEqual(["Trash:Plan.txt"]);
		ds = reduce(ds, {
			type: "ClassicyAppFinderPathsMoved",
			moves: [{ from: "Trash:Plan.txt", to: "Macintosh HD:Notes:Plan.txt" }],
		});
		expect(targets(ds, "document")).toEqual(["Macintosh HD:Notes:Plan.txt"]);
		expect(items(ds).find((i) => i.kind === "document")?.name).toBe("Plan.txt");
	});
});

describe("a host turning Recent Items off (review M5)", () => {
	it("a defaultState seed of `enabled: false` keeps the counts and records nothing", () => {
		let ds = mergeClassicyState(base(), {
			System: { Manager: { Desktop: { recentItems: { enabled: false } } } },
		});
		expect(classicyRecentItemsOf(ds)).toEqual({
			enabled: false,
			counts: { application: 10, document: 10 },
			items: [],
		});
		ds = reduceAll(ds, [
			open("Calculator.app"),
			finderOpen("Macintosh HD:A.txt"),
		]);
		expect(items(ds)).toEqual([]);
	});
});

describe("the load migration (review M6)", () => {
	const withRecent = (recentItems: unknown): ClassicyStore =>
		produce(DefaultAppManagerState, (draft) => {
			(draft.System.Manager.Desktop as Record<string, unknown>).recentItems =
				recentItems;
		});

	it("normalizes a malformed stored value, idempotently", () => {
		const migrated = migrateClassicyState(
			withRecent({
				enabled: true,
				counts: { application: 500, document: "x" },
				items: [
					{ kind: "document", path: "A", name: "A", at: 1 },
					{ kind: "bogus" },
					"junk",
				],
			}),
		);
		expect(migrated.System.Manager.Desktop.recentItems).toEqual({
			enabled: true,
			counts: { application: 99, document: 10 },
			items: [{ kind: "document", path: "A", name: "A", at: 1 }],
		});
		expect(migrateClassicyState(migrated)).toBe(migrated);
		expect(
			migrateClassicyState(withRecent("not an object")).System.Manager.Desktop
				.recentItems,
		).toEqual({
			enabled: true,
			counts: { application: 10, document: 10 },
			items: [],
		});
	});

	it("leaves a valid value, or none, as it is", () => {
		const valid = withRecent({
			enabled: true,
			counts: { application: 3, document: 4 },
			items: [{ kind: "application", appId: "X.app", name: "X", at: 2 }],
		});
		expect(migrateClassicyState(valid)).toBe(valid);
		const none = produce(DefaultAppManagerState, (draft) => {
			delete draft.System.Manager.Desktop.recentItems;
		});
		expect(migrateClassicyState(none).System.Manager.Desktop.recentItems).toBe(
			undefined,
		);
	});
});

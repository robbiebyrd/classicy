// Documents the apps open themselves, and opening an app for a document
// (story 0226-a6f; the window behavior found during it). Mac OS 8.1 on
// Infinite Mac: a document launching SimpleText shows that document alone,
// and quitting closes the app's documents.
import { produce } from "immer";
import { describe, expect, it } from "vitest";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	base,
	finderOpen,
	open,
	reduce,
	reduceAll,
	setUpRecentItemsFixtures,
	targets,
} from "@/SystemFolder/SystemResources/RecentItems/__tests__/recentItemsStore";

setUpRecentItemsFixtures();

describe("documents apps open themselves (review I2, M2)", () => {
	it("remembers a QuickTime document the Finder opens", () => {
		const ds = reduce(base(), {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_type: ClassicyFileSystemEntryFileType.Video,
				_creator: "QuickTime",
				_data: JSON.stringify({ url: "https://example.com/clip.mp4" }),
			},
			path: "Macintosh HD:Movies:Clip.mov",
		});
		expect(targets(ds, "document")).toEqual(["Macintosh HD:Movies:Clip.mov"]);
		expect(targets(ds, "application")).toEqual(["MoviePlayer.app"]);
	});

	it("remembers the documents the apps' own open actions open", () => {
		const stack: HCStack = {
			name: "Home",
			cards: [{ id: "c1", name: "One", parts: [] }],
		};
		const ds = reduceAll(base(), [
			{
				type: "ClassicyAppPDFViewerOpenFile",
				path: "Macintosh HD:Docs:Manual.pdf",
			},
			{
				type: "ClassicyAppPictureViewerOpenFile",
				path: "Macintosh HD:Pictures:Cat.png",
			},
			{
				type: "ClassicyAppMoviePlayerOpenFile",
				path: "Macintosh HD:Movies:Clip.mov",
			},
			{
				type: "ClassicyAppHyperCardOpenStack",
				stackId: "Macintosh HD:Stacks:Home.stack",
				stackSource: "Macintosh HD:Stacks:Home.stack",
				stack,
			},
			// SimpleText's File > Open... and HyperCard's Open Stack... feed
			// their apps' OpenFile; a surface outside the reducers records
			// through the action.
			{
				type: "ClassicyDesktopRecentItemsRecordDocument",
				path: "Macintosh HD:Read Me",
			},
		]);
		expect(targets(ds, "document")).toEqual([
			"Macintosh HD:Read Me",
			"Macintosh HD:Stacks:Home.stack",
			"Macintosh HD:Movies:Clip.mov",
			"Macintosh HD:Pictures:Cat.png",
			"Macintosh HD:Docs:Manual.pdf",
		]);
	});

	it("remembers a path a QuickTime OpenDocument names, never a URL document", () => {
		const ds = reduceAll(base(), [
			{
				type: "ClassicyAppMoviePlayerOpenDocument",
				document: { url: "https://example.com/a.mp4", name: "A" },
			},
			{
				type: "ClassicyAppPictureViewerOpenDocuments",
				documents: [
					{ url: "https://example.com/b.png" },
					"Macintosh HD:Pictures:Cat.png",
				],
			},
			{
				type: "ClassicyAppMoviePlayerOpenDocument",
				document: "Macintosh HD:Movies:Clip.mov",
			},
		]);
		expect(targets(ds, "document")).toEqual([
			"Macintosh HD:Movies:Clip.mov",
			"Macintosh HD:Pictures:Cat.png",
		]);
	});

	it("does not remember a stack that came from no file", () => {
		const ds = reduce(base(), {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "Home",
			stack: { name: "Home", cards: [{ id: "c1", name: "One", parts: [] }] },
		});
		expect(targets(ds, "document")).toEqual([]);
	});
});

describe("opening an app for a document (found during story 0226-a6f)", () => {
	/** `appId` open, with every window it had closed again. */
	const withClosedWindows = (appId: string, windowIds: string[]) =>
		produce(base(), (draft) => {
			const app = draft.System.Manager.Applications.apps[appId];
			for (const id of windowIds)
				app.windows[id] = {
					id,
					appId,
					closed: true,
					size: [200, 100],
					position: [10, 10],
					minimumSize: [100, 50],
				};
		});
	const closed = (ds: ClassicyStore, appId: string, windowId: string) =>
		getAppWindow(ds.System.Manager.Applications.apps[appId], windowId)?.closed;

	it("a plain open reopens every window the app closed, as before", () => {
		const ds = reduce(
			withClosedWindows("SimpleText.app", ["SimpleText_untitled_1"]),
			open("SimpleText.app"),
		);
		expect(closed(ds, "SimpleText.app", "SimpleText_untitled_1")).toBe(false);
	});

	it("a document open leaves a window the user closed closed, and reopens the document's own", () => {
		const docWindow = "SimpleText.app_file_Macintosh HD:Read Me";
		const ds = reduce(
			withClosedWindows("SimpleText.app", ["SimpleText_untitled_1", docWindow]),
			finderOpen("Macintosh HD:Read Me"),
		);
		expect(closed(ds, "SimpleText.app", "SimpleText_untitled_1")).toBe(true);
		expect(closed(ds, "SimpleText.app", docWindow)).toBe(false);
		expect(ds.System.Manager.Applications.apps["SimpleText.app"].open).toBe(
			true,
		);
	});

	it("an app's own document open does the same (PDF Viewer, Picture Viewer, Movie Player)", () => {
		for (const [appId, action] of [
			[
				"PDFViewer.app",
				{
					type: "ClassicyAppPDFViewerOpenFile",
					path: "Macintosh HD:Docs:Manual.pdf",
				},
			],
			[
				"PictureViewer.app",
				{
					type: "ClassicyAppPictureViewerOpenFile",
					path: "Macintosh HD:Pictures:Cat.png",
				},
			],
			[
				"MoviePlayer.app",
				{
					type: "ClassicyAppMoviePlayerOpenDocument",
					document: { url: "https://example.com/a.mp4" },
				},
			],
		] as [string, ActionMessage][]) {
			const ds = reduce(withClosedWindows(appId, ["old_window"]), action);
			expect(closed(ds, appId, "old_window"), appId).toBe(true);
			expect(ds.System.Manager.Applications.apps[appId].open, appId).toBe(true);
		}
	});

	it("quitting closes the app's documents, so a later open never brings one back", () => {
		const openFiles = (ds: ClassicyStore, appId: string) =>
			ds.System.Manager.Applications.apps[appId].data?.openFiles;
		let ds = reduceAll(base(), [
			{
				type: "ClassicyAppPictureViewerOpenFile",
				path: "Macintosh HD:Pictures:Cat.png",
			},
			finderOpen("Macintosh HD:Read Me"),
			{ type: "ClassicyAppClose", app: { id: "PictureViewer.app" } },
			{ type: "ClassicyAppClose", app: { id: "SimpleText.app" } },
		]);
		expect(openFiles(ds, "PictureViewer.app")).toEqual([]);
		expect(openFiles(ds, "SimpleText.app")).toEqual([]);
		ds = reduceAll(ds, [
			{
				type: "ClassicyAppPictureViewerOpenFile",
				path: "Macintosh HD:Docs:Manual.pdf",
			},
			open("SimpleText.app"),
		]);
		expect(openFiles(ds, "PictureViewer.app")).toEqual([
			"Macintosh HD:Docs:Manual.pdf",
		]);
		expect(openFiles(ds, "SimpleText.app")).toEqual([]);
	});

	it("HyperCard opens a stack in its one window, and no other", () => {
		const ds = reduce(
			withClosedWindows("HyperCard.app", [
				"hypercard_main",
				"hypercard_script",
			]),
			{
				type: "ClassicyAppHyperCardOpenFile",
				path: "Macintosh HD:Stacks:Home.stack",
			},
		);
		expect(closed(ds, "HyperCard.app", "hypercard_main")).toBe(false);
		expect(closed(ds, "HyperCard.app", "hypercard_script")).toBe(true);
	});
});

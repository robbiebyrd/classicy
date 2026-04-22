import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyQuickTimeMoviePlayerEventHandler } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

vi.mock("@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils", () => ({
	MoviePlayerAppInfo: {
		id: "MoviePlayer.app",
		name: "Movie Player",
		icon: "movie-icon.png",
	},
}));

function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: [],
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map(
							(type) => [type, "Finder.app"],
						),
					) as Record<ClassicyFileSystemEntryFileType, string>,
				},
				Appearance: {
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
			},
		},
	};
}

function makeStoreWithMoviePlayer(): ClassicyStore {
	const ds = makeStore();
	ds.System.Manager.Applications.apps["MoviePlayer.app"] = {
		id: "MoviePlayer.app",
		name: "Movie Player",
		icon: "movie-icon.png",
		open: false,
		focused: false,
		windows: [],
		data: { openFiles: [] },
	};
	return ds;
}

describe("classicyQuickTimeMoviePlayerEventHandler — ClassicyAppMoviePlayerOpenDocument", () => {
	it("adds a document to openFiles", () => {
		const ds = makeStoreWithMoviePlayer();
		const doc = { url: "http://example.com/movie.mp4", name: "Movie" };

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: doc,
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(1);
		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles[0].url,
		).toBe(doc.url);
	});

	it("deduplicates by URL — same URL is not added twice", () => {
		const ds = makeStoreWithMoviePlayer();
		const doc = { url: "http://example.com/movie.mp4", name: "Movie" };

		let result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: doc,
		});
		result = classicyQuickTimeMoviePlayerEventHandler(result, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: doc,
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(1);
	});

	it("is a no-op when document is undefined", () => {
		const ds = makeStoreWithMoviePlayer();

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: undefined,
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(0);
	});

	it("opens the app when a new document is added", () => {
		const ds = makeStoreWithMoviePlayer();
		const doc = { url: "http://example.com/movie.mp4", name: "Movie" };

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: doc,
		});

		expect(result.System.Manager.Applications.apps["MoviePlayer.app"].open).toBe(true);
	});
});

describe("classicyQuickTimeMoviePlayerEventHandler — ClassicyAppMoviePlayerOpenDocuments", () => {
	it("bulk adds multiple documents", () => {
		const ds = makeStoreWithMoviePlayer();
		const docs = [
			{ url: "http://example.com/a.mp4", name: "A" },
			{ url: "http://example.com/b.mp4", name: "B" },
		];

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocuments",
			documents: docs,
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(2);
	});

	it("filters out duplicates when bulk adding", () => {
		const ds = makeStoreWithMoviePlayer();
		ds.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles = [
			{ url: "http://example.com/a.mp4", name: "A" },
		];

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocuments",
			documents: [
				{ url: "http://example.com/a.mp4", name: "A" },
				{ url: "http://example.com/b.mp4", name: "B" },
			],
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(2);
		const urls = result.System.Manager.Applications.apps[
			"MoviePlayer.app"
		].data.openFiles.map((f: { url: string }) => f.url);
		expect(urls).toContain("http://example.com/a.mp4");
		expect(urls).toContain("http://example.com/b.mp4");
	});

	it("opens the app when bulk adding documents", () => {
		const ds = makeStoreWithMoviePlayer();

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocuments",
			documents: [{ url: "http://example.com/a.mp4", name: "A" }],
		});

		expect(result.System.Manager.Applications.apps["MoviePlayer.app"].open).toBe(true);
	});
});

describe("classicyQuickTimeMoviePlayerEventHandler — ClassicyAppMoviePlayerCloseDocument", () => {
	it("removes a document by URL", () => {
		const ds = makeStoreWithMoviePlayer();
		ds.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles = [
			{ url: "http://example.com/a.mp4", name: "A" },
			{ url: "http://example.com/b.mp4", name: "B" },
		];

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerCloseDocument",
			document: { url: "http://example.com/a.mp4" },
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(1);
		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles[0].url,
		).toBe("http://example.com/b.mp4");
	});

	it("is a no-op when the document URL does not exist in openFiles", () => {
		const ds = makeStoreWithMoviePlayer();
		ds.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles = [
			{ url: "http://example.com/a.mp4", name: "A" },
		];

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerCloseDocument",
			document: { url: "http://example.com/nonexistent.mp4" },
		});

		expect(
			result.System.Manager.Applications.apps["MoviePlayer.app"].data.openFiles,
		).toHaveLength(1);
	});
});

describe("classicyQuickTimeMoviePlayerEventHandler — guard", () => {
	it("returns ds unchanged when MoviePlayer.app is not registered", () => {
		const ds = makeStore();

		const result = classicyQuickTimeMoviePlayerEventHandler(ds, {
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: { url: "http://example.com/movie.mp4" },
		});

		expect(result.System.Manager.Applications.apps["MoviePlayer.app"]).toBeUndefined();
	});
});

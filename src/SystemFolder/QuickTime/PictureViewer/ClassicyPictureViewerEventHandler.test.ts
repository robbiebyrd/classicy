import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopStateEventReducer } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyQuickTimePictureViewerEventHandler } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import {
	isPictureViewerData,
	type PictureViewerOpenFile,
	type QuickTimeImageDocument,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

vi.mock("@/SystemFolder/QuickTime/PictureViewer/PictureViewer", () => ({
	PictureViewerAppInfo: {
		id: "PictureViewer.app",
		name: "Picture Viewer",
		icon: "picture-icon.png",
	},
}));

// PictureViewerContext imports ClassicyQuickTimeDocument from MoviePlayerContext,
// which in turn imports MoviePlayerUtils (which imports an image). Mock it too.
vi.mock(
	import("@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils"),
	async (importOriginal) => {
		const actual = await importOriginal();
		return {
			...actual,
			MoviePlayerAppInfo: {
				id: "MoviePlayer.app",
				name: "Movie Player",
				icon: "movie-icon.png",
			},
		};
	},
);

vi.mock(
	import("@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils"),
	async (importOriginal) => {
		const actual = await importOriginal();
		return {
			...actual,
			PictureViewerAppInfo: {
				id: "PictureViewer.app",
				name: "Picture Viewer",
				icon: "picture-icon.png",
			},
		};
	},
);

function makeStore(
	overrides: Partial<{
		minDateTime: string | null;
		maxDateTime: string | null;
		boundaryLocked: boolean;
		paused: boolean;
		dateTime: string;
	}> = {},
): ClassicyStore {
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
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					...overrides,
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
						Object.values(ClassicyFileSystemEntryFileType).map((type) => [
							type,
							"Finder.app",
						]),
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

function makeStoreWithPictureViewer(): ClassicyStore {
	const ds = makeStore();
	ds.System.Manager.Applications.apps["PictureViewer.app"] = {
		id: "PictureViewer.app",
		name: "Picture Viewer",
		icon: "picture-icon.png",
		open: false,
		focused: false,
		windows: [],
		data: { openFiles: [] },
	};
	return ds;
}

function getOpenFiles(ds: ClassicyStore): QuickTimeImageDocument[] {
	const data = ds.System.Manager.Applications.apps["PictureViewer.app"]?.data ?? {};
	return isPictureViewerData(data)
		? (data.openFiles as QuickTimeImageDocument[])
		: [];
}

function getRawOpenFiles(ds: ClassicyStore): PictureViewerOpenFile[] {
	const data = ds.System.Manager.Applications.apps["PictureViewer.app"]?.data ?? {};
	return isPictureViewerData(data) ? data.openFiles : [];
}

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerOpenDocument", () => {
	it("adds a document to openFiles", () => {
		const ds = makeStoreWithPictureViewer();
		const doc = { url: "http://example.com/image.png", name: "Image" };

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});

		expect(getOpenFiles(result)).toHaveLength(1);
		expect(getOpenFiles(result)[0].url).toBe(doc.url);
	});

	it("deduplicates by URL — same URL is not added twice", () => {
		const ds = makeStoreWithPictureViewer();
		const doc = { url: "http://example.com/image.png", name: "Image" };

		let result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});
		result = classicyQuickTimePictureViewerEventHandler(result, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});

		expect(getOpenFiles(result)).toHaveLength(1);
	});

	it("opens the app when a new document is added", () => {
		const ds = makeStoreWithPictureViewer();
		const doc = { url: "http://example.com/image.png", name: "Image" };

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});

		expect(
			result.System.Manager.Applications.apps["PictureViewer.app"].open,
		).toBe(true);
	});
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerOpenDocuments", () => {
	it("bulk adds multiple documents", () => {
		const ds = makeStoreWithPictureViewer();
		const docs = [
			{ url: "http://example.com/a.png", name: "A" },
			{ url: "http://example.com/b.png", name: "B" },
		];

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocuments",
			documents: docs,
		});

		expect(getOpenFiles(result)).toHaveLength(2);
	});

	it("filters out duplicates when bulk adding", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [{ url: "http://example.com/a.png", name: "A" }],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocuments",
			documents: [
				{ url: "http://example.com/a.png", name: "A" },
				{ url: "http://example.com/b.png", name: "B" },
			],
		});

		expect(getOpenFiles(result)).toHaveLength(2);
		const urls = getOpenFiles(result).map((f) => f.url);
		expect(urls).toContain("http://example.com/a.png");
		expect(urls).toContain("http://example.com/b.png");
	});

	it("opens the app when bulk adding documents", () => {
		const ds = makeStoreWithPictureViewer();

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocuments",
			documents: [{ url: "http://example.com/a.png", name: "A" }],
		});

		expect(
			result.System.Manager.Applications.apps["PictureViewer.app"].open,
		).toBe(true);
	});
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerCloseDocument", () => {
	it("removes a document by URL", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [
				{ url: "http://example.com/a.png", name: "A" },
				{ url: "http://example.com/b.png", name: "B" },
			],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerCloseDocument",
			document: { url: "http://example.com/a.png" },
		});

		expect(getOpenFiles(result)).toHaveLength(1);
		expect(getOpenFiles(result)[0].url).toBe("http://example.com/b.png");
	});

	it("is a no-op when the document URL does not exist in openFiles", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [{ url: "http://example.com/a.png", name: "A" }],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerCloseDocument",
			document: { url: "http://example.com/nonexistent.png" },
		});

		expect(getOpenFiles(result)).toHaveLength(1);
	});
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerOpenFile", () => {
	it("adds a filesystem path to openFiles", () => {
		const ds = makeStoreWithPictureViewer();

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenFile",
			path: "Macintosh HD:Documents:Photos:photo.jpg",
		});

		expect(getRawOpenFiles(result)).toEqual([
			"Macintosh HD:Documents:Photos:photo.jpg",
		]);
	});

	it("deduplicates by path — the same path is not added twice", () => {
		const ds = makeStoreWithPictureViewer();
		const path = "Macintosh HD:Documents:Photos:photo.jpg";

		let result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenFile",
			path,
		});
		result = classicyQuickTimePictureViewerEventHandler(result, {
			type: "ClassicyAppPictureViewerOpenFile",
			path,
		});

		expect(getRawOpenFiles(result)).toHaveLength(1);
	});

	it("opens the app when a new path is added", () => {
		const ds = makeStoreWithPictureViewer();

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenFile",
			path: "Macintosh HD:Documents:Photos:photo.jpg",
		});

		expect(
			result.System.Manager.Applications.apps["PictureViewer.app"].open,
		).toBe(true);
	});

	it("coexists with manually-opened documents in the same openFiles list", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [{ url: "http://example.com/a.png", name: "A" }],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenFile",
			path: "Macintosh HD:Documents:Photos:photo.jpg",
		});

		expect(getRawOpenFiles(result)).toEqual([
			{ url: "http://example.com/a.png", name: "A" },
			"Macintosh HD:Documents:Photos:photo.jpg",
		]);
	});
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerCloseFile", () => {
	it("removes a document by path", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [
				"Macintosh HD:Documents:Photos:a.jpg",
				"Macintosh HD:Documents:Photos:b.jpg",
			],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerCloseFile",
			path: "Macintosh HD:Documents:Photos:a.jpg",
		});

		expect(getRawOpenFiles(result)).toEqual([
			"Macintosh HD:Documents:Photos:b.jpg",
		]);
	});

	it("does not remove manually-opened documents with the same shape", () => {
		const ds = makeStoreWithPictureViewer();
		ds.System.Manager.Applications.apps["PictureViewer.app"].data = {
			openFiles: [
				{ url: "http://example.com/a.png", name: "A" },
				"Macintosh HD:Documents:Photos:a.jpg",
			],
		};

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerCloseFile",
			path: "Macintosh HD:Documents:Photos:a.jpg",
		});

		expect(getRawOpenFiles(result)).toEqual([
			{ url: "http://example.com/a.png", name: "A" },
		]);
	});
});

describe("classicyDesktopStateEventReducer routes ClassicyAppPictureViewer* events", () => {
	it("routes ClassicyAppPictureViewerOpenDocument via the reducer", () => {
		const ds = makeStoreWithPictureViewer();
		const doc = { url: "http://example.com/routed.png", name: "Routed" };

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});

		expect(getOpenFiles(result)).toHaveLength(1);
		expect(getOpenFiles(result)[0].url).toBe(doc.url);
	});
});

describe("classicyQuickTimePictureViewerEventHandler — auto-load when unregistered", () => {
	it("auto-registers PictureViewer.app via classicyAppEventHandler when not in the store", () => {
		const ds = makeStore();

		// PictureViewer is not registered — the handler should auto-load it via ClassicyAppLoad
		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: { url: "http://example.com/image.png" },
		});

		expect(
			result.System.Manager.Applications.apps["PictureViewer.app"],
		).toBeDefined();
	});

	it("adds the document after auto-loading PictureViewer.app", () => {
		const ds = makeStore();
		const doc = { url: "http://example.com/image.png", name: "Image" };

		const result = classicyQuickTimePictureViewerEventHandler(ds, {
			type: "ClassicyAppPictureViewerOpenDocument",
			document: doc,
		});

		expect(getOpenFiles(result)).toHaveLength(1);
		expect(getOpenFiles(result)[0].url).toBe(doc.url);
	});
});

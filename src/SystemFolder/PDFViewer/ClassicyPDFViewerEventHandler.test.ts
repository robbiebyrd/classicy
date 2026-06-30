import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopStateEventReducer } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyPDFViewerEventHandler } from "@/SystemFolder/PDFViewer/PDFViewerContext";
import { isPDFViewerData } from "@/SystemFolder/PDFViewer/PDFViewerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

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
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
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

function makeStoreWithPDFViewer(): ClassicyStore {
	const ds = makeStore();
	ds.System.Manager.Applications.apps["PDFViewer.app"] = {
		id: "PDFViewer.app",
		name: "PDFViewer",
		icon: "pdf-icon.png",
		open: false,
		focused: false,
		windows: [],
		data: { openFiles: [] },
	};
	return ds;
}

function getOpenFiles(ds: ClassicyStore): string[] {
	const data = ds.System.Manager.Applications.apps["PDFViewer.app"]?.data ?? {};
	return isPDFViewerData(data) ? data.openFiles : [];
}

describe("classicyPDFViewerEventHandler — ClassicyAppPDFViewerOpenFile", () => {
	it("adds a path to openFiles", () => {
		const ds = makeStoreWithPDFViewer();

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerOpenFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(getOpenFiles(result)).toEqual(["Macintosh HD:Documents:Sample.pdf"]);
	});

	it("deduplicates by path — same path is not added twice", () => {
		const ds = makeStoreWithPDFViewer();
		const action = {
			type: "ClassicyAppPDFViewerOpenFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		};

		let result = classicyPDFViewerEventHandler(ds, action);
		result = classicyPDFViewerEventHandler(result, action);

		expect(getOpenFiles(result)).toHaveLength(1);
	});

	it("opens the app when a new file is added", () => {
		const ds = makeStoreWithPDFViewer();

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerOpenFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(result.System.Manager.Applications.apps["PDFViewer.app"].open).toBe(
			true,
		);
	});
});

describe("classicyPDFViewerEventHandler — ClassicyAppPDFViewerCloseFile", () => {
	it("removes a path from openFiles", () => {
		const ds = makeStoreWithPDFViewer();
		ds.System.Manager.Applications.apps["PDFViewer.app"].data = {
			openFiles: [
				"Macintosh HD:Documents:Sample.pdf",
				"Macintosh HD:Documents:Other.pdf",
			],
		};

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerCloseFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(getOpenFiles(result)).toEqual(["Macintosh HD:Documents:Other.pdf"]);
	});

	it("is a no-op when the path does not exist in openFiles", () => {
		const ds = makeStoreWithPDFViewer();
		ds.System.Manager.Applications.apps["PDFViewer.app"].data = {
			openFiles: ["Macintosh HD:Documents:Sample.pdf"],
		};

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerCloseFile",
			path: "Macintosh HD:Documents:Nonexistent.pdf",
		});

		expect(getOpenFiles(result)).toHaveLength(1);
	});
});

describe("classicyDesktopStateEventReducer routes ClassicyAppPDFViewer* events", () => {
	it("routes ClassicyAppPDFViewerOpenFile via the reducer", () => {
		const ds = makeStoreWithPDFViewer();

		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppPDFViewerOpenFile",
			app: { id: "PDFViewer.app" },
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(getOpenFiles(result)).toEqual(["Macintosh HD:Documents:Sample.pdf"]);
	});
});

describe("classicyPDFViewerEventHandler — auto-load when unregistered", () => {
	it("auto-registers PDFViewer.app via classicyAppEventHandler when not in the store", () => {
		const ds = makeStore();

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerOpenFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(
			result.System.Manager.Applications.apps["PDFViewer.app"],
		).toBeDefined();
	});

	it("adds the path after auto-loading PDFViewer.app", () => {
		const ds = makeStore();

		const result = classicyPDFViewerEventHandler(ds, {
			type: "ClassicyAppPDFViewerOpenFile",
			path: "Macintosh HD:Documents:Sample.pdf",
		});

		expect(getOpenFiles(result)).toEqual(["Macintosh HD:Documents:Sample.pdf"]);
	});
});

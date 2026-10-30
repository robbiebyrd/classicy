import { z } from "zod";
import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	isPDFViewerData,
	PDFViewerAppInfo,
	type PDFViewerData,
	PDFViewerDataSchema,
} from "@/SystemFolder/PDFViewer/PDFViewerUtils";

type ClassicyPDFViewerEvent = {
	type: string;
	path?: string;
};

export const classicyPDFViewerEventHandler = (
	ds: ClassicyStore,
	action: ClassicyPDFViewerEvent,
) => {
	const { id: appId } = PDFViewerAppInfo;
	// Unlike the kernel's generic handler, this creates a missing record and
	// replaces invalid `data` with `{ openFiles: [] }` (dropping other keys).
	// Those are the only states where a ClassicyAppPDFViewerCloseFile differs
	// from the generic close, and the UI cannot reach them: a close box only
	// shows for a queued file, so the record and its `openFiles` exist.
	if (!ds.System.Manager.Applications.apps[appId]) {
		loadApp(
			ds,
			PDFViewerAppInfo.id,
			PDFViewerAppInfo.name,
			PDFViewerAppInfo.icon,
		);
	}

	const rawData = ds.System.Manager.Applications.apps[appId].data ?? {};
	if (!isPDFViewerData(rawData)) {
		ds.System.Manager.Applications.apps[appId].data = { openFiles: [] };
	}
	const appData = ds.System.Manager.Applications.apps[appId]
		.data as PDFViewerData;

	switch (action.type) {
		case "ClassicyAppPDFViewerOpenFile": {
			if (action.path && !appData.openFiles.includes(action.path)) {
				appData.openFiles = [...appData.openFiles, action.path];
				openApp(
					ds,
					PDFViewerAppInfo.id,
					PDFViewerAppInfo.name,
					PDFViewerAppInfo.icon,
				);
			}
			break;
		}
		case "ClassicyAppPDFViewerCloseFile": {
			appData.openFiles = appData.openFiles.filter((p) => p !== action.path);
			break;
		}
	}
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppPDFViewer* events
// without a hard-wired import. registerApp also records the manifest (action
// and state shapes with commentary) for balloon help, discovery, and dev-mode
// kernel state validation.
registerApp({
	id: PDFViewerAppInfo.id,
	description: "PDF document viewer with pan and zoom.",
	prefix: "ClassicyAppPDFViewer",
	handler: classicyPDFViewerEventHandler,
	actions: {
		ClassicyAppPDFViewerOpenFile: {
			description: "Open a PDF from the file system in a viewer window.",
			params: z.object({
				path: z.string().describe("Path of the PDF to open."),
			}),
		},
		ClassicyAppPDFViewerCloseFile: {
			description: "Close the viewer window for a PDF path.",
			params: z.object({
				path: z.string().describe("Path of the PDF to close."),
			}),
		},
	},
	state: PDFViewerDataSchema,
});

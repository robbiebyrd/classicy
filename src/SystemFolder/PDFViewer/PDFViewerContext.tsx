import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	isPDFViewerData,
	PDFViewerAppInfo,
	type PDFViewerData,
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
// without a hard-wired import.
registerAppEventHandler("ClassicyAppPDFViewer", classicyPDFViewerEventHandler);

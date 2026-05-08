import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyQuickTimeDocument } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import {
	PictureViewerAppInfo,
	isPictureViewerData,
	type PictureViewerData,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";

type classicyQuickTimeEvent = {
	type: string;
	document?: ClassicyQuickTimeDocument;
	documents?: ClassicyQuickTimeDocument[];
};

export const classicyQuickTimePictureViewerEventHandler = (
	ds: ClassicyStore,
	action: classicyQuickTimeEvent,
) => {
	const { id: appId } = PictureViewerAppInfo;
	if (!ds.System.Manager.Applications.apps[appId]) {
		loadApp(
			ds,
			PictureViewerAppInfo.id,
			PictureViewerAppInfo.name,
			PictureViewerAppInfo.icon,
		);
	}

	const rawData = ds.System.Manager.Applications.apps[appId].data ?? {};
	if (!isPictureViewerData(rawData)) {
		ds.System.Manager.Applications.apps[appId].data = { openFiles: [] };
	}
	const appData = ds.System.Manager.Applications.apps[appId]
		.data as PictureViewerData;

	const openDocUrls = appData.openFiles.map(
		(of: ClassicyQuickTimeDocument) => of.url,
	);

	switch (action.type) {
		case "ClassicyAppPictureViewerOpenDocument": {
			if (
				Array.isArray(openDocUrls) &&
				!openDocUrls.includes(action.document?.url)
			) {
				appData.openFiles = [...appData.openFiles, action.document];
				openApp(
					ds,
					PictureViewerAppInfo.id,
					PictureViewerAppInfo.name,
					PictureViewerAppInfo.icon,
				);
			}
			break;
		}
		case "ClassicyAppPictureViewerOpenDocuments": {
			const docs = action.documents?.filter(
				(doc) => !openDocUrls.includes(doc.url),
			);
			if (!docs) {
				break;
			}
			appData.openFiles = [...appData.openFiles, ...docs];
			openApp(
				ds,
				PictureViewerAppInfo.id,
				PictureViewerAppInfo.name,
				PictureViewerAppInfo.icon,
			);
			break;
		}
		case "ClassicyAppPictureViewerCloseDocument": {
			appData.openFiles = appData.openFiles.filter(
				(p: ClassicyQuickTimeDocument) => p.url !== action.document?.url,
			);
			break;
		}
	}
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppPictureViewer* events
// without a hard-wired import.
registerAppEventHandler(
	"ClassicyAppPictureViewer",
	classicyQuickTimePictureViewerEventHandler,
);

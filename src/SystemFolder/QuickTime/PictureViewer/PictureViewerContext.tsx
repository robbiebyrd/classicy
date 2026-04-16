import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyQuickTimeDocument } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import { PictureViewerAppInfo } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";

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

	if (!ds.System.Manager.Applications.apps[appId].data) {
		ds.System.Manager.Applications.apps[appId].data = {};
	}

	if (!("openFiles" in ds.System.Manager.Applications.apps[appId].data)) {
		ds.System.Manager.Applications.apps[appId].data.openFiles = [];
	}

	const openDocUrls = ds.System.Manager.Applications.apps[appId].data.openFiles.map(
		(of: ClassicyQuickTimeDocument) => of.url,
	);

	switch (action.type) {
		case "ClassicyAppPictureViewerOpenDocument": {
			if (
				Array.isArray(openDocUrls) &&
				!openDocUrls.includes(action.document?.url)
			) {
				ds.System.Manager.Applications.apps[appId].data.openFiles = [
					...ds.System.Manager.Applications.apps[appId].data.openFiles,
					action.document,
				];
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
			ds.System.Manager.Applications.apps[appId].data.openFiles = [
				...ds.System.Manager.Applications.apps[appId].data.openFiles,
				...docs,
			];
			openApp(
				ds,
				PictureViewerAppInfo.id,
				PictureViewerAppInfo.name,
				PictureViewerAppInfo.icon,
			);
			break;
		}
		case "ClassicyAppPictureViewerCloseDocument": {
			ds.System.Manager.Applications.apps[appId].data.openFiles =
				ds.System.Manager.Applications.apps[appId].data.openFiles.filter(
					(p: ClassicyQuickTimeDocument) => p.url !== action.document?.url,
				);
			break;
		}
	}
	return ds;
};

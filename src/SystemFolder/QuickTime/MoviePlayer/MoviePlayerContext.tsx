import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";

export type ClassicyQuickTimeDocument = {
	url: string;
	name?: string;
	options?: object;
	icon?: string;
	type?: "video" | "audio" | "image";
};

type classicyQuickTimeEvent = {
	type: string;
	document?: ClassicyQuickTimeDocument;
	documents?: ClassicyQuickTimeDocument[];
};

export const classicyQuickTimeMoviePlayerEventHandler = (
	ds: ClassicyStore,
	action: classicyQuickTimeEvent,
) => {
	const { id: appId } = MoviePlayerAppInfo;

	if (!ds.System.Manager.Applications.apps[appId]) return ds;

	if (!ds.System.Manager.Applications.apps[appId].data) {
		ds.System.Manager.Applications.apps[appId].data = {};
	}

	if (!("openFiles" in ds.System.Manager.Applications.apps[appId].data)) {
		ds.System.Manager.Applications.apps[appId].data.openFiles = [];
	}

	const openDocUrls = ds.System.Manager.Applications.apps[appId]?.data.openFiles.map(
		(app: ClassicyQuickTimeDocument) => app.url,
	);

	switch (action.type) {
		case "ClassicyAppMoviePlayerOpenDocument": {
			if (!action.document) {
				break;
			}
			if (
				Array.isArray(openDocUrls) &&
				!openDocUrls.includes(action.document.url)
			) {
				ds.System.Manager.Applications.apps[appId].data.openFiles = [
					...ds.System.Manager.Applications.apps[appId].data.openFiles,
					action.document,
				];
				openApp(
					ds,
					MoviePlayerAppInfo.id,
					MoviePlayerAppInfo.name,
					MoviePlayerAppInfo.icon,
				);
			}
			break;
		}
		case "ClassicyAppMoviePlayerOpenDocuments": {
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
				MoviePlayerAppInfo.id,
				MoviePlayerAppInfo.name,
				MoviePlayerAppInfo.icon,
			);
			break;
		}
		case "ClassicyAppMoviePlayerCloseDocument": {
			if (!action.document) {
				break;
			}

			ds.System.Manager.Applications.apps[appId].data.openFiles =
				ds.System.Manager.Applications.apps[appId].data.openFiles.filter(
					(p: ClassicyQuickTimeDocument) => p.url !== action.document?.url,
				);
			break;
		}
	}
	return ds;
};

import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	MoviePlayerAppInfo,
	isMoviePlayerData,
	type MoviePlayerData,
} from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";

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
	path?: string;
};

export const classicyQuickTimeMoviePlayerEventHandler = (
	ds: ClassicyStore,
	action: classicyQuickTimeEvent,
) => {
	const { id: appId } = MoviePlayerAppInfo;

	if (!ds.System.Manager.Applications.apps[appId]) return ds;

	const rawData = ds.System.Manager.Applications.apps[appId].data ?? {};
	if (!isMoviePlayerData(rawData)) {
		ds.System.Manager.Applications.apps[appId].data = { openFiles: [] };
	}
	const appData = ds.System.Manager.Applications.apps[appId]
		.data as MoviePlayerData;

	const openDocUrls = appData.openFiles.map((doc) =>
		typeof doc === "string" ? undefined : doc.url,
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
				appData.openFiles = [...appData.openFiles, action.document];
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
			appData.openFiles = [...appData.openFiles, ...docs];
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
			appData.openFiles = appData.openFiles.filter(
				(p) => typeof p === "string" || p.url !== action.document?.url,
			);
			break;
		}
		// Opened from Finder via a ClassicyFileSystem path — resolved to an
		// actual video/audio source (url or _data) at render time in MoviePlayer.tsx.
		case "ClassicyAppMoviePlayerOpenFile": {
			if (action.path && !appData.openFiles.includes(action.path)) {
				appData.openFiles = [...appData.openFiles, action.path];
				openApp(
					ds,
					MoviePlayerAppInfo.id,
					MoviePlayerAppInfo.name,
					MoviePlayerAppInfo.icon,
				);
			}
			break;
		}
		case "ClassicyAppMoviePlayerCloseFile": {
			appData.openFiles = appData.openFiles.filter((p) => p !== action.path);
			break;
		}
	}
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppMoviePlayer* events
// without a hard-wired import.
registerAppEventHandler(
	"ClassicyAppMoviePlayer",
	classicyQuickTimeMoviePlayerEventHandler,
);

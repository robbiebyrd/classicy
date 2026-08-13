import { z } from "zod";
import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	isMoviePlayerData,
	MoviePlayerAppInfo,
	type MoviePlayerData,
	MoviePlayerDataSchema,
	MoviePlayerOpenFileSchema,
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
// without a hard-wired import. registerApp also records the manifest (action
// and state shapes with commentary) for balloon help, discovery, and dev-mode
// kernel state validation.
registerApp({
	id: MoviePlayerAppInfo.id,
	description: "QuickTime movie and audio player.",
	prefix: "ClassicyAppMoviePlayer",
	handler: classicyQuickTimeMoviePlayerEventHandler,
	actions: {
		ClassicyAppMoviePlayerOpenDocument: {
			description: "Open a media document in a new player window.",
			params: z.object({
				document: MoviePlayerOpenFileSchema.describe(
					"The media document to open.",
				),
			}),
		},
		ClassicyAppMoviePlayerOpenDocuments: {
			description: "Open several media documents at once.",
			params: z.object({
				documents: z
					.array(MoviePlayerOpenFileSchema)
					.describe("The media documents to open."),
			}),
		},
		ClassicyAppMoviePlayerCloseDocument: {
			description: "Close the player window for a media document.",
			params: z.object({
				document: MoviePlayerOpenFileSchema.describe(
					"The media document to close, matched by url.",
				),
			}),
		},
		ClassicyAppMoviePlayerOpenFile: {
			description: "Open a media file from the file system by path.",
			params: z.object({
				path: z.string().describe("Path of the media file to open."),
			}),
		},
		ClassicyAppMoviePlayerCloseFile: {
			description: "Close the player window for a file-system path.",
			params: z.object({
				path: z.string().describe("Path of the media file to close."),
			}),
		},
	},
	state: MoviePlayerDataSchema,
});

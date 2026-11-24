import { z } from "zod";
import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import type { ClassicyQuickTimeDocument } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import {
	isPictureViewerData,
	PictureViewerAppInfo,
	type PictureViewerData,
	PictureViewerDataSchema,
	type PictureViewerOpenFile,
	PictureViewerOpenFileSchema,
	pictureViewerDocumentKey,
	pictureViewerWindowId,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";
import { recordClassicyRecentDocument } from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";

type classicyQuickTimeEvent = {
	type: string;
	document?: ClassicyQuickTimeDocument;
	documents?: ClassicyQuickTimeDocument[];
	path?: string;
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

	// Each open document's key: a path string is known by its path, a URL
	// object by its URL (a path string used to map to nothing, so a second
	// one was skipped as already open).
	const openDocKeys = appData.openFiles.map(pictureViewerDocumentKey);

	switch (action.type) {
		case "ClassicyAppPictureViewerOpenDocument": {
			const document = action.document as unknown as
				| PictureViewerOpenFile
				| undefined;
			const key = document && pictureViewerDocumentKey(document);
			if (document && key !== undefined && !openDocKeys.includes(key)) {
				appData.openFiles = [...appData.openFiles, document];
				// A document open: its window opens as it mounts; a
				// file-system path is remembered under Recent Documents.
				openApp(
					ds,
					PictureViewerAppInfo.id,
					PictureViewerAppInfo.name,
					PictureViewerAppInfo.icon,
					// Its window: a document is a URL object; one given as a path
					// string (untyped callers) is a file-system path.
					typeof document === "string"
						? { document, windows: [pictureViewerWindowId(key)] }
						: { windows: [pictureViewerWindowId(key)] },
				);
			}
			break;
		}
		case "ClassicyAppPictureViewerOpenDocuments": {
			const docs = action.documents?.filter(
				(doc, index, all) =>
					!openDocKeys.includes(pictureViewerDocumentKey(doc)) &&
					all.findIndex(
						(other) =>
							pictureViewerDocumentKey(other) === pictureViewerDocumentKey(doc),
					) === index,
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
				{
					windows: docs.map((doc) =>
						pictureViewerWindowId(pictureViewerDocumentKey(doc)),
					),
				},
			);
			for (const doc of docs) recordClassicyRecentDocument(ds, doc);
			break;
		}
		case "ClassicyAppPictureViewerCloseDocument": {
			appData.openFiles = appData.openFiles.filter(
				(p) => typeof p === "string" || p.url !== action.document?.url,
			);
			break;
		}
		// Opened from Finder via a ClassicyFileSystem path — resolved to an
		// actual image source (url or _data) at render time in PictureViewer.tsx.
		case "ClassicyAppPictureViewerOpenFile": {
			if (!action.path) break;
			if (!appData.openFiles.includes(action.path)) {
				appData.openFiles = [...appData.openFiles, action.path];
			}
			// Opening an already-open file still brings the app forward, as
			// the generic OpenFile handler does.
			openApp(
				ds,
				PictureViewerAppInfo.id,
				PictureViewerAppInfo.name,
				PictureViewerAppInfo.icon,
				{
					document: action.path,
					windows: [pictureViewerWindowId(action.path)],
				},
			);
			break;
		}
		case "ClassicyAppPictureViewerCloseFile": {
			appData.openFiles = appData.openFiles.filter((p) => p !== action.path);
			break;
		}
	}
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppPictureViewer* events
// without a hard-wired import. registerApp also records the manifest (action
// and state shapes with commentary) for balloon help, discovery, and dev-mode
// kernel state validation.
registerApp({
	id: PictureViewerAppInfo.id,
	description: "QuickTime still-image viewer.",
	prefix: "ClassicyAppPictureViewer",
	handler: classicyQuickTimePictureViewerEventHandler,
	actions: {
		ClassicyAppPictureViewerOpenDocument: {
			description: "Open an image document in a new viewer window.",
			params: z.object({
				document: PictureViewerOpenFileSchema.describe(
					"The image document to open.",
				),
			}),
		},
		ClassicyAppPictureViewerOpenDocuments: {
			description: "Open several image documents at once.",
			params: z.object({
				documents: z
					.array(PictureViewerOpenFileSchema)
					.describe("The image documents to open."),
			}),
		},
		ClassicyAppPictureViewerCloseDocument: {
			description: "Close the viewer window for an image document.",
			params: z.object({
				document: PictureViewerOpenFileSchema.describe(
					"The image document to close, matched by url.",
				),
			}),
		},
		ClassicyAppPictureViewerOpenFile: {
			description: "Open an image file from the file system by path.",
			params: z.object({
				path: z.string().describe("Path of the image file to open."),
			}),
		},
		ClassicyAppPictureViewerCloseFile: {
			description: "Close the viewer window for a file-system path.",
			params: z.object({
				path: z.string().describe("Path of the image file to close."),
			}),
		},
	},
	state: PictureViewerDataSchema,
});

import { z } from "zod";
import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	isWebViewerData,
	WebViewerAppInfo,
	type WebViewerData,
	WebViewerDataSchema,
} from "@/SystemFolder/WebViewer/WebViewerUtils";

type ClassicyWebViewerEvent = {
	type: string;
	url?: string;
	title?: string;
};

export { WebViewerAppInfo };

export const classicyWebViewerEventHandler = (
	ds: ClassicyStore,
	action: ClassicyWebViewerEvent,
) => {
	const { id: appId, name: appName, icon: appIcon } = WebViewerAppInfo;
	if (!ds.System.Manager.Applications.apps[appId]) {
		loadApp(ds, appId, appName, appIcon);
	}

	const rawData = ds.System.Manager.Applications.apps[appId].data ?? {};
	if (!isWebViewerData(rawData)) {
		ds.System.Manager.Applications.apps[appId].data = { openUrls: [] };
	}
	const appData = ds.System.Manager.Applications.apps[appId]
		.data as WebViewerData;

	switch (action.type) {
		case "ClassicyAppWebViewerOpenUrl": {
			if (!action.url) break;
			// The URL is the window identity: re-opening the same shortcut
			// focuses the existing window instead of stacking a duplicate.
			if (!appData.openUrls.some((u) => u.url === action.url)) {
				appData.openUrls = [
					...appData.openUrls,
					{ url: action.url, title: action.title || action.url },
				];
			}
			openApp(ds, appId, appName, appIcon);
			break;
		}
		case "ClassicyAppWebViewerCloseUrl": {
			appData.openUrls = appData.openUrls.filter((u) => u.url !== action.url);
			break;
		}
	}
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppWebViewer* events
// without a hard-wired import. registerApp also records the manifest (action
// and state shapes with commentary) for balloon help, discovery, and dev-mode
// kernel state validation.
registerApp({
	id: WebViewerAppInfo.id,
	description: "Embedded web page viewer for URL shortcuts.",
	prefix: "ClassicyAppWebViewer",
	handler: classicyWebViewerEventHandler,
	actions: {
		ClassicyAppWebViewerOpenUrl: {
			description: "Open a URL in a Web Viewer window.",
			params: z.object({
				url: z.string().describe("The URL to open — the window identity."),
				title: z
					.string()
					.optional()
					.describe("Window title to display; defaults to the URL."),
			}),
		},
		ClassicyAppWebViewerCloseUrl: {
			description: "Close the Web Viewer window showing a URL.",
			params: z.object({
				url: z.string().describe("The URL whose window should close."),
			}),
		},
	},
	state: WebViewerDataSchema,
});

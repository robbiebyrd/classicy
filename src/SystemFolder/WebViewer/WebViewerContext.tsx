import {
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	isWebViewerData,
	WebViewerAppInfo,
	type WebViewerData,
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
// without a hard-wired import.
registerAppEventHandler("ClassicyAppWebViewer", classicyWebViewerEventHandler);

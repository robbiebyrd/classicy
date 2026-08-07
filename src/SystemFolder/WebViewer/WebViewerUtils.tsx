import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/** One open shortcut target. `url` is the window identity. */
export type WebViewerOpenUrl = {
	url: string;
	title: string;
};

export type WebViewerData = {
	openUrls: WebViewerOpenUrl[];
};

export function isWebViewerData(
	d: Record<string, unknown>,
): d is WebViewerData {
	return (
		d !== null &&
		typeof d === "object" &&
		"openUrls" in d &&
		Array.isArray(d.openUrls)
	);
}

export const WebViewerAppInfo = {
	name: "Web Viewer",
	id: "WebViewer.app",
	icon: ClassicyIcons.applications.internetExplorer.globe,
};

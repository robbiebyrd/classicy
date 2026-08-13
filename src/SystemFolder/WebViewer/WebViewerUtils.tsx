import { z } from "zod";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/** One open shortcut target. `url` is the window identity. */
export type WebViewerOpenUrl = {
	url: string;
	title: string;
};

export type WebViewerData = {
	openUrls: WebViewerOpenUrl[];
};

/** Manifest schema for one open shortcut (see WebViewerOpenUrl). */
export const WebViewerOpenUrlSchema = z.looseObject({
	url: z.string().describe("The shortcut's target URL — the window identity."),
	title: z.string().describe("Window title shown for the shortcut."),
});

/** Manifest schema for WebViewer.app's `data` (see registerApp). */
export const WebViewerDataSchema = z.looseObject({
	openUrls: z
		.array(WebViewerOpenUrlSchema)
		.optional()
		.describe("Web shortcuts currently open, one window each."),
});

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

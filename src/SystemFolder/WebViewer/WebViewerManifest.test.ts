import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/WebViewer/WebViewerContext";

describe("Web Viewer manifest", () => {
	it("registers WebViewer.app with actions and state", () => {
		const manifest = getAppManifest("WebViewer.app");
		expect(manifest?.prefixes).toContain("ClassicyAppWebViewer");
		expect(
			manifest?.state?.safeParse({
				openUrls: [{ url: "https://example.com", title: "Example" }],
			}).success,
		).toBe(true);
		expect(manifest?.state?.safeParse({ openUrls: [{ url: 1 }] }).success).toBe(
			false,
		);
	});
});

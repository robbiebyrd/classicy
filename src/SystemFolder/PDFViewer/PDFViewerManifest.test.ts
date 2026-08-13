import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/PDFViewer/PDFViewerContext";

describe("PDF Viewer manifest", () => {
	it("registers PDFViewer.app with actions and state", () => {
		const manifest = getAppManifest("PDFViewer.app");
		expect(manifest?.prefixes).toContain("ClassicyAppPDFViewer");
		expect(
			manifest?.actions.ClassicyAppPDFViewerOpenFile?.description,
		).toBeTruthy();
		expect(
			manifest?.state?.safeParse({ openFiles: ["/doc.pdf"] }).success,
		).toBe(true);
		expect(manifest?.state?.safeParse({ openFiles: [1] }).success).toBe(false);
	});
});

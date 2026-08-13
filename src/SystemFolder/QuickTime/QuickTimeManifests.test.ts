import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";

describe("QuickTime app manifests", () => {
	it("registers MoviePlayer.app", () => {
		const manifest = getAppManifest("MoviePlayer.app");
		expect(manifest?.prefixes).toContain("ClassicyAppMoviePlayer");
		expect(
			manifest?.actions.ClassicyAppMoviePlayerOpenDocument?.description,
		).toBeTruthy();
		expect(manifest?.state).toBeDefined();
		expect(
			manifest?.state?.safeParse({ openFiles: ["/a.mp4", { url: "b.mp4" }] })
				.success,
		).toBe(true);
		expect(manifest?.state?.safeParse({ openFiles: [42] }).success).toBe(false);
	});

	it("registers PictureViewer.app", () => {
		const manifest = getAppManifest("PictureViewer.app");
		expect(manifest?.prefixes).toContain("ClassicyAppPictureViewer");
		expect(manifest?.state?.safeParse({}).success).toBe(true);
		expect(
			manifest?.state?.safeParse({ openFiles: [{ url: "x.png" }] }).success,
		).toBe(true);
	});
});

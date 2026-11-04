// Every bundled app must register a manifest with a non-empty description —
// it is the balloon-help copy ClassicyApp falls back to for the app's desktop
// icon, and it feeds every other manifest-driven surface (HyperCard
// discovery, dev-mode state validation). A new bundled app belongs in this
// list, with its registration module in ClassicyBundledApps.internal.ts.
import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

// Side effect: the shared list of every bundled app's registration module,
// the one Storybook's preview imports.
import "@/SystemFolder/ClassicyBundledApps.internal";

const BUNDLED_APP_IDS = [
	"AppleGuide.app",
	"AppearanceManager.app",
	"ControlStripManager.app",
	"DateAndTimeManager.app",
	"DriveSetup.app",
	"Finder.app",
	"HyperCard.app",
	"MoviePlayer.app",
	"PDFViewer.app",
	"PictureViewer.app",
	"ScreenSaver.app",
	"ScreenSaverManager.app",
	"SimpleText.app",
	"SoundManager.app",
	"WebViewer.app",
];

describe("bundled app manifests", () => {
	it.each(BUNDLED_APP_IDS)("%s registers a non-empty description", (appId) => {
		const manifest = getAppManifest(appId);
		expect(
			manifest,
			`${appId} has no manifest — registerApp not called?`,
		).toBeDefined();
		expect(manifest!.description.trim().length).toBeGreaterThan(0);
	});
});

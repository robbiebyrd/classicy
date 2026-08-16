// Every bundled app must register a manifest with a non-empty description —
// it is the balloon-help copy ClassicyApp falls back to for the app's desktop
// icon, and it feeds every other manifest-driven surface (HyperCard
// discovery, dev-mode state validation). A new bundled app belongs in this
// list, with its registration imported below.
import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

// Side-effect imports: each module's registerApp call runs at import time.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/HyperCard/Editor/HyperCardEditorContext";
import "@/SystemFolder/HyperCard/HyperCardContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/WebViewer/WebViewerContext";
import "@/SystemFolder/SimpleText/SimpleTextManifest";
import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupManifest";
import "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerManifest";

const BUNDLED_APP_IDS = [
	"AppleGuide.app",
	"AppearanceManager.app",
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

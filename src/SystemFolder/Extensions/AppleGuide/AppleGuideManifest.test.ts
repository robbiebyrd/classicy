import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";

describe("Apple Guide manifest", () => {
	it("registers AppleGuide.app with actions and state", () => {
		const manifest = getAppManifest("AppleGuide.app");
		expect(manifest?.prefixes).toContain("ClassicyAppAppleGuide");
		expect(
			manifest?.actions.ClassicyAppAppleGuideShowTopic?.description,
		).toBeTruthy();
		expect(
			manifest?.state?.safeParse({
				openTopics: ["topic-1"],
				pages: { "topic-1": 2 },
			}).success,
		).toBe(true);
		expect(
			manifest?.state?.safeParse({ pages: { "topic-1": "two" } }).success,
		).toBe(false);
	});

	// The Help Topics browser (the WIG audit's 12.21): its two actions and
	// its open flag.
	it("declares the Help Topics browser's actions and state", () => {
		const manifest = getAppManifest("AppleGuide.app");
		expect(
			manifest?.actions.ClassicyAppAppleGuideShowTopics?.description,
		).toBeTruthy();
		expect(
			manifest?.actions.ClassicyAppAppleGuideCloseTopics?.description,
		).toBeTruthy();
		expect(manifest?.state?.safeParse({ helpTopicsOpen: true }).success).toBe(
			true,
		);
		expect(manifest?.state?.safeParse({ helpTopicsOpen: "open" }).success).toBe(
			false,
		);
	});
});

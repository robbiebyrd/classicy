import { describe, expect, it } from "vitest";
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	appleGuideWindowId,
	getAppleGuideTopic,
	registerAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";

describe("appleGuideWindowId", () => {
	it("derives a stable window id from the topic id", () => {
		expect(appleGuideWindowId("about-balloon-help")).toBe(
			"apple_guide_about-balloon-help",
		);
	});
});

describe("Apple Guide topic registry", () => {
	it("registers a topic and retrieves it by id", () => {
		registerAppleGuideTopic({
			id: "test-topic",
			title: "Test Topic",
			pages: [<p key="0">Page one</p>],
		});
		expect(getAppleGuideTopic("test-topic")?.title).toBe("Test Topic");
	});

	it("overwrites a topic registered under an existing id", () => {
		registerAppleGuideTopic({
			id: "dupe",
			title: "First",
			pages: [<p key="0">a</p>],
		});
		registerAppleGuideTopic({
			id: "dupe",
			title: "Second",
			pages: [<p key="0">b</p>],
		});
		expect(getAppleGuideTopic("dupe")?.title).toBe("Second");
	});

	it("returns undefined for an unknown id", () => {
		expect(getAppleGuideTopic("no-such-topic")).toBeUndefined();
	});

	it("registers the built-in About Balloon Help topic on import", () => {
		const topic = getAppleGuideTopic(ABOUT_BALLOON_HELP_TOPIC_ID);
		expect(topic?.title).toBe("About Help");
		expect(topic?.pages).toHaveLength(1);
	});
});

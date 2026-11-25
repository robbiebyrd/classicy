// The probe package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	appleGuidePackageIdOf,
	appleGuideWindowId,
	getAppleGuideTopic,
	isAppleGuideTopicRegistered,
	listAppleGuideTopics,
	registerAppleGuideTopic,
	subscribeAppleGuideTopics,
	useAppleGuideTopic,
	useAppleGuideTopics,
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

// A topic's variants by package (`packages`, the WIG audit's 12.18): a
// package words a topic its own way beside the one every package offers,
// and a lookup takes the active package's (or the given one's).
describe("Apple Guide topic variants by package", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage("help-probe");
	});

	it("takes the variant offered under the package, else the unrestricted one", () => {
		registerAppleGuideTopic({
			id: "variant-topic",
			title: "Every package",
			pages: ["a"],
		});
		registerAppleGuideTopic({
			id: "variant-topic",
			title: "The probe's",
			packages: ["help-probe"],
			pages: ["b"],
		});
		expect(getAppleGuideTopic("variant-topic", "help-probe")?.title).toBe(
			"The probe's",
		);
		expect(getAppleGuideTopic("variant-topic", "platinum")?.title).toBe(
			"Every package",
		);
	});

	it("keeps a variant for other packages and replaces one for the same packages, in any order", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		registerAppleGuideTopic({
			id: "offer-topic",
			title: "Two packages",
			packages: ["one", "two"],
			pages: ["a"],
		});
		registerAppleGuideTopic({
			id: "offer-topic",
			title: "Every package",
			pages: ["b"],
		});
		expect(warn).not.toHaveBeenCalled();
		registerAppleGuideTopic({
			id: "offer-topic",
			title: "Two packages again",
			packages: ["two", "one", "two"],
			pages: ["c"],
		});
		expect(warn).toHaveBeenCalledWith(
			"[AppleGuide] Replacing already-registered topic",
			"offer-topic",
		);
		expect(getAppleGuideTopic("offer-topic", "one")?.title).toBe(
			"Two packages again",
		);
		expect(getAppleGuideTopic("offer-topic", "two")?.title).toBe(
			"Two packages again",
		);
		expect(getAppleGuideTopic("offer-topic", "three")?.title).toBe(
			"Every package",
		);
		warn.mockRestore();
	});

	it("treats an empty package list as every package", () => {
		registerAppleGuideTopic({
			id: "empty-offer",
			title: "Empty list",
			packages: [],
			pages: ["a"],
		});
		expect(getAppleGuideTopic("empty-offer", "anything")?.title).toBe(
			"Empty list",
		);
	});

	it("offers a package's own topic under no other package, while it stays registered", () => {
		registerAppleGuideTopic({
			id: "probe-only",
			title: "Probe only",
			packages: ["help-probe"],
			pages: ["a"],
		});
		expect(getAppleGuideTopic("probe-only", "platinum")).toBeUndefined();
		expect(getAppleGuideTopic("probe-only", "help-probe")?.title).toBe(
			"Probe only",
		);
		expect(isAppleGuideTopicRegistered("probe-only")).toBe(true);
		expect(isAppleGuideTopicRegistered("never-registered")).toBe(false);
	});

	it("lists the topics offered under a package, one per id, in first-registration order, with their books", () => {
		registerAppleGuideTopic({
			id: "list-a",
			title: "A",
			book: "Basics",
			pages: ["a"],
		});
		registerAppleGuideTopic({
			id: "list-b",
			title: "B (probe)",
			packages: ["help-probe"],
			pages: ["b"],
		});
		registerAppleGuideTopic({
			id: "list-a",
			title: "A (probe)",
			book: "Probe Basics",
			packages: ["help-probe"],
			pages: ["a"],
		});
		const probe = listAppleGuideTopics("help-probe");
		const ids = probe.map((topic) => topic.id);
		expect(ids.indexOf("list-a")).toBeLessThan(ids.indexOf("list-b"));
		expect(probe.find((topic) => topic.id === "list-a")).toMatchObject({
			title: "A (probe)",
			book: "Probe Basics",
		});
		const platinum = listAppleGuideTopics("platinum");
		expect(platinum.map((topic) => topic.id)).not.toContain("list-b");
		expect(platinum.find((topic) => topic.id === "list-a")?.book).toBe(
			"Basics",
		);
		expect(platinum.map((topic) => topic.id)).toContain(
			ABOUT_BALLOON_HELP_TOPIC_ID,
		);
	});

	it("tells its subscribers of every registration", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeAppleGuideTopics(listener);
		registerAppleGuideTopic({ id: "subscribed", title: "S", pages: ["a"] });
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
		registerAppleGuideTopic({ id: "subscribed-2", title: "S", pages: ["a"] });
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("resolves a stored package id as the desktop draws it", () => {
		// An unregistered or missing id: the default package's.
		expect(appleGuidePackageIdOf("help-probe")).toBe("platinum");
		expect(appleGuidePackageIdOf(undefined)).toBe("platinum");
		registerClassicyAppearancePackage({
			id: "help-probe",
			name: "Help probe",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "help-probe-default",
				package: "help-probe",
			},
			layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		});
		expect(appleGuidePackageIdOf("help-probe")).toBe("help-probe");
		expect(appleGuidePackageIdOf("gone")).toBe("platinum");
	});

	it("follows the active package and new registrations in its hooks", () => {
		const active = { id: "platinum" };
		const listeners = new Set<() => void>();
		connectClassicyAssetPackageSource({
			getId: () => active.id,
			subscribe: (onChange) => {
				listeners.add(onChange);
				return () => listeners.delete(onChange);
			},
		});
		registerAppleGuideTopic({
			id: "hooked",
			title: "Every package",
			pages: ["a"],
		});
		registerAppleGuideTopic({
			id: "hooked",
			title: "The probe's",
			packages: ["help-probe"],
			pages: ["b"],
		});
		const topic = renderHook(() => useAppleGuideTopic("hooked"));
		const topics = renderHook(() => useAppleGuideTopics());
		expect(topic.result.current?.title).toBe("Every package");
		const first = topics.result.current;
		expect(topics.result.current).toBe(first);
		act(() => {
			registerAppleGuideTopic({
				id: "hooked-later",
				title: "Later",
				pages: ["c"],
			});
		});
		expect(topics.result.current.map((t) => t.id)).toContain("hooked-later");
		registerClassicyAppearancePackage({
			id: "help-probe",
			name: "Help probe",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "help-probe-default",
				package: "help-probe",
			},
			layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		});
		act(() => {
			active.id = "help-probe";
			for (const onChange of listeners) onChange();
		});
		expect(topic.result.current?.title).toBe("The probe's");
		expect(topics.result.current.find((t) => t.id === "hooked")?.title).toBe(
			"The probe's",
		);
		topic.unmount();
		topics.unmount();
	});
});

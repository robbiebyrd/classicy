import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
	type AppleGuideData,
	classicyAppleGuideEventHandler,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	registerAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";

function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					dateTimeLocked: false,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					apps: {
						[APPLE_GUIDE_APP_ID]: {
							id: APPLE_GUIDE_APP_ID,
							name: "Apple Guide",
							icon: "",
							windows: [],
							open: true,
							focused: false,
							noDesktopIcon: true,
							data: {},
						},
					},
					fileTypeHandlers: {},
				},
				Appearance: { availableThemes: [], activeTheme: {} as ClassicyTheme },
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	} as unknown as ClassicyStore;
}

function data(ds: ClassicyStore): AppleGuideData {
	const d = ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data ?? {};
	return isAppleGuideData(d) ? d : {};
}

describe("classicyAppleGuideEventHandler — ShowTopic", () => {
	it("opens a registered topic at page 0", () => {
		const ds = makeStore();
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideShowTopic",
			topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
		});
		expect(data(ds).openTopics).toEqual([ABOUT_BALLOON_HELP_TOPIC_ID]);
		expect(data(ds).pages?.[ABOUT_BALLOON_HELP_TOPIC_ID]).toBe(0);
	});

	it("does not duplicate an already-open topic and resets its page", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID].data = {
			openTopics: [ABOUT_BALLOON_HELP_TOPIC_ID],
			pages: { [ABOUT_BALLOON_HELP_TOPIC_ID]: 3 },
		};
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideShowTopic",
			topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
		});
		expect(data(ds).openTopics).toHaveLength(1);
		expect(data(ds).pages?.[ABOUT_BALLOON_HELP_TOPIC_ID]).toBe(0);
	});

	it("is a no-op for an unregistered topic id", () => {
		const ds = makeStore();
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideShowTopic",
			topicId: "no-such-topic",
		});
		expect(data(ds).openTopics ?? []).toEqual([]);
	});

	it("returns ds unchanged when AppleGuide.app is not registered", () => {
		const ds = makeStore();
		delete ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID];
		const result = classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideShowTopic",
			topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
		});
		expect(result).toBe(ds);
	});
});

describe("APPLE_GUIDE_SHOW_TOPIC_EVENT — public consumer path", () => {
	it("opens a topic registered and shown entirely through the exported API", () => {
		registerAppleGuideTopic({
			id: "consumer-topic",
			title: "Consumer Topic",
			pages: ["Body"],
		});
		const ds = makeStore();
		classicyAppleGuideEventHandler(ds, {
			type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
			topicId: "consumer-topic",
		});
		expect(data(ds).openTopics).toEqual(["consumer-topic"]);
	});

	it("matches the reducer's literal action-type string", () => {
		expect(APPLE_GUIDE_SHOW_TOPIC_EVENT).toBe("ClassicyAppAppleGuideShowTopic");
	});
});

describe("classicyAppleGuideEventHandler — stale topic ids are pruned", () => {
	it("drops an unregistered id from openTopics/pages when the reducer runs", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID].data = {
			openTopics: ["ghost-topic", ABOUT_BALLOON_HELP_TOPIC_ID],
			pages: { "ghost-topic": 2, [ABOUT_BALLOON_HELP_TOPIC_ID]: 0 },
		};
		// Any dispatch touching the app runs the prune, not just ShowTopic —
		// exercise it via CloseTopic on an unrelated id so the ghost topic itself
		// is never explicitly closed.
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideCloseTopic",
			topicId: "some-other-topic-not-open",
		});
		expect(data(ds).openTopics).toEqual([ABOUT_BALLOON_HELP_TOPIC_ID]);
		expect(data(ds).pages).toEqual({ [ABOUT_BALLOON_HELP_TOPIC_ID]: 0 });
	});

	it("never lets a stale id re-accumulate across repeated dispatches", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID].data = {
			openTopics: ["ghost-topic"],
			pages: { "ghost-topic": 0 },
		};
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideSetPage",
			topicId: "ghost-topic",
			page: 1,
		});
		expect(data(ds).openTopics).toEqual([]);
		expect(data(ds).pages).toEqual({});
	});
});

describe("classicyAppleGuideEventHandler — CloseTopic", () => {
	it("removes only the named topic", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID].data = {
			openTopics: ["a", ABOUT_BALLOON_HELP_TOPIC_ID],
			pages: {},
		};
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideCloseTopic",
			topicId: "a",
		});
		expect(data(ds).openTopics).toEqual([ABOUT_BALLOON_HELP_TOPIC_ID]);
	});
});

describe("classicyAppleGuideEventHandler — SetPage", () => {
	it("clamps a negative page to 0", () => {
		const ds = makeStore();
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideSetPage",
			topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
			page: -5,
		});
		expect(data(ds).pages?.[ABOUT_BALLOON_HELP_TOPIC_ID]).toBe(0);
	});

	it("clamps a page beyond the last to the last page", () => {
		const ds = makeStore();
		// The built-in topic has exactly one page, so the last index is 0.
		classicyAppleGuideEventHandler(ds, {
			type: "ClassicyAppAppleGuideSetPage",
			topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
			page: 99,
		});
		expect(data(ds).pages?.[ABOUT_BALLOON_HELP_TOPIC_ID]).toBe(0);
	});
});

describe("isAppleGuideData", () => {
	it("rejects a non-array openTopics", () => {
		expect(isAppleGuideData({ openTopics: "nope" })).toBe(false);
	});

	it("accepts an empty object", () => {
		expect(isAppleGuideData({})).toBe(true);
	});

	it("rejects an openTopics array containing a non-string element", () => {
		expect(isAppleGuideData({ openTopics: ["ok", 5] })).toBe(false);
	});

	it("accepts an openTopics array of all strings", () => {
		expect(isAppleGuideData({ openTopics: ["a", "b"] })).toBe(true);
	});

	it("rejects a pages map with a non-numeric value (e.g. version-skewed string)", () => {
		expect(isAppleGuideData({ pages: { x: "3" } })).toBe(false);
	});

	it("rejects a pages map with a NaN/non-finite value", () => {
		expect(isAppleGuideData({ pages: { x: Number.NaN } })).toBe(false);
		expect(isAppleGuideData({ pages: { x: Number.POSITIVE_INFINITY } })).toBe(
			false,
		);
	});

	it("accepts a pages map with all-numeric values", () => {
		expect(isAppleGuideData({ pages: { a: 0, b: 3 } })).toBe(true);
	});
});

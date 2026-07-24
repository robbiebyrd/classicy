import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	APPLE_GUIDE_APP_ID,
	type AppleGuideData,
	classicyAppleGuideEventHandler,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";

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
});

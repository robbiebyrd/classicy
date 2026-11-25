import { z } from "zod";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { focusWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	appleGuidePackageIdOf,
	appleGuideWindowId,
	getAppleGuideTopic,
	isAppleGuideTopicRegistered,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

export const APPLE_GUIDE_APP_ID = "AppleGuide.app";
export const APPLE_GUIDE_APP_NAME = "Apple Guide";

/**
 * Event that opens (or re-focuses) a topic's window. Exported so consumers
 * registering a topic via `registerAppleGuideTopic` don't have to hardcode
 * the reducer's action-type string to open it.
 */
export const APPLE_GUIDE_SHOW_TOPIC_EVENT =
	"ClassicyAppAppleGuideShowTopic" as const;

/**
 * Event that opens (or re-focuses) the Help Topics browser
 * (`ClassicyHelpTopics`), under a package whose layout says
 * `help.topicWindow: "winhelp"` (Windows 98; WIG Ch.12 "The Help Topics
 * Browser", p.284; Ch.7 "The Help Menu", p.99). Without that key no window
 * lists the topics, and the event shows the built-in
 * `ABOUT_BALLOON_HELP_TOPIC_ID` topic, as `APPLE_GUIDE_SHOW_TOPIC_EVENT`
 * would. A window's Help ▸ Help Topics and the Start menu's Help dispatch
 * it (`{ type: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT }`).
 */
export const APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT =
	"ClassicyAppAppleGuideShowTopics" as const;

/** The Help Topics browser's window id, in `AppleGuide.app`. */
export const APPLE_GUIDE_HELP_TOPICS_WINDOW_ID = "apple_guide_help_topics";

export type AppleGuideData = {
	/** Topic ids with an open window, in the order they were opened. */
	openTopics?: string[];
	/** Current zero-based page index per topic id. */
	pages?: Record<string, number>;
	/**
	 * Whether the Help Topics browser is open (`ClassicyHelpTopics`; drawn
	 * only under `layout.help.topicWindow` "winhelp").
	 */
	helpTopicsOpen?: boolean;
};

/** Manifest schema for AppleGuide.app's `data` (see registerApp). */
export const AppleGuideDataSchema = z.looseObject({
	openTopics: z
		.array(z.string())
		.optional()
		.describe("Topic ids with an open window, in the order they were opened."),
	pages: z
		.record(z.string(), z.number())
		.optional()
		.describe("Current zero-based page index per topic id."),
	helpTopicsOpen: z
		.boolean()
		.optional()
		.describe(
			'Whether the Help Topics browser is open (drawn only under the package\'s help.topicWindow "winhelp").',
		),
});

export function isAppleGuideData(
	d: Record<string, unknown>,
): d is AppleGuideData {
	if (d === null || typeof d !== "object") return false;
	if ("openTopics" in d) {
		if (!Array.isArray(d.openTopics)) return false;
		if (!d.openTopics.every((t) => typeof t === "string")) return false;
	}
	if ("pages" in d) {
		if (
			typeof d.pages !== "object" ||
			d.pages === null ||
			Array.isArray(d.pages)
		) {
			return false;
		}
		if (
			!Object.values(d.pages as Record<string, unknown>).every(
				(p) => typeof p === "number" && Number.isFinite(p),
			)
		) {
			return false;
		}
	}
	if ("helpTopicsOpen" in d && typeof d.helpTopicsOpen !== "boolean") {
		return false;
	}
	return true;
}

/**
 * Drop any topic id no longer registered, so a removed/renamed id can never
 * get stuck. Registered under any package: a topic another package offers
 * stays open, its window drawing nothing until that package is drawn again.
 */
function pruneUnregisteredTopics(data: AppleGuideData): AppleGuideData {
	const open = data.openTopics;
	if (!open || open.every(isAppleGuideTopicRegistered)) {
		return data;
	}
	const kept = open.filter(isAppleGuideTopicRegistered);
	// No `pages` key where there was none: `pages: undefined` fails
	// `isAppleGuideData`, which would drop every open topic on the next read.
	if (!data.pages) return { ...data, openTopics: kept };
	const pages = Object.fromEntries(
		Object.entries(data.pages).filter(([id]) => kept.includes(id)),
	);
	return { ...data, openTopics: kept, pages };
}

const topicIdOf = (action: ActionMessage): string | undefined =>
	"topicId" in action && typeof action.topicId === "string"
		? action.topicId
		: undefined;

export const classicyAppleGuideEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const app = ds.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID];
	if (!app) return ds;

	const raw = app.data ?? {};
	let appData: AppleGuideData = pruneUnregisteredTopics(
		isAppleGuideData(raw) ? raw : {},
	);
	const topicId = topicIdOf(action);
	// The package the desktop draws, from the draft (reducers never read the
	// store's live state): it decides the topic variants offered and the
	// help layout.
	const packageId = appleGuidePackageIdOf(
		ds.System.Manager.Appearance?.packageId,
	);

	const showTopic = (id: string): ClassicyStore => {
		const open = appData.openTopics ?? [];
		appData = {
			...appData,
			openTopics: open.includes(id) ? open : [...open, id],
			pages: { ...(appData.pages ?? {}), [id]: 0 },
		};
		app.data = appData;
		// Focus explicitly: ClassicyWindowOpen only focuses brand-new windows,
		// and a reopened topic's window persists as closed after its first open.
		return focusWindow(ds, APPLE_GUIDE_APP_ID, appleGuideWindowId(id));
	};

	switch (action.type) {
		case APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT: {
			const winhelp =
				getClassicyAppearanceLayout(packageId).help?.topicWindow === "winhelp";
			if (!winhelp) return showTopic(ABOUT_BALLOON_HELP_TOPIC_ID);
			appData = { ...appData, helpTopicsOpen: true };
			app.data = appData;
			return focusWindow(
				ds,
				APPLE_GUIDE_APP_ID,
				APPLE_GUIDE_HELP_TOPICS_WINDOW_ID,
			);
		}
		case "ClassicyAppAppleGuideCloseTopics": {
			const { helpTopicsOpen: _closed, ...rest } = appData;
			appData = rest;
			break;
		}
		case APPLE_GUIDE_SHOW_TOPIC_EVENT: {
			if (!topicId) break;
			if (!getAppleGuideTopic(topicId, packageId)) {
				classicyLog("warn", "AppleGuide", "Unknown topic id", topicId);
				break;
			}
			return showTopic(topicId);
		}
		case "ClassicyAppAppleGuideCloseTopic": {
			if (!topicId) break;
			appData = {
				...appData,
				openTopics: (appData.openTopics ?? []).filter((t) => t !== topicId),
			};
			break;
		}
		case "ClassicyAppAppleGuideSetPage": {
			if (!topicId) break;
			const topic = getAppleGuideTopic(topicId, packageId);
			if (!topic) break;
			const requested =
				"page" in action && typeof action.page === "number" ? action.page : 0;
			const clamped = Math.min(
				Math.max(requested, 0),
				Math.max(topic.pages.length - 1, 0),
			);
			appData = {
				...appData,
				pages: { ...(appData.pages ?? {}), [topicId]: clamped },
			};
			break;
		}
	}

	app.data = appData;
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppAppleGuide*
// events without a hard-wired import. registerApp also records the manifest
// (action and state shapes with commentary) for balloon help, discovery, and
// dev-mode kernel state validation.
registerApp({
	id: APPLE_GUIDE_APP_ID,
	description: "Step-by-step system help topics (Apple Guide).",
	prefix: "ClassicyAppAppleGuide",
	handler: classicyAppleGuideEventHandler,
	actions: {
		[APPLE_GUIDE_SHOW_TOPIC_EVENT]: {
			description: "Open (or re-focus) the window for a guide topic.",
			params: z.object({
				topicId: z.string().describe("Id of the registered topic to show."),
			}),
		},
		ClassicyAppAppleGuideCloseTopic: {
			description: "Close the window for an open guide topic.",
			params: z.object({
				topicId: z.string().describe("Id of the topic to close."),
			}),
		},
		ClassicyAppAppleGuideSetPage: {
			description: "Jump an open guide topic to a page (clamped to range).",
			params: z.object({
				topicId: z.string().describe("Id of the topic to page."),
				page: z.number().describe("Zero-based page index to show."),
			}),
		},
		[APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT]: {
			description:
				'Open (or re-focus) the Help Topics browser, which lists the guide topics (under the package\'s help.topicWindow "winhelp"; else show the About Help topic).',
		},
		ClassicyAppAppleGuideCloseTopics: {
			description: "Close the Help Topics browser.",
		},
	},
	state: AppleGuideDataSchema,
});

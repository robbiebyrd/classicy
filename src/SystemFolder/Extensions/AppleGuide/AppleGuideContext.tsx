import { focusWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	appleGuideWindowId,
	getAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";

export const APPLE_GUIDE_APP_ID = "AppleGuide.app";
export const APPLE_GUIDE_APP_NAME = "Apple Guide";

export type AppleGuideData = {
	/** Topic ids with an open window, in the order they were opened. */
	openTopics?: string[];
	/** Current zero-based page index per topic id. */
	pages?: Record<string, number>;
};

export function isAppleGuideData(
	d: Record<string, unknown>,
): d is AppleGuideData {
	if (d === null || typeof d !== "object") return false;
	if ("openTopics" in d && !Array.isArray(d.openTopics)) return false;
	if (
		"pages" in d &&
		(typeof d.pages !== "object" || d.pages === null || Array.isArray(d.pages))
	) {
		return false;
	}
	return true;
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
	let appData: AppleGuideData = isAppleGuideData(raw) ? raw : {};
	const topicId = topicIdOf(action);

	switch (action.type) {
		case "ClassicyAppAppleGuideShowTopic": {
			if (!topicId) break;
			if (!getAppleGuideTopic(topicId)) {
				if (process.env.NODE_ENV !== "production") {
					console.warn("[AppleGuide] Unknown topic id", topicId);
				}
				break;
			}
			const open = appData.openTopics ?? [];
			appData = {
				...appData,
				openTopics: open.includes(topicId) ? open : [...open, topicId],
				pages: { ...(appData.pages ?? {}), [topicId]: 0 },
			};
			app.data = appData;
			// Focus explicitly: ClassicyWindowOpen only focuses brand-new windows,
			// and a reopened topic's window persists as closed after its first open.
			return focusWindow(ds, APPLE_GUIDE_APP_ID, appleGuideWindowId(topicId));
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
			const topic = getAppleGuideTopic(topicId);
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

registerAppEventHandler(
	"ClassicyAppAppleGuide",
	classicyAppleGuideEventHandler,
);

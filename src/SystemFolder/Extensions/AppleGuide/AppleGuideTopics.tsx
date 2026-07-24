import type { ReactNode } from "react";

/** A single help topic shown in an Apple Guide window. */
export type HelpTopic = {
	/** Stable id used in events and registry lookups. */
	id: string;
	/** Bold header text shown in the window's header band. */
	title: string;
	/** One entry per page. A one-page topic renders both arrows disabled. */
	pages: ReactNode[];
};

export const ABOUT_BALLOON_HELP_TOPIC_ID = "about-balloon-help";

/** Window id for a topic. Shared so the reducer and the window agree. */
export const appleGuideWindowId = (topicId: string) => `apple_guide_${topicId}`;

const topics = new Map<string, HelpTopic>();

/**
 * Register a help topic. Re-registering an id replaces the previous topic,
 * so consumers may override a built-in one.
 */
export function registerAppleGuideTopic(topic: HelpTopic): void {
	if (topics.has(topic.id) && process.env.NODE_ENV !== "production") {
		console.warn("[AppleGuide] Replacing already-registered topic", topic.id);
	}
	topics.set(topic.id, topic);
}

export function getAppleGuideTopic(id: string): HelpTopic | undefined {
	return topics.get(id);
}

registerAppleGuideTopic({
	id: ABOUT_BALLOON_HELP_TOPIC_ID,
	title: "About Help",
	pages: [
		<>
			<p>The Help menu includes:</p>
			<ul>
				<li>Balloons&mdash;to help you identify items on the screen.</li>
				<li>Help&mdash;to guide you step-by-step through tasks.</li>
			</ul>
		</>,
	],
});

import { type ReactNode, useSyncExternalStore } from "react";
import { subscribeClassicyActiveAppearancePackage } from "@/Appearance/ClassicyActiveAppearancePackage.internal";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { getRegisteredClassicyAppearancePackageOrDefault } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Store-free, like the package registry it reads, so the Apple Guide
// reducer may import it: the active package comes through the `.internal`
// source the store connects (resolved from `Appearance.packageId`), and a
// reducer passes the id from its draft instead.

/** A single help topic shown in an Apple Guide window. */
export type HelpTopic = {
	/** Stable id used in events and registry lookups. */
	id: string;
	/** Bold header text shown in the window's header band. */
	title: string;
	/** One entry per page. A one-page topic renders both arrows disabled. */
	pages: ReactNode[];
	/**
	 * The Appearance Package ids this variant of the topic is offered under,
	 * as `registerClassicyScreenSaver`'s `packages`. Absent or empty, every
	 * package. Several variants may share an id: a lookup takes the one
	 * offered under the active package, else the unrestricted one, so a
	 * package can word a built-in topic its own way (Windows 98's "Using
	 * Help" for `ABOUT_BALLOON_HELP_TOPIC_ID`) without replacing it for the
	 * others.
	 */
	packages?: string[];
	/**
	 * The book (a category of topics) the Help Topics browser's Contents tab
	 * lists the topic under (`ClassicyHelpTopics`, under the package's
	 * `layout.help.topicWindow` "winhelp"; WIG Ch.12 "The Help Topic Tabs",
	 * p.284). Absent, the topic is a page at the top level. Topics naming the
	 * same book share it, the book standing where its first topic was
	 * registered.
	 */
	book?: string;
};

export const ABOUT_BALLOON_HELP_TOPIC_ID = "about-balloon-help";

/** Window id for a topic. Shared so the reducer and the window agree. */
export const appleGuideWindowId = (topicId: string) => `apple_guide_${topicId}`;

// Every variant of every id, ids in first-registration order, variants in
// registration order.
const topics = new Map<string, HelpTopic[]>();
const listeners = new Set<() => void>();
let version = 0;

/** The packages a variant is offered under, as one comparable key ("" for every package). */
const offerKey = (topic: HelpTopic): string =>
	topic.packages && topic.packages.length > 0
		? [...new Set(topic.packages)].sort().join("\n")
		: "";

/**
 * Register a help topic. Re-registering an id offered under the same
 * packages replaces that variant, so consumers may override a built-in one;
 * a variant offered under other packages (`packages`) is kept beside it.
 */
export function registerAppleGuideTopic(topic: HelpTopic): void {
	const variants = topics.get(topic.id) ?? [];
	const key = offerKey(topic);
	const index = variants.findIndex((variant) => offerKey(variant) === key);
	if (index >= 0) {
		classicyLog(
			"warn",
			"AppleGuide",
			"Replacing already-registered topic",
			topic.id,
		);
		variants[index] = topic;
	} else {
		variants.push(topic);
	}
	topics.set(topic.id, variants);
	version += 1;
	for (const listener of listeners) listener();
}

/** The id a stored `packageId` resolves to, as the desktop draws it. */
export const appleGuidePackageIdOf = (packageId: string | undefined): string =>
	getRegisteredClassicyAppearancePackageOrDefault(packageId)?.id ??
	packageId ??
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;

/**
 * The id of the package whose topics are offered: the active one, resolved
 * as the drawn package is (`getRegisteredClassicyAppearancePackageOrDefault`),
 * else the default package's id. Reducers pass their draft's
 * `Appearance.packageId` through `appleGuidePackageIdOf` instead.
 */
export const activeAppleGuidePackageId = (): string =>
	appleGuidePackageIdOf(getClassicyAssetPackageSource()?.getId());

/**
 * The topic registered under `id` as offered under `packageId` (the active
 * package when omitted): the last-registered variant naming that package,
 * else the unrestricted one, else `undefined`.
 */
export function getAppleGuideTopic(
	id: string,
	packageId: string = activeAppleGuidePackageId(),
): HelpTopic | undefined {
	const variants = topics.get(id);
	if (!variants) return undefined;
	for (let i = variants.length - 1; i >= 0; i--) {
		if (variants[i].packages?.includes(packageId)) return variants[i];
	}
	return variants.find((variant) => offerKey(variant) === "");
}

/**
 * Whether any variant of `id` is registered, whatever package it is offered
 * under. A topic not offered under the active package stays open (its window
 * draws nothing) and comes back with its package.
 */
export const isAppleGuideTopicRegistered = (id: string): boolean =>
	(topics.get(id)?.length ?? 0) > 0;

/**
 * The topics offered under `packageId` (the active package when omitted),
 * one per id, in the order their ids were first registered: what the Help
 * Topics browser lists.
 */
export function listAppleGuideTopics(
	packageId: string = activeAppleGuidePackageId(),
): HelpTopic[] {
	const offered: HelpTopic[] = [];
	for (const id of topics.keys()) {
		const topic = getAppleGuideTopic(id, packageId);
		if (topic) offered.push(topic);
	}
	return offered;
}

/** Calls `listener` whenever a topic is registered. Returns the unsubscribe. */
export const subscribeAppleGuideTopics = (
	listener: () => void,
): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

// The registry and the active package, which decides the variants offered.
const subscribeOffered = (onChange: () => void): (() => void) => {
	const unsubscribeTopics = subscribeAppleGuideTopics(onChange);
	const unsubscribePackage = subscribeClassicyActiveAppearancePackage(onChange);
	return () => {
		unsubscribeTopics();
		unsubscribePackage();
	};
};

/**
 * The topic `id` as offered under the active package, re-rendering when a
 * topic registers or the package changes.
 */
export const useAppleGuideTopic = (id: string): HelpTopic | undefined => {
	const read = () => getAppleGuideTopic(id);
	return useSyncExternalStore(subscribeOffered, read, read);
};

// The last list handed out, kept while neither the registry nor the
// package changed, so `useSyncExternalStore` sees a stable snapshot.
let listed: { version: number; packageId: string; topics: HelpTopic[] } = {
	version: -1,
	packageId: "",
	topics: [],
};

const readOffered = (): HelpTopic[] => {
	const packageId = activeAppleGuidePackageId();
	if (listed.version !== version || listed.packageId !== packageId)
		listed = { version, packageId, topics: listAppleGuideTopics(packageId) };
	return listed.topics;
};

/**
 * The topics offered under the active package (`listAppleGuideTopics`),
 * re-rendering when a topic registers or the package changes.
 */
export const useAppleGuideTopics = (): HelpTopic[] =>
	useSyncExternalStore(subscribeOffered, readOffered, readOffered);

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

import { useSyncExternalStore } from "react";
import {
	type ClassicyNotification,
	getClassicyNotifiedAppIds,
	listClassicyNotifications,
	subscribeClassicyNotifications,
} from "./ClassicyNotificationStore.internal";

/**
 * The Notification Manager (Inside Macintosh: Processes, ch. 5): a way for
 * an app or a host to ask for the user's attention from anywhere, outside
 * React included. `classicyNotify` posts a request (`NMInstall`) and
 * `removeClassicyNotification` removes it (`NMRemove`); the requests are a
 * module store, read through `useSyncExternalStore`, and session state only.
 */
export {
	type ClassicyNotification,
	type ClassicyNotificationRequest,
	classicyNotify,
	getClassicyNotification,
	getClassicyNotifiedAppIds,
	listClassicyNotifications,
	removeClassicyNotification,
	subscribeClassicyNotifications,
} from "./ClassicyNotificationStore.internal";

/** The installed requests, oldest first; re-renders on any change. */
export const useClassicyNotifications = (): readonly ClassicyNotification[] =>
	useSyncExternalStore(
		subscribeClassicyNotifications,
		listClassicyNotifications,
		listClassicyNotifications,
	);

/**
 * The ids of the apps a request marks with ◆ (`mark: true`), for a list of
 * apps such as the Application menu: `appSwitcherAppsFrom` takes it and sets
 * `notified` on each entry. Same set until the requests change.
 */
export const useClassicyNotifiedAppIds = (): ReadonlySet<string> =>
	useSyncExternalStore(
		subscribeClassicyNotifications,
		getClassicyNotifiedAppIds,
		getClassicyNotifiedAppIds,
	);

/**
 * How long each icon of a title's blink shows: 1000 ms. Measured on Mac OS
 * 8.1 (Infinite Mac: a background Script Editor's notification alternated
 * with the Finder's icon every 1002 ms on average over 11 frames), and the
 * 60-tick wait of System 7.1's `NotificationMgr.c`; Inside Macintosh says
 * only that the icon "blinks periodically". While icons blink over both
 * titles, the two take turns, half this apart.
 */
export const CLASSICY_NOTIFICATION_BLINK_MS = 1000;

/**
 * The menu-bar title a request's icon blinks over (Inside Macintosh:
 * Processes, p. 5-4): the Application menu's when the request marks an app
 * the Application menu lists, else the Apple menu's.
 */
export type ClassicyNotificationIconSide = "apple" | "application";

/** The icons that blink over each title, oldest request first. */
export type ClassicyNotificationMenuBarIcons = Readonly<
	Record<ClassicyNotificationIconSide, readonly string[]>
>;

/**
 * Sort the requests' icons onto the two titles they blink over. A request
 * with `icon: false`, or with no icon of its own and an app with none
 * (`iconFor` returns `""`), blinks nothing. `listed` is the ids of the apps
 * the Application menu lists; `iconFor` gives an app's icon as that menu
 * shows it.
 */
export const classicyNotificationMenuBarIcons = (
	notifications: readonly ClassicyNotification[],
	listed: ReadonlySet<string>,
	iconFor: (appId: string) => string,
): ClassicyNotificationMenuBarIcons => {
	const apple: string[] = [];
	const application: string[] = [];
	for (const n of notifications) {
		if (n.icon === false) continue;
		const icon = n.icon ?? iconFor(n.appId);
		if (!icon) continue;
		(n.mark && listed.has(n.appId) ? application : apple).push(icon);
	}
	return { apple, application };
};

/** "A", "A and B", "A, B and C". */
const joinNames = (names: readonly string[]) =>
	names.length < 2
		? (names[0] ?? "")
		: `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * What each title's blinking says, for assistive technology: "Mail requests
 * your attention", "Mail and Chat request your attention", from the apps
 * whose requests belong to that title (by the same rule as their icons,
 * `classicyNotificationMenuBarIcons`, icon or none), each named once, in
 * request order; absent for a title with none. `nameFor` gives an app's
 * display name.
 */
export const classicyNotificationMenuBarDescriptions = (
	notifications: readonly ClassicyNotification[],
	listed: ReadonlySet<string>,
	nameFor: (appId: string) => string,
): Partial<Record<ClassicyNotificationIconSide, string>> => {
	const names: Record<ClassicyNotificationIconSide, string[]> = {
		apple: [],
		application: [],
	};
	for (const n of notifications) {
		const side = n.mark && listed.has(n.appId) ? "application" : "apple";
		const name = nameFor(n.appId);
		if (!names[side].includes(name)) names[side].push(name);
	}
	const out: Partial<Record<ClassicyNotificationIconSide, string>> = {};
	for (const side of ["apple", "application"] as const) {
		const list = names[side];
		if (list.length > 0)
			out[side] =
				`${joinNames(list)} ${list.length === 1 ? "requests" : "request"} your attention`;
	}
	return out;
};

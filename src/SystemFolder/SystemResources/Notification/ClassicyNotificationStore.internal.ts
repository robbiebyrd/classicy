import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * A request for the user's attention, as `classicyNotify` takes it: the
 * Notification Manager's notification record (Inside Macintosh: Processes,
 * pp. 5-6 to 5-9, `NMRec`), each field optional but `appId`.
 */
export type ClassicyNotificationRequest = {
	/**
	 * The app asking for attention (its `ClassicyApp` id). Its name carries
	 * the mark in the Application menu, its icon blinks in the menu bar, and
	 * its coming to the front removes the request (`removeOnActivate`).
	 */
	appId: string;
	/**
	 * The alert's text (`nmStr`). A non-empty string shows a note alert with
	 * an OK button, one request at a time; omitted or empty, no alert.
	 */
	message?: string;
	/**
	 * Mark the app's name in the Application menu with a diamond (◆,
	 * `nmMark`), and blink the icon above the Application menu rather than
	 * the Apple menu. Defaults to `true`. The mark shows only while the app
	 * is in the Application menu and in the background: the front app keeps
	 * its check.
	 */
	mark?: boolean;
	/**
	 * The small icon that blinks in the menu bar (`nmIcon`): an image URL,
	 * or `false` for none. Defaults to the app's icon, as the Application
	 * menu shows it.
	 */
	icon?: string | false;
	/**
	 * The sound (`nmSound`): `true` plays the user's alert sound, a string
	 * names a sound-pack sprite. Played once, at the alert volume, and not at
	 * all while sound is muted. Defaults to none.
	 */
	sound?: boolean | string;
	/**
	 * Remove the request when its app comes to the front, as Inside
	 * Macintosh asks an application to do (p. 5-6). Defaults to `true`; pass
	 * `false` to keep the mark and icon until `removeClassicyNotification`.
	 */
	removeOnActivate?: boolean;
	/**
	 * Called once, as the final stage (`nmResp`): after the user clicks the
	 * alert's OK, or, with no alert, once the request has been presented.
	 * Not called for a request removed before then.
	 */
	onResponse?: (id: string) => void;
};

/** An installed request, as `useClassicyNotifications` lists it. */
export type ClassicyNotification = Readonly<{
	/** The id `classicyNotify` returned. */
	id: string;
	appId: string;
	/** The alert's text; absent when the request shows no alert. */
	message?: string;
	mark: boolean;
	/** The icon as requested: absent for the app's own icon, `false` for none. */
	icon?: string | false;
	/** `true` for the user's alert sound, a sprite id, or absent for none. */
	sound?: true | string;
	removeOnActivate: boolean;
	onResponse?: (id: string) => void;
}>;

/**
 * Where a request stands in being presented (Inside Macintosh: Processes,
 * p. 5-4: the mark and the icon, then the sound, then the alert, then the
 * response). Session-only, as the requests themselves are.
 */
export type ClassicyNotificationEntry = Readonly<{
	notification: ClassicyNotification;
	/** Its sound, if any, has been played (or skipped: it had none). */
	soundPlayed: boolean;
	/** Its alert, if any, has been dismissed (or skipped: it had none). */
	alertDone: boolean;
	/** `onResponse` has been called (or there was none to call). */
	responded: boolean;
}>;

let entries: readonly ClassicyNotificationEntry[] = [];
let notifications: readonly ClassicyNotification[] = [];
let notifiedAppIds: ReadonlySet<string> = new Set();
let nextId = 1;
const listeners = new Set<() => void>();

const publish = (requestsChanged: boolean) => {
	if (requestsChanged) {
		notifications = entries.map((e) => e.notification);
		notifiedAppIds = new Set(
			notifications.filter((n) => n.mark).map((n) => n.appId),
		);
	}
	for (const listener of listeners) listener();
};

const nonEmptyString = (value: unknown): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

/**
 * Post a notification (`NMInstall`): ask for the user's attention from
 * anywhere, outside React included. The request is queued and presented as
 * soon as a `ClassicyDesktop` is mounted: the app's name is marked with ◆ in
 * the Application menu, its icon blinks in the menu bar, its sound plays and
 * its alert shows, each as requested, and `onResponse` is called last.
 *
 * The mark and the icon stay until the request is removed: by
 * `removeClassicyNotification`, when the app comes to the front (unless
 * `removeOnActivate` is `false`), or when the app quits. The sound and the
 * alert are presented once. Requests are session state: never persisted.
 *
 * Returns the request's id, or `""` (posting nothing) when `appId` is not a
 * non-empty string.
 */
export function classicyNotify(request: ClassicyNotificationRequest): string {
	const appId = nonEmptyString(request?.appId);
	if (!appId) {
		classicyLog(
			"error",
			"ClassicyNotification",
			"A notification needs an appId; nothing was posted.",
		);
		return "";
	}
	const id = `classicy-notification-${nextId++}`;
	const message = nonEmptyString(request.message);
	const icon =
		request.icon === false
			? false
			: (nonEmptyString(request.icon) ?? undefined);
	const sound =
		request.sound === true
			? true
			: (nonEmptyString(request.sound) ?? undefined);
	const onResponse =
		typeof request.onResponse === "function" ? request.onResponse : undefined;
	const notification: ClassicyNotification = Object.freeze({
		id,
		appId,
		...(message !== undefined ? { message } : {}),
		mark: request.mark !== false,
		...(icon !== undefined ? { icon } : {}),
		...(sound !== undefined ? { sound } : {}),
		removeOnActivate: request.removeOnActivate !== false,
		...(onResponse ? { onResponse } : {}),
	});
	entries = [
		...entries,
		Object.freeze({
			notification,
			soundPlayed: sound === undefined,
			alertDone: message === undefined,
			responded: onResponse === undefined,
		}),
	];
	publish(true);
	return id;
}

/**
 * Remove a request (`NMRemove`): its mark and icon go, a pending or open
 * alert for it is dismissed, and its `onResponse`, if not yet called, never
 * is. Returns whether a request with that id was installed.
 */
export function removeClassicyNotification(id: string): boolean {
	const next = entries.filter((e) => e.notification.id !== id);
	if (next.length === entries.length) return false;
	entries = next;
	publish(true);
	return true;
}

/** Remove every request matching `predicate`; returns how many went. */
export function removeClassicyNotificationsWhere(
	predicate: (notification: ClassicyNotification) => boolean,
): number {
	const next = entries.filter((e) => !predicate(e.notification));
	const removed = entries.length - next.length;
	if (removed === 0) return 0;
	entries = next;
	publish(true);
	return removed;
}

/** The installed requests, oldest first. */
export const listClassicyNotifications = (): readonly ClassicyNotification[] =>
	notifications;

/** The installed request with this id, if any. */
export const getClassicyNotification = (
	id: string,
): ClassicyNotification | undefined => notifications.find((n) => n.id === id);

/** Ids of the apps a request marks (`mark: true`), for the Application menu. */
export const getClassicyNotifiedAppIds = (): ReadonlySet<string> =>
	notifiedAppIds;

/** Calls `listener` on every change. Returns the unsubscribe function. */
export function subscribeClassicyNotifications(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Every request with its presentation progress, oldest first. */
export const getClassicyNotificationEntries =
	(): readonly ClassicyNotificationEntry[] => entries;

const updateEntry = (
	id: string,
	patch: Partial<Omit<ClassicyNotificationEntry, "notification">>,
): ClassicyNotificationEntry | undefined => {
	const index = entries.findIndex((e) => e.notification.id === id);
	if (index === -1) return undefined;
	const updated = Object.freeze({ ...entries[index], ...patch });
	entries = entries.map((e, i) => (i === index ? updated : e));
	publish(false);
	return updated;
};

/**
 * Note that a request's sound has been played. Returns the request when
 * this call is the one that marked it, so a caller plays each sound once.
 */
export function markClassicyNotificationSoundPlayed(
	id: string,
): ClassicyNotification | undefined {
	const entry = entries.find((e) => e.notification.id === id);
	if (!entry || entry.soundPlayed) return undefined;
	updateEntry(id, { soundPlayed: true });
	return entry.notification;
}

/** The final stage: call `onResponse` once, isolating its exceptions. */
export function respondToClassicyNotification(id: string): void {
	const entry = entries.find((e) => e.notification.id === id);
	if (!entry || entry.responded) return;
	updateEntry(id, { responded: true });
	try {
		entry.notification.onResponse?.(id);
	} catch (error) {
		classicyLog(
			"error",
			"ClassicyNotification",
			`onResponse for ${id} threw.`,
			error,
		);
	}
}

/** The user dismissed the request's alert: mark it done, then respond. */
export function completeClassicyNotificationAlert(id: string): void {
	if (!updateEntry(id, { alertDone: true })) return;
	respondToClassicyNotification(id);
}

/** Tests only: drop every request and restart the id counter. */
export function resetClassicyNotificationsForTests(): void {
	entries = [];
	nextId = 1;
	publish(true);
}

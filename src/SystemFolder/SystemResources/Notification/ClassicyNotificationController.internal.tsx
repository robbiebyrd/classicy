import {
	type FC as FunctionalComponent,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyAlertVolumeSoundAction } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { listClassicySoundPacks } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { useClassicyStartupShowing } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupHold.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	completeClassicyNotificationAlert,
	getClassicyNotificationEntries,
	markClassicyNotificationSoundPlayed,
	removeClassicyNotificationsWhere,
	respondToClassicyNotification,
	subscribeClassicyNotifications,
} from "./ClassicyNotificationStore.internal";

// A per-page token in every alert's window id: request ids start over on
// each page load, and a window id an app already knows (a record a reload
// left behind) would reopen unfocused.
const PAGE_TOKEN = Math.random().toString(36).slice(2, 10);

// Sprites named by a request that no registered pack has, each logged once.
const unknownSprites = new Set<string>();

/**
 * Warn, once per name, when a request's sound names a sprite no registered
 * sound pack has: the sound manager would play nothing, silently.
 */
const warnIfUnknownSprite = (sound: true | string) => {
	if (sound === true || unknownSprites.has(sound)) return;
	if (
		listClassicySoundPacks().some((pack) => Object.hasOwn(pack.sprite, sound))
	)
		return;
	unknownSprites.add(sound);
	classicyLog(
		"warn",
		"ClassicyNotification",
		`No registered sound pack has the sprite "${sound}"; the notification plays no sound.`,
	);
};

/** Tests only: forget which unknown sprites were logged. */
export const resetClassicyNotificationSpriteWarningsForTests = () =>
	unknownSprites.clear();

/** The window id of a request's alert, unique to this page load. */
export const classicyNotificationAlertWindowId = (id: string) =>
	`${id}-alert-${PAGE_TOKEN}`;

type ClassicyAppPresence = {
	open?: boolean;
	hidden?: boolean;
	extension?: boolean;
};

// App ids matching `keep`, as one string so the selector's value compares by
// content and the controller re-renders only when the set changes.
const appIdsKey = (
	apps: Record<string, ClassicyAppPresence>,
	keep: (app: ClassicyAppPresence) => boolean,
) =>
	Object.entries(apps)
		.filter(([, app]) => keep(app))
		.map(([id]) => id)
		.sort()
		.join("\n");

const isOpen = (app: ClassicyAppPresence) => app.open === true;
// An app that can hold the alert's window where the user sees it: open and
// not hidden (a hidden app's modals are `display: none`).
const isShown = (app: ClassicyAppPresence) =>
	app.open === true && app.hidden !== true;
const isShownApplication = (app: ClassicyAppPresence) =>
	isShown(app) && app.extension !== true;

/**
 * The app whose window the alert is, so it never activates another: the
 * front app when it is shown, else the Finder, else the first shown
 * application; `undefined` when no app is shown (the alert waits).
 */
const alertHost = (
	focusedAppId: string | undefined,
	shown: ReadonlySet<string>,
	shownApplications: readonly string[],
): string | undefined => {
	if (focusedAppId && shown.has(focusedAppId)) return focusedAppId;
	if (shown.has("Finder.app")) return "Finder.app";
	return shownApplications[0];
};

/**
 * Presents the Notification Manager's requests: what the menu bar does not
 * draw (Inside Macintosh: Processes, pp. 5-4 and 5-5). Mounted once by
 * `ClassicyDesktop`.
 *
 * - The sound: each request's, once, through the sound manager at the alert
 *   volume, silent while sound is muted.
 * - The alert: a note alert with the request's message and an OK button,
 *   one request at a time, oldest first; the others wait their turn. It
 *   opens over the front application without making another app active,
 *   and plays no sound of its own.
 * - The response: `onResponse` after the alert's OK, or, with no alert,
 *   once the request has been presented.
 * - Removal: a request whose app comes to the front (`removeOnActivate`) or
 *   quits is removed, as Inside Macintosh asks of an application and as the
 *   Notification Manager flushed a quitting application's requests.
 */
export const ClassicyNotificationController: FunctionalComponent = () => {
	const entries = useSyncExternalStore(
		subscribeClassicyNotifications,
		getClassicyNotificationEntries,
		getClassicyNotificationEntries,
	);
	const player = useSoundDispatch();
	const focusedAppId = useAppManager(
		(s) => s.System.Manager.Applications.focusedAppId,
	);
	const openApps = useAppManager((s) =>
		appIdsKey(s.System.Manager.Applications.apps, isOpen),
	);
	const shownKey = useAppManager((s) =>
		appIdsKey(s.System.Manager.Applications.apps, isShown),
	);
	const shownApplicationsKey = useAppManager((s) =>
		appIdsKey(s.System.Manager.Applications.apps, isShownApplication),
	);

	// Presentation waits for the second commit: the sound manager's provider
	// mirrors the stored alert sound and volume into its state in its own
	// effects, which run after this component's on the first, so a request
	// queued before the desktop mounted would otherwise sound with defaults.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	// And for Classicy's own startup screen (or power-on overlay) to go, as
	// the system notified the user "after the startup process completes"
	// (p. 5-10). A host's own `bootScreen` owns its timing, and holds nothing.
	const startupShowing = useClassicyStartupShowing();
	const presenting = mounted && !startupShowing;

	// The sound, then (with no alert) the response, for each new request.
	useEffect(() => {
		if (!presenting) return;
		for (const { notification, alertDone, responded } of entries) {
			const posted = markClassicyNotificationSoundPlayed(notification.id);
			if (posted?.sound !== undefined) {
				warnIfUnknownSprite(posted.sound);
				player(classicyAlertVolumeSoundAction(posted.sound));
			}
			if (notification.message === undefined && alertDone && !responded) {
				respondToClassicyNotification(notification.id);
			}
		}
	}, [entries, player, presenting]);

	// An app coming to the front takes its marks down.
	const lastFocused = useRef(focusedAppId);
	useEffect(() => {
		const before = lastFocused.current;
		lastFocused.current = focusedAppId;
		if (!focusedAppId || focusedAppId === before) return;
		removeClassicyNotificationsWhere(
			(n) => n.appId === focusedAppId && n.removeOnActivate,
		);
	}, [focusedAppId]);

	// A quitting app's requests go with it.
	const lastOpen = useRef(openApps);
	useEffect(() => {
		const before = lastOpen.current;
		lastOpen.current = openApps;
		if (openApps === before) return;
		const stillOpen = new Set(openApps.split("\n"));
		const quit = new Set(
			before.split("\n").filter((id) => id !== "" && !stillOpen.has(id)),
		);
		if (quit.size > 0)
			removeClassicyNotificationsWhere((n) => quit.has(n.appId));
	}, [openApps]);

	const alerting = presenting
		? entries.find((e) => e.notification.message !== undefined && !e.alertDone)
				?.notification
		: undefined;

	// The alert's window belongs to the app that was in front when it
	// opened, and stays with it while that app is open and shown, so it
	// never activates another. Should the owner quit or hide (its window
	// would close, or go `display: none`), the alert moves to the app in
	// front now, as a new window of that app.
	const shown = useMemo(
		() => new Set(shownKey.split("\n").filter((id) => id !== "")),
		[shownKey],
	);
	const shownApplications = useMemo(
		() => shownApplicationsKey.split("\n").filter((id) => id !== ""),
		[shownApplicationsKey],
	);
	const [owner, setOwner] = useState<{ id: string; appId: string }>();
	const ownerAppId =
		alerting && owner?.id === alerting.id && shown.has(owner.appId)
			? owner.appId
			: alertHost(focusedAppId, shown, shownApplications);
	useEffect(() => {
		if (
			alerting &&
			ownerAppId &&
			(owner?.id !== alerting.id || owner.appId !== ownerAppId)
		) {
			setOwner({ id: alerting.id, appId: ownerAppId });
		}
	}, [alerting, owner, ownerAppId]);

	// No wrapper: the alert's own modal scrim blocks the desktop while it
	// shows, and nothing is left over the desktop when it cannot show.
	if (!alerting?.message || !ownerAppId) return null;
	return (
		<ClassicyAlert
			key={`${alerting.id}:${ownerAppId}`}
			id={classicyNotificationAlertWindowId(alerting.id)}
			appId={ownerAppId}
			alertType={"note"}
			label={alerting.message}
			playSound={false}
			onClose={() => completeClassicyNotificationAlert(alerting.id)}
		/>
	);
};

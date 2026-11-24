import {
	type FC as FunctionalComponent,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyAlertVolumeSoundAction } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { useClassicyStartupShowing } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupHold.internal";
import {
	completeClassicyNotificationAlert,
	getClassicyNotificationEntries,
	markClassicyNotificationSoundPlayed,
	removeClassicyNotificationsWhere,
	respondToClassicyNotification,
	subscribeClassicyNotifications,
} from "./ClassicyNotificationStore.internal";

/** The window id of a request's alert. */
export const classicyNotificationAlertWindowId = (id: string) => `${id}-alert`;

// The open apps, as one string so the selector's value compares by content.
const openAppsKey = (
	apps: Record<string, { open?: boolean; extension?: boolean }>,
) =>
	Object.entries(apps)
		.filter(([, app]) => app.open === true)
		.map(([id]) => id)
		.sort()
		.join("\n");

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
		openAppsKey(s.System.Manager.Applications.apps),
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
	// opened, kept for as long as it shows, so it never activates another.
	const [owner, setOwner] = useState<{ id: string; appId: string }>();
	const ownerAppId =
		alerting && owner?.id === alerting.id
			? owner.appId
			: focusedAppId || "Finder.app";
	useEffect(() => {
		if (alerting && owner?.id !== alerting.id) {
			setOwner({ id: alerting.id, appId: ownerAppId });
		}
	}, [alerting, owner, ownerAppId]);

	if (!alerting?.message) return null;
	return (
		<div className={"classicyDesktopDialogOverlay"}>
			<ClassicyAlert
				key={alerting.id}
				id={classicyNotificationAlertWindowId(alerting.id)}
				appId={ownerAppId}
				alertType={"note"}
				label={alerting.message}
				playSound={false}
				onClose={() => completeClassicyNotificationAlert(alerting.id)}
			/>
		</div>
	);
};

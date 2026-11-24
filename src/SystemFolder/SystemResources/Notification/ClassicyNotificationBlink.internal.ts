import { useEffect, useState, useSyncExternalStore } from "react";
import type {
	ClassicyNotificationIconSide,
	ClassicyNotificationMenuBarIcons,
} from "./ClassicyNotificationManager";

/**
 * How long each icon of a title's cycle shows: 60 ticks, one second (the
 * Notification Manager's `WaitSThresh`, System 7.1's `NotificationMgr.c`;
 * Inside Macintosh documents only that the icon "blinks periodically").
 * While icons blink over both titles, the two take turns, half this apart.
 */
export const CLASSICY_NOTIFICATION_BLINK_MS = 1000;

const STEP_MS = CLASSICY_NOTIFICATION_BLINK_MS / 2;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const reducedMotionQuery = (): MediaQueryList | undefined =>
	typeof window !== "undefined" && typeof window.matchMedia === "function"
		? window.matchMedia(REDUCED_MOTION_QUERY)
		: undefined;

const subscribeReducedMotion = (listener: () => void) => {
	const query = reducedMotionQuery();
	query?.addEventListener?.("change", listener);
	return () => query?.removeEventListener?.("change", listener);
};

const prefersReducedMotion = () => reducedMotionQuery()?.matches === true;

/** Whether the user asks for reduced motion; re-renders when that changes. */
export const useClassicyPrefersReducedMotion = (): boolean =>
	useSyncExternalStore(
		subscribeReducedMotion,
		prefersReducedMotion,
		() => false,
	);

/** The icon a title shows in place of its own right now; none: its own. */
export type ClassicyNotificationBlinkFrame = Partial<
	Record<ClassicyNotificationIconSide, string>
>;

/**
 * The menu-bar titles' blinking (Inside Macintosh: Processes, p. 5-4): each
 * title shows its requests' icons in turn and then its own, each for
 * `CLASSICY_NOTIFICATION_BLINK_MS`, so a single request's icon alternates
 * with the title's. A change of icons starts the cycle over, from the first.
 *
 * For users who prefer reduced motion nothing blinks: each title shows its
 * first request's icon steadily. While `paused` (a menu of the bar is open)
 * each title shows its own icon.
 */
export function useClassicyNotificationBlink(
	icons: ClassicyNotificationMenuBarIcons,
	paused: boolean,
): ClassicyNotificationBlinkFrame {
	const reducedMotion = useClassicyPrefersReducedMotion();
	const signature = `${icons.apple.join("\n")}\u0000${icons.application.join("\n")}`;
	const [cycle, setCycle] = useState({ signature, step: 0 });
	const step = cycle.signature === signature ? cycle.step : 0;
	const blinking =
		!paused &&
		!reducedMotion &&
		(icons.apple.length > 0 || icons.application.length > 0);

	useEffect(() => {
		setCycle((c) =>
			c.signature === signature && c.step === 0 ? c : { signature, step: 0 },
		);
		if (!blinking) return;
		const timer = setInterval(
			() => setCycle((c) => ({ signature: c.signature, step: c.step + 1 })),
			STEP_MS,
		);
		return () => clearInterval(timer);
	}, [signature, blinking]);

	if (paused) return {};
	const both = icons.apple.length > 0 && icons.application.length > 0;
	const frame: ClassicyNotificationBlinkFrame = {};
	for (const side of ["apple", "application"] as const) {
		const list = icons[side];
		if (list.length === 0) continue;
		if (reducedMotion) {
			frame[side] = list[0];
			continue;
		}
		// The title's own icon closes each cycle (index list.length).
		const offset = side === "apple" && both ? 1 : 0;
		const index = Math.floor((step + offset) / 2) % (list.length + 1);
		if (index < list.length) frame[side] = list[index];
	}
	return frame;
}

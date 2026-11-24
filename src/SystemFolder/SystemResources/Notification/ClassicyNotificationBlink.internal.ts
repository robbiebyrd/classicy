import { useEffect, useState, useSyncExternalStore } from "react";
import {
	CLASSICY_NOTIFICATION_BLINK_MS,
	type ClassicyNotificationIconSide,
	type ClassicyNotificationMenuBarIcons,
} from "./ClassicyNotificationManager";

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
 * The timer runs only while some title blinks: once a second, or twice
 * while both titles blink, each then advancing on alternate ticks.
 *
 * While `frozen` (a menu of the bar is open) the blink stops where it is,
 * as Mac OS 8.1's does while the Menu Manager tracks a menu (the Notification
 * Manager runs from `SystemTask`, which menu tracking does not call); the
 * caller draws an open title's own icon. The 8.1 captures are Platinum's
 * `resources/screenshots/mac-os-8.1/platinum-81-blink-*-sheet.png`. For users who prefer reduced motion
 * nothing blinks: each title shows its first request's icon steadily.
 */
export function useClassicyNotificationBlink(
	icons: ClassicyNotificationMenuBarIcons,
	frozen: boolean,
): ClassicyNotificationBlinkFrame {
	const reducedMotion = useClassicyPrefersReducedMotion();
	const signature = `${icons.apple.join("\n")}\u0000${icons.application.join("\n")}`;
	const [cycle, setCycle] = useState({ signature, step: 0 });
	const step = cycle.signature === signature ? cycle.step : 0;
	const both = icons.apple.length > 0 && icons.application.length > 0;
	const blinking =
		!frozen &&
		!reducedMotion &&
		(icons.apple.length > 0 || icons.application.length > 0);

	// A new set of icons starts over from the first, its timer with it.
	// `step` counts half periods: a lone title advances every two, at one
	// tick a second; two titles take turns, at one tick each half second.
	useEffect(() => {
		setCycle((c) => (c.signature === signature ? c : { signature, step: 0 }));
		if (!blinking) return;
		const timer = setInterval(
			() =>
				setCycle((c) => ({
					signature: c.signature,
					step: c.step + (both ? 1 : 2),
				})),
			both
				? CLASSICY_NOTIFICATION_BLINK_MS / 2
				: CLASSICY_NOTIFICATION_BLINK_MS,
		);
		return () => clearInterval(timer);
	}, [signature, blinking, both]);

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

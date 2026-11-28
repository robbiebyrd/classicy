import { useEffect, useRef, useState } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { computeAnchoredTime } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";

/**
 * The tick both of Classicy's clocks run (plan 0020-w98 §2, "The clock"):
 * the menu bar's (`ClassicyDesktopMenuWidgetTime`) and the taskbar's
 * (`ClassicyTaskbarClock.internal.tsx`). Internal: not exported from the
 * package.
 */

/**
 * How often the clock's value changes: every second (the menu bar's clock,
 * which may show seconds), or only when the minute does (the taskbar's,
 * which never does).
 */
export type ClassicyClockResolution = "second" | "minute";

/** The store's UTC instant shifted by its whole-hour offset, in ms. */
const virtualMsOf = (dateTime: string, timeZoneOffset: string): number =>
	new Date(dateTime).getTime() +
	Number.parseInt(timeZoneOffset, 10) * 60 * 60 * 1000;

/**
 * The virtual clock's present moment, as a `Date` whose UTC fields read the
 * local time (the store's `DateAndTime.dateTime` shifted by its
 * `timeZoneOffset`), so a reader formats it with `getUTCHours()` and the
 * rest whatever the browser's own zone.
 *
 * - **Anchored.** It runs on two wall-clock anchors (the virtual moment
 *   when the store last set the time, and `Date.now()` then), polled every
 *   250 ms, so it never drifts however late the interval fires
 *   (`computeAnchoredTime`).
 * - **The store's time.** A new `dateTime` or `timeZoneOffset` resets both
 *   anchors and shows the new time at once, even while paused.
 * - **Paused** (`DateAndTime.paused`), it stands at the moment it paused,
 *   and goes on from there when it resumes.
 * - **The minute.** When the minute turns it writes the store
 *   (`ClassicyManagerDateTimeSet`, the UTC instant), once a minute and never
 *   more often, so everything reading `dateTime` follows the clock. Every
 *   mounted clock does, so the store keeps time while any clock is mounted,
 *   hidden ones included (a clock hidden by `DateAndTime.show` keeps its
 *   hook running).
 * - **Its value** changes each second at the `"second"` resolution (the
 *   default), only on a new minute (and on a store change) at `"minute"`.
 */
export function useClassicyClockTime({
	resolution = "second",
}: {
	resolution?: ClassicyClockResolution;
} = {}): Date {
	const dateTime = useAppManager((s) => s.System.Manager.DateAndTime.dateTime);
	const timeZoneOffset = useAppManager(
		(s) => s.System.Manager.DateAndTime.timeZoneOffset,
	);
	const paused = useAppManager((s) => s.System.Manager.DateAndTime.paused);
	const dispatch = useAppManagerDispatch();

	const [localDate, setLocalDate] = useState(
		() => new Date(virtualMsOf(dateTime, timeZoneOffset)),
	);

	// Wall-clock anchors: virtualAnchorMsRef holds the local (tz-shifted)
	// epoch-ms when the anchor was last set; realAnchorMsRef holds Date.now()
	// at that moment.
	const virtualAnchorMsRef = useRef(virtualMsOf(dateTime, timeZoneOffset));
	const realAnchorMsRef = useRef(Date.now());

	const timeZoneOffsetRef = useRef(timeZoneOffset);
	const prevMinutesRef = useRef(localDate.getUTCMinutes());
	const prevSecondsRef = useRef(localDate.getUTCSeconds());
	const pausedRef = useRef(paused);
	const resolutionRef = useRef(resolution);
	resolutionRef.current = resolution;

	// When the store changes (a new time or zone), reset both anchors and the
	// second and minute refs, so the next tick updates from the new baseline,
	// and show the new time at once: this must not wait for the tick, which
	// does nothing while paused.
	useEffect(() => {
		const newVirtualMs = virtualMsOf(dateTime, timeZoneOffset);
		virtualAnchorMsRef.current = newVirtualMs;
		realAnchorMsRef.current = Date.now();
		const d = new Date(newVirtualMs);
		prevSecondsRef.current = d.getUTCSeconds();
		prevMinutesRef.current = d.getUTCMinutes();
		setLocalDate(d);
	}, [dateTime, timeZoneOffset]);

	useEffect(() => {
		timeZoneOffsetRef.current = timeZoneOffset;
	}, [timeZoneOffset]);

	useEffect(() => {
		pausedRef.current = paused;
	}, [paused]);

	// Pause: snapshot both anchors at the current virtual moment, so the
	// formula yields that frozen time on later ticks. Resume: reset only
	// realAnchorMs, so the clock goes on from the paused instant.
	useEffect(() => {
		if (paused) {
			const frozenMs =
				virtualAnchorMsRef.current + (Date.now() - realAnchorMsRef.current);
			virtualAnchorMsRef.current = frozenMs;
			realAnchorMsRef.current = Date.now();
		} else {
			realAnchorMsRef.current = Date.now();
		}
	}, [paused]);

	// Poll every 250 ms; evaluate the anchor formula and move on only when the
	// second changes. Writes the store on minute boundaries.
	useEffect(() => {
		const intervalId = setInterval(() => {
			if (pausedRef.current) return;
			const local = computeAnchoredTime(
				virtualAnchorMsRef.current,
				realAnchorMsRef.current,
			);

			const newSeconds = local.getUTCSeconds();
			if (newSeconds === prevSecondsRef.current) return;
			prevSecondsRef.current = newSeconds;

			const date = new Date(
				local.getTime() -
					Number.parseInt(timeZoneOffsetRef.current, 10) * 60 * 60 * 1000,
			);
			const newMinutes = local.getUTCMinutes();
			const minuteTurned = newMinutes !== prevMinutesRef.current;

			if (resolutionRef.current === "second" || minuteTurned)
				setLocalDate(local);

			if (minuteTurned) {
				prevMinutesRef.current = newMinutes;
				dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: date });
			}
		}, 250);

		return () => clearInterval(intervalId);
	}, [dispatch]);

	return localDate;
}

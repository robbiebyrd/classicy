import { useCallback, useEffect, useRef, useState } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

export { classicyDateTimeManagerEventHandler } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler";

/** Returns a new Date shifted by tzOffsetHours hours from the UTC ISO string. */
export function toLocalDate(isoString: string, tzOffsetHours: number): Date {
	return new Date(
		new Date(isoString).getTime() + tzOffsetHours * 60 * 60 * 1000,
	);
}

/** Returns "HH:MM:SS" for the given UTC ISO string adjusted by tzOffsetHours. */
export function toLocalHMS(isoString: string, tzOffsetHours: number): string {
	const d = toLocalDate(isoString, tzOffsetHours);
	const h = String(d.getUTCHours()).padStart(2, "0");
	const m = String(d.getUTCMinutes()).padStart(2, "0");
	const s = String(d.getUTCSeconds()).padStart(2, "0");
	return `${h}:${m}:${s}`;
}

/**
 * Computes the current virtual time from two wall-clock anchors.
 *
 * virtualAnchorMs: the virtual epoch-ms when the anchor was last set.
 * realAnchorMs: Date.now() at that exact same moment.
 *
 * Drift-free: however late the caller invokes this, the elapsed real time
 * is always reflected exactly, with no accumulation error.
 */
export function computeAnchoredTime(
	virtualAnchorMs: number,
	realAnchorMs: number,
): Date {
	return new Date(virtualAnchorMs + (Date.now() - realAnchorMs));
}

export interface ClassicyDateTimeValue {
	/** UTC ISO string from the store (updates on minute boundaries when tick is active). */
	dateTime: string;
	/** Parsed integer hours offset from the store. */
	tzOffset: number;
	/**
	 * TZ-adjusted Date. When tick is true, advances every second; otherwise
	 * reflects the store value directly.
	 */
	localDate: Date;
	/** "HH:MM:SS" derived from localDate. */
	localHMS: string;
	/** Whether the clock is currently paused. */
	paused: boolean;
	/** Whether the clock is locked at a boundary (min or max). */
	boundaryLocked: boolean;
	setDateTime: (date: Date) => void;
	setTzOffset: (offset: string) => void;
	pause: () => void;
	resume: () => void;
}

/**
 * Read the virtual clock from the Classicy store.
 *
 * With `tick: true` the returned `localDate` and `localHMS` advance using
 * wall-clock anchoring — drift-free regardless of interval jitter or tab
 * backgrounding. The store is only updated on minute boundaries to avoid
 * excess writes.
 */
export function useClassicyDateTime(options?: {
	tick?: boolean;
}): ClassicyDateTimeValue {
	const tick = options?.tick ?? false;
	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	const dispatch = useAppManagerDispatch();

	const tzOffset = parseInt(dateAndTime.timeZoneOffset, 10);
	const paused = dateAndTime.paused;

	const [localDate, setLocalDate] = useState<Date>(() =>
		toLocalDate(dateAndTime.dateTime, tzOffset),
	);

	// Wall-clock anchors: virtualAnchorMsRef holds the virtual epoch-ms when the
	// anchor was last set; realAnchorMsRef holds Date.now() at that moment.
	// computeAnchoredTime() produces drift-free virtual time from these two refs.
	const virtualAnchorMsRef = useRef<number>(
		toLocalDate(dateAndTime.dateTime, tzOffset).getTime(),
	);
	const realAnchorMsRef = useRef<number>(Date.now());

	const tzOffsetRef = useRef(tzOffset);
	tzOffsetRef.current = tzOffset;
	const pausedRef = useRef(paused);
	pausedRef.current = paused;

	const boundaryLocked = dateAndTime.boundaryLocked;
	const minDateTime = dateAndTime.minDateTime ?? null;
	const maxDateTime = dateAndTime.maxDateTime ?? null;

	const boundaryLockedRef = useRef(boundaryLocked);
	boundaryLockedRef.current = boundaryLocked;
	const minDateTimeRef = useRef(minDateTime);
	minDateTimeRef.current = minDateTime;
	const maxDateTimeRef = useRef(maxDateTime);
	maxDateTimeRef.current = maxDateTime;

	// When the store's dateTime changes (user sets a new time, or minute dispatch
	// from the MenuBar widget), reset both anchors to the new virtual moment.
	useEffect(() => {
		const newVirtualMs = toLocalDate(dateAndTime.dateTime, tzOffset).getTime();
		virtualAnchorMsRef.current = newVirtualMs;
		realAnchorMsRef.current = Date.now();
		setLocalDate(new Date(newVirtualMs));
	}, [dateAndTime.dateTime, tzOffset]);

	// Pause: snapshot both anchors at the current virtual moment so the formula
	// yields that frozen time on all subsequent ticks.
	// Resume: keep virtualAnchorMs at the frozen moment, reset realAnchorMs to
	// now so elapsed real time counts from the exact resume instant.
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

	// Poll every 250ms and evaluate the anchor formula. Only updates React state
	// when the displayed second actually changes, so render frequency stays ≤1 Hz
	// even though the interval fires 4× per second.
	// Also checks min/max bounds on each tick and dispatches a correction if the
	// virtual clock crosses a boundary; skips advancing when boundaryLocked is true.
	useEffect(() => {
		if (!tick) return;
		const id = setInterval(() => {
			if (pausedRef.current || boundaryLockedRef.current) return;

			const virtualNow = computeAnchoredTime(
				virtualAnchorMsRef.current,
				realAnchorMsRef.current,
			);
			const virtualNowMs = virtualNow.getTime();
			const utcNowMs = virtualNowMs - tzOffsetRef.current * 3600000;

			const minMs =
				minDateTimeRef.current !== null
					? new Date(minDateTimeRef.current).getTime()
					: null;
			const maxMs =
				maxDateTimeRef.current !== null
					? new Date(maxDateTimeRef.current).getTime()
					: null;

			if (minMs !== null && utcNowMs < minMs) {
				dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: new Date(minMs) });
				return;
			}

			if (maxMs !== null && utcNowMs >= maxMs) {
				dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: new Date(maxMs) });
				return;
			}

			setLocalDate((prev) => {
				if (
					Math.floor(prev.getTime() / 1000) ===
					Math.floor(virtualNowMs / 1000)
				) {
					return prev;
				}
				return virtualNow;
			});
		}, 250);
		return () => clearInterval(id);
	}, [tick, dispatch]);

	const setDateTime = useCallback(
		(date: Date) => {
			dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: date });
		},
		[dispatch],
	);

	const setTzOffset = useCallback(
		(offset: string) => {
			dispatch({ type: "ClassicyManagerDateTimeTZSet", tzOffset: offset });
		},
		[dispatch],
	);

	const pause = useCallback(
		() => dispatch({ type: "ClassicyManagerDateTimePause" }),
		[dispatch],
	);

	const resume = useCallback(
		() => dispatch({ type: "ClassicyManagerDateTimeResume" }),
		[dispatch],
	);

	const localHMS = toLocalHMS(localDate.toISOString(), 0);

	return {
		dateTime: dateAndTime.dateTime,
		tzOffset,
		localDate,
		localHMS,
		paused,
		boundaryLocked,
		setDateTime,
		setTzOffset,
		pause,
		resume,
	};
}

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
	setDateTime: (date: Date) => void;
	setTzOffset: (offset: string) => void;
}

/**
 * Read the virtual clock from the Classicy store.
 *
 * With `tick: true` the returned `localDate` and `localHMS` advance every
 * second from the stored base time, matching the MenuBar widget pattern.
 * The store itself is only updated on minute boundaries to avoid excess
 * writes.
 */
export function useClassicyDateTime(options?: {
	tick?: boolean;
}): ClassicyDateTimeValue {
	const tick = options?.tick ?? false;
	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	const dispatch = useAppManagerDispatch();

	const tzOffset = parseInt(dateAndTime.timeZoneOffset, 10);

	const [localDate, setLocalDate] = useState<Date>(() =>
		toLocalDate(dateAndTime.dateTime, tzOffset),
	);

	// Accumulates the advancing local time so each tick builds on the previous tick
	const localDateRef = useRef<Date>(toLocalDate(dateAndTime.dateTime, tzOffset));
	const tzOffsetRef = useRef(tzOffset);
	tzOffsetRef.current = tzOffset;

	// When the store changes (user sets a new time), reset the accumulated clock
	useEffect(() => {
		const reset = toLocalDate(dateAndTime.dateTime, tzOffset);
		localDateRef.current = reset;
		setLocalDate(reset);
	}, [dateAndTime.dateTime, tzOffset]);

	// Per-second tick: advance from the accumulated ref, not from the store base
	useEffect(() => {
		if (!tick) return;
		const id = setInterval(() => {
			const advanced = new Date(localDateRef.current.getTime() + 1000);
			localDateRef.current = advanced;
			setLocalDate(advanced);
		}, 1000);
		return () => clearInterval(id);
	}, [tick]);

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

	const localHMS = toLocalHMS(localDate.toISOString(), 0);

	return { dateTime: dateAndTime.dateTime, tzOffset, localDate, localHMS, setDateTime, setTzOffset };
}


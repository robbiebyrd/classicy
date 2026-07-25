import {
	hasDateTime,
	hasTzOffset,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/**
 * Clamp `date` into the configured [minDateTime, maxDateTime] window, store it
 * as a UTC ISO string, and update boundaryLocked.
 *
 * Shared by ClassicyManagerDateTimeSet and ClassicyManagerDateTimeSync so both
 * honour host-configured bounds identically.
 */
function applyDateTimeWithBounds(ds: ClassicyStore, date: Date): void {
	const { minDateTime, maxDateTime } = ds.System.Manager.DateAndTime;
	const isoValue = date.toISOString();

	if (maxDateTime !== null && isoValue >= maxDateTime) {
		ds.System.Manager.DateAndTime.dateTime = maxDateTime;
		ds.System.Manager.DateAndTime.boundaryLocked = true;
	} else if (minDateTime !== null && isoValue < minDateTime) {
		ds.System.Manager.DateAndTime.dateTime = minDateTime;
		ds.System.Manager.DateAndTime.boundaryLocked = false;
	} else {
		ds.System.Manager.DateAndTime.dateTime = isoValue;
		ds.System.Manager.DateAndTime.boundaryLocked = false;
	}
}

export const classicyDateTimeManagerEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyManagerDateTimeSet": {
			if (!hasDateTime(action)) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Expected a Date for dateTime",
					{ received: action.dateTime, receivedType: typeof action.dateTime },
				);
				break;
			}
			applyDateTimeWithBounds(ds, action.dateTime);
			break;
		}
		case "ClassicyManagerDateTimeTZSet": {
			if (!hasTzOffset(action)) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Invalid tzOffset:",
					action.tzOffset,
				);
				break;
			}
			const offset = Number(action.tzOffset);
			if (!Number.isFinite(offset) || offset < -12 || offset > 14) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Invalid tzOffset:",
					action.tzOffset,
				);
				break;
			}
			ds.System.Manager.DateAndTime.timeZoneOffset = String(offset);
			break;
		}
		case "ClassicyManagerDateTimeSync": {
			const dt = ds.System.Manager.DateAndTime;
			const now = new Date();
			// Sync always adopts the host machine's offset, so the synced hour
			// reads as real local time regardless of what was selected before.
			// Fractional zones (e.g. India, +5.5) are stored faithfully; the
			// timezone pop-up lists whole hours only and will show no selection.
			const newTz = -now.getTimezoneOffset() / 60;
			// Shift into the new local frame so UTC getters yield machine
			// wall-clock fields, independent of the browser's own timezone.
			// Below, a date sourced from dateSource (which may come from a
			// different offset) is recomposed with this machine wall-clock
			// time; that only works if both are read in one consistent local
			// frame first, which is why `- newTz * 3600000` afterwards is
			// load-bearing: it converts the composed local wall time back to
			// UTC for storage. That's true when dateSource comes from the
			// stored date (the time-only path); on the full-sync path
			// dateSource === nowLocal, so the round trip provably cancels
			// back to floor_s(Date.now()) — the shared composition below is
			// intentional, not redundant, since it serves both branches.
			const nowLocal = new Date(now.getTime() + newTz * 3600000);

			// In time-only mode the calendar date the user currently SEES is
			// preserved. That date is rendered in the OLD offset, so shift by it
			// — not by newTz — before reading the Y/M/D fields.
			const oldTz = Number(dt.timeZoneOffset) || 0;
			const dateSource = dt.syncTimeOnly
				? new Date(new Date(dt.dateTime).getTime() + oldTz * 3600000)
				: nowLocal;

			const localMs = Date.UTC(
				dateSource.getUTCFullYear(),
				dateSource.getUTCMonth(),
				dateSource.getUTCDate(),
				nowLocal.getUTCHours(),
				nowLocal.getUTCMinutes(),
				nowLocal.getUTCSeconds(),
				0,
			);

			dt.timeZoneOffset = String(newTz);
			applyDateTimeWithBounds(ds, new Date(localMs - newTz * 3600000));
			break;
		}
		case "ClassicyManagerDateTimePause": {
			ds.System.Manager.DateAndTime.paused = true;
			break;
		}
		case "ClassicyManagerDateTimeLock": {
			ds.System.Manager.DateAndTime.dateTimeLocked = true;
			break;
		}
		case "ClassicyManagerDateTimeUnlock": {
			ds.System.Manager.DateAndTime.dateTimeLocked = false;
			break;
		}
		case "ClassicyManagerDateTimeResume": {
			if (ds.System.Manager.DateAndTime.boundaryLocked) {
				break;
			}
			ds.System.Manager.DateAndTime.paused = false;
			break;
		}
	}
	return ds;
};

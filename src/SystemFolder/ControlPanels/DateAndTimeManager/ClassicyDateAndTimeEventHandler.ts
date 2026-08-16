import {
	hasDateTime,
	hasMilitaryTime,
	hasTzOffset,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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
				classicyLog(
					"error",
					"classicyDateTimeManagerEventHandler",
					"Expected a Date for dateTime",
					{ received: action.dateTime, receivedType: typeof action.dateTime },
				);
				break;
			}
			applyDateTimeWithBounds(ds, action.dateTime);
			break;
		}
		case "ClassicyManagerDateTimeTZSet": {
			if (!hasTzOffset(action)) {
				classicyLog(
					"error",
					"classicyDateTimeManagerEventHandler",
					"Invalid tzOffset:",
					action.tzOffset,
				);
				break;
			}
			const offset = Number(action.tzOffset);
			if (!Number.isFinite(offset) || offset < -12 || offset > 14) {
				classicyLog(
					"error",
					"classicyDateTimeManagerEventHandler",
					"Invalid tzOffset:",
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
			// Shift into the machine's local frame so UTC getters yield wall-clock
			// fields. The `- newTz` below converts the recomposed local time back to
			// UTC; on the full-sync path it cancels, on the time-only path it does not.
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
		case "ClassicyManagerDateTimeFormatSet": {
			if (!hasMilitaryTime(action)) {
				classicyLog(
					"error",
					"classicyDateTimeManagerEventHandler",
					"Expected a boolean for militaryTime",
					{
						received: action.militaryTime,
						receivedType: typeof action.militaryTime,
					},
				);
				break;
			}
			ds.System.Manager.DateAndTime.militaryTime = action.militaryTime;
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

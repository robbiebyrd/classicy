import {
	hasDateTime,
	hasTzOffset,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

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
			const { minDateTime, maxDateTime } = ds.System.Manager.DateAndTime;
			const isoValue = action.dateTime.toISOString();

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
		case "ClassicyManagerDateTimePause": {
			ds.System.Manager.DateAndTime.paused = true;
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

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
			const raw = action.dateTime;
			if (!(raw instanceof Date)) {
				console.error(
					"[classicyDateTimeManagerEventHandler] Expected a Date for dateTime",
					{ received: raw, receivedType: typeof raw },
				);
				break;
			}
			ds.System.Manager.DateAndTime.dateTime = raw.toISOString();
			break;
		}
		case "ClassicyManagerDateTimeTZSet": {
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
	}
	return ds;
};

import {
  ActionMessage,
  ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export const classicyDateTimeManagerEventHandler = (
  ds: ClassicyStore,
  action: ActionMessage,
) => {
  switch (action.type) {
    case "ClassicyManagerDateTimeSet": {
      const t = action.dateTime as Date;
      ds.System.Manager.DateAndTime.dateTime = t.toISOString();
      break;
    }
    case "ClassicyManagerDateTimeTZSet": {
      ds.System.Manager.DateAndTime.timeZoneOffset =
        String(action.tzOffset);
      break;
    }
  }
  return ds;
};

import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const DATE_AND_TIME_MANAGER_APP_ID = "DateAndTimeManager.app";

// Description-only manifest: the Date & Time control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: DATE_AND_TIME_MANAGER_APP_ID,
	description: "Control panel for the desktop clock's date, time, and time zone.",
});

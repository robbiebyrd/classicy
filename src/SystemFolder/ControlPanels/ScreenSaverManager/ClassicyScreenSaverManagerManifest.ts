import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const SCREEN_SAVER_MANAGER_APP_ID = "ScreenSaverManager.app";

// Description-only manifest: the Screen Saver control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: SCREEN_SAVER_MANAGER_APP_ID,
	description: "Control panel for the screen saver: pick a module and set idle timing.",
});

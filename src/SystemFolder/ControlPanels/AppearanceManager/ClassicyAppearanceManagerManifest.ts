import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const APPEARANCE_MANAGER_APP_ID = "AppearanceManager.app";

// Description-only manifest: the Appearance control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: APPEARANCE_MANAGER_APP_ID,
	description: "Control panel for themes, colors, and the desktop background.",
});

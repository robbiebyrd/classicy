import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const DRIVE_SETUP_APP_ID = "DriveSetup.app";

// Description-only manifest: the Drive Setup control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: DRIVE_SETUP_APP_ID,
	description: "Disk utility: initialize the startup disk or sync it with its backend.",
});

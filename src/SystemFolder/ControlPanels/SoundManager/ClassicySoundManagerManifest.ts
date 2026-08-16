import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const SOUND_MANAGER_APP_ID = "SoundManager.app";

// Description-only manifest: the Sound control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: SOUND_MANAGER_APP_ID,
	description: "Control panel for alert sounds and system volume.",
});

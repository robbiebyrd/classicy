import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const APPLE_MENU_OPTIONS_APP_ID = "AppleMenuOptions.app";
export const APPLE_MENU_OPTIONS_APP_NAME = "Apple Menu Options";

// Description-only manifest: the Apple Menu Options control panel edits
// System.Manager.Desktop.recentItems through ClassicyDesktopRecentItems*
// actions, so it has no reducer of its own; every bundled app registers a
// description (the balloon-help copy ClassicyApp falls back to).
registerApp({
	id: APPLE_MENU_OPTIONS_APP_ID,
	description:
		"Control panel for the Apple menu's Recent Applications and Recent Documents: turn them on or off and set how many items each remembers.",
	// Not an application: Recent Applications never lists it.
	controlPanel: true,
});

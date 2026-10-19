import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const CONTROL_STRIP_MANAGER_APP_ID = "ControlStripManager.app";
export const CONTROL_STRIP_MANAGER_APP_NAME = "Control Strip";

// Description-only manifest: the Control Strip control panel edits
// System.Manager.Desktop.controlStrip through ClassicyDesktopControlStrip*
// actions, so it has no reducer of its own — but every bundled app registers
// a description (the balloon-help copy ClassicyApp falls back to).
registerApp({
	id: CONTROL_STRIP_MANAGER_APP_ID,
	description:
		"Control panel for the Control Strip: show or hide the strip, and choose which modules it shows and in what order.",
});

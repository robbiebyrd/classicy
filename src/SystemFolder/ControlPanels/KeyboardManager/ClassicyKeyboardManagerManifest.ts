import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const KEYBOARD_MANAGER_APP_ID = "KeyboardManager.app";
export const KEYBOARD_MANAGER_APP_NAME = "Keyboard";

// Description-only manifest: the Keyboard control panel edits
// System.Manager.Desktop.shortcutOverrides through the
// ClassicyDesktopSetShortcutOverride and ClassicyDesktopResetShortcutOverrides
// actions, so it has no reducer of its own — but every bundled app registers
// a description (the balloon-help copy ClassicyApp falls back to).
registerApp({
	id: KEYBOARD_MANAGER_APP_ID,
	description:
		"Control panel for the keyboard shortcuts of the built-in applications' menu commands.",
});

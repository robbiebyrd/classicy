import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const APPEARANCE_MANAGER_APP_ID = "AppearanceManager.app";

/** The key of the panel's remembering tab strip (`useClassicySessionTab`). */
export const APPEARANCE_MANAGER_TABS_KEY = "main";

/**
 * The panel's Desktop tab, by its place in the strip (Themes, Packages,
 * Options, Desktop, Colors, Fonts, Metrics, Sound): Windows' Display
 * Properties opens on its Background, which the Desktop tab sets
 * (`openClassicyAppAtTab`).
 */
export const APPEARANCE_MANAGER_DESKTOP_TAB = 3;

// Description-only manifest: the Appearance control panel has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: APPEARANCE_MANAGER_APP_ID,
	description: "Control panel for themes, colors, and the desktop background.",
});

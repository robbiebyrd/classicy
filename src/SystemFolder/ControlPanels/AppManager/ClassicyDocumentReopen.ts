import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { focusWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

/**
 * Whether opening a document or folder that is already open brings its own
 * window forward: the active package's `layout.document.reopenActivates`
 * (Windows; WIG Ch.6 "Opening and Closing Windows", pp.94-95, repeating an
 * open of a document: "Activates the existing window of the object and
 * displays it at the top of the window Z order"; Ch.5 "View Operations",
 * p.46; Ch.9 "Single Document Window Interface", p.175), read store-free
 * from the draft's package id. Absent or `false` (Mac OS 8 and
 * System 7, today's behavior): the app comes forward with its last-focused
 * window.
 */
export const classicyReopenActivates = (ds: ClassicyStore): boolean =>
	getClassicyAppearanceLayout(ds.System.Manager.Appearance?.packageId).document
		?.reopenActivates === true;

/**
 * Under `layout.document.reopenActivates`, the second half of an open of a
 * document or folder that `wasOpen` already: focus `windowId`, the app's own
 * window for it, when that window is registered and not closed, so it, not
 * the app's last-focused window, comes forward and takes the menu bar. Call
 * it after the open brought the app forward (`openApp`). Returns whether it
 * focused the window; under any other package, or for a document that was
 * not open, or whose window has not registered yet, it does nothing (a
 * window opening for the first time, or again after its close, focuses
 * itself when it registers).
 *
 * The generic `*OpenFile` route passes ClassicyApp's file-window id
 * (`${appId}_file_${path}`); an app with its own reducer passes its own key
 * (the PDF Viewer's `${appId}_file_${path}`, the Picture Viewer's and Movie
 * Player's `${appId}_PictureViewer_${path}` and `${appId}_MoviePlayer_${path}`,
 * the Finder's folder path).
 */
export function focusClassicyReopenedWindow(
	ds: ClassicyStore,
	appId: string,
	windowId: string,
	wasOpen: boolean,
): boolean {
	if (!wasOpen || !classicyReopenActivates(ds)) return false;
	const apps = ds.System.Manager.Applications.apps;
	if (!Object.hasOwn(apps, appId)) return false;
	const win = getAppWindow(apps[appId], windowId);
	if (!win || win.closed) return false;
	focusWindow(ds, appId, windowId);
	return true;
}

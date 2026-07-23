import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export function getDefaultAppForFileType(
	ds: ClassicyStore,
	fileType: ClassicyFileSystemEntryFileType,
): string | undefined {
	return ds.System.Manager.Applications.fileTypeHandlers[fileType];
}

export function deFocusApps(ds: ClassicyStore) {
	for (const app of Object.values(ds.System.Manager.Applications.apps)) {
		app.focused = false;
		app.windows.forEach((w) => {
			w.focused = false;
		});
	}
	ds.System.Manager.Applications.focusedAppId = undefined;
	return ds;
}

export function focusWindow(
	ds: ClassicyStore,
	appId: string,
	windowId: string,
	menuBar?: ClassicyMenuItem[],
) {
	const app = ds.System.Manager.Applications.apps[appId];
	if (!app) return ds;
	deFocusApps(ds);
	app.focused = true;
	app.lastFocusedAt = Date.now();
	ds.System.Manager.Applications.focusedAppId = appId;
	const win = app.windows.find((w) => w.id === windowId);
	if (win) {
		win.focused = true;
		win.zOrder = Date.now();
		app.lastAccessedWindowId = windowId;
		const menu = menuBar ?? win.menuBar;
		if (menu) {
			ds.System.Manager.Desktop.appMenu = menu;
		}
	}
	return ds;
}

function pickWindowToRestore(app: ClassicyStoreSystemApp) {
	// Utility (tool-palette) windows float and never become the active document
	// window, so they are never a succession target. When only utility windows
	// remain, candidates is empty and focusApp keeps the app focused with no
	// focused window.
	const candidates = app.windows.filter(
		(w) => !w.closed && w.windowType !== "utility",
	);
	if (candidates.length === 0) return undefined;
	const lastAccessed = candidates.find(
		(w) => w.id === app.lastAccessedWindowId,
	);
	if (lastAccessed) return lastAccessed;
	const withZOrder = candidates.filter((w) => w.zOrder !== undefined);
	if (withZOrder.length > 0) {
		return withZOrder.reduce((best, w) =>
			(w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
		);
	}
	return candidates.find((w) => w.default) ?? candidates[candidates.length - 1];
}

export function focusApp(ds: ClassicyStore, appId: string) {
	const app = ds.System.Manager.Applications.apps[appId];
	// A closed app can never take focus: in-window controls that quit their
	// own app bubble a ClassicyAppActivate after the ClassicyAppClose, and
	// honoring it would leave a closed app owning the menu bar.
	if (!app || !app.open) return;
	const restore = pickWindowToRestore(app);
	if (restore) {
		focusWindow(ds, appId, restore.id);
	} else {
		deFocusApps(ds);
		app.focused = true;
		app.lastFocusedAt = Date.now();
		ds.System.Manager.Applications.focusedAppId = appId;
	}
}

/**
 * Pick the app that should inherit the menu bar when `closingAppId` quits.
 *
 * Returns the most-recently-focused OPEN, non-extension app, excluding Finder
 * (the floor, never a peer in the rotation) and the app being closed. Returns
 * undefined when only Finder remains — the caller falls back to Finder + the
 * desktop menu bar. Recency comes from `lastFocusedAt`; apps that have never
 * been focused (no timestamp) sort oldest.
 */
export function pickSuccessorApp(
	ds: ClassicyStore,
	closingAppId: string,
): string | undefined {
	const candidates = Object.values(ds.System.Manager.Applications.apps).filter(
		(app) =>
			app.open &&
			app.extension !== true &&
			app.id !== "Finder.app" &&
			app.id !== closingAppId,
	);
	if (candidates.length === 0) return undefined;
	const best = candidates.reduce((a, b) =>
		(b.lastFocusedAt ?? 0) > (a.lastFocusedAt ?? 0) ? b : a,
	);
	return best.id;
}

export function openApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (findApp) {
		findApp.open = true;
		findApp.windows.forEach((w) => {
			w.closed = false;
		});
		focusApp(ds, appId);
	} else {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: [],
			open: true,
			data: {},
		};
	}
}

export function loadApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
	contextMenu?: ClassicyMenuItem[],
	extension?: boolean,
) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (!findApp) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: [],
			// Extensions run in the background from the moment they load; their
			// windows can only render while the app is open. They never take
			// focus on load.
			open: extension === true,
			data: {},
			contextMenu,
			...(extension ? { extension: true, focused: false } : {}),
		};
	} else {
		// Always refresh: menu onClickFunc handlers do not survive localStorage
		// persistence, so a re-mounting app must overwrite the persisted value.
		findApp.contextMenu = contextMenu;
		if (extension) {
			// A persisted extension entry may have open: false (or a stale
			// focused flag) from an old session; extensions always run in the
			// background once mounted.
			findApp.extension = true;
			findApp.open = true;
			findApp.focused = false;
		} else if (findApp.extension) {
			// The app was an extension in a previous session but mounts as a
			// regular app now — clear the stale flag so it isn't hidden from
			// the App Switcher or listed under System Folder/Extensions.
			delete findApp.extension;
		}
	}
}

export function closeApp(ds: ClassicyStore, appId: string) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (findApp) {
		findApp.open = false;
		findApp.focused = false;
		findApp.windows?.forEach((w) => {
			w.closed = true;
		});
	}
}

/**
 * @deprecated Alias of focusApp, kept for public API compatibility.
 */
export const activateApp = focusApp;

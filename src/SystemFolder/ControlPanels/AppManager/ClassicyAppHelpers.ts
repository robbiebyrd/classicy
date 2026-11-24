import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	getAppWindow,
	listAppWindows,
	mostRecentAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { recordClassicyRecentApp } from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";

// An app id is library input (a host's `ClassicyApp` id, a stack's
// `ClassicyAppOpen`). Indexed plainly, `apps["__proto__"]` is
// `Object.prototype`, and assigned, it rewrites the record's prototype, so
// that id is never an app.
const RESERVED_APP_ID = "__proto__";

/** The app record with `appId`, or `undefined` when there is none of its own. */
const ownApp = (ds: ClassicyStore, appId: string) => {
	const apps = ds.System.Manager.Applications.apps;
	return Object.hasOwn(apps, appId) ? apps[appId] : undefined;
};

/** Whether `appId` may become a record key; logs a refusal. */
const isAssignableAppId = (appId: string) => {
	if (appId !== RESERVED_APP_ID) return true;
	classicyLog("warn", "ClassicyAppHelpers", "Ignoring reserved app id", {
		appId,
	});
	return false;
};

export function getDefaultAppForFileType(
	ds: ClassicyStore,
	fileType: ClassicyFileSystemEntryFileType,
): string | undefined {
	return ds.System.Manager.Applications.fileTypeHandlers[fileType];
}

export function deFocusApps(ds: ClassicyStore) {
	for (const app of Object.values(ds.System.Manager.Applications.apps)) {
		app.focused = false;
		for (const w of listAppWindows(app)) {
			w.focused = false;
		}
	}
	ds.System.Manager.Applications.focusedAppId = undefined;
	return ds;
}

/**
 * Marks `appId` the focused app: every other app and window unfocused, the
 * app focused, stamped and recorded as `focusedAppId`, and shown when it was
 * hidden (an app that takes focus is shown, HIG7 p.127). Every path that
 * gives an app the menu bar goes through here.
 */
export function markAppFocused(ds: ClassicyStore, appId: string) {
	const app = ownApp(ds, appId);
	if (!app) return;
	deFocusApps(ds);
	app.focused = true;
	app.lastFocusedAt = Date.now();
	if (app.hidden) app.hidden = false;
	ds.System.Manager.Applications.focusedAppId = appId;
}

export function focusWindow(
	ds: ClassicyStore,
	appId: string,
	windowId: string,
	menuBar?: ClassicyMenuItem[],
) {
	const app = ownApp(ds, appId);
	if (!app) return ds;
	markAppFocused(ds, appId);
	const win = getAppWindow(app, windowId);
	if (win) {
		win.focused = true;
		// Strictly above every sibling, not just Date.now(): two focuses in the
		// same millisecond would otherwise tie, and succession would break the
		// tie by record order rather than recency.
		const topZOrder = Math.max(
			0,
			...listAppWindows(app).map((w) => w.zOrder ?? 0),
		);
		win.zOrder = Math.max(Date.now(), topZOrder + 1);
		app.lastAccessedWindowId = windowId;
		const menu = menuBar ?? win.menuBar;
		if (menu) {
			ds.System.Manager.Desktop.appMenu = menu;
		}
	}
	return ds;
}

/**
 * Which window an app re-focuses when it is activated. In priority order:
 *
 * 1. the last-accessed window (`lastAccessedWindowId`), if still a candidate;
 * 2. the most recently focused candidate (highest `zOrder`);
 * 3. the app's `default` window;
 * 4. the most recently registered candidate.
 *
 * Steps 1-3 are decided by window data alone. Only the ties inside step 2
 * (equal zOrder) and step 4 fall back to the windows record's insertion order
 * (`listAppWindows`), and step 4 is reachable only from hand-built state:
 * opening a window focuses it, which stamps a zOrder. Insertion order is
 * registration order except for integer-like ids ("2"), which JavaScript
 * always enumerates first.
 */
export function pickWindowToRestore(app: ClassicyStoreSystemApp) {
	// Utility (tool-palette) windows float and never become the active document
	// window, so they are never a succession target. When only utility windows
	// remain, candidates is empty and focusApp keeps the app focused with no
	// focused window.
	const candidates = listAppWindows(app).filter(
		(w) => !w.closed && w.windowType !== "utility",
	);
	if (candidates.length === 0) return undefined;
	const lastAccessed = candidates.find(
		(w) => w.id === app.lastAccessedWindowId,
	);
	if (lastAccessed) return lastAccessed;
	const withZOrder = candidates.filter((w) => w.zOrder !== undefined);
	if (withZOrder.length > 0) {
		return mostRecentAppWindow(withZOrder);
	}
	return candidates.find((w) => w.default) ?? candidates.at(-1);
}

export function focusApp(ds: ClassicyStore, appId: string) {
	const app = ownApp(ds, appId);
	// A closed app can never take focus: in-window controls that quit their
	// own app bubble a ClassicyAppActivate after the ClassicyAppClose, and
	// honoring it would leave a closed app owning the menu bar.
	if (!app?.open) return;
	const restore = pickWindowToRestore(app);
	if (restore) {
		focusWindow(ds, appId, restore.id);
	} else {
		markAppFocused(ds, appId);
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

/** The open apps the Application menu lists: every one but extensions. */
const applicationMenuApps = (ds: ClassicyStore) =>
	Object.values(ds.System.Manager.Applications.apps).filter(
		(app) => app.open && app.extension !== true,
	);

/**
 * The open, shown app other than `appId` that takes the menu bar when
 * `appId` is hidden: the most recently focused one, Finder only when no
 * other is shown. `undefined` when every other app is hidden or none is
 * open, so `appId` stays shown (the Application menu dims Hide then).
 */
export function pickShownSuccessorApp(
	ds: ClassicyStore,
	appId: string,
): string | undefined {
	const shown = applicationMenuApps(ds).filter(
		(app) => app.id !== appId && app.hidden !== true,
	);
	const peers = shown.filter((app) => app.id !== "Finder.app");
	if (peers.length > 0)
		return peers.reduce((a, b) =>
			(b.lastFocusedAt ?? 0) > (a.lastFocusedAt ?? 0) ? b : a,
		).id;
	return shown[0]?.id;
}

/**
 * Hides `appId` (the Application menu's Hide <app>): its windows go out of
 * sight while it stays open, and, when it held the menu bar, the next shown
 * app takes it (`pickShownSuccessorApp`). Nothing happens to an extension, a
 * closed app, or the last shown app.
 */
export function hideApp(ds: ClassicyStore, appId: string) {
	const app = ownApp(ds, appId);
	if (!app?.open || app.extension === true || app.hidden === true) return;
	const successor = pickShownSuccessorApp(ds, appId);
	if (!successor) return;
	app.hidden = true;
	if (app.focused) focusApp(ds, successor);
}

/**
 * Hides every open app but `appId` (Hide Others), which takes the menu bar
 * when it did not hold it.
 */
export function hideOtherApps(ds: ClassicyStore, appId: string) {
	const app = ownApp(ds, appId);
	if (!app?.open || app.extension === true) return;
	if (!app.focused) focusApp(ds, appId);
	for (const other of applicationMenuApps(ds))
		if (other.id !== appId) other.hidden = true;
}

/** Shows every hidden app (Show All); the menu bar stays where it is. */
export function showAllApps(ds: ClassicyStore) {
	for (const app of Object.values(ds.System.Manager.Applications.apps))
		if (app.hidden) app.hidden = false;
}

export function openApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
) {
	const findApp = ownApp(ds, appId);
	if (findApp) {
		findApp.open = true;
		for (const w of listAppWindows(findApp)) {
			w.closed = false;
			w.closedThisSession = false;
		}
		focusApp(ds, appId);
		// A launch: Recent Applications remembers it (not an app record this
		// call conjured for an id nothing loaded).
		recordClassicyRecentApp(ds, appId);
	} else if (isAssignableAppId(appId)) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: {},
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
	const findApp = ownApp(ds, appId);
	if (!findApp) {
		if (!isAssignableAppId(appId)) return;
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: {},
			// Extensions run in the background from the moment they load; their
			// windows can only render while the app is open. They never take
			// focus on load.
			open: extension === true,
			data: {},
			contextMenu,
			...(extension ? { extension: true, focused: false } : {}),
		};
	} else {
		// Code-derived, like desktop-icon re-adds: the record is the app's own
		// identity, and a package's display override is never written here.
		findApp.name = appName;
		findApp.icon = appIcon;
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
	const findApp = ownApp(ds, appId);
	if (findApp) {
		findApp.open = false;
		findApp.focused = false;
		delete findApp.hidden;
		for (const w of listAppWindows(findApp)) {
			w.closed = true;
		}
	}
}

/**
 * @deprecated Alias of focusApp, kept for public API compatibility.
 */
export const activateApp = focusApp;

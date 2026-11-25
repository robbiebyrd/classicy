import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	getAppWindow,
	listAppWindows,
	mostRecentAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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

/**
 * Whether windows minimize under the package `ds` is drawn with
 * (`layout.window.collapse: "minimize"`, the Windows shell, plan 0020-w98 §5
 * "Minimize"), read store-free for the stored package id, as every reducer
 * reads the layout.
 * Under every other package (`"shade"`, the default) a collapse is
 * WindowShade and nothing below that keys on it runs.
 */
export const classicyWindowsMinimize = (ds: ClassicyStore): boolean =>
	getClassicyAppearanceLayout(ds.System.Manager.Appearance?.packageId).window
		.collapse === "minimize";

type ClassicyWindowKind = Pick<
	ClassicyStoreSystemAppWindow,
	"modal" | "windowType"
>;

/**
 * A primary window: neither a modal dialog nor a palette (`windowType:
 * "utility"`). Under `window.collapse: "minimize"` only a primary window has
 * a taskbar button ("secondary windows do not appear on the taskbar", WIG
 * Ch.8, p.145), so only it can be minimized: a modal's or palette's stored
 * `collapsed` is ignored there, drawn expanded, and kept for a package that
 * shades it.
 */
export const isClassicyPrimaryWindow = (w: ClassicyWindowKind): boolean =>
	w.modal !== true && w.windowType !== "utility";

/**
 * Whether `w` is minimized under `window.collapse: "minimize"`: a collapsed
 * primary window. The same record is shaded under `"shade"`.
 */
export const isClassicyWindowMinimized = (
	w: ClassicyWindowKind & Pick<ClassicyStoreSystemAppWindow, "collapsed">,
): boolean => w.collapsed === true && isClassicyPrimaryWindow(w);

/**
 * Whether `app`'s palettes are hidden with it under `window.collapse:
 * "minimize"`: it has at least one open primary window, and every one is
 * minimized. Windows hides a minimized window's owned pop-ups (WIG Ch.8,
 * p.145; Wine `NC_HandleSysCommand`); Classicy's palettes belong to an app,
 * not a window, so they go when the app's last shown window does. An app
 * with palettes only keeps them.
 */
export function classicyAppPalettesHidden(
	app: ClassicyStoreSystemApp | undefined,
): boolean {
	const primary = listAppWindows(app).filter(
		(w) => !w.closed && isClassicyPrimaryWindow(w),
	);
	return primary.length > 0 && primary.every((w) => w.collapsed === true);
}

/**
 * Whether `w`, a window of `app`, is on screen under `window.collapse:
 * "minimize"`: open, not minimized, and, for a palette, not hidden with its
 * app (`classicyAppPalettesHidden`). A modal is on screen while it is open.
 */
export function isClassicyWindowShown(
	app: ClassicyStoreSystemApp | undefined,
	w: ClassicyStoreSystemAppWindow,
): boolean {
	if (w.closed) return false;
	if (w.windowType === "utility" && w.modal !== true)
		return !classicyAppPalettesHidden(app);
	return !isClassicyWindowMinimized(w);
}

// The primary windows of `app` that may take focus when another leaves the
// screen: open and not minimized, `exceptId` aside.
const shownPrimaryWindows = (
	app: ClassicyStoreSystemApp | undefined,
	exceptId?: string,
) =>
	listAppWindows(app).filter(
		(w) =>
			!w.closed &&
			w.id !== exceptId &&
			isClassicyPrimaryWindow(w) &&
			w.collapsed !== true,
	);

/**
 * Where focus goes, under `window.collapse: "minimize"`, when the focused
 * app `appId`'s window `windowId` leaves the screen (minimized, closed or
 * destroyed; plan 0020-w98 §5 "Minimize"). Windows activates "the next
 * top-level window in the Z order" (`ShowWindow`'s `SW_MINIMIZE`; Wine
 * `activate_other_window`), never a minimized one:
 *
 * 1. the app's own front primary window: open, not minimized, the highest
 *    `zOrder`, `windowId` aside. Classicy draws the focused app's windows
 *    above every other app's (`classicyWindowActiveApp`), so that window is
 *    the next one down;
 * 2. else the front such window of any other open app that is not hidden,
 *    Finder and extensions included (an Apple Guide window has a taskbar
 *    button, so it is a primary window here). `zOrder` is a focus
 *    timestamp (`focusWindow` stamps `max(Date.now(), top + 1)`), so it
 *    orders windows across apps too;
 * 3. else the desktop: Finder focused with no window focused (with no
 *    Finder record, no app at all), so the desktop's menus are the bar's.
 *
 * It never picks a minimized window, so passing focus on never restores
 * one, and never leaves an app focused with no window to show its menus.
 */
export function classicyVisibleSuccession(
	ds: ClassicyStore,
	appId: string,
	windowId: string,
): ClassicyStore {
	const own = mostRecentAppWindow(
		shownPrimaryWindows(ownApp(ds, appId), windowId),
	);
	if (own) return focusWindow(ds, appId, own.id);
	let next: { appId: string; window: ClassicyStoreSystemAppWindow } | undefined;
	for (const [id, app] of Object.entries(ds.System.Manager.Applications.apps)) {
		if (id === appId || !app.open || app.hidden === true) continue;
		const front = mostRecentAppWindow(shownPrimaryWindows(app));
		if (front && (!next || (front.zOrder ?? 0) > (next.window.zOrder ?? 0)))
			next = { appId: id, window: front };
	}
	if (next) return focusWindow(ds, next.appId, next.window.id);
	if (ownApp(ds, "Finder.app")) markAppFocused(ds, "Finder.app");
	else deFocusApps(ds);
	return ds;
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
		// Under `window.collapse: "minimize"`, activating a minimized window
		// restores it: its taskbar button, ALT+TAB, or its app activated
		// (WIG Ch.6 "Restoring Windows", p.85). A modal's or palette's stored
		// collapse is not a minimize, so it is kept; under every other
		// package focus never touches `collapsed`.
		if (isClassicyWindowMinimized(win) && classicyWindowsMinimize(ds))
			win.collapsed = false;
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

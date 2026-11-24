import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { runClassicyAppQuitHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppQuitHandlers.internal";
import {
	getAppWindow,
	listAppWindows,
	mostRecentAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { isClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	recordClassicyRecentApp,
	recordClassicyRecentDocument,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
import { isClassicyWindowMounted } from "@/SystemFolder/SystemResources/Window/ClassicyMountedWindows.internal";

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

/**
 * How `openApp` opens an app: plainly (a launch: the Apple menu, a desktop
 * icon) or for a document (`document` or `windows` given).
 */
export interface ClassicyOpenAppOptions {
	/**
	 * The file-system path of the document the app is opened for. It is
	 * remembered under Recent Documents when it names a file
	 * (`recordClassicyRecentDocument`), and the open is a document open. The
	 * document's window is the one with the id `${appId}_file_${document}`,
	 * the id `ClassicyApp` gives the windows it draws for `data.openFiles`.
	 */
	document?: string;
	/**
	 * The ids of the windows that show the document (an app that draws its
	 * own: the viewers, Web Viewer, HyperCard). Given, or with `document`,
	 * the open is a document open.
	 */
	windows?: readonly string[];
}

/** The id `ClassicyApp` gives the window it draws for `path` in `data.openFiles`. */
export const classicyDocumentWindowId = (appId: string, path: string): string =>
	`${appId}_file_${path}`;

/** Does `windowId` show one of a document open's documents or windows? */
const showsClassicyDocument = (
	appId: string,
	windowId: string,
	open: { documents: readonly string[]; windows: readonly string[] },
): boolean =>
	open.windows.includes(windowId) ||
	open.documents.some(
		(document) => windowId === classicyDocumentWindowId(appId, document),
	);

/**
 * Open `appId` (creating its record when nothing loaded it and the id is
 * assignable) and bring it forward.
 *
 * - A **plain** open reopens every window the app closed that is mounted;
 *   one that is not mounted (the app was quit, or the document it showed
 *   closed) reopens itself if and when it mounts (`ClassicyWindowOpen`), so
 *   no window record is left open with nothing on screen.
 * - A **document** open (`options.document` or `options.windows`) reopens
 *   only the document's windows (`${appId}_file_${document}`, or the ids
 *   named) and brings them to the front; every other window the app closed
 *   stays closed. When it launches the app (the app was not open, its
 *   `ClassicyApp` mounted), the windows that mount with the launch are held
 *   to the same rule (`launchedFor`, read by `mayClassicyWindowReopen`;
 *   modal and utility windows are never held), so after a quit, or on a
 *   first launch, a document open shows only that document, as while the
 *   app runs. `ClassicyApp` ends the launch once its windows have mounted
 *   (`ClassicyAppLaunchSettled`, `settleAppLaunch`, which opens the held
 *   windows after all when none of the app's windows opened); a plain open
 *   or a quit ends it too.
 *
 * Every open of an app that is there is remembered under Recent
 * Applications, and a document's path under Recent Documents.
 */
export function openApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
	options: ClassicyOpenAppOptions = {},
) {
	const forDocument =
		options.document !== undefined || options.windows !== undefined;
	const open = {
		documents: options.document !== undefined ? [options.document] : [],
		windows: [...(options.windows ?? [])],
	};
	const findApp = ownApp(ds, appId);
	if (findApp) {
		// A launch is tracked only for an app whose ClassicyApp is mounted:
		// that is what ends it (ClassicyAppLaunchSettled).
		const launching = !findApp.open && isClassicyAppMounted(appId);
		findApp.open = true;
		if (launching) findApp.launching = true;
		if (!forDocument) {
			delete findApp.launchedFor;
		} else if (launching) {
			findApp.launchedFor = open;
		} else if (findApp.launchedFor) {
			// A second document before the launch settled.
			findApp.launchedFor = {
				documents: [...findApp.launchedFor.documents, ...open.documents],
				windows: [...findApp.launchedFor.windows, ...open.windows],
			};
		}
		let reopened: string | undefined;
		for (const w of listAppWindows(findApp)) {
			// Not on screen: it reopens itself when it mounts, if it ever does.
			if (!w.closed || !isClassicyWindowMounted(appId, w.id)) continue;
			if (forDocument && !showsClassicyDocument(appId, w.id, open)) continue;
			w.closed = false;
			w.closedThisSession = false;
			reopened = w.id;
		}
		focusApp(ds, appId);
		// The document's window comes to the front, over every other window
		// of the app (its ClassicyWindowOpen, when it mounts again, finds it
		// open already and leaves the focus where it is).
		if (forDocument && reopened !== undefined) focusWindow(ds, appId, reopened);
	} else if (isAssignableAppId(appId)) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: {},
			open: true,
			data: {},
			...(isClassicyAppMounted(appId)
				? { launching: true, ...(forDocument ? { launchedFor: open } : {}) }
				: {}),
		};
	}
	// A launch (only of an app that is really there: recordClassicyRecentApp),
	// then the document it opened, the newer of the two.
	recordClassicyRecentApp(ds, appId);
	if (options.document !== undefined)
		recordClassicyRecentDocument(ds, options.document);
}

/**
 * End `appId`'s launch (`ClassicyAppLaunchSettled`, which `ClassicyApp`
 * dispatches once the windows that mount with the launch have registered):
 * the document launch's rule for windows (`launchedFor`) ends, and, the app
 * being in front with no window focused, the window it last had in front
 * takes focus, as when a relaunch reopened every window at once.
 */
export function settleAppLaunch(ds: ClassicyStore, appId: string) {
	const app = ownApp(ds, appId);
	if (!app) return;
	const launching = app.launching === true;
	const forDocument = app.launchedFor !== undefined;
	delete app.launching;
	delete app.launchedFor;
	if (!launching || !app.open) return;
	// A document launch that opened no window of the app (its document shows
	// in a window of the app's own, not one the launch could name): fail
	// open, reopening every mounted window as a plain launch does, so the
	// app is never left in front with nothing on screen.
	if (forDocument && !listAppWindows(app).some((w) => !w.closed)) {
		for (const w of listAppWindows(app)) {
			if (!w.closed || !isClassicyWindowMounted(appId, w.id)) continue;
			w.closed = false;
			w.closedThisSession = false;
		}
	}
	if (!app.focused) return;
	if (listAppWindows(app).some((w) => w.focused && !w.closed)) return;
	const restore = pickWindowToRestore(app);
	if (restore) focusWindow(ds, appId, restore.id);
}

/**
 * Whether a window that mounts while its app is being launched for a
 * document (`launchedFor`) may open: when it shows the document, and always
 * for a modal window (a dialog the document's opening asks, such as a
 * HyperCard stack's `answer`) and a utility window (a palette, such as
 * HyperCard's Tools and Info), which accompany documents rather than
 * compete with them. Any other window waits for the launch's end, which
 * opens it after all when no window of the app opened (`settleAppLaunch`).
 */
export function mayClassicyWindowReopen(
	app: ClassicyStoreSystemApp,
	windowId: string,
	window: { modal?: unknown; windowType?: unknown } = {},
): boolean {
	const launch = app.launchedFor;
	if (!launch) return true;
	if (window.modal === true || window.windowType === "utility") return true;
	return showsClassicyDocument(app.id, windowId, launch);
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

/**
 * Quit `appId`: it closes, and so do its windows and the documents it had
 * open (the kernel's `data.openFiles` queue empties, and an app's own quit
 * handler closes the rest: Web Viewer's pages, HyperCard's stacks), as
 * quitting a Mac application closed its documents. So a later launch,
 * plain or by a document, never brings back a document the app had open
 * before it quit.
 */
export function closeApp(ds: ClassicyStore, appId: string) {
	const findApp = ownApp(ds, appId);
	if (findApp) {
		findApp.open = false;
		findApp.focused = false;
		delete findApp.hidden;
		delete findApp.launching;
		delete findApp.launchedFor;
		for (const w of listAppWindows(findApp)) {
			w.closed = true;
		}
		if (Array.isArray(findApp.data?.openFiles)) findApp.data.openFiles = [];
		// Documents kept elsewhere (Web Viewer's pages, HyperCard's stacks).
		runClassicyAppQuitHandler(findApp);
	}
}

/**
 * @deprecated Alias of focusApp, kept for public API compatibility.
 */
export const activateApp = focusApp;

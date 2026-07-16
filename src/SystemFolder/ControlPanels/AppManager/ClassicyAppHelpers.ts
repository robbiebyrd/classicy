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
	const candidates = app.windows.filter((w) => !w.closed);
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
	if (!app) return;
	const restore = pickWindowToRestore(app);
	if (restore) {
		focusWindow(ds, appId, restore.id);
	} else {
		deFocusApps(ds);
		app.focused = true;
		ds.System.Manager.Applications.focusedAppId = appId;
	}
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
			// A persisted extension entry may have open: false from an old
			// session; extensions always run once mounted.
			findApp.extension = true;
			findApp.open = true;
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

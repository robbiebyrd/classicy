import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export function getDefaultAppForFileType(
	ds: ClassicyStore,
	fileType: ClassicyFileSystemEntryFileType,
): string | undefined {
	return ds.System.Manager.Applications.fileTypeHandlers[fileType];
}

export function deFocusApps(ds: ClassicyStore) {
	Object.values(ds.System.Manager.Applications.apps).forEach((app) => {
		app.focused = false;
		app.windows.forEach((w) => {
			w.focused = false;
		});
	});
	return ds;
}

export function focusApp(ds: ClassicyStore, appId: string) {
	ds = deFocusApps(ds);
	if (ds.System.Manager.Applications.apps[appId]) {
		ds.System.Manager.Applications.apps[appId].focused = true;
	}
	const windows = ds.System.Manager.Applications.apps[appId]?.windows ?? [];
	const defaultIdx = windows.findIndex((w) => w.default);
	const idx =
		defaultIdx >= 0 ? defaultIdx : windows.length > 0 ? windows.length - 1 : -1;
	if (idx >= 0) {
		windows[idx].closed = false;
		windows[idx].focused = true;
		const menuBar = windows[idx].menuBar;
		if (menuBar) {
			ds.System.Manager.Desktop.appMenu = menuBar;
		}
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
) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (!findApp) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: [],
			open: false,
			data: {},
		};
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

export function activateApp(ds: ClassicyStore, appId: string) {
	Object.entries(ds.System.Manager.Applications.apps).forEach(([key, app]) => {
		app.focused = key === appId;
		if (key !== appId) {
			app.windows.forEach((w) => {
				w.focused = false;
			});
		}
	});
}

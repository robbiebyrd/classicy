import {
	type ClassicyStoreSystemAppearanceManager,
	type ClassicyTheme,
	getAllThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { classicyDateTimeManagerEventHandler } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
import type { ClassicyStoreSystemSoundManager } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { classicyFinderEventHandler } from "@/SystemFolder/Finder/FinderContext";
import { classicyQuickTimeMoviePlayerEventHandler } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { classicyQuickTimePictureViewerEventHandler } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import { classicyDesktopIconEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import {
	type ClassicyStoreSystemDesktopManager,
	classicyDesktopEventHandler,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { classicyWindowEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";
import themesData from "../AppearanceManager/styles/themes.json";


import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const macosIcon = ClassicyIcons.system.macos;

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = Array<JsonValue>;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface ClassicyStoreSystemAppManager
	extends ClassicyStoreSystemManager {
	apps: Record<string, ClassicyStoreSystemApp>;
	fileTypeHandlers: Record<ClassicyFileSystemEntryFileType, string>;
}

export interface ClassicyStoreSystemApp {
	id: string;
	name: string;
	icon: string;
	windows: ClassicyStoreSystemAppWindow[];
	open: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: App data is dynamically shaped per app
	data?: Record<string, any>;
	focused?: boolean;
	noDesktopIcon?: boolean;
	debug?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: App options are dynamically shaped per app
	options?: Record<string, any>[];
	appMenu?: ClassicyMenuItem[];
	handlesFileTypes?: ClassicyFileSystemEntryFileType[];
}

export interface ClassicyStoreSystemAppWindow {
	closed: boolean;
	id: string;
	appId?: string;
	title?: string;
	icon?: string;
	size: [number, number];
	position: [number, number];
	minimumSize: [number, number];
	focused?: boolean;
	default?: boolean;
	resizing?: boolean;
	zoomed?: boolean;
	collapsed?: boolean;
	dragging?: boolean;
	moving?: boolean;
	modal?: boolean;
	menuBar?: ClassicyMenuItem[];
	contextMenu?: ClassicyMenuItem[];
	showContextMenu?: boolean;
	zOrder?: number;
	options?: Record<string, JsonValue>[];
}

export interface ClassicyStore {
	System: ClassicyStoreSystem;
}

export interface ClassicyStoreSystem {
	Manager: {
		Desktop: ClassicyStoreSystemDesktopManager;
		Sound: ClassicyStoreSystemSoundManager;
		Applications: ClassicyStoreSystemAppManager;
		Appearance: ClassicyStoreSystemAppearanceManager;
		DateAndTime: ClassicyStoreSystemDateAndTimeManager;
	};
}

export interface ClassicyStoreSystemDateAndTimeManager
	extends ClassicyStoreSystemManager {
	dateTime: string;
	timeZoneOffset: string;
	militaryTime: boolean;
	displaySeconds: boolean;
	displayPeriod: boolean;
	displayDay: boolean;
	displayLongDay: boolean;
	flashSeparators: boolean;
	show: boolean;
}

// biome-ignore lint/complexity/noBannedTypes: Intentional empty base type extended by manager interfaces
export type ClassicyStoreSystemManager = {};

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
	const idx = defaultIdx >= 0 ? defaultIdx : windows.length > 0 ? windows.length - 1 : -1;
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

// biome-ignore lint/suspicious/noExplicitAny: ActionMessage is a catch-all event type accessed with dynamic properties throughout the codebase
export type ActionMessage = Record<string, any> & {
	type: string;
};

export type AppEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => ClassicyStore;

const pluginEventHandlers: Array<{
	prefix: string;
	handler: AppEventHandler;
}> = [];

/**
 * Register an event handler for a given action type prefix.
 * Call this at module load time from your app's context file.
 * Handlers are checked before the generic ClassicyApp* handler.
 */
export function registerAppEventHandler(
	prefix: string,
	handler: AppEventHandler,
): void {
	pluginEventHandlers.push({ prefix, handler });
}

export const classicyAppEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyAppOpen": {
			openApp(ds, action.app.id, action.app.name, action.app.icon);
			break;
		}
		case "ClassicyAppLoad": {
			loadApp(ds, action.app.id, action.app.name, action.app.icon);
			break;
		}
		case "ClassicyAppClose": {
			closeApp(ds, action.app.id);
			const openApps = Object.values(ds.System.Manager.Applications.apps).find(
				(value) => {
					return value.open;
				},
			);

			if (openApps?.id) {
				focusApp(ds, openApps.id);
			}

			break;
		}
		case "ClassicyAppFocus": {
			focusApp(ds, action.app.id);
			break;
		}
		case "ClassicyAppActivate": {
			activateApp(ds, action.app.id);
			break;
		}
		case "ClassicyAppRegisterFileTypes": {
			if (Array.isArray(action.fileTypes)) {
				const app =
					ds.System.Manager.Applications.apps[action.app.id];
				if (app) {
					const existing = app.handlesFileTypes ?? [];
					app.handlesFileTypes = Array.from(
						new Set([...existing, ...action.fileTypes]),
					);
				}
				for (const ft of action.fileTypes) {
					const current =
						ds.System.Manager.Applications.fileTypeHandlers[
							ft as ClassicyFileSystemEntryFileType
						];
					if (!current || current === "Finder.app") {
						ds.System.Manager.Applications.fileTypeHandlers[
							ft as ClassicyFileSystemEntryFileType
						] = action.app.id;
					}
				}
			}
			break;
		}
		case "ClassicyAppUnregisterFileTypes": {
			const app = ds.System.Manager.Applications.apps[action.app.id];
			if (app && Array.isArray(action.fileTypes)) {
				app.handlesFileTypes = (app.handlesFileTypes ?? []).filter(
					(t: ClassicyFileSystemEntryFileType) =>
						!action.fileTypes.includes(t),
				);
			}
			break;
		}
		case "ClassicyAppSetDefaultFileTypeHandler": {
			if (action.fileType && action.app?.id) {
				ds.System.Manager.Applications.fileTypeHandlers[
					action.fileType as ClassicyFileSystemEntryFileType
				] = action.app.id;
			}
			break;
		}
		default: {
			if (
				action.type.endsWith("OpenFile") &&
				action.app?.id &&
				action.path
			) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app) {
					if (!app.data) app.data = {};
					if (!Array.isArray(app.data.openFiles))
						app.data.openFiles = [];
					if (!app.data.openFiles.includes(action.path)) {
						app.data.openFiles = [
							...app.data.openFiles,
							action.path,
						];
					}
					openApp(ds, app.id, app.name, app.icon);
				}
			} else if (
				action.type.endsWith("CloseFile") &&
				action.app?.id &&
				action.path
			) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app?.data?.openFiles) {
					app.data.openFiles = app.data.openFiles.filter(
						(p: string) => p !== action.path,
					);
				}
			}
			break;
		}
	}

	return ds;
};

export const classicyDesktopStateEventReducer = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	if ("debug" in action && process.env.NODE_ENV !== "production") {
		console.group("Desktop Event");
		console.log("Action: ", action);
		console.log("Start State: ", ds);
	}

	if ("type" in action) {
		// Cross-app orchestration handled at top level, before prefix routing
		if (action.type === "ClassicyAppFinderOpenFile") {
			const file = action.file;
			// Legacy QuickTime _creator-based routing
			if (file && file._creator === "QuickTime") {
				let document: unknown;
				try {
					document =
						typeof file._data === "string"
							? JSON.parse(file._data)
							: file._data;
				} catch {
					// Malformed JSON — skip silently
				}
				if (
					typeof document === "object" &&
					document !== null &&
					"url" in document &&
					typeof (document as { url: unknown }).url === "string" &&
					isValidHttpUrl((document as { url: string }).url)
				) {
					ds = classicyAppEventHandler(ds, {
						type: "ClassicyAppOpen",
						app: MoviePlayerAppInfo,
					});
					ds = classicyQuickTimeMoviePlayerEventHandler(ds, {
						type: "ClassicyAppMoviePlayerOpenDocument",
						document: document as { url: string },
					});
				}
			} else if (file && action.path) {
				// Route to the default app registered for this file type
				const fileType =
					file._type as ClassicyFileSystemEntryFileType;
				const targetAppId =
					ds.System.Manager.Applications.fileTypeHandlers[fileType];
				const targetApp = targetAppId
					? ds.System.Manager.Applications.apps[targetAppId]
					: undefined;
				if (targetApp) {
					ds = classicyAppEventHandler(ds, {
						type: `ClassicyApp${targetApp.name}OpenFile`,
						app: { id: targetAppId },
						path: action.path,
					});
				}
			}
		} else if (action.type.startsWith("ClassicyWindow")) {
			ds = classicyWindowEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyAppFinder")) {
			ds = classicyFinderEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyAppMoviePlayer")) {
			ds = classicyQuickTimeMoviePlayerEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyAppPictureViewer")) {
			ds = classicyQuickTimePictureViewerEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyDesktopIcon")) {
			ds = classicyDesktopIconEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyDesktop")) {
			ds = classicyDesktopEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyManagerDateTime")) {
			ds = classicyDateTimeManagerEventHandler(ds, action);
		} else {
			const plugin = pluginEventHandlers.find(({ prefix }) =>
				action.type.startsWith(prefix),
			);
			if (plugin) {
				ds = plugin.handler(ds, action);
			} else if (action.type.startsWith("ClassicyApp")) {
				ds = classicyAppEventHandler(ds, action);
			} else if (process.env.NODE_ENV !== "production") {
				console.warn(
					"[ClassicyDesktopStateEventReducer] Unhandled action type",
					{ type: action.type },
				);
			}
		}
	}

	if ("debug" in action && process.env.NODE_ENV !== "production") {
		console.log("End State: ", ds);
		console.groupEnd();
	}

	return ds;
};

export const DefaultAppManagerState: ClassicyStore = {
	System: {
		Manager: {
			DateAndTime: {
				show: true,
				dateTime: new Date().toISOString(),
				timeZoneOffset: (new Date().getTimezoneOffset() / -60).toString(),
				militaryTime: false,
				displaySeconds: true,
				displayPeriod: true,
				displayDay: true,
				displayLongDay: false,
				flashSeparators: true,
			},
			Sound: {
				volume: 100,
				labels: {},
				disabled: [],
			},
			Desktop: {
				selectedIcons: [],
				contextMenu: [],
				showContextMenu: false,
				icons: [],
				systemMenu: [
					{
						id: "about",
						title: "About This Computer",
						keyboardShortcut: "&#8984;S",
						onClickFunc: () => {},
					},
					{ id: "spacer" },
				],
				appMenu: [],
				selectBox: {
					size: [0, 0],
					start: [0, 0],
					active: false,
				},
				disableBalloonHelp: false,
			},
			Applications: {
				apps: {
					"Finder.app": {
						id: "Finder.app",
						name: "Finder",
						icon: macosIcon,
						windows: [],
						open: true,
						focused: true,
						noDesktopIcon: true,
						data: {},
						handlesFileTypes: Object.values(
							ClassicyFileSystemEntryFileType,
						),
					},
				},
				fileTypeHandlers: Object.fromEntries(
					Object.values(ClassicyFileSystemEntryFileType).map(
						(type) => [type, "Finder.app"],
					),
				) as Record<ClassicyFileSystemEntryFileType, string>,
			},
			Appearance: {
				availableThemes: getAllThemes(),
				activeTheme: themesData.find(
					(t) => t.id === "default",
				) as ClassicyTheme,
			},
		},
	},
};

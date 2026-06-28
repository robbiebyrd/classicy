import {
	type ClassicyStoreSystemAppearanceManager,
	type ClassicyTheme,
	getAllThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	activateApp,
	closeApp,
	deFocusApps,
	focusApp,
	getDefaultAppForFileType,
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import { classicyDateTimeManagerEventHandler } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler";
import type { ClassicyStoreSystemSoundManager } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { classicyDesktopIconEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import {
	type ClassicyStoreSystemDesktopManager,
	classicyDesktopEventHandler,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { classicyWindowEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	hasApp,
	hasAppAndFileType,
	hasAppAndFileTypes,
	hasAppAndPath,
	hasDesktopAppRef,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import themesData from "../AppearanceManager/styles/themes.json";

const macosIcon = ClassicyIcons.system.macos;

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = Array<JsonValue>;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface ClassicyStoreSystemAppManager
	extends ClassicyStoreSystemManager {
	apps: Record<string, ClassicyStoreSystemApp>;
	fileTypeHandlers: Record<ClassicyFileSystemEntryFileType, string>;
	focusedAppId?: string;
}

export interface ClassicyStoreSystemApp {
	id: string;
	name: string;
	icon: string;
	windows: ClassicyStoreSystemAppWindow[];
	open: boolean;
	data?: Record<string, unknown>;
	focused?: boolean;
	noDesktopIcon?: boolean;
	debug?: boolean;
	options?: Record<string, unknown>[];
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

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

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
	paused: boolean;
	minDateTime: string | null;
	maxDateTime: string | null;
	boundaryLocked: boolean;
}

// biome-ignore lint/complexity/noBannedTypes: Intentional empty base type extended by manager interfaces
export type ClassicyStoreSystemManager = {};

export {
	activateApp,
	closeApp,
	deFocusApps,
	focusApp,
	getDefaultAppForFileType,
	loadApp,
	openApp,
};

export type ActionMessage = Record<string, unknown> & {
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
 * Registering the same prefix a second time is a no-op.
 */
export function registerAppEventHandler(
	prefix: string,
	handler: AppEventHandler,
): void {
	if (pluginEventHandlers.some((entry) => entry.prefix === prefix)) {
		return;
	}
	pluginEventHandlers.push({ prefix, handler });
}

/**
 * Dispatch an action to the registered handler for the given prefix.
 * Used for cross-app orchestration without a direct import between apps.
 */
export function dispatchToPlugin(
	ds: ClassicyStore,
	prefix: string,
	action: ActionMessage,
): ClassicyStore {
	const plugin = pluginEventHandlers.find((entry) => entry.prefix === prefix);
	if (plugin) {
		return plugin.handler(ds, action);
	}
	return ds;
}

export const classicyAppEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyAppOpen": {
			if (hasDesktopAppRef(action)) {
				openApp(ds, action.app.id, action.app.name, action.app.icon);
			}
			break;
		}
		case "ClassicyAppLoad": {
			if (hasDesktopAppRef(action)) {
				loadApp(ds, action.app.id, action.app.name, action.app.icon);
			}
			break;
		}
		case "ClassicyAppClose": {
			if (hasApp(action)) {
				closeApp(ds, action.app.id);
			}
			const openApps = Object.values(ds.System.Manager.Applications.apps).find(
				(value) => {
					return value.open;
				},
			);

			if (openApps?.id) {
				focusApp(ds, openApps.id);
			} else {
				deFocusApps(ds);
			}

			break;
		}
		case "ClassicyAppFocus": {
			if (hasApp(action)) {
				focusApp(ds, action.app.id);
			}
			break;
		}
		case "ClassicyAppActivate": {
			if (hasApp(action)) {
				activateApp(ds, action.app.id);
			}
			break;
		}
		case "ClassicyAppRegisterFileTypes": {
			if (hasAppAndFileTypes(action)) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app) {
					const existing = app.handlesFileTypes ?? [];
					app.handlesFileTypes = Array.from(
						new Set([...existing, ...(action.fileTypes as ClassicyFileSystemEntryFileType[])]),
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
			if (hasAppAndFileTypes(action)) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app) {
					app.handlesFileTypes = (app.handlesFileTypes ?? []).filter(
						(t: ClassicyFileSystemEntryFileType) => !(action.fileTypes as unknown[]).includes(t),
					);
					for (const ft of action.fileTypes) {
						const key = ft as ClassicyFileSystemEntryFileType;
						if (
							ds.System.Manager.Applications.fileTypeHandlers[key] ===
							action.app.id
						) {
							ds.System.Manager.Applications.fileTypeHandlers[key] = "Finder.app";
						}
					}
				}
			}
			break;
		}
		case "ClassicyAppSetDefaultFileTypeHandler": {
			if (hasAppAndFileType(action)) {
				ds.System.Manager.Applications.fileTypeHandlers[
					action.fileType as ClassicyFileSystemEntryFileType
				] = action.app.id;
			}
			break;
		}
		default: {
			if (action.type.endsWith("OpenFile") && hasAppAndPath(action)) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app) {
					if (!app.data) app.data = {};
					const openFiles = app.data.openFiles;
					if (!Array.isArray(openFiles)) {
						app.data.openFiles = [action.path];
					} else if (!openFiles.includes(action.path)) {
						app.data.openFiles = [...openFiles, action.path];
					}
					openApp(ds, app.id, app.name, app.icon);
				}
			} else if (action.type.endsWith("CloseFile") && hasAppAndPath(action)) {
				const app = ds.System.Manager.Applications.apps[action.app.id];
				if (app?.data) {
					const openFiles = app.data.openFiles;
					if (Array.isArray(openFiles)) {
						app.data.openFiles = openFiles.filter(
							(p: unknown) => p !== action.path,
						);
					}
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
		if (action.type.startsWith("ClassicyWindow")) {
			ds = classicyWindowEventHandler(ds, action);
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

/**
 * Deep-merge `overrides` onto a structural clone of `base`.
 * Plain objects merge recursively; arrays and primitives from `overrides`
 * replace the base value wholesale; `undefined` override values are skipped;
 * `base` is never mutated.
 */
export function mergeClassicyState(
	base: ClassicyStore,
	overrides: DeepPartial<ClassicyStore>,
): ClassicyStore {
	const mergeInto = (
		target: Record<string, unknown>,
		source: Record<string, unknown>,
	): void => {
		for (const key of Object.keys(source)) {
			const next = source[key];
			if (next === undefined) continue;
			const current = target[key];
			if (isPlainObject(next) && isPlainObject(current)) {
				const cloned = { ...current };
				mergeInto(cloned, next);
				target[key] = cloned;
			} else {
				target[key] = next;
			}
		}
	};

	const result = structuredClone(base);
	mergeInto(
		result as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>,
	);
	return result;
}

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
				paused: false,
				minDateTime: null,
				maxDateTime: null,
				boundaryLocked: false,
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
						event: "ClassicyAppFinderAboutThisComputerOpen",
						eventData: {},
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
				errorDialog: null,
			},
			Applications: {
				focusedAppId: "Finder.app",
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
						handlesFileTypes: Object.values(ClassicyFileSystemEntryFileType),
					},
				},
				fileTypeHandlers: Object.fromEntries(
					Object.values(ClassicyFileSystemEntryFileType).map((type) => [
						type,
						"Finder.app",
					]),
				) as Record<ClassicyFileSystemEntryFileType, string>,
			},
			Appearance: {
				availableThemes: getAllThemes(),
				activeTheme: themesData.find(
					(t) => t.id === "default",
				) as unknown as ClassicyTheme,
			},
		},
	},
};

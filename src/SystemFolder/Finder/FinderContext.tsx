import {
	hasFinderFile,
	hasPath,
	hasPaths,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyAppEventHandler,
	dispatchToPlugin,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

export type FinderData = {
	openPaths?: string[];
	showAboutThisComputer?: boolean;
};

export function isFinderData(d: Record<string, unknown>): d is FinderData {
	if (d === null || typeof d !== "object") return false;
	if ("openPaths" in d && !Array.isArray(d.openPaths)) return false;
	if (
		"showAboutThisComputer" in d &&
		typeof d.showAboutThisComputer !== "boolean" &&
		d.showAboutThisComputer !== undefined
	)
		return false;
	return true;
}

export const classicyFinderEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const appId = "Finder.app";
	if (!ds.System.Manager.Applications.apps[appId]) return ds;
	const raw = ds.System.Manager.Applications.apps[appId].data ?? {};
	let appData: FinderData = isFinderData(raw) ? { ...raw } : {};

	switch (action.type) {
		case "ClassicyAppFinderOpenFolder": {
			if (!hasPath(action)) break;
			if (!appData.openPaths) {
				appData = { ...appData, openPaths: [action.path] };
				break;
			}

			appData = {
				...appData,
				openPaths: Array.from(new Set([...appData.openPaths, action.path])),
			};
			break;
		}
		case "ClassicyAppFinderOpenFolders": {
			if (!hasPaths(action)) break;
			const existing = appData.openPaths ?? [];
			appData = {
				...appData,
				openPaths: Array.from(
					new Set([...existing, ...(action.paths as string[])]),
				),
			};
			break;
		}
		case "ClassicyAppFinderCloseFolder": {
			if (!hasPath(action)) break;
			const existing = appData.openPaths ?? [];
			appData = {
				...appData,
				openPaths: existing.filter((p: string) => p !== action.path),
			};

			// Sync the window closed state so the desktop icon doesn't show as open
			const windows = ds.System.Manager.Applications.apps[appId].windows;
			const winIdx = windows.findIndex((w) => w.id === action.path);
			if (winIdx !== -1) {
				windows[winIdx] = { ...windows[winIdx], closed: true, focused: false };
			}
			break;
		}
		case "ClassicyAppFinderAboutThisComputerOpen": {
			appData = { ...appData, showAboutThisComputer: true };
			break;
		}
		case "ClassicyAppFinderAboutThisComputerClose": {
			appData = { ...appData, showAboutThisComputer: false };
			break;
		}
		case "ClassicyAppFinderEmptyTrash": {
			// TODO: What will this do?
			break;
		}
		case "ClassicyAppFinderOpenFile": {
			const file = hasFinderFile(action) ? action.file : undefined;
			if (file?._system) {
				ds.System.Manager.Desktop.errorDialog = {
					message:
						"This file is used by the system software. It cannot be opened.",
				};
				return ds;
			}
			// Legacy QuickTime _creator-based routing
			if (file && file._creator === "QuickTime") {
				let document: unknown;
				try {
					document =
						typeof file._data === "string"
							? JSON.parse(file._data)
							: file._data;
				} catch (error: unknown) {
					console.warn("ClassicyFinder: failed to parse QuickTime file data", {
						error,
						file,
					});
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
					ds = dispatchToPlugin(ds, "ClassicyAppMoviePlayer", {
						type: "ClassicyAppMoviePlayerOpenDocument",
						document: document as { url: string },
					});
				}
			} else if (
				file &&
				file._type === ClassicyFileSystemEntryFileType.AppShortcut
			) {
				// App shortcuts (e.g. the derived Applications folder) open or
				// focus the app named by _creator — same semantics as
				// double-clicking the app's desktop icon.
				const targetAppId =
					typeof file._creator === "string" ? file._creator : undefined;
				const targetApp = targetAppId
					? ds.System.Manager.Applications.apps[targetAppId]
					: undefined;
				if (targetApp) {
					openApp(ds, targetApp.id, targetApp.name, targetApp.icon);
				} else {
					ds.System.Manager.Desktop.errorDialog = {
						message:
							"The application that created this item could not be found.",
					};
				}
			} else if (file && hasPath(action)) {
				// Route to the default app registered for this file type
				const fileType = file._type as ClassicyFileSystemEntryFileType;
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
				} else {
					// Fall back to Finder if it can handle the requested type
					const finder = ds.System.Manager.Applications.apps[appId];
					if (finder?.handlesFileTypes?.includes(fileType)) {
						ds = classicyAppEventHandler(ds, {
							type: `ClassicyApp${finder.name}OpenFile`,
							app: { id: appId },
							path: action.path,
						});
					} else {
						ds.System.Manager.Desktop.errorDialog = {
							message: "Finder cannot open the file type you requested.",
						};
					}
				}
			}
			// Skip the default data write below — this action does not mutate Finder's appData
			return ds;
		}
	}
	ds.System.Manager.Applications.apps[appId].data = { ...appData };
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppFinder* events
// without a hard-wired import.
registerAppEventHandler("ClassicyAppFinder", classicyFinderEventHandler);

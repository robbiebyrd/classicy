import { z } from "zod";
import {
	hasFinderFile,
	hasPath,
	hasPaths,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import {
	focusWindow,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyAppEventHandler,
	dispatchToPlugin,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	parseAppData,
	registerApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

export const FinderDataSchema = z.looseObject({
	openPaths: z
		.array(z.string())
		.optional()
		.describe("Folder paths with an open Finder window, in open order."),
	showAboutThisComputer: z
		.boolean()
		.optional()
		.describe("Whether the About This Computer window is open."),
});

export type FinderData = z.infer<typeof FinderDataSchema>;

export const FINDER_ABOUT_THIS_COMPUTER_WINDOW_ID =
	"finder_about_this_computer";

/** @deprecated Use `parseAppData<FinderData>("Finder.app", d)` — kept for existing consumers and tests. */
export function isFinderData(d: Record<string, unknown>): d is FinderData {
	return FinderDataSchema.safeParse(d).success;
}

export const classicyFinderEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const appId = "Finder.app";
	if (!ds.System.Manager.Applications.apps[appId]) return ds;
	const raw = ds.System.Manager.Applications.apps[appId].data ?? {};
	let appData: FinderData = parseAppData<FinderData>(appId, raw) ?? { ...raw };

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
			// Focus explicitly: the ClassicyWindowOpen handler only focuses
			// brand-new windows, and this window persists as closed after its
			// first open. On first open (no entry yet) this focuses Finder and
			// the window registration focuses the window itself.
			ds = focusWindow(ds, appId, FINDER_ABOUT_THIS_COMPUTER_WINDOW_ID);
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
			if (file?._type === ClassicyFileSystemEntryFileType.Extension) {
				// Mac OS 8 behavior: extensions add functionality at boot and are
				// not openable documents or applications.
				ds.System.Manager.Desktop.errorDialog = {
					title: "Library",
					message:
						"This file adds functionality to your computer. It cannot be opened.",
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
					classicyLog(
						"warn",
						"ClassicyFinder",
						"failed to parse QuickTime file data",
						{
							error,
							file,
						},
					);
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
			} else if (
				file &&
				file._type === ClassicyFileSystemEntryFileType.Shortcut
			) {
				// A URL shortcut. Routed explicitly rather than through
				// fileTypeHandlers so the entry's own _openIn decides where it
				// opens — the generic fallback would ignore it.
				if (typeof file._url !== "string" || file._url === "") {
					ds.System.Manager.Desktop.errorDialog = {
						message: "The original item for this shortcut could not be found.",
					};
					return ds;
				}
				const name = hasPath(action)
					? (action.path.split(":").pop() ?? action.path)
					: file._url;
				ds = classicyDesktopEventHandler(ds, {
					type: "ClassicyDesktopOpenUrl",
					url: file._url,
					disposition: file._openIn,
					title: typeof file._label === "string" ? file._label : name,
				});
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
// without a hard-wired import. registerApp also records the manifest: action
// and state shapes with written commentary, consumed by balloon help,
// HyperCard discovery, and dev-mode kernel state validation.
registerApp({
	id: "Finder.app",
	description: "The system file browser: desktop, folders, and the Trash.",
	prefix: "ClassicyAppFinder",
	handler: classicyFinderEventHandler,
	actions: {
		ClassicyAppFinderOpenFolder: {
			description: "Open a Finder window at the given folder path.",
			params: z.object({
				path: z.string().describe("Absolute path of the folder to open."),
			}),
		},
		ClassicyAppFinderOpenFolders: {
			description: "Open Finder windows for several folder paths at once.",
			params: z.object({
				paths: z
					.array(z.string())
					.describe("Absolute paths of the folders to open."),
			}),
		},
		ClassicyAppFinderCloseFolder: {
			description: "Close the Finder window showing the given folder path.",
			params: z.object({
				path: z.string().describe("Absolute path of the folder to close."),
			}),
		},
		ClassicyAppFinderAboutThisComputerOpen: {
			description: "Open the About This Computer window.",
		},
		ClassicyAppFinderAboutThisComputerClose: {
			description: "Close the About This Computer window.",
		},
		ClassicyAppFinderEmptyTrash: {
			description:
				"Empty the Trash. Guarded route: never reachable by untrusted dispatch.",
		},
		ClassicyAppFinderOpenFile: {
			description:
				"Open a file with its default app, resolved by the entry's file type.",
			params: z.object({
				file: z
					.looseObject({})
					.describe("The ClassicyFileSystem entry being opened."),
				path: z
					.string()
					.optional()
					.describe("Filesystem path of the entry, when known."),
			}),
		},
	},
	state: FinderDataSchema,
});

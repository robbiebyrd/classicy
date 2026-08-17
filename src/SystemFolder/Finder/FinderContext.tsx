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

export const FinderViewTypeSchema = z.enum(["icons", "list"]);
export const FinderIconSizeSchema = z.enum(["small", "medium", "large"]);
export const FinderArrangementSchema = z.enum(["none", "grid", "sorted"]);
export const FinderSortKeySchema = z.enum([
	"name",
	"modified",
	"created",
	"size",
	"kind",
	"label",
]);

export const FinderIconViewOptionsSchema = z.object({
	arrangement: FinderArrangementSchema.default("none"),
	keepArrangedBy: FinderSortKeySchema.default("name"),
	iconSize: FinderIconSizeSchema.default("large"),
});

export const FinderListColumnsSchema = z.object({
	modified: z.boolean().default(true),
	created: z.boolean().default(false),
	size: z.boolean().default(true),
	kind: z.boolean().default(true),
	label: z.boolean().default(false),
	comments: z.boolean().default(false),
	version: z.boolean().default(false),
});

export const FinderListViewOptionsSchema = z.object({
	useRelativeDate: z.boolean().default(true),
	calculateFolderSizes: z.boolean().default(false),
	iconSize: FinderIconSizeSchema.default("medium"),
	// Precomputed (not `.default({})`): under Zod 4, a `.default()` value is
	// substituted verbatim when the key is absent from the input, without
	// being re-parsed — so a bare `{}` would skip FinderListColumnsSchema's
	// own per-column defaults instead of filling them in.
	columns: FinderListColumnsSchema.default(FinderListColumnsSchema.parse({})),
});

export const FinderStandardViewsSchema = z.object({
	// Same reasoning as `columns` above, one level up.
	icons: FinderIconViewOptionsSchema.default(
		FinderIconViewOptionsSchema.parse({}),
	),
	list: FinderListViewOptionsSchema.default(
		FinderListViewOptionsSchema.parse({}),
	),
});

export type FinderViewType = z.infer<typeof FinderViewTypeSchema>;
export type FinderIconSize = z.infer<typeof FinderIconSizeSchema>;
export type FinderArrangement = z.infer<typeof FinderArrangementSchema>;
export type FinderSortKey = z.infer<typeof FinderSortKeySchema>;
export type FinderIconViewOptions = z.infer<typeof FinderIconViewOptionsSchema>;
export type FinderListViewOptions = z.infer<typeof FinderListViewOptionsSchema>;
export type FinderStandardViews = z.infer<typeof FinderStandardViewsSchema>;

export const FINDER_PREFERENCES_WINDOW_ID = "finder_preferences";

/**
 * Standard-view options with every default filled in. Parsing rather than
 * spreading means a partially-written or hand-edited persisted value still
 * yields a complete, valid object instead of `undefined` holes reaching the
 * view components.
 */
export const resolveStandardViews = (data: FinderData): FinderStandardViews => {
	const parsed = FinderStandardViewsSchema.safeParse(data.standardViews ?? {});
	return parsed.success ? parsed.data : FinderStandardViewsSchema.parse({});
};

export const FinderDataSchema = z.looseObject({
	openPaths: z
		.array(z.string())
		.optional()
		.describe("Folder paths with an open Finder window, in open order."),
	showAboutThisComputer: z
		.boolean()
		.optional()
		.describe("Whether the About This Computer window is open."),
	showPreferences: z
		.boolean()
		.optional()
		.describe("Whether the Finder Preferences window is open."),
	standardViews: FinderStandardViewsSchema.optional().describe(
		"Default view options applied to folders using standard views.",
	),
	folderViews: z
		.record(z.string(), FinderViewTypeSchema)
		.optional()
		.describe(
			"Explicit per-folder view type. A path absent from this map follows the standard views.",
		),
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
		case "ClassicyAppFinderPreferencesOpen": {
			appData = { ...appData, showPreferences: true };
			// Same reason as AboutThisComputer above: this window persists as
			// closed after its first open, so ClassicyWindowOpen will not focus
			// it again and it would render behind its siblings forever.
			ds = focusWindow(ds, appId, FINDER_PREFERENCES_WINDOW_ID);
			break;
		}
		case "ClassicyAppFinderPreferencesClose": {
			appData = { ...appData, showPreferences: false };
			break;
		}
		case "ClassicyAppFinderSetStandardViewOption": {
			const { view, option, value } = action as {
				view?: unknown;
				option?: unknown;
				value?: unknown;
			};
			if (view !== "icons" && view !== "list") break;
			if (typeof option !== "string") break;

			const parts = option.split(".");
			// One level of nesting only — `columns.created`, never deeper.
			if (parts.length > 2) break;

			const current = resolveStandardViews(appData);
			const viewOptions = current[view] as Record<string, unknown>;

			let nextViewOptions: Record<string, unknown>;
			if (parts.length === 1) {
				nextViewOptions = { ...viewOptions, [parts[0]]: value };
			} else {
				const nested = viewOptions[parts[0]];
				if (typeof nested !== "object" || nested === null) break;
				nextViewOptions = {
					...viewOptions,
					[parts[0]]: {
						...(nested as Record<string, unknown>),
						[parts[1]]: value,
					},
				};
			}

			// Validate the merged result, so a bad path or value is rejected
			// rather than written and then read back as garbage.
			const candidate = { ...current, [view]: nextViewOptions };
			const parsed = FinderStandardViewsSchema.safeParse(candidate);
			if (!parsed.success) break;
			appData = { ...appData, standardViews: parsed.data };
			break;
		}
		case "ClassicyAppFinderSetFolderView": {
			if (!hasPath(action)) break;
			const viewType = (action as { viewType?: unknown }).viewType;
			if (viewType !== "icons" && viewType !== "list") break;
			appData = {
				...appData,
				folderViews: {
					...(appData.folderViews ?? {}),
					[action.path]: viewType,
				},
			};
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
		ClassicyAppFinderPreferencesOpen: {
			description: "Open the Finder Preferences window.",
		},
		ClassicyAppFinderPreferencesClose: {
			description: "Close the Finder Preferences window.",
		},
		ClassicyAppFinderSetStandardViewOption: {
			description:
				"Set one standard-view option for the icon or list view. `option` is a dotted path at most one level deep, e.g. `columns.created`.",
			params: z.object({
				view: FinderViewTypeSchema.describe("Which view's options to change."),
				option: z
					.string()
					.describe("Dotted option path within that view, max one level deep."),
				value: z.unknown().describe("New value; validated against the schema."),
			}),
		},
		ClassicyAppFinderSetFolderView: {
			description:
				"Remember an explicit view type for one folder, overriding the standard views.",
			params: z.object({
				path: z.string().describe("Absolute path of the folder."),
				viewType: FinderViewTypeSchema.describe("The view to use for it."),
			}),
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

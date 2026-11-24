/**
 * Find File's manifest and reducer (story 0227-815). The Finder's File ▸
 * Find… sends `ClassicyAppFindFileShowFind`, which launches Find File or
 * brings its Find window back to the front. The location pop-up's choice is
 * kept (`data.location`), as Mac OS 8.1 kept it across launches; the rows
 * and the results are the open session's, and go when Find File quits.
 */
import { z } from "zod";
import {
	focusApp,
	focusWindow,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	getAppWindow,
	updateAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

export const FIND_FILE_APP_ID = "FindFile.app";
export const FIND_FILE_APP_NAME = "Find File";
/** The Find window: the location and the rows. */
export const FIND_FILE_WINDOW_ID = "FindFile.app_find";
/** The results window, Items Found. */
export const FIND_FILE_RESULTS_WINDOW_ID = "FindFile.app_results";

export const FindFileDataSchema = z.looseObject({
	location: z
		.string()
		.optional()
		.describe(
			"The location pop-up's choice: all, local, desktop or disk:<name>. Kept across launches, as Mac OS 8.1 kept it.",
		),
});

export type FindFileData = z.infer<typeof FindFileDataSchema>;

export const classicyFindFileEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const app = ds.System.Manager.Applications.apps[FIND_FILE_APP_ID];
	if (!app) return ds;
	switch (action.type) {
		case "ClassicyAppFindFileShowFind": {
			if (!app.open) {
				// A launch: the Find window opens as Find File mounts it.
				openApp(ds, FIND_FILE_APP_ID, app.name, app.icon);
				break;
			}
			const find = getAppWindow(app, FIND_FILE_WINDOW_ID);
			if (!find) {
				focusApp(ds, FIND_FILE_APP_ID);
				break;
			}
			if (find.closed) {
				updateAppWindow(app, FIND_FILE_WINDOW_ID, {
					closed: false,
					closedThisSession: false,
				});
			}
			focusWindow(ds, FIND_FILE_APP_ID, FIND_FILE_WINDOW_ID);
			break;
		}
		case "ClassicyAppFindFileSetLocation": {
			if (typeof action.location !== "string") break;
			app.data = { ...(app.data ?? {}), location: action.location };
			break;
		}
	}
	return ds;
};

registerApp({
	id: FIND_FILE_APP_ID,
	description:
		"Search the disks for items by name, kind, date, size, label and more, and search the channels the site adds.",
	prefix: "ClassicyAppFindFile",
	handler: classicyFindFileEventHandler,
	actions: {
		ClassicyAppFindFileShowFind: {
			description:
				"Launch Find File, or bring its Find window to the front (the Finder's File ▸ Find…).",
		},
		ClassicyAppFindFileSetLocation: {
			description: "Remember the location pop-up's choice.",
			params: z.object({
				location: z
					.string()
					.describe("all, local, desktop or disk:<name> (one disk)."),
			}),
		},
	},
	state: FindFileDataSchema,
});

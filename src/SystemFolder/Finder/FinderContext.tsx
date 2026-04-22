import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export const classicyFinderEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const appId = "Finder.app";
	if (!ds.System.Manager.Applications.apps[appId]) return ds;
	let appData = ds.System.Manager.Applications.apps[appId].data;

	switch (action.type) {
		case "ClassicyAppFinderOpenFolder": {
			if (!appData || !("openPaths" in appData)) {
				appData = { openPaths: [action.path] };
				break;
			}

			appData.openPaths = Array.from(
				new Set([...appData.openPaths, action.path]),
			);
			break;
		}
		case "ClassicyAppFinderOpenFolders": {
			if (!appData) {
				appData = {
					openPaths: [],
				};
			}

			if (!("openPaths" in appData)) {
				appData.openPaths = [];
			}

			appData.openPaths = Array.from(
				new Set([...appData.openPaths, ...action.paths]),
			);
			break;
		}
		case "ClassicyAppFinderCloseFolder": {
			if (!appData) {
				appData = {
					openPaths: [],
				};
			}

			if (!("openPaths" in appData)) {
				appData.openPaths = [];
			}

			appData.openPaths = appData.openPaths.filter(
				(p: string) => p !== action.path,
			);

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
			// Handled at top level in classicyDesktopStateEventReducer (cross-app orchestration)
			break;
		}
	}
	ds.System.Manager.Applications.apps[appId].data = { ...appData };
	return ds;
};

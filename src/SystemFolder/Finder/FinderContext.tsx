import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerAppEventHandler } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export type FinderData = {
	openPaths?: string[];
	showAboutThisComputer?: boolean;
};

export function isFinderData(
	d: Record<string, unknown>,
): d is FinderData {
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
			if (!appData.openPaths) {
				appData = { ...appData, openPaths: [action.path as string] };
				break;
			}

			appData = {
				...appData,
				openPaths: Array.from(
					new Set([...appData.openPaths, action.path as string]),
				),
			};
			break;
		}
		case "ClassicyAppFinderOpenFolders": {
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
			const existing = appData.openPaths ?? [];
			appData = {
				...appData,
				openPaths: existing.filter((p: string) => p !== (action.path as string)),
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
			// Handled at top level in classicyDesktopStateEventReducer (cross-app orchestration)
			break;
		}
	}
	ds.System.Manager.Applications.apps[appId].data = { ...appData };
	return ds;
};

// Self-register so the kernel router can dispatch ClassicyAppFinder* events
// without a hard-wired import.
// Note: ClassicyAppFinderOpenFile cross-app orchestration is handled at the
// top level of classicyDesktopStateEventReducer before prefix routing.
registerAppEventHandler("ClassicyAppFinder", classicyFinderEventHandler);

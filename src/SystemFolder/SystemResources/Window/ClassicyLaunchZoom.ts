import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyZoomOrigin,
	type ClassicyZoomRectsHandle,
	playClassicyLaunchZoom,
} from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

/** The ids of the applications open in the store now. */
const openClassicyAppIds = (): Set<string> => {
	if (typeof useAppManager.getState !== "function") return new Set();
	const apps = useAppManager.getState().System.Manager.Applications.apps;
	return new Set(
		Object.values(apps)
			.filter((app) => app?.open)
			.map((app) => app.id),
	);
};

/**
 * Runs `open` (a dispatch that opens an item: an application, or a document
 * in its application) and, when it started an application that was not
 * running, zooms from the item's icon out to the whole desktop, as the 8.1
 * Finder did, the started application's windows drawn when the zoom ends.
 * Opening a document in an application already running draws nothing
 * (measured in Infinite Mac, story 0230-n6c). No origin, no zoom. Returns
 * the zoom, or null.
 */
export const withClassicyLaunchZoom = (
	origin: ClassicyZoomOrigin | undefined,
	open: () => void,
): ClassicyZoomRectsHandle | null => {
	if (!origin) {
		open();
		return null;
	}
	const before = openClassicyAppIds();
	open();
	const started = [...openClassicyAppIds()].filter((id) => !before.has(id));
	return started.length > 0 ? playClassicyLaunchZoom(origin, started) : null;
};

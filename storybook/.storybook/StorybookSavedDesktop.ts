import {
	CLASSICY_DESKTOP_STATE_STORAGE_KEY,
	startAppManagerPersistence,
	stopAppManagerPersistence,
	wasHydratedFromStorage,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * A desktop story that keeps its desktop state across a reload, as a host's
 * page does (`parameters.classicy.persistence: true`). Every other story
 * saves nothing (ClassicyDecorators stops the store's persistence) and starts
 * from the default state.
 *
 * While such a story is shown the store saves as a host's does
 * (`startAppManagerPersistence`, under `classicyDesktopState`, 500 ms after a
 * change), so a reload loads that state when the store is created, as a
 * host's page loads it (`wasHydratedFromStorage`), and the story's frame
 * draws the store as it loaded, where it would otherwise reset it. The state
 * a page loaded is the first story's only when that story keeps its state:
 * any other first story resets the store before it draws
 * (`claimClassicyStorybookLoadedState`). The saved state is removed when the
 * story leaves; a page closed while it is shown leaves it saved, and the next
 * page sets it aside the same way.
 */

/** The store holds the state this page loaded, and no story has claimed it. */
let loadedUnclaimed = wasHydratedFromStorage();

/**
 * True the first time it is called on a page whose store was loaded from
 * saved desktop state, false after that and on any other page: the first
 * story to draw claims the loaded state, to draw it (a story that keeps its
 * state) or to reset the store (any other).
 */
export const claimClassicyStorybookLoadedState = (): boolean => {
	const loaded = loadedUnclaimed;
	loadedUnclaimed = false;
	return loaded;
};

/**
 * Saves the desktop state as a host's page does, until the returned function
 * is called: it stops saving and removes the saved state, so no other story
 * loads it.
 */
export const keepClassicyStorybookDesktopSaved = (): (() => void) => {
	startAppManagerPersistence();
	return () => {
		stopAppManagerPersistence();
		try {
			localStorage.removeItem(CLASSICY_DESKTOP_STATE_STORAGE_KEY);
		} catch {
			// Storage blocked: nothing was saved.
		}
	};
};

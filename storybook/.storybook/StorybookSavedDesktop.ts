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
 * change), with the story, package and theme it is saved for beside it
 * (`classicyStorybookSavedStateOwner`). A reload loads that state when the
 * store is created, as a host's page loads it (`wasHydratedFromStorage`), and
 * the story's frame draws the store as it loaded, where it would otherwise
 * reset it, when the page shows the story it was saved for, under the same
 * Package and Theme toolbar choices. Any other first story resets the store
 * before it draws (`claimClassicyStorybookLoadedState`). The saved state is
 * removed when the story leaves; a page closed while it is shown leaves it
 * saved, and the next page sets it aside the same way.
 */

/** Where the owner of the saved desktop state is kept. */
const OWNER_KEY = "classicyStorybookDesktopStateOwner";

const readOwner = (): string | null => {
	try {
		return localStorage.getItem(OWNER_KEY);
	} catch {
		return null;
	}
};

/** The story, package and theme a story's desktop state is kept for. */
export const classicyStorybookSavedStateOwner = (
	storyId: string,
	packageId: string,
	themeId: string,
): string => JSON.stringify([storyId, packageId, themeId]);

/** The store holds the state this page loaded, and no story has claimed it. */
let loadedUnclaimed = wasHydratedFromStorage();
/** Whom the state this page loaded was saved for, read as it loaded. */
const loadedOwner = loadedUnclaimed ? readOwner() : null;

/**
 * Claims the state this page loaded, once: the first story to draw calls it,
 * to draw that state or to reset the store. With `owner` (a story that keeps
 * its state), true when the store was loaded from state saved for `owner`;
 * without one (any other story), true when the store was loaded from saved
 * state at all. False after the first call, and on a page whose store loaded
 * nothing.
 */
export const claimClassicyStorybookLoadedState = (owner?: string): boolean => {
	const loaded = loadedUnclaimed;
	loadedUnclaimed = false;
	return loaded && (owner === undefined || owner === loadedOwner);
};

/**
 * Saves the desktop state as a host's page does, for `owner`, until the
 * returned function is called: it stops saving and removes the saved state,
 * so no other story loads it.
 */
export const keepClassicyStorybookDesktopSaved = (
	owner: string,
): (() => void) => {
	try {
		localStorage.setItem(OWNER_KEY, owner);
	} catch {
		// Storage blocked: nothing will be saved either.
	}
	startAppManagerPersistence();
	return () => {
		stopAppManagerPersistence();
		try {
			localStorage.removeItem(CLASSICY_DESKTOP_STATE_STORAGE_KEY);
			localStorage.removeItem(OWNER_KEY);
		} catch {
			// Storage blocked: nothing was saved.
		}
	};
};

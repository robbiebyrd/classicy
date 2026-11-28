import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	flushAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";

/**
 * Ending the Windows shell's session (plan 0020-w98 E2): what Shut down,
 * Restart and Log Off do before the screen goes dark or the page reloads.
 * Internal: not exported from the package.
 */

/** The Finder's app id: the desktop itself, which a session end keeps. */
const FINDER_APP_ID = "Finder.app";

/**
 * Closes every program, as Windows does before it shuts down, restarts or
 * logs off: each open app that is neither an extension nor the Finder gets
 * `ClassicyAppClose`, as its Quit would send. The Finder is the desktop (the
 * Explorer), and its folder windows stay as they are, since Windows 98's
 * Explorer opens again at logon the folder windows open at shutdown.
 * Classicy's apps hold no unsaved state the shell could ask about (Windows'
 * WM_QUERYENDSESSION), so none is asked. Then writes the state at once
 * (`flushAppManagerPersistence`), so a reload that follows keeps it.
 */
export const closeClassicySessionPrograms = (
	dispatch: (action: ActionMessage) => void,
): void => {
	const { apps } = useAppManager.getState().System.Manager.Applications;
	for (const app of Object.values(apps)) {
		if (!app?.open || app.extension === true || app.id === FINDER_APP_ID)
			continue;
		dispatch({ type: "ClassicyAppClose", app: { id: app.id } });
	}
	flushAppManagerPersistence();
};

/** How a session ends after its programs close. */
export type ClassicySessionEnd =
	/** Restart (and the power coming back after Shut down): the startup
	 * screen plays again. */
	| "restart"
	/** Log Off: the next session starts with no startup screen, as Windows
	 * logs on again without restarting. */
	| "logOff";

/**
 * Starts a fresh session: the page reloads (`reload`, the page's own by
 * default) with every setting and file kept (Classicy's Reset PRAM is the
 * path that clears them). For `"restart"` the startup screen's
 * once-per-session mark is cleared first, so the boot plays again, as
 * Windows restarts.
 */
export const startClassicyFreshSession = (
	end: ClassicySessionEnd,
	reload: () => void = () => window.location.reload(),
): void => {
	if (end === "restart") resetStartupScreenSession();
	reload();
};

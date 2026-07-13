const SESSION_KEY = "classicyStartupScreenShown";

export const hasShownStartupScreenThisSession = (): boolean => {
	try {
		return sessionStorage.getItem(SESSION_KEY) !== null;
	} catch {
		// Storage unavailable (private browsing, SSR): degrade to showing.
		return false;
	}
};

export const markStartupScreenShownThisSession = (): void => {
	try {
		sessionStorage.setItem(SESSION_KEY, "true");
	} catch {
		// Storage unavailable: the splash will simply show again next load.
	}
};

/**
 * Forget that the splash was shown this session, so the next load replays
 * it. Used by "reboot"-style flows (e.g. Empty Trash) that reload the page.
 */
export const resetStartupScreenSession = (): void => {
	try {
		sessionStorage.removeItem(SESSION_KEY);
	} catch {
		// Storage unavailable: nothing to reset.
	}
};

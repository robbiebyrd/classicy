import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/**
 * What an app's own reducer closes when it quits, beside the kernel's
 * `data.openFiles` (`closeApp`): Web Viewer's pages, HyperCard's stacks. A
 * leaf module, so `closeApp` (in the kernel's helpers) runs them without
 * importing the apps.
 */
const quitHandlers = new Map<string, (app: ClassicyStoreSystemApp) => void>();

/** Called once at module load by an app whose documents live elsewhere than `data.openFiles`. */
export const registerClassicyAppQuitHandler = (
	appId: string,
	handler: (app: ClassicyStoreSystemApp) => void,
): void => {
	quitHandlers.set(appId, handler);
};

/** Run `app`'s quit handler, if it registered one. */
export const runClassicyAppQuitHandler = (
	app: ClassicyStoreSystemApp,
): void => {
	quitHandlers.get(app.id)?.(app);
};

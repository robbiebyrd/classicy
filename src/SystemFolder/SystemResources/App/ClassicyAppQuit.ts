import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * Asked before an app quits by `requestClassicyAppQuit`: resolves `true` to go
 * on (nothing would be lost, or the user saved or discarded it), `false` to
 * keep the app running (the user chose Cancel). SimpleText's asks to save
 * each unsaved document; HyperCard's asks about each unsaved stack.
 */
export type ClassicyAppQuitGuard = () => boolean | Promise<boolean>;

const guards = new Map<string, ClassicyAppQuitGuard>();
const pending = new Map<string, Promise<boolean>>();

/**
 * Register `appId`'s quit guard (one per app; a later one replaces it).
 * Returns the unregister, which removes it only while it is still the one
 * registered. Call it from an effect of the app's component, as the guard
 * usually needs the component's state to ask.
 */
export function registerClassicyAppQuitGuard(
	appId: string,
	guard: ClassicyAppQuitGuard,
): () => void {
	guards.set(appId, guard);
	return () => {
		if (guards.get(appId) === guard) guards.delete(appId);
	};
}

/**
 * Quit `appId` the way its File > Quit does: its quit guard runs first (an
 * app with unsaved work asks), and `ClassicyAppClose` is dispatched only when
 * it resolves `true`. Resolves whether the app quit. A second request while
 * one is asking joins it. Dispatching `ClassicyAppClose` directly quits at
 * once and discards what the app has not saved.
 */
export function requestClassicyAppQuit(appId: string): Promise<boolean> {
	const inFlight = pending.get(appId);
	if (inFlight) return inFlight;
	const guard = guards.get(appId);
	const run = (async () => {
		try {
			const proceed = guard ? await guard() : true;
			if (proceed) dispatch({ type: "ClassicyAppClose", app: { id: appId } });
			return proceed;
		} finally {
			pending.delete(appId);
		}
	})();
	pending.set(appId, run);
	return run;
}

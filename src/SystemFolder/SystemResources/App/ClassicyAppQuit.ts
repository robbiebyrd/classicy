import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Asked before an app quits by `requestClassicyAppQuit`: resolves `true` to go
 * on (nothing would be lost, or the user saved or discarded it), `false` to
 * keep the app running (the user chose Cancel). SimpleText's asks to save
 * each unsaved document; HyperCard's asks about each unsaved stack.
 *
 * A guard must always settle: a request for the same app joins one still
 * asking, so a guard that never settles holds every later request for its
 * app until it is replaced or unregistered (which ends that wait). A guard
 * that throws (or rejects) counts as a refusal: the app keeps running, and
 * the error is logged.
 */
export type ClassicyAppQuitGuard = () => boolean | Promise<boolean>;

const guards = new Map<string, ClassicyAppQuitGuard>();
/** The request asking for each app, with the guard it is waiting on. */
const pending = new Map<
	string,
	{ guard: ClassicyAppQuitGuard | undefined; request: Promise<boolean> }
>();

/**
 * Register `appId`'s quit guard (one per app; a later one replaces it).
 * Returns the unregister, which removes it only while it is still the one
 * registered. Call it from an effect of the app's component, as the guard
 * usually needs the component's state to ask. Replacing or unregistering a
 * guard releases its app from a request still waiting on it: the next
 * request runs afresh.
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
 * it resolves `true`. Resolves whether the app quit; never rejects (a guard
 * that throws is a refusal, logged through `classicyLog`). A second request
 * while one is asking joins it, as long as the guard it waits on is still
 * the app's; requests for other apps never wait on it. Dispatching
 * `ClassicyAppClose` directly quits at once and discards what the app has
 * not saved.
 */
export function requestClassicyAppQuit(appId: string): Promise<boolean> {
	const guard = guards.get(appId);
	const inFlight = pending.get(appId);
	if (inFlight && inFlight.guard === guard) return inFlight.request;
	// Registered before the request runs: with no guard (or a synchronous
	// one) it runs to its end at once, and must not leave itself behind.
	const entry: {
		guard: ClassicyAppQuitGuard | undefined;
		request: Promise<boolean>;
	} = { guard, request: Promise.resolve(false) };
	pending.set(appId, entry);
	entry.request = (async () => {
		try {
			let proceed: boolean;
			try {
				proceed = guard ? (await guard()) === true : true;
			} catch (error) {
				classicyLog(
					"error",
					"ClassicyAppQuit",
					"A quit guard failed; the app keeps running",
					{ appId, error },
				);
				proceed = false;
			}
			if (proceed) dispatch({ type: "ClassicyAppClose", app: { id: appId } });
			return proceed;
		} finally {
			if (pending.get(appId) === entry) pending.delete(appId);
		}
	})();
	return entry.request;
}

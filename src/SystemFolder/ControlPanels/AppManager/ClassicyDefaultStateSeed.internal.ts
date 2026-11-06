/**
 * Whether a host's `defaultState` seed has been applied in this page session
 * (`withClassicyDefaultStateSeed`). The provider applies a seed at most once
 * per session: its own guard is per instance, and `wasHydratedFromStorage`
 * is fixed when the store loads, so a remount (an SPA route, a `key`
 * change, Fast Refresh, a second provider) would otherwise seed again, over
 * the user's theme. Its own module, free of side effects, so the test setup
 * can reset it without creating the store.
 */
let applied = false;

/** True once a `defaultState` seed has been applied in this page session. */
export const wasClassicyDefaultStateSeedApplied = (): boolean => applied;

/** Notes that a `defaultState` seed has been applied. */
export const markClassicyDefaultStateSeedApplied = (): void => {
	applied = true;
};

/** Tests only: forget the applied seed, as a new page session would. */
export const resetClassicyDefaultStateSeedForTests = (): void => {
	applied = false;
};

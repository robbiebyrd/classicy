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

/**
 * The `defaultState` seed of the mounted provider, applied or not: Reset
 * PRAM hands storage adapters the state a first session starts from, seed
 * included (`resetClassicyPersistedState`, ClassicyStateSync.internal.ts).
 */
let seed: unknown;

/** Notes the provider's `defaultState` seed (undefined for none). */
export const rememberClassicyDefaultStateSeed = (value: unknown): void => {
	seed = value;
};

/** The provider's `defaultState` seed, as last noted. */
export const rememberedClassicyDefaultStateSeed = (): unknown => seed;

/** True once a `defaultState` seed has been applied in this page session. */
export const wasClassicyDefaultStateSeedApplied = (): boolean => applied;

/** Notes that a `defaultState` seed has been applied. */
export const markClassicyDefaultStateSeedApplied = (): void => {
	applied = true;
};

/** Tests only: forget the applied seed, as a new page session would. */
export const resetClassicyDefaultStateSeedForTests = (): void => {
	applied = false;
	seed = undefined;
};

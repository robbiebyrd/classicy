// The module state of ClassicyIconDimming.ts, and the helpers its tests use
// to read and clear it. Not public API: `.internal.ts` modules are excluded
// from the barrels (.ts-barrel.json), so none of this reaches `src/index.ts`.

/** The dimmed image of each (rule, size, source) key, once requested. */
export const dimmedSources = new Map<string, Promise<string | undefined>>();
/** Sources already reported, so a source that cannot be read logs once
 * however many sizes or mounts ask for it. */
export const reportedSources = new Set<string>();
/** Cache keys whose load failed: the failure may be transient (a network
 * error), so the next request for one draws again instead of keeping it. */
export const retryKeys = new Set<string>();
/** The settled result of each key (`undefined`: no dimmed image). */
export const settled = new Map<string, string | undefined>();
/** Components listening for a dimmed image to settle. */
export const settledListeners = new Set<() => void>();

/** Test-only: how many components listen for a dimmed image to settle. */
export const classicyDimmedIconListenerCountForTests = (): number =>
	settledListeners.size;

/** Test-only: forgets every dimmed image. */
export const resetClassicyDimmedIconsForTests = (): void => {
	dimmedSources.clear();
	settled.clear();
	reportedSources.clear();
	retryKeys.clear();
};

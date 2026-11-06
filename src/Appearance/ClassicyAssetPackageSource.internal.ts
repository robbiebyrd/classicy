// Library-internal: the link from the asset registry to the active Appearance
// Package. Not public API — `.internal.ts` modules are excluded from the
// barrels (.ts-barrel.json), so only the store module (which connects it) and
// the asset registry (which reads it) import this file, by path. A leaf: no
// runtime imports, so either side may evaluate first.

/** Where the asset registry learns which Appearance Package is active. */
export type ClassicyAssetPackageSource = {
	/** The resolved active package id, read at call time. */
	getId: () => string;
	/** Calls `onChange` whenever the active id may have changed. */
	subscribe: (onChange: () => void) => () => void;
};

let source: ClassicyAssetPackageSource | undefined;
let onConnect: (() => void) | undefined;

/**
 * Connects the asset registry to the active Appearance Package. The app
 * manager calls it once, right after it creates its store. The source is read
 * lazily: `getId` at lookup time, `subscribe` when the first asset consumer
 * subscribes.
 */
export const connectClassicyAssetPackageSource = (
	next: ClassicyAssetPackageSource,
): void => {
	source = next;
	onConnect?.();
};

/** The connected source, or `undefined` before the store connects one. */
export const getClassicyAssetPackageSource = ():
	| ClassicyAssetPackageSource
	| undefined => source;

/** The asset registry's hook: called on every (re)connection. */
export const onClassicyAssetPackageSourceConnect = (
	handler: () => void,
): void => {
	onConnect = handler;
};

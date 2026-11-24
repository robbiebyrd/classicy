// Library-internal: the link from the asset registry to the active Appearance
// Package. Not public API — `.internal.ts` modules are excluded from the
// barrels (.ts-barrel.json), so only the store module (which connects it),
// the package registry (which sets the variant lookup below) and the asset
// registry (which reads both) import this file, by path. A leaf: no runtime
// imports, so any side may evaluate first.

/** Where the asset registry learns which Appearance Package is active. */
export type ClassicyAssetPackageSource = {
	/** The resolved active package id, read at call time. */
	getId: () => string;
	/**
	 * The active theme, read at call time: its `package` and `assetVariant`
	 * pick the variant tree its lookups read first. Optional: a source without
	 * it selects no variant.
	 */
	getActiveTheme?: () =>
		| { package?: string; assetVariant?: string }
		| undefined;
	/** Calls `onChange` whenever the active id or theme may have changed. */
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

// Whether a registered package ships a built-in theme (its defaults or a
// preset) naming an asset variant, set by the package registry (story
// 0235-xgi). Another package's theme naming that variant then draws the
// drawing package's variant trees, as its knobs complete from that built-in
// (`classicyDrawnThemeMeasurements`); a variant no built-in of the drawing
// package names selects none of its trees.

/** Whether `packageId` ships a built-in theme whose `assetVariant` is
 * `variant`; `false` for an unregistered id. */
export type ClassicyPackageVariantThemeLookup = (
	packageId: string,
	variant: string,
) => boolean;

let variantThemeLookup: ClassicyPackageVariantThemeLookup = () => false;

/**
 * Sets the variant lookup. Called once, by ClassicyAppearancePackageRegistry.
 * @internal
 */
export const setClassicyPackageVariantThemeLookup = (
	next: ClassicyPackageVariantThemeLookup,
): void => {
	variantThemeLookup = next;
};

/**
 * Whether `packageId` ships a built-in theme naming `variant`.
 * @internal
 */
export const hasClassicyPackageVariantTheme = (
	packageId: string,
	variant: string,
): boolean => variantThemeLookup(packageId, variant);

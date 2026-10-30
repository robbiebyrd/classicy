import { subscribeClassicyAppearancePackages } from "./ClassicyAppearancePackageRegistry";
import { subscribeClassicyAssets } from "./ClassicyAssetRegistry";

// Library-internal: `.internal.ts` modules are excluded from the barrels
// (.ts-barrel.json), so the hooks that read the active package import this
// file by path. Store-free, like both registries it joins, so reducers may
// import the modules that use it.

/**
 * Subscribes to every change that can change what the active Appearance
 * Package is or declares: the asset registry follows the active package id
 * (and the store's connection, whenever it happens); the package registry
 * covers a package re-registered under the active id. The one subscriber the
 * live package hooks (`useClassicyAppearance`, `useClassicyAppearanceLayout`,
 * `useClassicyAppIdentityOverrides`) share, so they always listen to the
 * same sources.
 */
export const subscribeClassicyActiveAppearancePackage = (
	onChange: () => void,
): (() => void) => {
	const unsubscribeAssets = subscribeClassicyAssets(onChange);
	const unsubscribePackages = subscribeClassicyAppearancePackages(onChange);
	return () => {
		unsubscribeAssets();
		unsubscribePackages();
	};
};

import { useSyncExternalStore } from "react";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "./ClassicyAppearanceDefaults";
import type { ClassicyAppearanceLayout } from "./ClassicyAppearancePackage";
import {
	getRegisteredClassicyAppearancePackageOrDefault,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "./ClassicyAssetPackageSource.internal";
import { subscribeClassicyAssets } from "./ClassicyAssetRegistry";

export { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "./ClassicyAppearanceDefaults";

// Store-free, so reducers may import it: this module never reaches the app
// manager or the package module (which reads the store). A reducer the app
// manager imports would otherwise have the store created while
// DefaultAppManagerState is still in its temporal dead zone. The active
// package id comes through the `.internal` source the store connects
// (resolved from `Appearance.packageId`, never `activeTheme.package`).

/**
 * The layout of `packageId`'s package, or of the active package when no id
 * is given (the store's `packageId`, read at call time); an unregistered id
 * falls back to the default package's layout, then to
 * `CLASSICY_DEFAULT_APPEARANCE_LAYOUT` (the rule of
 * `getRegisteredClassicyAppearancePackageOrDefault`, which
 * `resolveClassicyAppearancePackage` shares). Store-free, for reducers and
 * effects (a reducer passes the id from its draft); components use
 * `useClassicyAppearanceLayout`.
 */
export const getClassicyAppearanceLayout = (
	packageId?: string,
): ClassicyAppearanceLayout =>
	getRegisteredClassicyAppearancePackageOrDefault(
		packageId ?? getClassicyAssetPackageSource()?.getId(),
	)?.layout ?? CLASSICY_DEFAULT_APPEARANCE_LAYOUT;

// The asset registry follows the active package id (and the store's
// connection, whenever it happens); the package registry covers a package
// re-registered under the active id with a new layout.
const subscribeActiveLayout = (onChange: () => void): (() => void) => {
	const unsubscribeAssets = subscribeClassicyAssets(onChange);
	const unsubscribePackages = subscribeClassicyAppearancePackages(onChange);
	return () => {
		unsubscribeAssets();
		unsubscribePackages();
	};
};

const getActiveLayout = (): ClassicyAppearanceLayout =>
	getClassicyAppearanceLayout();

/** The active package's layout; re-renders when the package changes. */
export const useClassicyAppearanceLayout = (): ClassicyAppearanceLayout =>
	useSyncExternalStore(subscribeActiveLayout, getActiveLayout, getActiveLayout);

/**
 * The layout as CSS custom properties with bare keyword values, for the
 * desktop root (spread beside the theme vars, not by `getThemeVars`, which
 * only sees the theme).
 */
export const classicyLayoutVars = (
	layout: ClassicyAppearanceLayout,
): Record<string, string> => ({
	"--classicy-layout-grow-box-corner": layout.window.growBoxCorner,
	"--classicy-layout-menu-bar-placement": layout.menuBar.placement,
	"--classicy-layout-icon-grid-origin": layout.desktop.iconGridOrigin,
});

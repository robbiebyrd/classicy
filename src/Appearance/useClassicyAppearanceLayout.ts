import {
	type ClassicyAppearanceLayout,
	resolveClassicyAppearancePackage,
	useActiveClassicyAppearancePackage,
} from "./ClassicyAppearancePackage";

export { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "./ClassicyAppearanceDefaults";

/**
 * The layout of `packageId`'s package (falling back to Platinum's, then the
 * default layout), or of the active package when no id is given, read from
 * the store at call time. For reducers and effects; components use
 * `useClassicyAppearanceLayout`.
 */
export const getClassicyAppearanceLayout = (
	packageId?: string,
): ClassicyAppearanceLayout =>
	resolveClassicyAppearancePackage(packageId).layout;

/** The active package's layout; re-renders when the package changes. */
export const useClassicyAppearanceLayout = (): ClassicyAppearanceLayout =>
	useActiveClassicyAppearancePackage().layout;

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

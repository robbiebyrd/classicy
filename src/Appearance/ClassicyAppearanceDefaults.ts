import type { ClassicyAppearanceLayout } from "./ClassicyAppearancePackage";

// A leaf: no runtime imports, ever (ClassicyAppearanceDefaults.test.ts pins
// it). The app manager reads these while it builds DefaultAppManagerState at
// module evaluation, and the package module reaches the app manager through
// `useAppManager`; holding them here means neither side can meet the other's
// constants in their temporal dead zone, whichever module a bundle evaluates
// first. ClassicyAppearancePackage.ts and useClassicyAppearanceLayout.ts
// re-export them under their contract homes.

/** The Appearance Package a fresh desktop starts with. */
export const CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID = "platinum";

/**
 * Platinum's arrangement: grow box bottom-right, one menu bar across the
 * screen, desktop icons laid out from the top right.
 */
export const CLASSICY_DEFAULT_APPEARANCE_LAYOUT: ClassicyAppearanceLayout =
	Object.freeze({
		window: Object.freeze({ growBoxCorner: "bottom-right" }),
		menuBar: Object.freeze({ placement: "screen" }),
		desktop: Object.freeze({ iconGridOrigin: "top-right" }),
	});

/**
 * The components that can lay their patterns from an origin the core
 * publishes (`ClassicyAppearanceLayout`'s `patternOrigin`), by their
 * vocabulary names (`CLASSICY_COMPONENT`). Frozen.
 */
export const CLASSICY_PATTERN_ORIGIN_COMPONENTS = Object.freeze([
	"ControlGroup",
	"PopUpMenu",
	"Separator",
	"Slider",
] as const);

/** One of `CLASSICY_PATTERN_ORIGIN_COMPONENTS`. */
export type ClassicyPatternOriginComponent =
	(typeof CLASSICY_PATTERN_ORIGIN_COMPONENTS)[number];

/**
 * Where a component's patterns are laid from: `element` (its own corner,
 * nothing published), `window` (the window's content origin) or `desktop`
 * (the desktop's corner, the screen's).
 */
export type ClassicyPatternOrigin = "element" | "window" | "desktop";

/**
 * Elements a package masks or fills with a pattern of its own (the core's
 * dither mixins included), by CSS selector, and the origin to publish on
 * each (`ClassicyAppearanceLayout`'s `patternOrigin.elements`).
 */
export type ClassicyPatternOriginElements = {
	readonly selector: string;
	readonly origin: Exclude<ClassicyPatternOrigin, "element">;
};

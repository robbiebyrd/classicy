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

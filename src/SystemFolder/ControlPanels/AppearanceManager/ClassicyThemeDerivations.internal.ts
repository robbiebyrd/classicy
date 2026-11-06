import { intToPx } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";

/**
 * A pixel length rounded to three decimals, so a fractional derivation
 * (`14 * 0.865`) is the same string in a test, the store and the browser.
 * Internal: `getThemeVars` (through `classicyThemeDerivations`) and the
 * reducer-side desktop-icon metrics round with it, so the two agree.
 */
export const px3 = (n: number): string => intToPx(Math.round(n * 1000) / 1000);

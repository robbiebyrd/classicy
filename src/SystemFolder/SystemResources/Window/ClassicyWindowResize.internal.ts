/**
 * Added to the pointer's distance from the anchored corner, so the grow box
 * stays under the pointer: `computeClassicyWindowResize`'s default `fudge`,
 * and what `ClassicyWindow` passes. Internal, so a measured value can replace
 * it without a public API change.
 */
export const CLASSICY_WINDOW_RESIZE_FUDGE = 5;

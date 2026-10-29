/**
 * Added to the pointer's distance from the anchored corner, so the grow box
 * stays under the pointer: `computeClassicyWindowResize`'s default `fudge`.
 * It equals Platinum's `--window-resize-inset` (padding − border = 5 px);
 * `ClassicyWindow` passes the live variable instead, so a theme with other
 * metrics keeps the grow box under the pointer. Internal, so a measured value
 * can replace it without a public API change.
 */
export const CLASSICY_WINDOW_RESIZE_FUDGE = 5;

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";

/**
 * Added to the pointer's distance from the anchored corner, so the grow box
 * stays under the pointer (today's `+ 5`; Part G replaces it with a measured
 * value).
 */
export const CLASSICY_WINDOW_RESIZE_FUDGE = 5;

/** A window's bounding rect, as captured when the resize gesture starts. */
export type ClassicyWindowRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

export type ClassicyWindowResizeResult = {
	/** The new content-box size, applied as the window's inline width/height. */
	size: [number, number];
	/** The new outer left/top that keeps the anchored corner where it was. */
	position: [number, number];
};

/**
 * The size and position for a resize drag whose grow box sits in `corner`.
 * The corner opposite the grow box is the anchor: the size is the pointer's
 * distance from it plus `fudge`, and the position keeps it fixed. `rect` is
 * the window's bounding rect at the start of the gesture and `chrome` its
 * frame padding plus border (`classicyWindowChromeSize`), which the rect
 * includes but the applied size does not.
 */
export const computeClassicyWindowResize = (
	corner: ClassicyAppearanceLayout["window"]["growBoxCorner"],
	rect: ClassicyWindowRect,
	pointer: [number, number],
	chrome: [number, number],
	fudge = CLASSICY_WINDOW_RESIZE_FUDGE,
): ClassicyWindowResizeResult => {
	const growsLeft = corner === "bottom-left" || corner === "top-left";
	const growsUp = corner === "top-right" || corner === "top-left";
	const anchorX = growsLeft ? rect.right : rect.left;
	const anchorY = growsUp ? rect.bottom : rect.top;
	const size: [number, number] = [
		Math.abs(anchorX - pointer[0]) + fudge,
		Math.abs(anchorY - pointer[1]) + fudge,
	];
	return {
		size,
		position: [
			growsLeft ? rect.right - (size[0] + chrome[0]) : rect.left,
			growsUp ? rect.bottom - (size[1] + chrome[1]) : rect.top,
		],
	};
};

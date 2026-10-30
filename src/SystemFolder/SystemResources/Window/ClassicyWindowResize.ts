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
 *
 * On an axis whose grow box moves the window's left or top edge, two limits
 * keep the anchor fixed through the release:
 * - `floor` is the lowest left/top the window may take (the floor
 *   `clampWindowPositionToViewport` re-applies after the gesture); past it the
 *   size shrinks so the edge stops there.
 * - `minimum` is the window's minimum content size, which CSS draws however
 *   small the size; the position comes from the drawn size, so the edge stops
 *   at the minimum. The returned size stays raw. The minimum wins when both
 *   bind.
 * Bottom-right moves no edge, so it ignores both and its numbers are today's.
 */
export const computeClassicyWindowResize = (
	corner: ClassicyAppearanceLayout["window"]["growBoxCorner"],
	rect: ClassicyWindowRect,
	pointer: [number, number],
	chrome: [number, number],
	fudge = CLASSICY_WINDOW_RESIZE_FUDGE,
	minimum: [number, number] = [0, 0],
	floor: [number, number] = [0, 0],
): ClassicyWindowResizeResult => {
	const flipped = [
		corner === "bottom-left" || corner === "top-left",
		corner === "top-right" || corner === "top-left",
	];
	const near = [rect.left, rect.top];
	const far = [rect.right, rect.bottom];
	const size: [number, number] = [0, 0];
	const position: [number, number] = [rect.left, rect.top];
	for (const i of [0, 1]) {
		const anchor = flipped[i] ? far[i] : near[i];
		size[i] = Math.abs(anchor - pointer[i]) + fudge;
		if (!flipped[i]) continue;
		if (anchor - (size[i] + chrome[i]) < floor[i]) {
			size[i] = anchor - chrome[i] - floor[i];
		}
		position[i] = anchor - (Math.max(size[i], minimum[i]) + chrome[i]);
	}
	return { size, position };
};

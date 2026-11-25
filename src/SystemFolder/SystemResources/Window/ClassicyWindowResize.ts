import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_WINDOW_RESIZE_FUDGE } from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize.internal";

/**
 * A window's bounding rect in viewport pixels (frame padding and border
 * included), as captured when the resize gesture starts: the `rect` argument
 * of `computeClassicyWindowResize`.
 */
export type ClassicyWindowRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

/** What `computeClassicyWindowResize` returns for one pointer position. */
export type ClassicyWindowResizeResult = {
	/** The new content-box size, applied as the window's inline width/height. */
	size: [number, number];
	/** The new outer left/top that keeps the anchored corner where it was. */
	position: [number, number];
};

/**
 * The size and position for a resize drag whose grow box sits in `corner`.
 * The corner opposite the grow box is the anchor: the size is the pointer's
 * distance from it plus `fudge` (default 5, which keeps the grow box under
 * the pointer), and the position keeps it fixed. `rect` is
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
 *   bind. No real press reaches that state: both bind only when
 *   `anchor − (minimum + chrome) < floor`, so a window drawn at least its
 *   minimum would have to start the gesture with its edge already past the
 *   floor, and the release clamp forbids such a press rect. If it is ever
 *   reached, the release clamp still moves the window onto the floor.
 * Bottom-right moves no edge, so it ignores both.
 *
 * On an axis whose grow box moves the window's right or bottom edge (the far
 * edge: `bottom-right` on both axes), `ceiling` is the largest right/bottom
 * that edge may reach, measured as the release clamp measures it: the left or
 * top plus the content size. Past it the size shrinks so the edge stops
 * there. The default, `[Infinity, Infinity]`, sets no limit, so a caller that
 * passes none gets today's numbers; `ClassicyWindow` passes the taskbar's top
 * (`[Infinity, innerHeight − band]`) only while a taskbar's band is
 * published, so a grow-box drag into the taskbar stops at its top instead of
 * being moved back up by the release clamp.
 */
export const computeClassicyWindowResize = (
	corner: ClassicyAppearanceLayout["window"]["growBoxCorner"],
	rect: ClassicyWindowRect,
	pointer: [number, number],
	chrome: [number, number],
	fudge = CLASSICY_WINDOW_RESIZE_FUDGE,
	minimum: [number, number] = [0, 0],
	floor: [number, number] = [0, 0],
	ceiling: [number, number] = [Infinity, Infinity],
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
		if (!flipped[i]) {
			// The far edge moves; the anchor is the left or top. Never below
			// 0, even for a press whose left or top is already past the limit.
			if (anchor + size[i] > ceiling[i]) {
				size[i] = Math.max(0, ceiling[i] - anchor);
			}
			continue;
		}
		if (anchor - (size[i] + chrome[i]) < floor[i]) {
			size[i] = anchor - chrome[i] - floor[i];
		}
		position[i] = anchor - (Math.max(size[i], minimum[i]) + chrome[i]);
	}
	return { size, position };
};

/**
 * What a frame-edge sizing gesture moves (`layout.window.frameEdges:
 * "resize"`, the Windows shell): one of the four edges, or a corner, which
 * moves both of its edges. These are Windows' eight sizing hit-test codes,
 * `HTTOP` to `HTBOTTOMRIGHT` (Wine's `NC_HandleNCHitTest`).
 */
export type ClassicyWindowSizingEdges =
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

/**
 * The size and position for a frame-edge sizing drag (`layout.window.frameEdges:
 * "resize"`, WIG Ch.6 "Sizing Borders", p.83): the edges `edges` names move by
 * the pointer's travel since the press (`pointer − startPointer`, rounded to
 * whole pixels), and every other edge stays where it was, so a left or top
 * drag keeps the right or bottom edge in place. `startRect` is the window's
 * bounding rect when the drag started (frame included) and `chrome` its frame
 * padding plus border, which the rect includes and the returned size does not.
 *
 * Each moving edge stops at a limit, as Windows confines the pointer of a
 * sizing drag to the work area and stops the edge at the window's minimum
 * and maximum tracking size (Wine's `sys_command_size_move`):
 * - a left or top edge at `floor`, the lowest left/top the window may take
 *   (the floor `clampWindowPositionToViewport` re-applies after the gesture);
 * - a right or bottom edge at `ceiling`, the largest right/bottom it may
 *   reach, measured as the release clamp measures it, the left or top plus
 *   the content size;
 * - any moving edge where the content would pass `minimum` or `maximum`
 *   (the content size CSS draws at least and at most: `ClassicyWindow`
 *   passes its `minimumSize` and its height reserve's cap, so the size it
 *   stores is the size it draws, and a fixed edge never moves).
 *
 * The returned size is never below 0. The minimum wins over every other
 * limit, as CSS's `min-height` beats `max-height`; it conflicts with the
 * floor or the ceiling only for a window stored below its minimum (which CSS
 * draws at the minimum anyway), because the release clamp keeps every
 * window's stored rect between the floor and the ceiling. So the window ends
 * the gesture where the user left it, and the release clamp never moves a
 * window the user has just sized. Returns `{ size, position }`, as
 * `computeClassicyWindowResize` does: the content size and the outer
 * left/top.
 */
export const computeClassicyWindowEdgeResize = (
	edges: ClassicyWindowSizingEdges,
	startRect: ClassicyWindowRect,
	startPointer: [number, number],
	pointer: [number, number],
	chrome: [number, number],
	minimum: [number, number] = [0, 0],
	floor: [number, number] = [0, 0],
	ceiling: [number, number] = [Infinity, Infinity],
	maximum: [number, number] = [Infinity, Infinity],
): ClassicyWindowResizeResult => {
	const near = [startRect.left, startRect.top];
	const far = [startRect.right, startRect.bottom];
	const movesNear = [edges.includes("left"), edges.startsWith("top")];
	const movesFar = [edges.includes("right"), edges.startsWith("bottom")];
	const size: [number, number] = [0, 0];
	const position: [number, number] = [startRect.left, startRect.top];
	for (const i of [0, 1]) {
		const startSize = Math.max(0, far[i] - near[i] - chrome[i]);
		const travel = Math.round(pointer[i] - startPointer[i]);
		// Never below 0, nor past the maximum; the minimum wins over both.
		const bounded = (next: number) =>
			Math.max(minimum[i], 0, Math.min(next, maximum[i]));
		if (movesFar[i]) {
			// The right or bottom edge moves; the left or top stays.
			size[i] = bounded(Math.min(startSize + travel, ceiling[i] - near[i]));
		} else if (movesNear[i]) {
			// The left or top edge moves; the right or bottom stays.
			size[i] = bounded(
				Math.min(startSize - travel, far[i] - chrome[i] - floor[i]),
			);
			position[i] = far[i] - chrome[i] - size[i];
		} else {
			size[i] = startSize;
		}
	}
	return { size, position };
};

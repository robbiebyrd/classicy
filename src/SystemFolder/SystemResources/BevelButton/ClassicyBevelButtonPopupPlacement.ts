// Where a pop-up bevel button's menu goes (HIGOS8 Ch.2 "Bevel Buttons as
// Pop-up Buttons", p.32): "directly below or to the right of the button".
// Below, the menu's left edge lines up with the button's; to the right, the
// top edges line up. When that side has no room the menu flips to the
// opposite side of the button (HIG Figure 2-16 shows a Control Strip pop-up
// opening upward), and as a last resort it is clamped onto the screen.
// Given the box it must show inside (`bounds`: what shows of the desktop,
// and how far its frame's shadow reaches), it keeps to that box on both
// axes, its shadow included, and a menu below with no room on the right
// hangs with its right side under the button's right side instead, as a
// menu bar's pull-down does, before it is clamped (pinned) inside it.

export type ClassicyBevelPopupSide = "below" | "right";

/**
 * How the popup lines up along the button: `start` puts the edges together
 * (left edges below, tops to the right); `center` centers it on the button,
 * rounding up — HIGOS8 Figure 2-16's slider sits centered on its module.
 */
export type ClassicyBevelPopupAlign = "start" | "center";

export type ClassicyBevelPopupRect = {
	top: number;
	bottom: number;
	left: number;
	right: number;
};

/**
 * The box a popup must show inside, in viewport pixels (what shows of its
 * desktop: its box where it overlaps the viewport), and how far its frame's
 * shadow reaches past each of the popup's sides (the shadow must show too).
 */
export type ClassicyBevelPopupBounds = ClassicyBevelPopupRect & {
	inkLeft?: number;
	inkTop?: number;
	inkRight?: number;
	inkBottom?: number;
};

type Rect = ClassicyBevelPopupRect;
type Size = { width: number; height: number };

/**
 * Where a pop-up bevel button's popup goes, `{ left, top }` in viewport
 * pixels, for a popup of size `popup` beside the button at `anchor`. It
 * keeps to `bounds` when given (the desktop's box, the frame's shadow
 * included), else to `viewport`.
 */
export const classicyBevelPopupPlacement = (
	anchor: Rect,
	popup: Size,
	viewport: Size,
	side: ClassicyBevelPopupSide,
	align: ClassicyBevelPopupAlign = "start",
	bounds?: ClassicyBevelPopupBounds,
): { left: number; top: number } => {
	const centered = (start: number, end: number, size: number) =>
		start + Math.ceil((end - start - size) / 2);
	const box = bounds ?? {
		left: 0,
		top: 0,
		right: viewport.width,
		bottom: viewport.height,
	};
	const ink = {
		left: bounds?.inkLeft ?? 0,
		top: bounds?.inkTop ?? 0,
		right: bounds?.inkRight ?? 0,
		bottom: bounds?.inkBottom ?? 0,
	};
	const passesRight = (left: number) =>
		left + popup.width + ink.right > box.right;
	const passesBottom = (top: number) =>
		top + popup.height + ink.bottom > box.bottom;
	// Inside the box, its left side or top winning when it is too large.
	const pinAcross = (left: number) =>
		Math.max(
			box.left + ink.left,
			Math.min(left, box.right - ink.right - popup.width),
		);
	const pinDown = (top: number) =>
		Math.max(
			box.top + ink.top,
			Math.min(top, box.bottom - ink.bottom - popup.height),
		);
	if (side === "right") {
		let left = anchor.right;
		if (passesRight(left) && anchor.left - popup.width - ink.left >= box.left) {
			left = anchor.left - popup.width;
		}
		return {
			left: pinAcross(left),
			top: pinDown(
				align === "center"
					? centered(anchor.top, anchor.bottom, popup.height)
					: anchor.top,
			),
		};
	}
	let top = anchor.bottom;
	if (passesBottom(top) && anchor.top - popup.height - ink.top >= box.top) {
		top = anchor.top - popup.height;
	}
	let left =
		align === "center"
			? centered(anchor.left, anchor.right, popup.width)
			: anchor.left;
	if (bounds && align === "start" && passesRight(left)) {
		left = anchor.right - popup.width;
	}
	return { left: pinAcross(left), top: pinDown(top) };
};

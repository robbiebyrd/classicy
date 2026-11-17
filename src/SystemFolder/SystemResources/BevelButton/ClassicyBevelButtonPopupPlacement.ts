// Where a pop-up bevel button's menu goes (HIGOS8 Ch.2 "Bevel Buttons as
// Pop-up Buttons", p.32): "directly below or to the right of the button".
// Below, the menu's left edge lines up with the button's; to the right, the
// top edges line up. When that side has no room the menu flips to the
// opposite side of the button (HIG Figure 2-16 shows a Control Strip pop-up
// opening upward), and as a last resort it is clamped onto the screen.
// Given the span across it must show in (`across`: the desktop's, and its
// frame's shadow), a menu below with no room on the right hangs with its
// right side under the button's right side instead, as a menu bar's
// pull-down does, before it is clamped (pinned) inside that span.

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
 * The span across a popup must show in, in viewport pixels: its desktop's
 * left and right edges, and how far its frame's shadow reaches past its
 * left and right sides (the shadow must show too).
 */
export type ClassicyBevelPopupAcross = {
	left: number;
	right: number;
	inkLeft?: number;
	inkRight?: number;
};

type Rect = ClassicyBevelPopupRect;
type Size = { width: number; height: number };

const clamp = (value: number, size: number, viewport: number) =>
	Math.max(0, Math.min(value, viewport - size));

/**
 * Where a pop-up bevel button's popup goes, `{ left, top }` in viewport
 * pixels, for a popup of size `popup` beside the button at `anchor`.
 * Vertically it keeps to `viewport`. Across it keeps to `across` when given
 * (the desktop's span, the frame's shadow included), else to `viewport`.
 */
export const classicyBevelPopupPlacement = (
	anchor: Rect,
	popup: Size,
	viewport: Size,
	side: ClassicyBevelPopupSide,
	align: ClassicyBevelPopupAlign = "start",
	across?: ClassicyBevelPopupAcross,
): { left: number; top: number } => {
	const centered = (start: number, end: number, size: number) =>
		start + Math.ceil((end - start - size) / 2);
	const span = across ?? { left: 0, right: viewport.width };
	const inkLeft = across?.inkLeft ?? 0;
	const inkRight = across?.inkRight ?? 0;
	const passesEnd = (left: number) =>
		left + popup.width + inkRight > span.right;
	// Inside the span, its left side winning when it is too wide for it.
	const pin = (left: number) =>
		Math.max(
			span.left + inkLeft,
			Math.min(left, span.right - inkRight - popup.width),
		);
	if (side === "right") {
		let left = anchor.right;
		if (passesEnd(left) && anchor.left - popup.width - inkLeft >= span.left) {
			left = anchor.left - popup.width;
		}
		return {
			left: pin(left),
			top: clamp(
				align === "center"
					? centered(anchor.top, anchor.bottom, popup.height)
					: anchor.top,
				popup.height,
				viewport.height,
			),
		};
	}
	let top = anchor.bottom;
	if (top + popup.height > viewport.height && anchor.top >= popup.height) {
		top = anchor.top - popup.height;
	}
	let left =
		align === "center"
			? centered(anchor.left, anchor.right, popup.width)
			: anchor.left;
	if (across && align === "start" && passesEnd(left)) {
		left = anchor.right - popup.width;
	}
	return {
		left: pin(left),
		top: clamp(top, popup.height, viewport.height),
	};
};

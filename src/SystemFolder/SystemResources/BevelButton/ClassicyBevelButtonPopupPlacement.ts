// Where a pop-up bevel button's menu goes (HIGOS8 Ch.2 "Bevel Buttons as
// Pop-up Buttons", p.32): "directly below or to the right of the button".
// Below, the menu's left edge lines up with the button's; to the right, the
// top edges line up. When that side has no room the menu flips to the
// opposite side of the button (HIG Figure 2-16 shows a Control Strip pop-up
// opening upward), and as a last resort it is clamped onto the screen.

export type ClassicyBevelPopupSide = "below" | "right";

/**
 * How the popup lines up along the button: `start` puts the edges together
 * (left edges below, tops to the right); `center` centres it on the button,
 * rounding up — HIGOS8 Figure 2-16's slider sits centred on its module.
 */
export type ClassicyBevelPopupAlign = "start" | "center";

export type ClassicyBevelPopupRect = {
	top: number;
	bottom: number;
	left: number;
	right: number;
};

type Rect = ClassicyBevelPopupRect;
type Size = { width: number; height: number };

const clamp = (value: number, size: number, viewport: number) =>
	Math.max(0, Math.min(value, viewport - size));

export const classicyBevelPopupPlacement = (
	anchor: Rect,
	popup: Size,
	viewport: Size,
	side: ClassicyBevelPopupSide,
	align: ClassicyBevelPopupAlign = "start",
): { left: number; top: number } => {
	const centred = (start: number, end: number, size: number) =>
		start + Math.ceil((end - start - size) / 2);
	if (side === "right") {
		let left = anchor.right;
		if (left + popup.width > viewport.width && anchor.left >= popup.width) {
			left = anchor.left - popup.width;
		}
		return {
			left: clamp(left, popup.width, viewport.width),
			top: clamp(
				align === "center"
					? centred(anchor.top, anchor.bottom, popup.height)
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
	return {
		left: clamp(
			align === "center"
				? centred(anchor.left, anchor.right, popup.width)
				: anchor.left,
			popup.width,
			viewport.width,
		),
		top: clamp(top, popup.height, viewport.height),
	};
};

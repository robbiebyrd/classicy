// Vertical placement policy for the open pop-up menu.
//
// The menu is rendered into a portal with `position: fixed`, so it cannot rely
// on the layout engine to keep itself on screen — it has to be told which way
// to grow. Policy: prefer growing downward (the historical Platinum look, where
// the menu covers its own button), and only flip upward when the menu does not
// fit below *and* there is more room above. Either way the height is clamped to
// the space actually available, so the list scrolls internally instead of
// running off the edge of the viewport.

/** Gutter left between the menu and the viewport edge. */
export const POPUP_MENU_VIEWPORT_MARGIN = 4;

/**
 * Design cap on menu height — mirrors `max-height` in ClassicyPopUpMenu.scss,
 * which governs the single measuring pass before this policy is applied. Keep
 * the two in sync.
 */
export const POPUP_MENU_MAX_HEIGHT = 300;

/**
 * Floor on menu height. A menu shorter than roughly two rows is unusable, so in
 * the pathological case (anchor scrolled off screen, viewport shorter than the
 * menu) prefer overflowing slightly to rendering an unusable sliver.
 */
const POPUP_MENU_MIN_HEIGHT = 64;

/** The anchoring pop-up button's viewport rect (a `DOMRect` satisfies this). */
type ClassicyPopUpMenuAnchor = {
	top: number;
	bottom: number;
};

export type ClassicyPopUpMenuPlacementResult = {
	/** True when the menu should grow upward from the button's bottom edge. */
	above: boolean;
	/** Height cap to apply inline, in pixels. */
	maxHeight: number;
};

export const classicyPopUpMenuPlacement = (
	anchor: ClassicyPopUpMenuAnchor,
	contentHeight: number,
	viewportHeight: number,
): ClassicyPopUpMenuPlacementResult => {
	// The two sides are measured from different edges because the menu overlaps
	// its button: growing down starts at the button's top, growing up starts at
	// the button's bottom.
	const spaceBelow = viewportHeight - anchor.top - POPUP_MENU_VIEWPORT_MARGIN;
	const spaceAbove = anchor.bottom - POPUP_MENU_VIEWPORT_MARGIN;

	// Fit is tested against the height the menu will actually render at, not its
	// full content height: a long list is already capped and scrolling, so using
	// the raw content height here would flip menus above even with ample room.
	const desiredHeight = Math.min(contentHeight, POPUP_MENU_MAX_HEIGHT);

	const above = desiredHeight > spaceBelow && spaceAbove > spaceBelow;

	const maxHeight = Math.max(
		POPUP_MENU_MIN_HEIGHT,
		Math.min(
			desiredHeight,
			above ? spaceAbove : spaceBelow,
			viewportHeight - POPUP_MENU_VIEWPORT_MARGIN * 2,
		),
	);

	return { above, maxHeight };
};

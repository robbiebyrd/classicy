// Vertical placement policy for the open pop-up menu.
//
// Two modes:
//
//  * Aligned (Mac OS 8 pop-up menu, HIG Ch.2): when a selection is passed, the
//    menu opens so the *currently selected item sits over the button* — items
//    before it extend upward, items after it extend downward — and, when the
//    list is longer than the viewport, it scrolls so the selection still lands
//    on the button. This is the classic Platinum pop-up where your current
//    choice is right under the pointer.
//
//  * Grow (combo box, or a pop-up showing a placeholder with nothing selected):
//    no item to align on, so prefer growing downward and only flip upward when
//    the menu does not fit below *and* there is more room above. This is the
//    historical behavior and is what ClassicyComboBox uses.
//
// The menu is rendered into a `position: fixed` portal, so it cannot rely on the
// layout engine to keep itself on screen — the policy clamps both the top and
// the height to the viewport, and the list scrolls internally past the cap.

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

/** The selected option's geometry within the (unscrolled) list content. */
export type ClassicyPopUpMenuSelectedMetrics = {
	/** Distance from the top of the list content to the option's top edge. */
	offsetTop: number;
	/** The option row's height. */
	height: number;
};

export type ClassicyPopUpMenuPlacementResult = {
	/** True when the menu grows upward (grow mode only; informational otherwise). */
	above: boolean;
	/** Height cap to apply inline, in pixels. */
	maxHeight: number;
	/**
	 * Fixed `top` (px) for the menu, computed so the selection lands on the
	 * button. Null in grow mode — the caller anchors by its own edge instead.
	 */
	top: number | null;
	/** Initial scroll offset (px) to align the selection; 0 in grow mode. */
	scrollTop: number;
};

export const classicyPopUpMenuPlacement = (
	anchor: ClassicyPopUpMenuAnchor,
	contentHeight: number,
	viewportHeight: number,
	selected?: ClassicyPopUpMenuSelectedMetrics | null,
): ClassicyPopUpMenuPlacementResult => {
	const margin = POPUP_MENU_VIEWPORT_MARGIN;

	if (selected) {
		// --- Aligned mode -----------------------------------------------------
		// Render height: the content, capped by the design max and the viewport.
		const viewportAvail = Math.max(
			POPUP_MENU_MIN_HEIGHT,
			viewportHeight - margin * 2,
		);
		const maxHeight = Math.max(
			POPUP_MENU_MIN_HEIGHT,
			Math.min(contentHeight, POPUP_MENU_MAX_HEIGHT, viewportAvail),
		);

		// Put the selected row's centre on the button's centre…
		const anchorCentre = anchor.top + (anchor.bottom - anchor.top) / 2;
		const selectionCentre = selected.offsetTop + selected.height / 2;
		let top = anchorCentre - selectionCentre;

		// …then slide the whole menu back on screen if that pushed it off an edge.
		if (top + maxHeight > viewportHeight - margin) {
			top = viewportHeight - margin - maxHeight;
		}
		if (top < margin) top = margin;

		// If the list is taller than the menu, scroll it so the selection still
		// lands on the button despite the clamp (bounded to the scrollable range).
		let scrollTop = 0;
		if (contentHeight > maxHeight) {
			scrollTop = Math.min(
				Math.max(top + selectionCentre - anchorCentre, 0),
				contentHeight - maxHeight,
			);
		}

		return { above: top < anchor.top, maxHeight, top, scrollTop };
	}

	// --- Grow mode (unchanged historical policy) ------------------------------
	// The two sides are measured from different edges because the menu overlaps
	// its button: growing down starts at the button's top, growing up starts at
	// the button's bottom.
	const spaceBelow = viewportHeight - anchor.top - margin;
	const spaceAbove = anchor.bottom - margin;

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
			viewportHeight - margin * 2,
		),
	);

	return { above, maxHeight, top: null, scrollTop: 0 };
};

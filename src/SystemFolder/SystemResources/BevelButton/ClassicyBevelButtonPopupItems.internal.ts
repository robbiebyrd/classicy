/**
 * The items of a pop-up surface's menu (`ClassicyBevelButtonPopup`) that the
 * keyboard walks. Internal: not exported from the package.
 */

/**
 * An enabled menu item, plain or checkable (ClassicyMenu renders a checkable
 * item as a menuitemcheckbox, an option item, `mark: "bullet"`, as a
 * menuitemradio).
 */
export const CLASSICY_BEVEL_POPUP_MENU_ITEM_SELECTOR =
	'li:is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]):not(.disabled)';

/**
 * Every menu item, plain or checkable, enabled or dimmed: what Windows' menu
 * loop walks (Wine's `MENU_MoveSelection` passes over separators alone, and
 * a grayed item takes the highlight).
 */
export const CLASSICY_BEVEL_POPUP_ANY_MENU_ITEM_SELECTOR =
	'li:is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"])';

/**
 * The menu items of the popup surface `surface` that show, in document
 * order: every enabled item (every item, dimmed ones included, with
 * `dimmed`, as Windows' menu loop walks them) whose enclosing submenus, if
 * any, are open (an item whose submenu is open carries `open`). A closed
 * submenu's list is drawn `display: none` and its items take no focus, so
 * the arrow keys pass over them rather than stop on them. A flat menu's
 * items are all of them.
 */
export const classicyBevelPopupShownItems = (
	surface: Element | null,
	{ dimmed = false }: { dimmed?: boolean } = {},
): HTMLElement[] =>
	Array.from(
		surface?.querySelectorAll<HTMLElement>(
			dimmed
				? CLASSICY_BEVEL_POPUP_ANY_MENU_ITEM_SELECTOR
				: CLASSICY_BEVEL_POPUP_MENU_ITEM_SELECTOR,
		) ?? [],
	).filter((item) => {
		for (
			let owner = item.parentElement?.closest(".classicyMenuItem");
			owner && surface?.contains(owner);
			owner = owner.parentElement?.closest(".classicyMenuItem")
		) {
			if (!owner.classList.contains("open")) return false;
		}
		return true;
	});

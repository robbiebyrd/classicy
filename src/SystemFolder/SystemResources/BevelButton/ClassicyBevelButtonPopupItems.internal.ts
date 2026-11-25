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
 * The menu items of the popup surface `surface` that show, in document
 * order: every enabled item whose enclosing submenus, if any, are open (an
 * item whose submenu is open carries `open`). A closed submenu's list is
 * drawn `display: none` and its items take no focus, so the arrow keys pass
 * over them rather than stop on them. A flat menu's items are all of them.
 */
export const classicyBevelPopupShownItems = (
	surface: Element | null,
): HTMLElement[] =>
	Array.from(
		surface?.querySelectorAll<HTMLElement>(
			CLASSICY_BEVEL_POPUP_MENU_ITEM_SELECTOR,
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

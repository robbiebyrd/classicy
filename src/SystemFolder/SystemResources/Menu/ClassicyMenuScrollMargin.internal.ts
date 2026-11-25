import { createContext } from "react";
import { POPUP_MENU_VIEWPORT_MARGIN } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement";

/**
 * How far a menu's scroll cap (ClassicyMenu) keeps its list from the
 * bottom of the menu bounds (`classicyMenuBounds`), in px: the pop-up
 * menus' `POPUP_MENU_VIEWPORT_MARGIN` (4) unless a host provides another.
 * A list taller than the room left above that margin scrolls; its
 * submenus read the same value.
 *
 * Only a host that places its menu flush on the bounds' bottom provides
 * one: the Windows shell's Start menu and tray pop-ups
 * (`ClassicyBevelButtonPopup`'s `menuScrollMargin`, 0), which sit on the
 * taskbar band's top edge (plan 0020-w98 §2, "Menus keep above the
 * taskbar"), and a contextual menu opened from a point below the bounds,
 * in that band (`ClassicyContextualMenu`, 0: the taskbar's, the clock's, a
 * tray icon's and a window button's menus, plan 0020-w98 E1), so a menu
 * that fits there is drawn whole rather than capped by the margin into
 * scrolling. Without a provider every menu keeps the margin, as before.
 * Internal: not exported from the package.
 */
export const ClassicyMenuScrollMarginContext = createContext<number>(
	POPUP_MENU_VIEWPORT_MARGIN,
);

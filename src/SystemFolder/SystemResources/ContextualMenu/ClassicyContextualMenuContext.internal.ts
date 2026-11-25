import { createContext, useContext } from "react";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The contextual menu's context and its hook, apart from the provider, so a
// control that opens a menu (a text field's own, `textField.contextMenu`)
// reaches it without loading the menu's renderer.

/**
 * How `showContextMenu` opens a menu. Every key is optional, and with none
 * the menu opens as it always has: 1 px below and right of the click, a
 * Help item first, the keyboard left where it is.
 */
export interface ClassicyContextualMenuOptions {
	/**
	 * Put a disabled Help item first when the items include none (HIGOS8
	 * p.93: every Mac OS contextual menu leads with Help). `false` opens the
	 * items as given, as a Windows pop-up menu has no such item (the window
	 * pop-up menu, WIG Ch.7, p.102). Defaults to `true`.
	 */
	helpItem?: boolean;
	/**
	 * What `clickAt` is. `"click"` (the default): the pointer's click, the
	 * menu opening 1 px below and right of it (HIGOS8 "Contextual Menus").
	 * `"corner"`: the menu's top-left corner itself, for a menu dropped from
	 * a part rather than a click (the window pop-up menu below the caption,
	 * where Wine's `NC_GetSysPopupPos` puts it). Either way the menu then
	 * keeps to the desktop as always (flipped and pinned inside it).
	 */
	placement?: "click" | "corner";
	/**
	 * Focus the menu's first item when it opens, as a menu opened from the
	 * keyboard selects it (ALT+SPACE's window pop-up menu: Wine's
	 * `MENU_TrackKbdMenuBar` selects item 0), and give the focus back to the
	 * element that had it when the menu closes. Defaults to `false`.
	 */
	focusFirstItem?: boolean;
	/**
	 * The menu takes the keyboard while it is open, as Windows' menu loop
	 * does: the up and down arrows walk its items, the dimmed ones included
	 * (Windows highlights a grayed item), from the one that has the focus
	 * (with none, Down takes the first and Up the last), and ESC closes it;
	 * neither reaches anything else. It waits for the keyboard, with no idle
	 * timeout. Every other key passes, ENTER choosing the focused item.
	 * Defaults to `false`.
	 */
	keyboard?: boolean;
	/**
	 * The element the menu is opened from. A press on it is not a press
	 * outside the menu, so it does not close it: its owner handles it, as a
	 * bevel button's pop-up leaves presses on its button to the button. A
	 * menu opened by a press (the window pop-up menu from the title bar's
	 * icon) needs it, since the menu's outside-press listener is in place
	 * before that very press reaches the document. Defaults to none.
	 */
	anchor?: Element | null;
}

/**
 * The name lane 4's text-field menus used for these options.
 * @deprecated Use `ClassicyContextualMenuOptions`.
 */
export type ClassicyContextMenuOptions = ClassicyContextualMenuOptions;

/** The imperative contextual-menu API returned by `useClassicyContextualMenu`. */
export interface ClassicyContextualMenuAPI {
	/**
	 * Open `items` as the contextual menu, 1 px below and right of `clickAt`
	 * (viewport `[x, y]`), replacing any menu already open. A disabled Help
	 * item is put first unless the items include one, or `options.helpItem`
	 * is `false` (a menu that copies one with none, such as Windows' edit
	 * control's, or the window pop-up menu). The other `options` change
	 * where it opens and how it takes the keyboard
	 * (`ClassicyContextualMenuOptions`); without them the menu opens as it
	 * always has. Under a package whose
	 * layout says `contextMenu.openOn: "release"` (Windows 98), a call made
	 * while button 2 is down is held, and the menu opens when that button
	 * comes up.
	 */
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
		options?: ClassicyContextualMenuOptions,
	) => void;
	/** Close the open contextual menu, if any, and drop a held one. */
	hideContextMenu: () => void;
}

const noop = () => {};

/** @internal The provider's context; `useClassicyContextualMenu` reads it. */
export const ClassicyContextualMenuContext =
	createContext<ClassicyContextualMenuAPI>({
		showContextMenu: noop,
		hideContextMenu: noop,
	});

/**
 * Opens and closes the desktop's single contextual menu from code, e.g. in a
 * custom `onContextMenu` handler. Outside a `ClassicyContextualMenuProvider`
 * both functions are no-ops.
 */
export const useClassicyContextualMenu = (): ClassicyContextualMenuAPI =>
	useContext(ClassicyContextualMenuContext);

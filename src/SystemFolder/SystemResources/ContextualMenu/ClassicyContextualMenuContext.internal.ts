import { createContext, useContext } from "react";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The contextual menu's context and its hook, apart from the provider, so a
// control that opens a menu (a text field's own, `textField.contextMenu`)
// reaches it without loading the menu's renderer.

/** How `showContextMenu` opens a menu. */
export interface ClassicyContextMenuOptions {
	/**
	 * `false` opens the items as they are, with no Help item put first.
	 * Defaults to `true`.
	 */
	helpItem?: boolean;
}

/** The imperative contextual-menu API returned by `useClassicyContextualMenu`. */
export interface ClassicyContextualMenuAPI {
	/**
	 * Open `items` as the contextual menu, 1 px below and right of `clickAt`
	 * (viewport `[x, y]`), replacing any menu already open. A disabled Help
	 * item is put first unless the items include one, or `options.helpItem`
	 * is `false` (a menu that copies one with none, such as Windows' edit
	 * control's). Under a package whose
	 * layout says `contextMenu.openOn: "release"` (Windows 98), a call made
	 * while button 2 is down is held, and the menu opens when that button
	 * comes up.
	 */
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
		options?: ClassicyContextMenuOptions,
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

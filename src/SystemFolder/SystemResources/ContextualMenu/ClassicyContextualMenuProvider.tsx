import {
	createContext,
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
	focusFirstItem: boolean;
	keyboard: boolean;
	anchor: Element | null;
}

/** The imperative contextual-menu API returned by `useClassicyContextualMenu`. */
export interface ClassicyContextualMenuAPI {
	/**
	 * Open `items` as the contextual menu, 1 px below and right of `clickAt`
	 * (viewport `[x, y]`), replacing any menu already open. A disabled Help
	 * item is put first unless the items include one. `options` change each
	 * of those (`ClassicyContextualMenuOptions`); without them the menu opens
	 * as it always has.
	 */
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
		options?: ClassicyContextualMenuOptions,
	) => void;
	/** Close the open contextual menu, if any. */
	hideContextMenu: () => void;
}

const noop = () => {};

const ClassicyContextualMenuContext = createContext<ClassicyContextualMenuAPI>({
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

// HIG "Contextual Menus" (Ch. 4): the menu opens 1 px down and to the right of
// the click point, so the pointer sits just outside the top-left corner.
const clickOffset: [number, number] = [1, 1];

// The HIG requires a Help item as the first item of every contextual menu. If
// the caller didn't supply one, inject a disabled placeholder at the top.
const HELP_ITEM_ID = "contextual-help";

const withHelpItem = (items: ClassicyMenuItem[]): ClassicyMenuItem[] => {
	const hasHelp = items.some(
		(i) =>
			i.id === HELP_ITEM_ID ||
			i.id === "help" ||
			i.title?.trim().toLowerCase() === "help",
	);
	if (hasHelp) return items;
	return [{ id: HELP_ITEM_ID, title: "Help", disabled: true }, ...items];
};

/**
 * Owns the desktop's one open contextual menu and renders it, via a portal into
 * `#classicyDesktop`, as a `ClassicyContextualMenu`. `ClassicyDesktop` mounts
 * it, so apps only need it to render menu targets outside a desktop (as the
 * Storybook story for `ClassicyContextualMenuTarget` does).
 *
 * Every menu opened through it (`ClassicyContextualMenuTarget`, window, app,
 * desktop icon and desktop menus, `useClassicyContextualMenu`) opens 1 px down
 * and right of the click and gets the HIG's leading Help item (HIGOS8 p.93) —
 * a disabled placeholder when the caller supplied none — unless the caller's
 * `ClassicyContextualMenuOptions` say otherwise (the Windows shell's window
 * pop-up menu).
 */
export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

	const showContextMenu = useCallback(
		(
			items: ClassicyMenuItem[],
			clickAt: [number, number],
			options?: ClassicyContextualMenuOptions,
		) => {
			const offset: [number, number] =
				options?.placement === "corner" ? [0, 0] : clickOffset;
			setOpenMenu({
				items: options?.helpItem === false ? items : withHelpItem(items),
				position: [clickAt[0] + offset[0], clickAt[1] + offset[1]],
				focusFirstItem: options?.focusFirstItem === true,
				keyboard: options?.keyboard === true,
				anchor: options?.anchor ?? null,
			});
		},
		[],
	);

	const hideContextMenu = useCallback(() => setOpenMenu(null), []);

	const api = useMemo(
		() => ({ showContextMenu, hideContextMenu }),
		[showContextMenu, hideContextMenu],
	);

	return (
		<ClassicyContextualMenuContext.Provider value={api}>
			{children}
			{openMenu &&
				createPortal(
					<ClassicyContextualMenu
						name={"classicyContextualMenu"}
						menuItems={openMenu.items}
						position={openMenu.position}
						onClose={hideContextMenu}
						focusFirstItem={openMenu.focusFirstItem || undefined}
						keyboard={openMenu.keyboard || undefined}
						anchor={openMenu.anchor ?? undefined}
					/>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</ClassicyContextualMenuContext.Provider>
	);
};

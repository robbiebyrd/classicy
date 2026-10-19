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

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
}

/** The imperative contextual-menu API returned by `useClassicyContextualMenu`. */
export interface ClassicyContextualMenuAPI {
	/**
	 * Open `items` as the contextual menu, 1 px below and right of `clickAt`
	 * (viewport `[x, y]`), replacing any menu already open. A disabled Help
	 * item is put first unless the items include one.
	 */
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
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
 * a disabled placeholder when the caller supplied none.
 */
export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

	const showContextMenu = useCallback(
		(items: ClassicyMenuItem[], clickAt: [number, number]) => {
			setOpenMenu({
				items: withHelpItem(items),
				position: [clickAt[0] + clickOffset[0], clickAt[1] + clickOffset[1]],
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
					/>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</ClassicyContextualMenuContext.Provider>
	);
};

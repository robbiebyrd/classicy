import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import {
	type ClassicyContextMenuOptions,
	ClassicyContextualMenuContext,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
import { useClassicyContextMenuKey } from "@/SystemFolder/SystemResources/ContextualMenu/useClassicyContextMenuKey.internal";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { classicyContextMenuOpensOnRelease } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
}

export type {
	ClassicyContextMenuOptions,
	ClassicyContextualMenuAPI,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
export { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";

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
 *
 * Under the package's `layout.keyboard.contextMenuKey` (Windows) it also
 * opens them from the keyboard: Shift+F10 and the Application key send the
 * focused element a `contextmenu` of its own, at its center (or, with focus
 * on the desktop itself, where the pointer last went down in it), which the
 * same targets resolve innermost first (WIG Ch.7 "Pop-up Menu Interaction"
 * (p.101)). Under `layout.menu.keys` `"windows"` Escape closes the open menu
 * a level at a time (`ClassicyMenu`), and Up and Down take the keyboard into
 * it. A Mac OS package declares neither: its contextual menus open from a
 * Control-click or right-click alone and close as sticky menus do (HIGOS8
 * "Contextual Menus" (pp.93-94)).
 *
 * Under a package whose layout says `contextMenu.openOn: "release"`
 * (Windows 98; WIG Ch.5 "Selection with the Mouse", p.38: "display the
 * contextual pop-up menu for the selected objects when the user releases
 * the mouse button"; Ch.7 "Pop-up Menu Interaction", p.101), it watches button
 * 2 on the document, in the capture phase: a menu asked for while the
 * button is down (the `contextmenu` a macOS or Linux host raises at the
 * press, a press handler's own call; on a macOS host, a Control-click's
 * too) is held and opened at that button's `mouseup`; a newer call
 * replaces it, and a lost pointer stream (the
 * window blurs, a `pointercancel`, the page is hidden) or
 * `hideContextMenu` drops it. A Windows host raises `contextmenu` at the
 * release, so the menu opens at once there. Mac OS 8 opened its contextual
 * menus at the Control-press, so other packages open at the call.
 */
export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);
	const layout = useClassicyAppearanceLayout();
	useClassicyContextMenuKey(layout.keyboard?.contextMenuKey === true);
	const onRelease = classicyContextMenuOpensOnRelease(layout);

	// Under `openOn: "release"`: the button of the secondary press that is
	// down (button 2, or button 1 pressed with Control, which a macOS host
	// turns into a `contextmenu` as it does a right-click), if any, and the
	// menu asked for meanwhile, opened at that button's release.
	const secondaryButtonRef = useRef<number | null>(null);
	const heldMenuRef = useRef<OpenContextMenu | null>(null);
	const stopWatchingHeldRef = useRef<(() => void) | null>(null);
	const dropHeldMenu = useCallback(() => {
		heldMenuRef.current = null;
		stopWatchingHeldRef.current?.();
		stopWatchingHeldRef.current = null;
	}, []);
	useEffect(() => {
		if (!onRelease) return;
		const onDown = (e: MouseEvent) => {
			// Any other press starts afresh: a release the document never
			// heard (let go outside the window) leaves nothing behind.
			secondaryButtonRef.current =
				e.button === 2 || (e.button === 0 && e.ctrlKey) ? e.button : null;
		};
		const onUp = (e: MouseEvent) => {
			if (e.button !== secondaryButtonRef.current) return;
			secondaryButtonRef.current = null;
			const held = heldMenuRef.current;
			dropHeldMenu();
			if (held) setOpenMenu(held);
		};
		document.addEventListener("mousedown", onDown, true);
		document.addEventListener("mouseup", onUp, true);
		return () => {
			document.removeEventListener("mousedown", onDown, true);
			document.removeEventListener("mouseup", onUp, true);
			secondaryButtonRef.current = null;
			dropHeldMenu();
		};
	}, [onRelease, dropHeldMenu]);

	const showContextMenu = useCallback(
		(
			items: ClassicyMenuItem[],
			clickAt: [number, number],
			options?: ClassicyContextMenuOptions,
		) => {
			const menu: OpenContextMenu = {
				items: options?.helpItem === false ? items : withHelpItem(items),
				position: [clickAt[0] + clickOffset[0], clickAt[1] + clickOffset[1]],
			};
			if (onRelease && secondaryButtonRef.current !== null) {
				// Held for the release; a newer call replaces it.
				heldMenuRef.current = menu;
				stopWatchingHeldRef.current ??= onClassicyPointerStreamLost(() => {
					// The release will not come: neither the menu nor the
					// press outlives the stream.
					secondaryButtonRef.current = null;
					dropHeldMenu();
				});
				return;
			}
			setOpenMenu(menu);
		},
		[onRelease, dropHeldMenu],
	);

	const hideContextMenu = useCallback(() => {
		dropHeldMenu();
		setOpenMenu(null);
	}, [dropHeldMenu]);

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

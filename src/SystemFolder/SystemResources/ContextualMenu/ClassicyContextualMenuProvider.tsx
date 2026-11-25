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
import {
	findClassicyHelpAnchor,
	isClassicyWhatsThisActive,
	markClassicyWhatsThisContextMenuOpen,
	showClassicyContextHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { ClassicyWhatsThisPopup } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThisPopup.internal";
import { useClassicyContextHelpKeys } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyContextHelpKeys.internal";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import {
	ClassicyContextualMenuContext,
	type ClassicyContextualMenuOptions,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
import { useClassicyContextMenuKey } from "@/SystemFolder/SystemResources/ContextualMenu/useClassicyContextMenuKey.internal";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { classicyContextMenuOpensOnRelease } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
	focusFirstItem: boolean;
	keyboard: boolean;
	anchor: Element | null;
}

export type {
	ClassicyContextMenuOptions,
	ClassicyContextualMenuAPI,
	ClassicyContextualMenuOptions,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
export { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";

// HIG "Contextual Menus" (Ch. 4): the menu opens 1 px down and to the right of
// the click point, so the pointer sits just outside the top-left corner.
const clickOffset: [number, number] = [1, 1];

// The HIG requires a Help item as the first item of every contextual menu. If
// the caller didn't supply one, inject a disabled placeholder at the top.
const HELP_ITEM_ID = "contextual-help";

// The item of a control's own What's This? menu (Figure 12.4).
const WHATS_THIS_ITEM_ID = "classicy-whats-this";

// How many menus every provider has been asked for (held ones included), so
// a `contextmenu` event can tell whether anything opened a menu for it, and
// the events a provider has taken up for What's This?.
let contextMenuRequests = 0;
const whatsThisEvents = new WeakSet<Event>();

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
 *
 * Under a package whose layout says `balloonHelp.contextHelp: "whatsThis"`
 * (Windows 98; WIG Ch.12 "Context-Sensitive Help", pp.273-275) it mounts
 * context-sensitive Help: F1 and Shift+F1 (`useClassicyContextHelpKeys`),
 * the pop-up What's This? and F1 show (`ClassicyWhatsThisPopup`), and the
 * pop-up menu of a control with help and no menu of its own: a right-click
 * on an element `useClassicyBalloonHelp` describes, inside a window, that
 * opened no contextual menu (no target, window, app or text field asked
 * for one) opens a menu holding "What's This?" alone (access key W;
 * user.exe's "&What's This?", the menu WinHelp's HELP_CONTEXTMENU shows,
 * Figure 12.4), which shows the help at the click at once ("there is no
 * need for entering the context-sensitive Help mode", p.275). Other
 * packages mount the pop-up, which never opens, and nothing else.
 */
export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);
	const layout = useClassicyAppearanceLayout();
	useClassicyContextMenuKey(layout.keyboard?.contextMenuKey === true);
	const onRelease = classicyContextMenuOpensOnRelease(layout);
	const contextHelp = layout.balloonHelp?.contextHelp === "whatsThis";
	useClassicyContextHelpKeys(contextHelp);
	const bundledAccessKey = useClassicyBundledAccessKeys();

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
			options?: ClassicyContextualMenuOptions,
		) => {
			contextMenuRequests += 1;
			const offset: [number, number] =
				options?.placement === "corner" ? [0, 0] : clickOffset;
			const menu: OpenContextMenu = {
				items: options?.helpItem === false ? items : withHelpItem(items),
				position: [clickAt[0] + offset[0], clickAt[1] + offset[1]],
				focusFirstItem: options?.focusFirstItem === true,
				keyboard: options?.keyboard === true,
				anchor: options?.anchor ?? null,
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
	const showContextMenuRef = useRef(showContextMenu);
	showContextMenuRef.current = showContextMenu;

	// What's This? holds its mode while a menu a press passed through to is
	// open; it hears this one's opening and closing whatever the package's
	// menu keyboard.
	const menuIsOpen = openMenu !== null;
	useEffect(() => {
		if (menuIsOpen) return markClassicyWhatsThisContextMenuOpen();
	}, [menuIsOpen]);

	// Under `balloonHelp.contextHelp` "whatsThis": a right-click on a control
	// with help, in a window, that no one opened a menu for gets What's
	// This? alone. Whether anyone did is known once the event has run its
	// course (a target, a window, an app or a text field asks during it,
	// held for the release or not), so the check comes after it.
	const whatsThisKeyRef = useRef<string | undefined>(undefined);
	whatsThisKeyRef.current = bundledAccessKey("W");
	useEffect(() => {
		if (!contextHelp) return;
		const timers = new Set<ReturnType<typeof setTimeout>>();
		const onContextMenu = (e: MouseEvent) => {
			if (
				isClassicyWhatsThisActive() ||
				!(e.target instanceof Element) ||
				whatsThisEvents.has(e)
			)
				return;
			const inWindow = e.target.closest(".classicyWindow");
			const anchor =
				inWindow && e.target.closest(".classicyDesktop")
					? findClassicyHelpAnchor(e.target, inWindow)
					: null;
			if (!anchor) return;
			// One provider answers an event, whichever desktop it serves.
			whatsThisEvents.add(e);
			const requests = contextMenuRequests;
			const at: [number, number] = [e.clientX, e.clientY];
			const timer = setTimeout(() => {
				timers.delete(timer);
				if (contextMenuRequests !== requests || !anchor.isConnected) return;
				showContextMenuRef.current(
					[
						{
							id: WHATS_THIS_ITEM_ID,
							title: "What's This?",
							accessKey: whatsThisKeyRef.current,
							onClickFunc: () => showClassicyContextHelp(anchor, at),
						},
					],
					at,
					{ helpItem: false },
				);
			}, 0);
			timers.add(timer);
		};
		window.addEventListener("contextmenu", onContextMenu, true);
		return () => {
			window.removeEventListener("contextmenu", onContextMenu, true);
			for (const timer of timers) clearTimeout(timer);
		};
	}, [contextHelp]);

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
			<ClassicyWhatsThisPopup />
		</ClassicyContextualMenuContext.Provider>
	);
};

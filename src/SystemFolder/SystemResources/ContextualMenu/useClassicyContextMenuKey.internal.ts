import { useEffect } from "react";

/**
 * How long after a context-menu key the browser's own `contextmenu` for it
 * may still arrive (Chrome on Windows fires it on the Menu key's keyup).
 */
const NATIVE_MENU_WINDOW_MS = 500;

/** Shift+F10, or the Application (Menu) key alone (WIG Ch.7 "Pop-up Menu Interaction" (p.101)). */
const isContextMenuKey = (e: KeyboardEvent): boolean =>
	!e.ctrlKey &&
	!e.altKey &&
	!e.metaKey &&
	((e.key === "ContextMenu" && !e.shiftKey) || (e.key === "F10" && e.shiftKey));

/**
 * Where a menu the keyboard opens for `el` goes: the center of the part of
 * it that shows in the viewport, as Windows places an edit control's
 * keyboard pop-up menu ("Windows places the menu at the edit's center in
 * this case", Wine's `edit.c`), whole pixels.
 * @internal
 */
export const classicyContextMenuKeyPoint = (el: Element): [number, number] => {
	const rect = el.getBoundingClientRect();
	const left = Math.max(rect.left, 0);
	const top = Math.max(rect.top, 0);
	const right = Math.min(rect.right, window.innerWidth || rect.right);
	const bottom = Math.min(rect.bottom, window.innerHeight || rect.bottom);
	if (right <= left || bottom <= top)
		return [Math.round(rect.left), Math.round(rect.top)];
	return [Math.round((left + right) / 2), Math.round((top + bottom) / 2)];
};

// A file view's item and the selected look it carries: the icon view's
// `.classicyIcon.selected`, the list view's selected row around its name
// cell's container (`ClassicyFileBrowser`'s views).
const FILE_ITEM = "[data-classicy-file-path]";
const isSelectedFileItem = (el: Element): boolean =>
	el.classList.contains("selected") ||
	el.closest("tr")?.classList.contains("selected") === true;

/**
 * The element whose `contextmenu` stands for the focused selection, when
 * the keyboard opens a menu from `from` (WIG Ch.4 "Shortcut Keys" (p.28),
 * Appendix B Tables B.2 and B.3: Shift+F10 and the Application key display
 * "the pop-up menu for the selected item"): in a file view
 * (`.classicyFileBrowserFill`), the focused item when it is selected, else
 * the view's first selected item (icons or rows, in the view's order); on
 * the desktop (its root, or a desktop icon outside any window), the
 * focused icon when it is selected, else the desktop's first selected icon.
 * `null` when nothing there is selected, so the key falls back to the
 * element itself (the white space's menu), and for a text field, whose
 * own menu it opens.
 * @internal
 */
export const classicyContextMenuKeySelectionTarget = (
	from: Element,
	desktop: Element | null,
): Element | null => {
	// A text field (an icon's rename field included) opens its own menu.
	if (from.closest("input, textarea, [contenteditable='true']")) return null;
	const view = from.closest(".classicyFileBrowserFill");
	if (view) {
		const own = from.closest(FILE_ITEM);
		if (own && view.contains(own) && isSelectedFileItem(own)) return own;
		for (const item of view.querySelectorAll(FILE_ITEM))
			if (isSelectedFileItem(item)) return item;
		return null;
	}
	if (!desktop) return null;
	const ownIcon = from.closest(".classicyDesktopIcon");
	const onDesktop =
		from === desktop ||
		(ownIcon !== null &&
			desktop.contains(ownIcon) &&
			ownIcon.closest(".classicyWindow") === null);
	if (!onDesktop) return null;
	if (ownIcon?.classList.contains("selected")) return ownIcon;
	for (const icon of desktop.querySelectorAll(".classicyDesktopIcon.selected"))
		if (icon.closest(".classicyWindow") === null) return icon;
	return null;
};

/**
 * The part of a selected item that stands for its icon, LVIR_ICON: a file
 * view's or desktop icon's image (its mask pair, else its `<img>`), a list
 * row's small icon; the item itself when it has none.
 */
const ITEM_ICON =
	".classicyIconMaskOuter, .classicyDesktopIconMaskOuter, .classicyFileBrowserViewTableRowIcon, img";

/**
 * Where a menu the keyboard opens for a selected item goes: the center of
 * the item's icon, as Explorer's view places it (Windows as shipped, over
 * the 1995 text's silence: ReactOS's `CDefView::OnContextMenu`, which follows
 * it, takes the focused selected item, else the first selected one, and
 * opens at the center of its LVIR_ICON rectangle; the audit's review
 * corrected L4-H2's lower left), kept in the viewport, whole pixels.
 * @internal
 */
export const classicyContextMenuKeyItemPoint = (
	el: Element,
): [number, number] => {
	const rect = (el.querySelector(ITEM_ICON) ?? el).getBoundingClientRect();
	const width = window.innerWidth || rect.right;
	const height = window.innerHeight || rect.bottom;
	const x = Math.min(
		Math.max((rect.left + rect.right) / 2, 0),
		Math.max(width - 1, 0),
	);
	const y = Math.min(
		Math.max((rect.top + rect.bottom) / 2, 0),
		Math.max(height - 1, 0),
	);
	return [Math.round(x), Math.round(y)];
};

/**
 * Whether a `contextmenu` event came from the keyboard: no pointer position
 * (both coordinates 0) and no button (`button` 0, or `detail` 0), as
 * browsers send the one the Application key raises when the page did not
 * see the key itself.
 * @internal
 */
export const isClassicyKeyboardContextMenuEvent = (e: MouseEvent): boolean =>
	e.clientX === 0 && e.clientY === 0 && (e.button === 0 || e.detail === 0);

/**
 * A keyboard-raised `contextmenu` (`isClassicyKeyboardContextMenuEvent`)
 * inside the desktop is taken (`preventDefault`, no other listener sees
 * it) and `open` sends the key's own event to the focused selection
 * instead. Returns whether it took the event; a pointer's event, or one
 * outside the desktop, is left alone.
 * @internal
 */
export const classicyRedirectKeyboardContextMenu = (
	e: MouseEvent,
	open: () => boolean,
	desktop: Element | null,
): boolean => {
	if (!isClassicyKeyboardContextMenuEvent(e)) return false;
	const target = e.target instanceof Element ? e.target : null;
	if (!target || (desktop && !desktop.contains(target))) return false;
	e.preventDefault();
	e.stopImmediatePropagation();
	open();
	return true;
};

/**
 * Shift+F10 and the Application key open the contextual menu of the
 * selection (WIG Ch.7 "Pop-up Menu Interaction" (p.101)), for every target
 * a right-click reaches: the focused element gets a `contextmenu` event of
 * its own, so a `ClassicyContextualMenuTarget`, a window's `contextMenu`, a
 * desktop icon's and the desktop's resolve it innermost first, as they do a
 * click, at the center of the focused element (`classicyContextMenuKeyPoint`).
 * Focus on nothing in particular (the page, or the desktop itself, which a
 * click inside a window focuses) sends it to where the pointer last went
 * down inside the desktop, at that point, else to the desktop. Keys outside
 * the desktop (`#classicyDesktop`), a key a handler already took
 * (`defaultPrevented`) and auto-repeats are left alone; the browser's own
 * `contextmenu` for the key, which some browsers also fire, is swallowed.
 * The menu is the focused selection's
 * (`classicyContextMenuKeySelectionTarget`): in a file view the selected
 * item's (`itemContextMenu`), on the desktop the selected icon's, at the
 * center of the item's icon (`classicyContextMenuKeyItemPoint`). A
 * `contextmenu` the browser raises with no pointer position
 * (`isClassicyKeyboardContextMenuEvent`: the key reached the page as that
 * event alone) is taken back and sent the same way. A text field's opens
 * at its center, as Windows' edit control places it.
 * Only while `enabled` (the package's `layout.keyboard.contextMenuKey`:
 * Windows'; Mac OS 8's and System 7's contextual menus open from a
 * Control-click alone, HIGOS8 "Contextual Menus" (p.93), so neither key is
 * taken there). Mounted by `ClassicyContextualMenuProvider`.
 * @internal
 */
export const useClassicyContextMenuKey = (enabled: boolean): void => {
	useEffect(() => {
		if (
			!enabled ||
			typeof document === "undefined" ||
			typeof window === "undefined"
		)
			return;
		let lastPress: { target: Element; x: number; y: number } | null = null;
		let swallowNativeUntil = 0;
		const desktopOf = () => document.getElementById("classicyDesktop");

		const onMouseDown = (e: MouseEvent) => {
			if (e.target instanceof Element)
				lastPress = { target: e.target, x: e.clientX, y: e.clientY };
		};
		// Where the key's menu goes: the focused element, else where the
		// pointer last went down, else the desktop; then the selection there.
		const openForFocus = (): boolean => {
			const desktop = desktopOf();
			const inScope = (node: Node | null): node is Element =>
				node instanceof Element && (desktop ? desktop.contains(node) : true);
			let target: Element | null = document.activeElement;
			let at: [number, number] | null = null;
			if (!target || target === document.body || target === desktop) {
				const pressedInWindow =
					lastPress?.target.isConnected &&
					inScope(lastPress.target) &&
					lastPress.target.closest(".classicyWindow") !== null;
				const desktopSelection =
					desktop && !pressedInWindow
						? classicyContextMenuKeySelectionTarget(desktop, desktop)
						: null;
				if (desktopSelection) {
					target = desktopSelection;
				} else if (lastPress?.target.isConnected && inScope(lastPress.target)) {
					target = lastPress.target;
					at = [lastPress.x, lastPress.y];
				} else {
					target = desktop;
				}
			}
			if (!inScope(target)) return false;
			const selected = classicyContextMenuKeySelectionTarget(target, desktop);
			if (selected) {
				target = selected;
				at = classicyContextMenuKeyItemPoint(selected);
			}
			const [clientX, clientY] = at ?? classicyContextMenuKeyPoint(target);
			const event = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				composed: true,
				clientX,
				clientY,
				button: 2,
			});
			target.dispatchEvent(event);
			return true;
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.repeat || !isContextMenuKey(e)) return;
			if (!openForFocus()) return;
			e.preventDefault();
			swallowNativeUntil = Date.now() + NATIVE_MENU_WINDOW_MS;
		};
		// The Menu key's keyup is where Chrome on Windows would open its own.
		const onKeyUp = (e: KeyboardEvent) => {
			if (
				Date.now() < swallowNativeUntil &&
				(e.key === "ContextMenu" || e.key === "F10")
			) {
				e.preventDefault();
				swallowNativeUntil = Date.now() + NATIVE_MENU_WINDOW_MS;
			}
		};
		const onContextMenu = (e: MouseEvent) => {
			if (!e.isTrusted) return;
			if (Date.now() < swallowNativeUntil) {
				swallowNativeUntil = 0;
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}
			// The key reached the page only as its menu event: send it to
			// the focused selection, as the key would have been.
			classicyRedirectKeyboardContextMenu(e, openForFocus, desktopOf());
		};

		document.addEventListener("mousedown", onMouseDown, true);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("contextmenu", onContextMenu, true);
		return () => {
			document.removeEventListener("mousedown", onMouseDown, true);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("contextmenu", onContextMenu, true);
		};
	}, [enabled]);
};

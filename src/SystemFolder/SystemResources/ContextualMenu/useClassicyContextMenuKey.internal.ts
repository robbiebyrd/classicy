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
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.repeat || !isContextMenuKey(e)) return;
			const desktop = desktopOf();
			const inScope = (node: Node | null): node is Element =>
				node instanceof Element && (desktop ? desktop.contains(node) : true);
			let target: Element | null = document.activeElement;
			let at: [number, number] | null = null;
			if (!target || target === document.body || target === desktop) {
				if (lastPress?.target.isConnected && inScope(lastPress.target)) {
					target = lastPress.target;
					at = [lastPress.x, lastPress.y];
				} else {
					target = desktop;
				}
			}
			if (!inScope(target)) return;
			e.preventDefault();
			swallowNativeUntil = Date.now() + NATIVE_MENU_WINDOW_MS;
			const [clientX, clientY] = at ?? classicyContextMenuKeyPoint(target);
			target.dispatchEvent(
				new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
					composed: true,
					clientX,
					clientY,
					button: 2,
				}),
			);
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
			if (!e.isTrusted || Date.now() >= swallowNativeUntil) return;
			swallowNativeUntil = 0;
			e.preventDefault();
			e.stopImmediatePropagation();
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

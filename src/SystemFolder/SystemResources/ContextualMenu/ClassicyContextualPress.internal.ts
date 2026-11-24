/**
 * The contextual-menu click on the desktop and in a file browser (story
 * 0228-e9l). HIGOS8 p.93: "Pressing the Control key while clicking on an item
 * displays a pop-up menu … (The contextual menu may also be invoked by
 * clicking on an item with the right button on a two-button mouse.)" So a
 * Control-press and a right-press are one gesture, and the Mac OS 8.1 Finder
 * (Infinite Mac) takes it as follows: on empty space it deselects; on an
 * unselected item it selects that item alone, and on a selected one it keeps
 * the selection; the item's (or the window's) menu opens at the press; the
 * press never drags the item or a selection rectangle (moving the pointer
 * tracks the menu); and no click follows it.
 *
 * A macOS browser turns a Control-click into a `contextmenu` itself; a
 * browser elsewhere sends only the press, with Control held, and the click
 * after it. `openClassicyControlPressContextMenu` makes the two alike.
 */

/** Any press that opens a contextual menu: a right-press or a Control-press. */
export const isClassicyContextualPress = (e: {
	button: number;
	ctrlKey: boolean;
}): boolean => e.button === 2 || (e.button === 0 && e.ctrlKey);

/** The primary button pressed with Control held. */
export const isClassicyControlPress = (e: {
	button: number;
	ctrlKey: boolean;
}): boolean => e.button === 0 && e.ctrlKey;

/**
 * Swallows the click (and the double-click) ending the press under way, in
 * the capture phase, before any handler sees it. Only the gesture's own: a
 * click with no press behind it (`detail` 0: the keyboard's Space or Enter,
 * a script's `click()`) passes, and the swallow ends a task after the first
 * click it takes (a double-click's `dblclick` follows its click in the same
 * task), or at the next press, whichever comes first. Call it during the
 * press's own `mousedown`.
 */
export const swallowClassicyPressClick = (): void => {
	let ending: ReturnType<typeof setTimeout> | null = null;
	const stop = () => {
		if (ending !== null) clearTimeout(ending);
		document.removeEventListener("click", swallow, true);
		document.removeEventListener("dblclick", swallow, true);
		document.removeEventListener("mousedown", stop, true);
	};
	const swallow = (e: MouseEvent) => {
		if (e.detail === 0) return;
		e.stopPropagation();
		if (ending === null) ending = setTimeout(stop, 0);
	};
	document.addEventListener("click", swallow, true);
	document.addEventListener("dblclick", swallow, true);
	// Added during the press's own mousedown, so its capture phase has
	// passed: the next press ends it.
	document.addEventListener("mousedown", stop, true);
};

/**
 * A Control-press taken as the contextual-menu click: the menu under the
 * pointer, and no click after it. A macOS browser fires `contextmenu` for the
 * press itself; elsewhere none comes, so one is sent from the press's target
 * once the press's own task has passed without one, as a right-press would
 * send it, and the click the browser sends at the release is swallowed
 * (`swallowClassicyPressClick`). The caller applies the selection rule and
 * starts no drag. Call it during the press's own `mousedown`.
 */
export const openClassicyControlPressContextMenu = (
	press: MouseEvent,
): void => {
	const target = press.target;
	if (!(target instanceof Element)) return;
	swallowClassicyPressClick();
	let native = false;
	const heard = () => {
		native = true;
	};
	document.addEventListener("contextmenu", heard, true);
	setTimeout(() => {
		document.removeEventListener("contextmenu", heard, true);
		if (native || !target.isConnected) return;
		target.dispatchEvent(
			new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: press.clientX,
				clientY: press.clientY,
				ctrlKey: true,
				button: 2,
				buttons: 0,
			}),
		);
	}, 0);
};

/** The palette window's root class (`ClassicyWindow`'s `className`). */
export const CLASSICY_APP_SWITCHER_PALETTE_CLASS =
	"classicyApplicationSwitcherPalette";

/** Whether `node` is inside the Application Switcher's palette. */
export const isInClassicyAppSwitcherPalette = (
	node: EventTarget | null,
): boolean =>
	node instanceof Element &&
	node.closest(`.${CLASSICY_APP_SWITCHER_PALETTE_CLASS}`) !== null;

/**
 * Hands the keyboard to `appId`, the application a switch has just brought
 * to the front, as Mac OS 8.5's palette and Command-Tab did: the element
 * with DOM focus gives it up unless it is inside one of that application's
 * own windows (DOM id `${appId}_…`). So a text field or control of the
 * application left behind, or a palette button pressed from the keyboard,
 * never takes the next keys (Enter and Space included: an application
 * leaves those to a control of another window,
 * `isActivationKeyAimedAtOtherWindowControl`). The Application menu needs
 * none of this, since the press that opens it moves the focus to the body.
 * Neither a palette switch nor a chord has a press there, so both call
 * this.
 */
export const releaseClassicyAppSwitcherKeyboardTo = (appId: string): void => {
	if (typeof document === "undefined") return;
	const active = document.activeElement;
	if (!(active instanceof HTMLElement) || active === document.body) return;
	const win = active.closest(".classicyWindow");
	if (
		win &&
		!isInClassicyAppSwitcherPalette(win) &&
		win.id.startsWith(`${appId}_`)
	)
		return;
	active.blur();
};

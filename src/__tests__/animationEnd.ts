import { act } from "@testing-library/react";

/** The menu item flash's keyframes (Platinum's `_Menu.scss`). */
export const MENU_ITEM_FLASH_KEYFRAMES = "classicyMenuItemFlashKeyframes";

/**
 * Ends a CSS animation on `el` the way React hears it under jsdom.
 *
 * jsdom has no `AnimationEvent` global, so React falls back to its legacy
 * vendor-prefix detection and registers `onAnimationEnd` as
 * "webkitAnimationEnd" rather than "animationend" (jsdom's style object does
 * expose `WebkitAnimation`, so the prefixed branch wins). `fireEvent.animationEnd`
 * therefore never reaches the handler, and a test that relies on it passes
 * only through whatever fallback the component has. This dispatches the real,
 * bubbling event React listens for, with `animationName` set, as a browser
 * would. `ClassicyMenu` runs a leaf item's action once its flash ends, so
 * menu tests complete the flash with it (the default `animationName`).
 */
export function dispatchAnimationEnd(
	el: Element | null,
	animationName: string = MENU_ITEM_FLASH_KEYFRAMES,
): void {
	if (!el) throw new Error("dispatchAnimationEnd: no element to dispatch on");
	const event = new Event("webkitAnimationEnd", {
		bubbles: true,
		cancelable: true,
	});
	Object.defineProperty(event, "animationName", { value: animationName });
	act(() => {
		el.dispatchEvent(event);
	});
}

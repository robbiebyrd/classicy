/**
 * When a modal dialog opens in the background under the Windows 95/98 shell
 * (plan 0020-w98 E3, the shell addendum's B17): WIG Ch.10 "Message
 * Notification" (p.212, Figure 10.3) has an application that is not active
 * flash its taskbar button rather than take the foreground, and Windows 98
 * enforces it (its foreground lock: a `SetForegroundWindow` from a process
 * that did not receive the last input flashes the caller's taskbar button,
 * `ForegroundFlashCount` times, instead). Classicy's analog of "the last
 * input" is the page's transient user activation: a dialog an inactive app
 * opens within the browser's activation window after a click or key press
 * (a Start menu item, a taskbar menu, a tray icon) is the user's doing and
 * opens focused as always; one opened later, by a timer or a network reply,
 * opens without taking focus while its app's button flashes.
 *
 * Internal: `ClassicyWindow` reads it once, as the modal mounts, and sends
 * the answer as `ClassicyWindowOpen`'s `window.background`; the reducer
 * checks the rest (the shell, a button to flash).
 * @internal
 */

/**
 * Whether the user is interacting with the page now: the browser's
 * transient user activation (`navigator.userActivation.isActive`). Where
 * the browser has no User Activation API (Safari before 16.4, jsdom) every
 * moment counts as the user's, so a dialog opens focused as it always has.
 */
export const classicyUserIsActive = (): boolean => {
	if (typeof navigator === "undefined") return true;
	const activation = (navigator as { userActivation?: { isActive?: unknown } })
		.userActivation;
	return typeof activation?.isActive === "boolean" ? activation.isActive : true;
};

/**
 * Whether a window opening now asks to open in the background: a modal, under
 * a package with a taskbar, of an app that is not the focused one, while the
 * user is not interacting with the page (`userActive`). Pure.
 */
export function classicyModalOpensInBackground({
	modal,
	hasTaskbar,
	appFocused,
	userActive,
}: {
	modal: boolean;
	hasTaskbar: boolean;
	/** The window's app is the focused one (its record's `focused`). */
	appFocused: boolean;
	userActive: boolean;
}): boolean {
	return modal && hasTaskbar && !appFocused && !userActive;
}

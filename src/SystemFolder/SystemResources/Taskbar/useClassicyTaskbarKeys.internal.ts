import { type RefObject, useEffect, useRef } from "react";

/**
 * The taskbar's key (plan 0020-w98 §2, "Keyboard"; WIG App. B, Table B.2,
 * p.358): CTRL+ESC, "Access Start button in taskbar", toggles the Start
 * menu. Internal: not exported from the package.
 */

/**
 * Whether `e` is CTRL+ESC: Escape with Control alone held. The WINDOWS key
 * (Table B.3, "Display Start button menu") is not bound: it is Command on a
 * Mac keyboard, which Classicy leaves to the browser, and Windows keeps it.
 */
export const isClassicyStartMenuKey = (
	e: Pick<
		KeyboardEvent,
		"altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code"
	>,
): boolean =>
	e.ctrlKey &&
	!e.altKey &&
	!e.metaKey &&
	!e.shiftKey &&
	(e.key === "Escape" || e.code === "Escape");

/**
 * Whether a modal dialog is open on the desktop `el` is in (its
 * `.classicyDesktop`, else the document): a modal window's scrim is drawn
 * there while it is open, and blocks the whole desktop, the taskbar
 * included. A hidden app's scrim (`display: none`, the Application menu's
 * Hide commands) blocks nothing.
 */
export const classicyDesktopHasOpenModal = (el: Element | null): boolean => {
	const scope: ParentNode | null =
		el?.closest(".classicyDesktop") ?? el?.ownerDocument ?? null;
	if (!scope) return false;
	return Array.from(
		scope.querySelectorAll<HTMLElement>(".classicyWindowModalScrim"),
	).some((scrim) => scrim.style.display !== "none");
};

/**
 * Binds CTRL+ESC on the document while the taskbar at `rootRef` is mounted:
 * it opens the Start menu (`open`) when it is closed and no modal dialog is
 * open on the taskbar's desktop (`classicyDesktopHasOpenModal`, which
 * blocks the taskbar as it blocks the desktop), and closes it (`close`)
 * when it is open, preventing the key's default either way. A held key's
 * repeats do nothing more (nor reach the open menu's own Escape, which
 * would close it). An event another listener has already handled
 * (`defaultPrevented`) is left alone. On a Windows host the system takes
 * CTRL+ESC before the page sees it; elsewhere it reaches the page.
 */
export function useClassicyTaskbarKeys(
	rootRef: RefObject<HTMLElement | null>,
	isOpen: boolean,
	open: () => void,
	close: () => void,
): void {
	// Read when the key arrives, so the listener is bound once.
	const latest = useRef({ isOpen, open, close });
	latest.current = { isOpen, open, close };
	useEffect(() => {
		if (typeof document === "undefined") return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || !isClassicyStartMenuKey(e)) return;
			const { isOpen: menuOpen, open: show, close: hide } = latest.current;
			if (menuOpen) {
				e.preventDefault();
				// A repeat must not reach the menu's own Escape either (it
				// would close the menu the press opened). Bound before the
				// menu opened, this listener runs first.
				if (e.repeat) e.stopImmediatePropagation();
				else hide();
				return;
			}
			if (classicyDesktopHasOpenModal(rootRef.current)) return;
			e.preventDefault();
			if (!e.repeat) show();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [rootRef]);
}

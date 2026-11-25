import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * HIG "Sticky Menus" (Ch. 4): an open menu stays open with nothing held, but
 * auto-closes after ~15 seconds of inactivity. The idle timer is (re)started
 * whenever the menu becomes active and reset on any hover/keyboard activity
 * (`pokeActivity`).
 */
export const CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS = 15000;

/**
 * The time an open menu waits, untouched, before it closes itself, in
 * milliseconds: the active Appearance Package's `layout.menuBar.idleTimeoutMs`
 * (`0`: never, as Windows keeps a menu until the next click, WIG Ch.7
 * "Drop-down Menu Interaction" (p.97)), else
 * `CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS`, Mac OS 8's fifteen seconds
 * (HIGOS8 "Sticky Menus", p.92). Re-renders when the package changes. Every
 * `ClassicyMenuProvider` given no `idleTimeoutMs` of its own reads it, so a
 * bar that mounts one needs no prop; a host that passes its own provider an
 * `idleTimeoutMs` can read the package's value here.
 */
export const useClassicyMenuIdleTimeout = (): number =>
	useClassicyAppearanceLayout().menuBar.idleTimeoutMs ??
	CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS;

/**
 * Open/close state for a tree of `ClassicyMenu`s: which submenu is open,
 * whether the menu is active (so hovering opens sibling menus), and HIG sticky
 * menus — an open menu auto-closes after `idleTimeoutMs` of inactivity.
 * `ClassicyDesktopMenuBar` and `ClassicyContextualMenu` each mount one; wrap a
 * standalone `ClassicyMenu` in one.
 */
export const ClassicyMenuProvider: FunctionalComponent<{
	/** The menus that share this state. */
	children: ReactNode;
	/** Called whenever the menus close (a selection, `closeAll`, or the idle timeout). */
	onClose?: () => void;
	/**
	 * Milliseconds of inactivity before an open menu auto-closes. 0 disables.
	 * Defaults to the active Appearance Package's `layout.menuBar.idleTimeoutMs`,
	 * else `15000` (`useClassicyMenuIdleTimeout`).
	 */
	idleTimeoutMs?: number;
	/**
	 * Treat the menu as already open on mount (contextual menus are shown
	 * immediately rather than via a menu-bar click). Defaults to `false`.
	 * Its root `ClassicyMenu` is then a vertical menu to the keyboard, where
	 * one under a provider without it is a menu bar.
	 */
	startActive?: boolean;
}> = ({
	children,
	onClose,
	idleTimeoutMs: idleTimeoutProp,
	startActive = false,
}) => {
	const packageIdleTimeout = useClassicyMenuIdleTimeout();
	const idleTimeoutMs = idleTimeoutProp ?? packageIdleTimeout;
	const [closeSignal, setCloseSignal] = useState(0);
	const [menuBarActive, setMenuBarActive] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearIdleTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const closeAll = useCallback(() => {
		clearIdleTimer();
		setCloseSignal((s) => s + 1);
		setMenuBarActive(false);
		onClose?.();
	}, [onClose, clearIdleTimer]);

	const activateMenuBar = useCallback(() => {
		setMenuBarActive(true);
	}, []);

	const isOpen = menuBarActive || startActive;

	const startIdleTimer = useCallback(() => {
		clearIdleTimer();
		if (!isOpen || idleTimeoutMs <= 0) return;
		timerRef.current = setTimeout(() => {
			closeAll();
		}, idleTimeoutMs);
	}, [isOpen, idleTimeoutMs, clearIdleTimer, closeAll]);

	// (Re)start the idle timer whenever the menu opens; clear it when it closes.
	useEffect(() => {
		startIdleTimer();
		return clearIdleTimer;
	}, [startIdleTimer, clearIdleTimer]);

	const pokeActivity = useCallback(() => {
		if (!isOpen || idleTimeoutMs <= 0) return;
		startIdleTimer();
	}, [isOpen, idleTimeoutMs, startIdleTimer]);

	return (
		<ClassicyMenuContext.Provider
			value={{
				closeSignal,
				closeAll,
				menuBarActive,
				activateMenuBar,
				pokeActivity,
				popup: startActive,
			}}
		>
			{children}
		</ClassicyMenuContext.Provider>
	);
};

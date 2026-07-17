import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * HIG "Sticky Menus" (Ch. 4): an open menu stays open with nothing held, but
 * auto-closes after ~15 seconds of inactivity. The idle timer is (re)started
 * whenever the menu becomes active and reset on any hover/keyboard activity
 * (`pokeActivity`).
 */
const DEFAULT_IDLE_TIMEOUT_MS = 15000;

export const ClassicyMenuProvider: FunctionalComponent<{
	children: ReactNode;
	onClose?: () => void;
	/** Milliseconds of inactivity before an open menu auto-closes. 0 disables. */
	idleTimeoutMs?: number;
	/**
	 * Treat the menu as already open on mount (contextual menus are shown
	 * immediately rather than via a menu-bar click).
	 */
	startActive?: boolean;
}> = ({
	children,
	onClose,
	idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
	startActive = false,
}) => {
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
			}}
		>
			{children}
		</ClassicyMenuContext.Provider>
	);
};

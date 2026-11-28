import { createContext } from "react";

export interface ClassicyMenuContextValue {
	closeSignal: number;
	closeAll: () => void;
	menuBarActive: boolean;
	activateMenuBar: () => void;
	/**
	 * Reset the sticky-menu idle auto-close timer. Called by menu items on
	 * hover/keyboard activity so an in-use menu never times out.
	 */
	pokeActivity: () => void;
	/**
	 * The provider was mounted `startActive`: its menu is a pop-up shown as
	 * it mounts (a contextual menu, a pop-up bevel button's), not a menu
	 * bar whose titles a press opens. Its root list is a vertical menu to
	 * the keyboard (`ClassicyMenu`'s `orientation`). Optional, so a host's
	 * own context value still type-checks; absent reads as `false`.
	 */
	popup?: boolean;
}

export const ClassicyMenuContext = createContext<ClassicyMenuContextValue>({
	closeSignal: 0,
	closeAll: () => {},
	menuBarActive: false,
	activateMenuBar: () => {},
	pokeActivity: () => {},
	popup: false,
});

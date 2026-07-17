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
}

export const ClassicyMenuContext = createContext<ClassicyMenuContextValue>({
	closeSignal: 0,
	closeAll: () => {},
	menuBarActive: false,
	activateMenuBar: () => {},
	pokeActivity: () => {},
});

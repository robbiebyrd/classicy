import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The Finder's File ▸ Find… (Mac OS 8.1's ⌘F, ⌥F in Classicy, whose
 * browser keeps ⌘): launches Find File, or brings its Find window to the
 * front. On every Finder File menu, the desktop's included.
 */
export const classicyFinderFindMenuItem = (
	idPrefix: string,
	dispatch: (action: ActionMessage) => void,
): ClassicyMenuItem => ({
	id: `${idPrefix}_file_find`,
	title: "Find…",
	keyboardShortcut: "⌥F",
	onClickFunc: () => dispatch({ type: "ClassicyAppFindFileShowFind" }),
});

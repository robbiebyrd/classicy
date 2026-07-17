import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import {
	classicyEditCommands,
	ensureEditTracker,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Menu-triggered window closes bypass ClassicyWindow's own close box, which
 * normally dispatches ClassicyWindowClose itself before calling onCloseFunc.
 * This hook packages both steps together for use from a menu item.
 */
export function useClassicyWindowClose(
	appId: string,
): (windowId: string, appCleanupAction: ActionMessage) => void {
	const dispatch = useAppManagerDispatch();
	return useCallback(
		(windowId: string, appCleanupAction: ActionMessage) => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: appId },
				window: { id: windowId },
			});
			dispatch(appCleanupAction);
		},
		[dispatch, appId],
	);
}

export type ClassicyAboutMenu = {
	aboutMenuItem: ClassicyMenuItem;
	aboutWindow: ReactNode;
};

/**
 * Bundles the showAbout state + About menu item + About window that every
 * app previously hand-rolled (Finder, Sound Manager, Appearance Manager,
 * Date & Time Manager all duplicated this exact pattern).
 */
export function useClassicyAboutMenu(
	appId: string,
	appName: string,
	appIcon: string,
): ClassicyAboutMenu {
	const [showAbout, setShowAbout] = useState(false);

	const aboutMenuItem: ClassicyMenuItem = {
		id: `${appId}_about`,
		title: "About",
		onClickFunc: () => setShowAbout(true),
	};

	const aboutWindow = showAbout ? (
		<ClassicyAboutWindow
			appId={appId}
			appName={appName}
			appIcon={appIcon}
			hideFunc={() => setShowAbout(false)}
		/>
	) : null;

	return { aboutMenuItem, aboutWindow };
}

/**
 * Builds a standard HIG Edit menu (Undo / Cut / Copy / Paste / Clear / Select
 * All) whose commands act on the last-focused text field. Keyboard equivalents
 * are handled natively by the browser in the focused field (the items are
 * flagged `nativeShortcut`), so their glyphs render but the app-wide dispatcher
 * leaves the keystrokes to the browser; the click handlers drive the same
 * actions for mouse users.
 */
export function useClassicyEditMenu(idPrefix: string): ClassicyMenuItem {
	useEffect(() => {
		ensureEditTracker();
	}, []);

	return useMemo(
		() => ({
			id: `${idPrefix}_edit`,
			title: "Edit",
			menuChildren: [
				{
					id: `${idPrefix}_undo`,
					title: "Undo",
					keyboardShortcut: "⌘Z",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.undo,
				},
				{ id: "spacer" },
				{
					id: `${idPrefix}_cut`,
					title: "Cut",
					keyboardShortcut: "⌘X",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.cut,
				},
				{
					id: `${idPrefix}_copy`,
					title: "Copy",
					keyboardShortcut: "⌘C",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.copy,
				},
				{
					id: `${idPrefix}_paste`,
					title: "Paste",
					keyboardShortcut: "⌘V",
					nativeShortcut: true,
					onClickFunc: () => {
						void classicyEditCommands.paste();
					},
				},
				{
					id: `${idPrefix}_clear`,
					title: "Clear",
					onClickFunc: classicyEditCommands.clear,
				},
				{
					id: `${idPrefix}_select_all`,
					title: "Select All",
					keyboardShortcut: "⌘A",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.selectAll,
				},
			],
		}),
		[idPrefix],
	);
}

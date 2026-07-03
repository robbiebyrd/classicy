import { type ReactNode, useCallback, useState } from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
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

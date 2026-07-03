import { useCallback } from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

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

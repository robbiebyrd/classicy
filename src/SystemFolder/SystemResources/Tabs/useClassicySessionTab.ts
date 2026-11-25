import { useCallback, useState } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * A tab strip that reopens, for the rest of the session, on the tab it last
 * showed: the props to spread on `ClassicyTabs`. The strip's last tab is
 * kept in the app's session places (`apps[appId].session.tabs[key]`, never
 * persisted, kept when the app quits), so a control panel closed and opened
 * again shows the page it was left on, as the WIG asks of a secondary window
 * ("Interaction with Other Windows", p.146: "the last tabbed page") and HIG7
 * of every window (p.146: open it in the state it was last in).
 *
 * ```tsx
 * <ClassicyTabs tabs={tabs} {...useClassicySessionTab(APP_ID, "main")} />
 * ```
 */
export const useClassicySessionTab = (
	appId: string,
	key: string,
): { defaultTab: number; onTabChange: (index: number) => void } => {
	const dispatch = useAppManagerDispatch();
	// Read once, on mount: the strip keeps its tab itself from then on.
	const [defaultTab] = useState(() => {
		const tabs =
			useAppManager.getState().System.Manager.Applications.apps[appId]?.session
				?.tabs;
		return tabs && Object.hasOwn(tabs, key) ? tabs[key] : 0;
	});
	const onTabChange = useCallback(
		(index: number) =>
			dispatch({
				type: "ClassicyAppRememberTab",
				app: { id: appId },
				tabs: key,
				index,
			}),
		[dispatch, appId, key],
	);
	return { defaultTab, onTabChange };
};

import "./FinderPreferences.scss";
import type { FC as FunctionalComponent } from "react";
import { useMemo } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	FINDER_PREFERENCES_WINDOW_ID,
	type FinderData,
	resolveStandardViews,
} from "@/SystemFolder/Finder/FinderContext";
import { useFinderViewsTab } from "@/SystemFolder/Finder/useFinderViewsTab";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appId = "Finder.app";
const helpIcon = ClassicyIcons.system.help;

export const FinderPreferences: FunctionalComponent = () => {
	const dispatch = useAppManagerDispatch();
	const rawData = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId]?.data,
	);
	const standardViews = useMemo(
		() => resolveStandardViews((rawData ?? {}) as FinderData),
		[rawData],
	);
	const viewsTab = useFinderViewsTab(standardViews);
	const tabs = useMemo(() => [viewsTab], [viewsTab]);

	return (
		<ClassicyWindow
			id={FINDER_PREFERENCES_WINDOW_ID}
			appId={appId}
			title={"Preferences"}
			closable={true}
			resizable={false}
			zoomable={false}
			scrollable={false}
			collapsable={false}
			modal={false}
			initialSize={[470, 0]}
			initialPosition={["center", "center"]}
			onCloseFunc={() =>
				dispatch({ type: "ClassicyAppFinderPreferencesClose" })
			}
		>
			<div className={"finderPreferences"}>
				<ClassicyTabs tabs={tabs} />
				{/* Static, exactly as in the Mac OS 8 dialog: the badge marks the
				    note as explanatory help, it is not a control. Nothing here
				    opens Apple Guide, so it is deliberately not a button. */}
				<div className={"finderPreferencesFooter"}>
					<img
						className={"finderPreferencesHelpIcon"}
						src={helpIcon}
						alt={"Help"}
					/>
					<p className={"finderPreferencesNote"}>
						Changes are applied to all folders that are set to Standard views.
						Other folders are not affected.
					</p>
				</div>
			</div>
		</ClassicyWindow>
	);
};

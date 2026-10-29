import "./FinderPreferences.scss";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { useMemo } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
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
type FinderPreferencesProps = {
	/** Extra class names, forwarded to the `ClassicyWindow` root. */
	className?: string;
	/** Inline style, forwarded to the `ClassicyWindow` root. */
	style?: CSSProperties;
};

export const FinderPreferences: FunctionalComponent<FinderPreferencesProps> = ({
	className,
	style,
}) => {
	const helpIcon = useClassicyAsset("icons", "system.help") ?? "";
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
			className={className}
			style={style}
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

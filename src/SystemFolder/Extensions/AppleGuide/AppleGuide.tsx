import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_APP_NAME,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

/**
 * Apple Guide — the system help extension. Headless: it contributes no desktop
 * icon and no Apple-menu entry, and simply renders a window for each open help
 * topic. Importing this module registers the ClassicyAppAppleGuide reducer.
 */
export const AppleGuide: FunctionalComponent = () => {
	const rawData = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data,
	);
	const normalizedData = rawData ?? {};
	const data = isAppleGuideData(normalizedData) ? normalizedData : {};
	const openTopics = data.openTopics ?? [];

	return (
		<ClassicyApp
			id={APPLE_GUIDE_APP_ID}
			name={APPLE_GUIDE_APP_NAME}
			icon={ClassicyIcons.system.extensions.appleGuide}
			extension
		>
			{openTopics.map((topicId) => (
				<AppleGuideWindow key={topicId} topicId={topicId} />
			))}
		</ClassicyApp>
	);
};

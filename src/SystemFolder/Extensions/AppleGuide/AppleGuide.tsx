import type { FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_APP_NAME,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import { ClassicyHelpTopics } from "@/SystemFolder/Extensions/AppleGuide/ClassicyHelpTopics";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

/**
 * Apple Guide — the system help extension. Headless: it contributes no desktop
 * icon and no Apple-menu entry, and simply renders a window for each open help
 * topic, and, under a package whose layout says `help.topicWindow:
 * "winhelp"` (Windows 98), the Help Topics browser (`ClassicyHelpTopics`)
 * while it is open. Importing this module registers the ClassicyAppAppleGuide
 * reducer.
 */
export const AppleGuide: FunctionalComponent = () => {
	const appleGuideIcon =
		useClassicyAsset("icons", "system.extensions.appleGuide") ?? "";
	const rawData = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data,
	);
	const normalizedData = rawData ?? {};
	const data = isAppleGuideData(normalizedData) ? normalizedData : {};
	const openTopics = data.openTopics ?? [];
	const winhelp = useClassicyAppearanceLayout().help?.topicWindow === "winhelp";

	return (
		<ClassicyApp
			id={APPLE_GUIDE_APP_ID}
			name={APPLE_GUIDE_APP_NAME}
			icon={appleGuideIcon}
			extension
		>
			{openTopics.map((topicId) => (
				<AppleGuideWindow key={topicId} topicId={topicId} />
			))}
			{winhelp && data.helpTopicsOpen === true && <ClassicyHelpTopics />}
		</ClassicyApp>
	);
};

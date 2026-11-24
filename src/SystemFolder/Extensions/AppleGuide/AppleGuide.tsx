import type { FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_APP_NAME,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
// Registers the Keyboard Shortcuts topic the Help menu offers.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideKeyboardShortcuts";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { appleGuideWindowId } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

/**
 * Apple Guide — the system help extension. Headless: it contributes no desktop
 * icon and no Apple-menu entry, and simply renders a window for each open help
 * topic. Importing this module registers the ClassicyAppAppleGuide reducer.
 */
export const AppleGuide: FunctionalComponent = () => {
	const appleGuideIcon =
		useClassicyAsset("icons", "system.extensions.appleGuide") ?? "";
	const rawData = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data,
	);
	const normalizedData = rawData ?? {};
	const data = isAppleGuideData(normalizedData) ? normalizedData : {};
	const guideApp = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID],
	);
	// Rendered by recency (the window's `zOrder`, a window not yet registered
	// last): floating windows past the fourth share one z-index, where the DOM
	// order decides, so this keeps the most recent topic on top at any count.
	const recency = (id: string) =>
		getAppWindow(guideApp, appleGuideWindowId(id))?.zOrder ??
		Number.MAX_SAFE_INTEGER;
	const openTopics = [...(data.openTopics ?? [])].sort(
		(a, b) => recency(a) - recency(b),
	);

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
		</ClassicyApp>
	);
};

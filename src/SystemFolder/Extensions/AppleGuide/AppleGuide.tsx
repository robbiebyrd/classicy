import { type FC as FunctionalComponent, useEffect, useState } from "react";
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
	// Floating windows past the fourth share one z-index, where the DOM order
	// decides, so the topics are rendered by recency (the window's `zOrder`, a
	// window not yet registered last). The reorder is applied one task after a
	// raise: raising happens on mouseup, and moving a node between mouseup and
	// the click that follows makes Chromium drop that click, so a button
	// clicked in a lower topic would not activate. React restores the focus a
	// later move blurs (`restoreSelection` in its commit).
	const recency = (id: string) =>
		getAppWindow(guideApp, appleGuideWindowId(id))?.zOrder ??
		Number.MAX_SAFE_INTEGER;
	const open = data.openTopics ?? [];
	const byRecency = [...open].sort((a, b) => recency(a) - recency(b));
	const recencyKey = byRecency.join("|");
	const [domOrder, setDomOrder] = useState<string[]>(byRecency);
	// biome-ignore lint/correctness/useExhaustiveDependencies: recencyKey stands for byRecency
	useEffect(() => {
		const t = setTimeout(() => setDomOrder(byRecency), 0);
		return () => clearTimeout(t);
	}, [recencyKey]);
	// What is drawn now: the settled order for topics still open, then any
	// newly opened one, so a topic appears at once and a closed one goes at once.
	const openTopics = [
		...domOrder.filter((id) => open.includes(id)),
		...byRecency.filter((id) => !domOrder.includes(id)),
	];

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

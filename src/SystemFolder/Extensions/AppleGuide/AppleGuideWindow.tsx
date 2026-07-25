import "./AppleGuide.scss";
import type { FC as FunctionalComponent } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	appleGuideWindowId,
	getAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	ClassicyAssistant,
	type ClassicyAssistantPage,
} from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

type AppleGuideWindowProps = {
	topicId: string;
};

/**
 * One help topic, rendered as a ClassicyAssistant driven in controlled mode:
 * the page index lives in the AppManager store (the window is opened by a
 * dispatched event and its position in the topic survives a reload), so the
 * assistant renders the stored page and reports arrow clicks back as
 * `ClassicyAppAppleGuideSetPage`.
 */
export const AppleGuideWindow: FunctionalComponent<AppleGuideWindowProps> = ({
	topicId,
}) => {
	const dispatch = useAppManagerDispatch();
	const rawData = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data,
	);
	const topic = getAppleGuideTopic(topicId);

	const normalizedData = rawData ?? {};
	const data = isAppleGuideData(normalizedData) ? normalizedData : {};
	const page = data.pages?.[topicId] ?? 0;

	if (!topic) return null;

	const lastIndex = topic.pages.length - 1;
	// Apple Guide names the whole TOPIC, not each page: the header band reads
	// the same all the way through, unlike an assistant's per-step titles.
	// The end marker only closes out the final page.
	const assistantPages: ClassicyAssistantPage[] = topic.pages.map(
		(body, index) => ({
			title: topic.title,
			content: (
				<>
					{body}
					{index === lastIndex && <p className="appleGuideEnd">- End -</p>}
				</>
			),
		}),
	);

	return (
		<ClassicyWindow
			id={appleGuideWindowId(topicId)}
			appId={APPLE_GUIDE_APP_ID}
			hideIcon={true}
			closable={true}
			zoomable={true}
			collapsable={true}
			resizable={false}
			scrollable={false}
			initialSize={[700, 322]}
			initialPosition={["center", "center"]}
			onCloseFunc={() =>
				dispatch({
					type: "ClassicyAppAppleGuideCloseTopic",
					app: { id: APPLE_GUIDE_APP_ID },
					topicId,
				})
			}
		>
			<div className="appleGuideWindow">
				<ClassicyAssistant
					pages={assistantPages}
					page={page}
					onPageChange={(next) =>
						dispatch({
							type: "ClassicyAppAppleGuideSetPage",
							app: { id: APPLE_GUIDE_APP_ID },
							topicId,
							page: next,
						})
					}
				/>
			</div>
		</ClassicyWindow>
	);
};

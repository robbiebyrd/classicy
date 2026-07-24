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
import { AppleGuidePager } from "@/SystemFolder/Extensions/AppleGuide/AppleGuidePager";
import {
	appleGuideWindowId,
	getAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

type AppleGuideWindowProps = {
	topicId: string;
};

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

	const pageCount = topic.pages.length;
	const safePage = Math.min(Math.max(page, 0), Math.max(pageCount - 1, 0));

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
			header={<div className="appleGuideTopicTitle">{topic.title}</div>}
			onCloseFunc={() =>
				dispatch({
					type: "ClassicyAppAppleGuideCloseTopic",
					app: { id: APPLE_GUIDE_APP_ID },
					topicId,
				})
			}
		>
			<div className="appleGuideBody">
				<div className="appleGuideContent">
					{topic.pages[safePage]}
					{safePage === pageCount - 1 && (
						<p className="appleGuideEnd">- End -</p>
					)}
				</div>
				<div className="appleGuideFooter">
					<AppleGuidePager
						page={safePage}
						pageCount={pageCount}
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
			</div>
		</ClassicyWindow>
	);
};

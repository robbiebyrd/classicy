import "./AppleGuide.scss";
import type { CSSProperties, FC as FunctionalComponent } from "react";
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
	/**
	 * Id of a topic registered with `registerAppleGuideTopic`. Also derives the
	 * window id (`apple_guide_<topicId>`). Unknown ids render nothing.
	 */
	topicId: string;
	/** Extra class names, forwarded to the topic's `ClassicyWindow` root. */
	className?: string;
	/** Inline style, forwarded to the topic's `ClassicyWindow` root. */
	style?: CSSProperties;
};

/**
 * One Apple Guide help topic in its own window: the Mac OS 8 step-by-step
 * help system behind the Help menu (its "About Balloon Help…" item opens the
 * built-in topic). The topic's `title` heads every page, its `pages` are
 * paged with the assistant's arrows, and the last page ends with "- End -".
 *
 * You normally do not render this yourself: `ClassicyDesktop` mounts the
 * `AppleGuide` extension, which renders one of these per open topic. Register
 * a topic at module scope and open it by dispatching
 * `APPLE_GUIDE_SHOW_TOPIC_EVENT`:
 *
 * ```tsx
 * registerAppleGuideTopic({ id: "my-app-basics", title: "My App Basics",
 *   pages: [<p>Step one…</p>, <p>Step two…</p>] });
 * dispatch({ type: APPLE_GUIDE_SHOW_TOPIC_EVENT, topicId: "my-app-basics" });
 * ```
 *
 * Under the hood it is a `ClassicyAssistant` driven in controlled mode: the
 * page index lives in the AppManager store (`AppleGuide.app`'s `data.pages`,
 * so the position in a topic survives a reload), the assistant renders the
 * stored page and reports arrow clicks back as `ClassicyAppAppleGuideSetPage`.
 * Showing a topic again restarts it at page 1; the close box dispatches
 * `ClassicyAppAppleGuideCloseTopic`.
 */
export const AppleGuideWindow: FunctionalComponent<AppleGuideWindowProps> = ({
	topicId,
	className,
	style,
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
			className={className}
			style={style}
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

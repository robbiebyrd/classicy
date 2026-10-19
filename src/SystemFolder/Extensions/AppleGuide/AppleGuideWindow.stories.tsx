import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { APPLE_GUIDE_SHOW_TOPIC_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	registerAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const STORY_TOPIC_ID = "storybook-make-alias";

// Topics register at module scope, before anything renders.
registerAppleGuideTopic({
	id: STORY_TOPIC_ID,
	title: "How do I make an alias?",
	pages: [
		<p key="1">In the Finder, click the item you want to make an alias of.</p>,
		<p key="2">Choose Make Alias from the File menu.</p>,
		<p key="3">
			Drag the alias to wherever you want it. Its name is shown in italics.
		</p>,
	],
});

const meta = {
	title: "Extensions/AppleGuide",
	component: AppleGuideWindow,
	// Render inside a real ClassicyDesktop: AppleGuideWindow wraps itself in a
	// ClassicyWindow, which needs the AppManager store and sound providers,
	// and paging writes to the AppleGuide.app record the desktop mounts.
	parameters: desktopParameters,
} satisfies Meta<typeof AppleGuideWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The built-in "About Balloon Help…" topic the desktop's Help menu opens — the
 * canonical About Help implementation (an Apple Guide topic, not the generic
 * paged wizard in Dialogs/Assistant). One page, so both arrows are
 * disabled and the page ends with "- End -".
 */
export const AboutBalloonHelp: Story = {
	args: {
		topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
	},
};

/**
 * A three-page topic registered with `registerAppleGuideTopic`. The header
 * keeps the topic title on every page; the arrows page through it, and the
 * page index is stored in the AppManager store.
 */
export const MultiPageTopic: Story = {
	args: {
		topicId: STORY_TOPIC_ID,
	},
};

const ShowTopicLauncher = () => {
	const dispatch = useAppManagerDispatch();
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="apple-guide-launcher"
				appId="storybook.app"
				title="Help Launcher"
				initialSize={[260, 0]}
				initialPosition={[40, 60]}
				scrollable={false}
			>
				<ClassicyButton
					onClickFunc={() =>
						dispatch({
							type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
							topicId: STORY_TOPIC_ID,
						})
					}
				>
					Show Help Topic
				</ClassicyButton>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * The recommended way to open a topic: dispatch `APPLE_GUIDE_SHOW_TOPIC_EVENT`
 * with its `topicId`, and the desktop's AppleGuide extension renders and
 * focuses the window. Showing an open topic again re-focuses it at page 1.
 */
export const ShowTopicByDispatch: Story = {
	args: {
		topicId: STORY_TOPIC_ID,
	},
	render: () => <ShowTopicLauncher />,
};

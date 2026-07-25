import type { Meta, StoryObj } from "@storybook/react-vite";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";

const meta = {
	title: "Extensions/AppleGuide",
	component: AppleGuideWindow,
	// Render inside a real ClassicyDesktop: AppleGuideWindow wraps itself in a
	// ClassicyWindow, which needs the AppManager store and sound providers.
	parameters: { classicy: { desktop: true } },
} satisfies Meta<typeof AppleGuideWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

// The actual "About Balloon Help…" window, opened from the desktop's Help
// menu (see ClassicyDesktopMenuBar). This is the canonical About Help
// implementation — a ClassicyAssistant-backed Apple Guide topic, not the
// generic layout reference in SystemResources/Assistant.stories.tsx.
export const AboutBalloonHelp: Story = {
	args: {
		topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
	},
};

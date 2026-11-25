// Windows 98's Help: a topic in WinHelp's task topic window (its command
// buttons above it, sizable) and the Help Topics browser listing the topics
// in books (the core's `help.topicWindow` "winhelp"; WIG Ch.12 "Task Topic
// Windows", pp.279-280, Figure 12.10; "The Help Topics Browser", pp.284-288,
// Figure 12.13).
import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
	registerAppleGuideTopic,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { windows98Parameters } from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";

// A few topics in books, offered under Windows 98 alone, registered before
// anything renders.
const STORY_TOPICS = [
	{
		id: "windows98-story-print-queue",
		title: "To view documents waiting to be printed",
		book: "Printing",
		steps: [
			"Click the Start button, point to Settings, and then click Printers.",
			"Double-click the icon for the printer you want to look at.",
		],
	},
	{
		id: "windows98-story-change-printer",
		title: "To change printer settings",
		book: "Printing",
		steps: [
			"Click the Start button, point to Settings, and then click Printers.",
			"Click the printer you want, and then click Properties on the File menu.",
		],
	},
	{
		id: "windows98-story-find-file",
		title: "To find a file or folder",
		book: "Finding Things",
		steps: [
			"Click the Start button, point to Find, and then click Files or Folders.",
			"In Named, type the name of the file or folder you want to find.",
			"Click Find Now.",
		],
	},
];

for (const topic of STORY_TOPICS)
	registerAppleGuideTopic({
		id: topic.id,
		title: topic.title,
		book: topic.book,
		packages: ["windows98"],
		pages: [
			<ol key="steps">
				{topic.steps.map((step) => (
					<li key={step}>{step}</li>
				))}
			</ol>,
			<p key="tip">You can also press F1 in a dialog box for help on it.</p>,
		],
	});

const meta = {
	title: "Appearance/Windows 98/Help",
	parameters: windows98Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dispatches `action` once the desktop has mounted, and renders nothing. */
function Dispatch({ action }: { action: Record<string, unknown> }) {
	const dispatch = useAppManagerDispatch();
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispatched once, on mount
	useEffect(() => {
		dispatch(action as Parameters<typeof dispatch>[0]);
	}, [dispatch]);
	return null;
}

/**
 * A topic in WinHelp's task topic window: captioned with the help file's
 * name, sizable, Help Topics, Back and Options above the topic, the topic on
 * InfoWindow, the wizard's Back and Next below.
 */
export const TopicWindow: Story = {
	render: () => (
		<Dispatch
			action={{
				type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
				topicId: "windows98-story-print-queue",
			}}
		/>
	),
};

/**
 * The Help menu's built-in topic, in Windows' words under Windows 98 ("Using
 * Help"); Platinum and System 7 keep Apple Guide's "About Help".
 */
export const UsingHelp: Story = {
	render: () => (
		<Dispatch
			action={{
				type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
				topicId: ABOUT_BALLOON_HELP_TOPIC_ID,
			}}
		/>
	),
};

/**
 * The Help Topics browser: its Contents tab lists the books and the topics
 * outside them; Display (or Open and Close on a book) and Cancel below.
 */
export const HelpTopics: Story = {
	render: () => (
		<Dispatch action={{ type: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT }} />
	),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import sampleMovie from "@vid/quicktime/sample.mp4?no-inline";
import { QuickTimeVideoEmbed } from "./QuickTimeMovieEmbed";

const meta = {
	title: "Controls/QuickTime",
	component: QuickTimeVideoEmbed,
	decorators: [
		(Story) => (
			<div style={{ width: 480 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof QuickTimeVideoEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DockedControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: true,
	},
};

export const OverlayControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: false,
	},
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyBalloonHelp } from "./ClassicyBalloonHelp";

const meta = {
	title: "Controls/BalloonHelp",
	component: ClassicyBalloonHelp,
} satisfies Meta<typeof ClassicyBalloonHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "Do Nothing",
		content: "Hover for 600ms to see this Mac OS 8-style help balloon.",
		position: "top-left",
		children: <ClassicyButton isDefault={true}>Hover Me</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ paddingTop: "8em", paddingLeft: "2em" }}>
				<Story />
			</div>
		),
	],
};

export const BottomCenter: Story = {
	args: {
		content: "Balloons can point in six directions.",
		position: "bottom-center",
		delay: 200,
		children: <ClassicyButton>Quick Balloon</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ padding: "2em 6em 10em" }}>
				<Story />
			</div>
		),
	],
};

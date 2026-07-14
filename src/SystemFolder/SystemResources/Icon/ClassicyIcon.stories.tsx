import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyIcon } from "./ClassicyIcon";

const meta = {
	title: "Controls/Icon",
	component: ClassicyIcon,
	decorators: [
		(Story) => (
			<div style={{ position: "relative", width: 320, height: 200 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		appId: "storybook.app",
		name: "Macintosh HD",
		icon: ClassicyIcons.system.macClassic as string,
		label: "Macintosh HD",
		initialPosition: [24, 24],
		onClickFunc: fn(),
	},
};

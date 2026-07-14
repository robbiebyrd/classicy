import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyControlLabel } from "./ClassicyControlLabel";

const meta = {
	title: "Controls/ControlLabel",
	component: ClassicyControlLabel,
} satisfies Meta<typeof ClassicyControlLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { label: "Printer Name" },
};

export const WithIcon: Story = {
	args: {
		label: "Get Info",
		icon: ClassicyIcons.system.info as string,
	},
};

export const Large: Story = {
	args: { label: "Section Heading", labelSize: "large" },
};

export const Disabled: Story = {
	args: { label: "Unavailable Option", disabled: true },
};

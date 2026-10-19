import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyControlLabel } from "./ClassicyControlLabel";

const meta = {
	title: "Controls/ControlLabel",
	component: ClassicyControlLabel,
} satisfies Meta<typeof ClassicyControlLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A plain medium-size label in the theme's UI font. */
export const Default: Story = {
	args: { label: "Printer Name" },
};

/** `icon` draws a picture before the text (32px by default; `iconSize` takes `sm` or `lg`). */
export const WithIcon: Story = {
	args: {
		label: "Get Info",
		icon: ClassicyIcons.system.info as string,
	},
};

/** `labelSize="large"` — double-size text. */
export const Large: Story = {
	args: { label: "Section Heading", labelSize: "large" },
};

/** `disabled` draws the text in the HIG's dimmed grey, for a label whose control is inactive. */
export const Disabled: Story = {
	args: { label: "Unavailable Option", disabled: true },
};

/** `labelSize="small"` — text at 80% of the UI font size. */
export const Small: Story = {
	args: { label: "Caption", labelSize: "small" },
};

/** `direction="right"` reverses the row, so the icon follows the text. */
export const IconAfterText: Story = {
	args: {
		label: "Get Info",
		icon: ClassicyIcons.system.info as string,
		iconSize: "sm",
		direction: "right",
	},
};

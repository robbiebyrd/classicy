import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyProgressBar } from "./ClassicyProgressBar";

const meta = {
	title: "Controls/ProgressBar",
	component: ClassicyProgressBar,
	argTypes: {
		labelAlign: {
			control: "select",
			options: ["left", "center", "right"],
		},
	},
} satisfies Meta<typeof ClassicyProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
	args: { value: 59 },
};

export const Indeterminate: Story = {
	args: { indeterminate: true },
};

export const WithLabel: Story = {
	args: { value: 33, label: "Copying files…" },
};

export const CenteredLabel: Story = {
	args: { value: 33, label: "Copying files…", labelAlign: "center" },
};

export const ChasingArrows: Story = {
	args: { chasingArrows: true, label: "Connecting…" },
};

// autoSwitch: indeterminate flag stays set, but a known value flips it to a
// filling determinate bar.
export const AutoSwitchToDeterminate: Story = {
	args: {
		indeterminate: true,
		autoSwitch: true,
		value: 45,
		label: "Downloading…",
	},
};

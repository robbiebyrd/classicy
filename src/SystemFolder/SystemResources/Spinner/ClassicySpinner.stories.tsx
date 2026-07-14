import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicySpinner } from "./ClassicySpinner";

const meta = {
	title: "Controls/Spinner",
	component: ClassicySpinner,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicySpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "spin-default",
		labelTitle: "Font Size",
		prefillValue: 12,
		minValue: 9,
		maxValue: 72,
	},
};

export const Disabled: Story = {
	args: {
		id: "spin-disabled",
		labelTitle: "Copies",
		prefillValue: 1,
		disabled: true,
	},
};

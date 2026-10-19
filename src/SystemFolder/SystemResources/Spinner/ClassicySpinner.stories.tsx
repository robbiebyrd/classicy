import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicySpinner } from "./ClassicySpinner";

const meta = {
	title: "Controls/Spinner",
	component: ClassicySpinner,
	args: { onChangeFunc: fn(), onEnterFunc: fn() },
} satisfies Meta<typeof ClassicySpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A number field with little arrows, clamped to 9–72. Click an arrow to step
 * by one, or hold it to auto-repeat.
 */
export const Default: Story = {
	args: {
		id: "spin-default",
		labelTitle: "Font Size",
		prefillValue: 12,
		minValue: 9,
		maxValue: 72,
	},
};

/**
 * A wide range: hold an arrow and the step grows tenfold every three seconds
 * (1, 10, 100…), so large values are quick to reach. The field is sized to fit
 * the longer bound.
 */
export const LargeRange: Story = {
	args: {
		id: "spin-large",
		labelTitle: "Cache Size (K):",
		labelPosition: "left",
		prefillValue: 512,
		minValue: 32,
		maxValue: 65536,
	},
};

/** A disabled spinner: neither the field nor the arrows respond. */
export const Disabled: Story = {
	args: {
		id: "spin-disabled",
		labelTitle: "Copies",
		prefillValue: 1,
		disabled: true,
	},
};

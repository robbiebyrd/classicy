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
 * by one, or hold it to auto-repeat; with the field focused, Up and Down
 * Arrow step by one too.
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

/**
 * `wrap`: past 12 the hour comes round to 1, and below 1 to 12, by the arrows
 * or the Up and Down keys, as Windows' spin boxes typically do (WIG Ch.7
 * "Spin Boxes", p.128). A typed value is still clamped.
 */
export const Wrap: Story = {
	args: {
		id: "spin-wrap",
		labelTitle: "Hour",
		labelPosition: "left",
		prefillValue: 12,
		minValue: 1,
		maxValue: 12,
		wrap: true,
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

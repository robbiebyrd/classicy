import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyRadioInput } from "./ClassicyRadioInput";

const meta = {
	title: "Controls/RadioInput",
	component: ClassicyRadioInput,
	args: {
		name: "speed",
		label: "Mouse Speed",
		onClickFunc: fn(),
		inputs: [
			{ id: "slow", label: "Slow" },
			{ id: "medium", label: "Medium", checked: true },
			{ id: "fast", label: "Fast" },
		],
	},
} satisfies Meta<typeof ClassicyRadioInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default layout, `align="rows"`: buttons side by side in one row under
 * the group title, with "Medium" pre-selected via `checked`.
 */
export const Default: Story = {};

/**
 * `align="columns"` stacks the buttons in one column. (Each story uses its own
 * `name` and ids, as separate groups on one page must.)
 */
export const Columns: Story = {
	args: {
		name: "speed-columns",
		align: "columns",
		inputs: [
			{ id: "slow-columns", label: "Slow" },
			{ id: "medium-columns", label: "Medium", checked: true },
			{ id: "fast-columns", label: "Fast" },
		],
	},
};

/** `align="rows"` passed explicitly: the same row as the default. */
export const Rows: Story = {
	args: {
		name: "speed-rows",
		align: "rows",
		inputs: [
			{ id: "slow-rows", label: "Slow" },
			{ id: "medium-rows", label: "Medium", checked: true },
			{ id: "fast-rows", label: "Fast" },
		],
	},
};

/** A fully disabled group: the group-level `disabled` dims every button and blocks clicks. */
export const Disabled: Story = {
	args: {
		name: "speed-disabled",
		disabled: true,
		inputs: [
			{ id: "slow-disabled", label: "Slow" },
			{ id: "medium-disabled", label: "Medium", checked: true },
			{ id: "fast-disabled", label: "Fast" },
		],
	},
};

/** A single unavailable choice in an otherwise active group. */
export const DisabledOption: Story = {
	args: {
		name: "speed-option",
		inputs: [
			{ id: "slow-option", label: "Slow" },
			{ id: "medium-option", label: "Medium", checked: true },
			{ id: "fast-option", label: "Fast (unavailable)", disabled: true },
		],
	},
};

/**
 * No entry is `checked`, so the first button starts on: a radio group always
 * has exactly one button on (HIGOS8 p.24).
 */
export const NonePreselected: Story = {
	args: {
		name: "speed-none",
		inputs: [
			{ id: "slow-none", label: "Slow" },
			{ id: "medium-none", label: "Medium" },
			{ id: "fast-none", label: "Fast" },
		],
	},
};

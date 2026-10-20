import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyCheckbox } from "./ClassicyCheckbox";

const meta = {
	title: "Controls/Checkbox",
	component: ClassicyCheckbox,
	args: { onClickFunc: fn() },
} satisfies Meta<typeof ClassicyCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The on state, drawn with the standard checkmark. */
export const Checked: Story = {
	args: { id: "cb-checked", checked: true, label: "Enable AppleTalk" },
};

/** The off state. Click the box or its label to toggle it; `onClickFunc` receives the new value. */
export const Unchecked: Story = {
	args: { id: "cb-unchecked", checked: false, label: "Show Balloons" },
};

/**
 * The mixed state: a dash meaning "on for part of the selection". It shows
 * regardless of `checked` until the caller clears `mixed`.
 */
export const Mixed: Story = {
	args: { id: "cb-mixed", mixed: true, label: "Partially Selected" },
};

/** A disabled checkbox keeps its value but dims, along with its label, and ignores clicks. */
export const Disabled: Story = {
	args: { id: "cb-disabled", disabled: true, checked: true, label: "Locked" },
};

/**
 * `isDefault` rings the box in the theme accent colour while it is on or
 * pressed — the same emphasis a default radio button gets.
 */
export const Default: Story = {
	args: {
		id: "cb-default",
		checked: true,
		isDefault: true,
		label: "Use as default",
	},
};

/**
 * `mark="x"` swaps the checkmark for an "x" — the HIG's localization opt-in
 * (p.28) for locales where a checkmark is not culturally acceptable.
 */
export const XMark: Story = {
	args: {
		id: "cb-x-mark",
		checked: true,
		mark: "x",
		label: "Enable AppleTalk",
	},
};

/** `labelPosition="left"` puts the label before the box. */
export const LabelOnLeft: Story = {
	args: {
		id: "cb-label-left",
		checked: true,
		labelPosition: "left",
		label: "Remember password",
	},
};

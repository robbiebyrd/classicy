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

/** A determinate bar 59% of the way through a task of known length. */
export const Determinate: Story = {
	args: { value: 59 },
};

/** The striped barber-pole bar, for work whose length is not yet known. */
export const Indeterminate: Story = {
	args: { indeterminate: true },
};

/** A status label above the bar, as in a Finder copy window. */
export const WithLabel: Story = {
	args: { value: 33, label: "Copying files…" },
};

/** `labelAlign="center"` centres the label over the bar. */
export const CenteredLabel: Story = {
	args: { value: 33, label: "Copying files…", labelAlign: "center" },
};

/** `chasingArrows` replaces the bar with the small spinning arrows used for background work. */
export const ChasingArrows: Story = {
	args: { chasingArrows: true, label: "Connecting…" },
};

/**
 * `autoSwitch`: the `indeterminate` flag stays set, but a known `value` flips it
 * to a filling determinate bar — the HIG's switch once a task's scope is known.
 */
export const AutoSwitchToDeterminate: Story = {
	args: {
		indeterminate: true,
		autoSwitch: true,
		value: 45,
		label: "Downloading…",
	},
};

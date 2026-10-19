import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTimePicker } from "./ClassicyTimePicker";

const meta = {
	title: "Controls/TimePicker",
	component: ClassicyTimePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A 12-hour clock control seeded with 10:30:00 am. Click a field, then use
 * Up/Down or the little arrows to step it; the pop-up switches am/pm.
 */
export const Default: Story = {
	args: {
		id: "time-default",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
	},
};

/**
 * `minValue` / `maxValue` limit the time to office hours (9 am–5 pm on the same
 * day as `prefillValue`); switching to pm at 10:30 snaps to 5:00:00 pm.
 */
export const OfficeHours: Story = {
	args: {
		id: "time-office-hours",
		labelTitle: "Meeting:",
		labelPosition: "left",
		prefillValue: new Date("2026-07-14T10:30:00"),
		minValue: new Date("2026-07-14T09:00:00"),
		maxValue: new Date("2026-07-14T17:00:00"),
	},
};

/** A display-only (inactive) clock control: fields, arrows and the am/pm pop-up are disabled. */
export const Disabled: Story = {
	args: {
		id: "time-disabled",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
		disabled: true,
	},
};

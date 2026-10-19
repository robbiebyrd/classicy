import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyDatePicker } from "./ClassicyDatePicker";

const meta = {
	title: "Controls/DatePicker",
	component: ClassicyDatePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * With no `prefillValue` the picker starts at the Classicy virtual clock's
 * date. Click a field, then use Up/Down or the little arrows to step it.
 */
export const Default: Story = {
	args: { id: "date-default", labelTitle: "Date" },
};

/** `prefillValue` seeds the fields with a specific date. */
export const Prefilled: Story = {
	args: {
		id: "date-prefilled",
		labelTitle: "Date",
		prefillValue: new Date("1998-07-14T00:00:00"),
	},
};

/**
 * `minValue` / `maxValue` bound the date to 1998: stepping the year past
 * either end snaps the whole date to that bound.
 */
export const Range: Story = {
	args: {
		id: "date-range",
		labelTitle: "Release date:",
		labelPosition: "left",
		prefillValue: new Date("1998-07-14T00:00:00"),
		minValue: new Date("1998-01-01T00:00:00"),
		maxValue: new Date("1998-12-31T00:00:00"),
	},
};

/** A display-only (inactive) clock control, as the HIG allows. */
export const Disabled: Story = {
	args: { id: "date-disabled", labelTitle: "Date", disabled: true },
};

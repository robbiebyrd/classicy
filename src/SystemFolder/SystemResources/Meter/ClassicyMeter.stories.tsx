import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyMeter } from "./ClassicyMeter";

const meta = {
	title: "Controls/Meter",
	component: ClassicyMeter,
	decorators: [(Story) => <div style={{ width: 260 }}>{<Story />}</div>],
} satisfies Meta<typeof ClassicyMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No thresholds: the whole range is optimal, drawn in the theme accent, with the value printed beside it. */
export const Basic: Story = {
	args: {
		value: 60,
		label: "Memory used",
		showValue: true,
	},
};

/** Battery-style: `optimum` sits in the high region, so a low value (two regions away) is bad. */
export const BatteryLow: Story = {
	args: {
		value: 12,
		low: 20,
		high: 80,
		optimum: 100,
		label: "Battery",
		showValue: true,
	},
};

/** The same battery at half charge: one region from `optimum`, so it is suboptimal (`--color-alert`). */
export const BatteryHalf: Story = {
	args: {
		value: 50,
		low: 20,
		high: 80,
		optimum: 100,
		label: "Battery",
		showValue: true,
	},
};

/** Disk-usage-style: `optimum` sits low, so a nearly-full disk (two regions away) is bad. */
export const DiskNearlyFull: Story = {
	args: {
		value: 95,
		low: 60,
		high: 90,
		optimum: 10,
		label: "Macintosh HD",
		showValue: true,
	},
};

/** `segments` draws discrete LED-style cells — the audio level-meter look. */
export const SegmentedLevel: Story = {
	args: {
		value: 7,
		max: 10,
		segments: 10,
		label: "Input level",
	},
};

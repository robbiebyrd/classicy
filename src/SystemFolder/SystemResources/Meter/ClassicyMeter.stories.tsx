import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyMeter } from "./ClassicyMeter";

const meta = {
	title: "Controls/Meter",
	component: ClassicyMeter,
	decorators: [(Story) => <div style={{ width: 260 }}>{<Story />}</div>],
} satisfies Meta<typeof ClassicyMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	args: {
		value: 60,
		label: "Memory used",
		showValue: true,
	},
};

// Battery-style: optimum sits in the high region, so a low value goes red.
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

// Disk-usage-style: optimum sits low, so a nearly-full disk goes red.
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

export const SegmentedLevel: Story = {
	args: {
		value: 7,
		max: 10,
		segments: 10,
		label: "Input level",
	},
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicySlider } from "./ClassicySlider";

const meta = {
	title: "Controls/Slider",
	component: ClassicySlider,
	args: { onChangeFunc: fn(), onCommitFunc: fn() },
} satisfies Meta<typeof ClassicySlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "slider-default", labelTitle: "Volume", value: 60 },
};

export const WithValueLabel: Story = {
	args: {
		id: "slider-value",
		labelTitle: "Brightness:",
		labelPosition: "left",
		value: 40,
		valueLabel: "40 %",
	},
};

export const Highlighted: Story = {
	args: { id: "slider-hl", labelTitle: "Bass", value: 75, highlighted: true },
};

export const Disabled: Story = {
	args: {
		id: "slider-disabled",
		labelTitle: "Treble",
		value: 30,
		disabled: true,
	},
};

export const Vertical: Story = {
	args: {
		id: "slider-vertical",
		labelTitle: "Level",
		value: 55,
		orientation: "vertical",
	},
};

export const NondirectionalKnob: Story = {
	args: {
		id: "slider-nondirectional",
		labelTitle: "Balance",
		value: 50,
		indicatorDirection: "nondirectional",
		tickInterval: "center",
	},
};

export const UpwardIndicator: Story = {
	args: {
		id: "slider-up",
		labelTitle: "Zoom",
		value: 50,
		indicatorDirection: "up",
	},
};

export const GhostIndicator: Story = {
	args: {
		id: "slider-ghost",
		labelTitle: "Scrub",
		value: 40,
		ghost: true,
	},
};

export const LabeledTicks: Story = {
	args: {
		id: "slider-labeled-ticks",
		labelTitle: "Speed",
		value: 50,
		tickInterval: 25,
		tickLabels: ["Slow", null, null, null, "Fast"],
	},
};

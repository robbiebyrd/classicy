import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect, useState } from "react";
import { fn } from "storybook/test";
import { ClassicySlider } from "./ClassicySlider";

/**
 * Keeps the story's `value` in local state, as a real consumer would, so the
 * readout beside the track follows the thumb. The `value` control still wins
 * whenever it is changed.
 */
const LiveSlider = (args: ComponentProps<typeof ClassicySlider>) => {
	const [value, setValue] = useState(args.value);
	useEffect(() => setValue(args.value), [args.value]);
	return (
		<ClassicySlider
			{...args}
			value={value}
			onChangeFunc={(e) => {
				args.onChangeFunc?.(e);
				setValue(Number(e.target.value));
			}}
		/>
	);
};

const meta = {
	title: "Controls/Slider",
	component: ClassicySlider,
	args: { onChangeFunc: fn(), onCommitFunc: fn() },
	render: (args) => <LiveSlider {...args} />,
} satisfies Meta<typeof ClassicySlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A horizontal slider with a downward-pointing indicator and a value readout.
 * `onChangeFunc` fires while dragging; `onCommitFunc` once on release.
 */
export const Default: Story = {
	args: { id: "slider-default", labelTitle: "Volume", value: 60 },
};

/** `valueLabel` replaces the numeric readout with custom text; the label sits to the left. */
export const WithValueLabel: Story = {
	args: {
		id: "slider-value",
		labelTitle: "Brightness:",
		labelPosition: "left",
		value: 40,
		valueLabel: "40 %",
	},
};

/** `highlighted` draws the thumb in the theme accent colour. */
export const Highlighted: Story = {
	args: { id: "slider-hl", labelTitle: "Bass", value: 75, highlighted: true },
};

/** A disabled slider: the thumb cannot move and the label is dimmed. */
export const Disabled: Story = {
	args: {
		id: "slider-disabled",
		labelTitle: "Treble",
		value: 30,
		disabled: true,
	},
};

/** `orientation="vertical"` tracks bottom to top, with a left-pointing indicator by default. */
export const Vertical: Story = {
	args: {
		id: "slider-vertical",
		labelTitle: "Level",
		value: 55,
		orientation: "vertical",
	},
};

/**
 * A nondirectional (unpointed) knob with a single centre tick — the HIG choice
 * when direction carries no meaning, as in a balance control.
 */
export const NondirectionalKnob: Story = {
	args: {
		id: "slider-nondirectional",
		labelTitle: "Balance",
		value: 50,
		indicatorDirection: "nondirectional",
		tickInterval: "center",
	},
};

/** `indicatorDirection` overrides which way the thumb points. */
export const UpwardIndicator: Story = {
	args: {
		id: "slider-up",
		labelTitle: "Zoom",
		value: 50,
		indicatorDirection: "up",
	},
};

/** `ghost`: drag the thumb to see a translucent copy trail the pointer (the Mac OS 8 ghost indicator). */
export const GhostIndicator: Story = {
	args: {
		id: "slider-ghost",
		labelTitle: "Scrub",
		value: 40,
		ghost: true,
	},
};

/** Ticks every 25 units with labels at the ends to show the direction of increase. */
export const LabeledTicks: Story = {
	args: {
		id: "slider-labeled-ticks",
		labelTitle: "Speed",
		value: 50,
		tickInterval: 25,
		tickLabels: ["Slow", null, null, null, "Fast"],
	},
};

/** `snapToTicks` makes the tick interval the step, so the thumb only rests on a tick. */
export const SnapToTicks: Story = {
	args: {
		id: "slider-snap",
		labelTitle: "Key Repeat",
		value: 40,
		tickInterval: 20,
		snapToTicks: true,
		tickLabels: ["Off", null, null, null, null, "Fast"],
	},
};

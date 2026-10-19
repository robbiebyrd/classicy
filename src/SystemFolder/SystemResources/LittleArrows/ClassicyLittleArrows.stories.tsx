import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyLittleArrows } from "./ClassicyLittleArrows";

const meta = {
	title: "Controls/LittleArrows",
	component: ClassicyLittleArrows,
	args: { onStep: fn() },
} satisfies Meta<typeof ClassicyLittleArrows>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bare arrow pair. Press an arrow to fire `onStep` once, then repeatedly while held. */
export const Default: Story = {};

/** Both arrows natively disabled: they leave the tab order and `onStep` never fires. */
export const Disabled: Story = {
	args: { disabled: true },
};

/**
 * The HIG pairs little arrows with the content they change (p.35). Wrapping
 * both in `classicyLittleArrowsGroup` gives the standard spacing; click to step
 * by one, or hold to repeat. The value (clamped to 0–99) lives in the caller.
 */
export const WithValue: Story = {
	render: (args) => {
		const [value, setValue] = useState(5);
		return (
			<div className="classicyLittleArrowsGroup">
				<span style={{ minWidth: 24, textAlign: "right" }}>{value}</span>
				<ClassicyLittleArrows
					{...args}
					upLabel="Increase value"
					downLabel="Decrease value"
					onStep={(direction, heldMs) => {
						args.onStep(direction, heldMs);
						setValue((v) => Math.min(99, Math.max(0, v + direction)));
					}}
				/>
			</div>
		);
	},
};

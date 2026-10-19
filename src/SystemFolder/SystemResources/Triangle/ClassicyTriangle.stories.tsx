import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyTriangle } from "./ClassicyTriangle";

const meta = {
	title: "Controls/Triangle",
	component: ClassicyTriangle,
	args: { onToggle: fn() },
} satisfies Meta<typeof ClassicyTriangle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An uncontrolled, interactive triangle: click it (or focus it and press
 * Enter/Space) to turn it between closed (right) and open (down).
 */
export const Interactive: Story = {
	args: { defaultOpen: false },
};

/**
 * The four closed `direction`s, drawn as bare non-interactive SVGs. Right is
 * the HIG's standard closed triangle.
 */
export const Directions: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1em" }}>
			<ClassicyTriangle direction="up" interactive={false} />
			<ClassicyTriangle direction="right" interactive={false} />
			<ClassicyTriangle direction="down" interactive={false} />
			<ClassicyTriangle direction="left" interactive={false} />
		</div>
	),
};

/**
 * Controlled use: the parent owns `open` and updates it from `onToggle`, here
 * showing a line of detail while open.
 */
export const Controlled: Story = {
	render: function Render(args) {
		const [open, setOpen] = useState(true);
		return (
			<div>
				<ClassicyTriangle
					{...args}
					open={open}
					onToggle={(next) => {
						args.onToggle?.(next);
						setOpen(next);
					}}
				/>
				{open && <p style={{ margin: 0 }}>Detail shown while open.</p>}
			</div>
		);
	},
};

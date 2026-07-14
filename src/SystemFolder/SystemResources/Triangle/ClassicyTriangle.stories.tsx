import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTriangle } from "./ClassicyTriangle";

const meta = {
	title: "Controls/Triangle",
	component: ClassicyTriangle,
	args: { onToggle: fn() },
} satisfies Meta<typeof ClassicyTriangle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
	args: { defaultOpen: false },
};

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

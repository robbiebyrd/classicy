import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyDisclosure } from "./ClassicyDisclosure";

const meta = {
	title: "Controls/Disclosure",
	component: ClassicyDisclosure,
} satisfies Meta<typeof ClassicyDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A labelled section, closed at first. Click the header (or focus it and press
 * Enter/Space, or ⌘→ / ⌘←) to reveal and hide the content.
 */
export const Default: Story = {
	args: {
		label: "Advanced Options",
		children: <p>Hidden details revealed on disclosure.</p>,
	},
};

/** `labelPosition="left"` puts the header text before the triangle. */
export const LabelOnLeft: Story = {
	args: {
		label: "Show details",
		labelPosition: "left",
		children: <p>Details revealed on disclosure.</p>,
	},
};

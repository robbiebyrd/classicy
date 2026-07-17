import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyImageWell } from "./ClassicyImageWell";

// Inline SVG data URI — no binary asset needed.
const sampleImage =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E";

const meta = {
	title: "Controls/ImageWell",
	component: ClassicyImageWell,
	args: {
		src: sampleImage,
		alt: "Sample picture",
	},
} satisfies Meta<typeof ClassicyImageWell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {};

export const Selected: Story = {
	args: { selected: true },
};

export const Disabled: Story = {
	args: { enabled: false },
};

export const DropTarget: Story = {
	args: {
		src: undefined,
		children: "Drop an image here",
		onDrop: (files) => console.log("dropped", files),
	},
};

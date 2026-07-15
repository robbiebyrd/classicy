import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyBoot } from "./ClassicyBoot";

const meta = {
	title: "System/Boot",
	component: ClassicyBoot,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyBoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

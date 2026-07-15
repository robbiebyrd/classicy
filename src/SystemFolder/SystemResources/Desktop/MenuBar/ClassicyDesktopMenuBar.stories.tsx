import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyDesktopMenuBar } from "./ClassicyDesktopMenuBar";

const meta = {
	title: "Desktop/MenuBar",
	component: ClassicyDesktopMenuBar,
} satisfies Meta<typeof ClassicyDesktopMenuBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

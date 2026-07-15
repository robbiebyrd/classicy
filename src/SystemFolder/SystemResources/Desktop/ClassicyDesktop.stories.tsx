import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyDesktop } from "./ClassicyDesktop";

const meta = {
	title: "Desktop/Desktop",
	component: ClassicyDesktop,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktop>;

export default meta;
type Story = StoryObj<typeof meta>;

// The desktop frame decorator supplies the ClassicyDesktop; the story
// contributes nothing extra — this showcases the bare environment
// (menu bar, wallpaper, Trash, Finder).
export const Default: Story = {
	render: () => null,
};

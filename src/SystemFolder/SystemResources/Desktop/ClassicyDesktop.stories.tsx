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

/**
 * The bare desktop with no apps of your own: menu bar, wallpaper, Trash, the
 * Finder's disk icon and the Control Strip. Right-click the empty desktop for
 * its menu, or drag on it to rubber-band select icons. (The Storybook
 * decorator supplies the `ClassicyDesktop`, with the startup screen off.)
 */
export const Default: Story = {
	render: () => null,
};

/**
 * `controlStrip={false}` hides the Control Strip, and with it the desktop's
 * Sound control. (Set here through the decorator's
 * `parameters.classicy.controlStrip`.)
 */
export const WithoutControlStrip: Story = {
	parameters: {
		classicy: { desktop: true, controlStrip: false },
	},
	render: () => null,
};

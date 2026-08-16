import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyLink } from "./ClassicyLink";

const meta = {
	title: "Controls/Link",
	component: ClassicyLink,
} satisfies Meta<typeof ClassicyLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InDesktopViewer: Story = {
	args: {
		href: "https://classicy.ing",
		children: "Visit classicy.ing",
	},
	decorators: [
		(Story) => (
			<p style={{ margin: 0 }}>
				Learn more at <Story /> — opens in a WebViewer window.
			</p>
		),
	],
};

export const NewBrowserTab: Story = {
	args: {
		href: "https://classicy.ing",
		disposition: "browser-new",
		children: "Open in a new tab",
	},
};

export const InternalAction: Story = {
	args: {
		event: "ClassicyAppScreenSaverActivate",
		children: "Start the screen saver",
	},
};

export const Disabled: Story = {
	args: {
		href: "https://classicy.ing",
		disabled: true,
		children: "Unavailable link",
	},
};

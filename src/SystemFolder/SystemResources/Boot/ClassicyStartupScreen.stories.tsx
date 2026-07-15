import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyStartupScreen } from "./ClassicyStartupScreen";
import { resetStartupScreenSession } from "./ClassicyStartupScreenSession";

const meta = {
	title: "System/StartupScreen",
	component: ClassicyStartupScreen,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyStartupScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		resetStartupScreenSession();
		return <ClassicyStartupScreen duration={30000} />;
	},
};

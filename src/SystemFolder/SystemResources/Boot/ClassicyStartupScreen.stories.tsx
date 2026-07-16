import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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

export const WithExtensions: Story = {
	render: () => {
		resetStartupScreenSession();
		const seed = [
			{
				id: "ClockExt.app",
				name: "Clock",
				icon: ClassicyIcons.system.extension,
			},
			{
				id: "ColorsExt.app",
				name: "Colors",
				icon: ClassicyIcons.system.colors.extension,
			},
			{ id: "MacExt.app", name: "Mac", icon: ClassicyIcons.system.mac },
			{
				id: "ClassicExt.app",
				name: "Classic",
				icon: ClassicyIcons.system.macClassic,
			},
			{ id: "WinkExt.app", name: "Wink", icon: ClassicyIcons.system.macWink },
		];
		for (const app of seed) {
			dispatch({ type: "ClassicyAppLoad", app, extension: true });
		}
		return <ClassicyStartupScreen duration={15000} />;
	},
};

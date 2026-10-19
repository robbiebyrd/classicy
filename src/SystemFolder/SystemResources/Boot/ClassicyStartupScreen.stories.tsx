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

/**
 * The stock splash with a 30-second `duration` so it stays up long enough to
 * inspect. The story resets the once-per-session flag before rendering;
 * without that, the splash would render nothing after its first showing.
 */
export const Default: Story = {
	render: () => {
		resetStartupScreenSession();
		return <ClassicyStartupScreen duration={30000} />;
	},
};

/**
 * The extension parade: five extension apps registered with `ClassicyAppLoad`
 * (`extension: true`) appear one at a time along the bottom, spaced so the
 * last lands before the progress bar fills.
 */
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

/**
 * Rebranded via `logo` and `wordmark` (on a desktop: `startupLogo` /
 * `startupWordmark`), with parade icons injected by `ClassicyBootParadeIconAdd`
 * — no extension app needed. Injected icons lead the parade.
 */
export const CustomBranding: Story = {
	render: () => {
		resetStartupScreenSession();
		dispatch({
			type: "ClassicyBootParadeIconAdd",
			id: "storybook-colors",
			name: "Colors",
			icon: ClassicyIcons.system.colors.extension,
		});
		dispatch({
			type: "ClassicyBootParadeIconAdd",
			id: "storybook-mac",
			name: "Mac",
			icon: ClassicyIcons.system.mac,
		});
		return (
			<ClassicyStartupScreen
				duration={15000}
				logo={ClassicyIcons.system.macWink}
				wordmark="My Product"
			/>
		);
	},
};

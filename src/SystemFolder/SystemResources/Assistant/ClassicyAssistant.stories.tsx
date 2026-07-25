import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const meta = {
	title: "SystemResources/Assistant",
	component: ClassicyAssistant,
	// Render inside a real ClassicyDesktop so the wrapping ClassicyWindow has
	// the AppManager store and sound providers it needs.
	parameters: { classicy: { desktop: true } },
} satisfies Meta<typeof ClassicyAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

// Compact single-page assistant layout — no icons, non-resizable. This is a
// generic ClassicyAssistant sizing/geometry reference matching 1.png's
// proportions; it is NOT the real "About Balloon Help" window. The actual
// About Help implementation is AppleGuideWindow (see
// SystemFolder/Extensions/AppleGuide/AppleGuideWindow.stories.tsx), opened
// from the desktop's Help menu.
export const CompactAssistantLayoutReference: Story = {
	render: () => (
		<ClassicyWindow
			id="about-help"
			appId="about-help"
			title=""
			initialSize={[420, 220]}
			initialPosition={["center", "center"]}
			resizable={false}
			zoomable={false}
		>
			<ClassicyAssistant
				pages={[
					{
						title: "About Help",
						content: (
							<div>
								<p>The Help menu includes:</p>
								<ul>
									<li>Balloons—to help you identify items on the screen.</li>
									<li>Help—to guide you step-by-step through tasks.</li>
								</ul>
								<p>- End -</p>
							</div>
						),
					},
				]}
			/>
		</ClassicyWindow>
	),
};

// Full "Mac OS Setup Assistant" — titled document window with a large
// overflowing accessory icon and a global Cancel button. Reproduces 2.png.
export const SetupAssistant: Story = {
	render: () => (
		<ClassicyWindow
			id="setup"
			appId="setup"
			title="Mac OS Setup Assistant"
			initialSize={[560, 420]}
			initialPosition={["center", "center"]}
			resizable
			zoomable
		>
			<ClassicyAssistant
				buttons={[{ title: "Cancel", onClick: () => {} }]}
				pages={[
					{
						title: "Introduction",
						accessoryIcon:
							ClassicyIcons.applications.setupAssistant.setupAssistant,
						accessoryIconSize: "lg",
						content: (
							<div>
								<p>Welcome to the Mac OS Setup Assistant!</p>
								<p>
									Based on your answers to a few questions, this assistant makes
									some basic settings on your computer and sets it up so that
									you can print documents and share files over a local network.
								</p>
								<p>
									This assistant starts with some questions about yourself,
									where you are, and how you plan to use your computer.
								</p>
								<p>Click the right arrow to continue.</p>
							</div>
						),
					},
					{
						title: "Regional Preferences",
						accessoryIcon:
							ClassicyIcons.applications.setupAssistant.setupAssistant,
						accessoryIconSize: "lg",
						content: <p>Choose your keyboard layout and time zone here.</p>,
					},
					{
						title: "Conclusion",
						accessoryIcon:
							ClassicyIcons.applications.setupAssistant.setupAssistant,
						accessoryIconSize: "lg",
						content: <p>You're all set. Click Done to finish.</p>,
						buttons: [{ title: "Done", onClick: () => {} }],
					},
				]}
			/>
		</ClassicyWindow>
	),
};

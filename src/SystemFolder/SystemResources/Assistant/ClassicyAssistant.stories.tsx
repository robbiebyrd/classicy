import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const meta = {
	title: "Dialogs/Assistant",
	component: ClassicyAssistant,
	// Render inside a real ClassicyDesktop so the wrapping ClassicyWindow has
	// the AppManager store and sound providers it needs.
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A compact single-page assistant in a small, non-resizable, untitled
 * window — no icons, so both pager arrows are disabled. A sizing and geometry
 * reference only: the real "About Balloon Help…" window is `AppleGuideWindow`
 * (Extensions/AppleGuide), opened from the desktop's Help menu.
 */
export const CompactAssistantLayoutReference: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="about-help"
				appId="storybook.app"
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
		</StoryApp>
	),
};

/**
 * The full "Mac OS Setup Assistant": a titled document window, a large
 * (`"lg"`) accessory icon overflowing the header, and an assistant-wide
 * Cancel button that the last page replaces with its own Done button. Page
 * with the arrows or, with focus inside, the ← / → keys.
 */
export const SetupAssistant: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="setup"
				appId="storybook.app"
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
										Based on your answers to a few questions, this assistant
										makes some basic settings on your computer and sets it up so
										that you can print documents and share files over a local
										network.
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
		</StoryApp>
	),
};

const GatedAssistant = () => {
	const [page, setPage] = useState(0);
	const [agreed, setAgreed] = useState(false);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="gated"
				appId="storybook.app"
				title={`Installer — step ${page + 1} of 2`}
				initialSize={[440, 260]}
				initialPosition={["center", "center"]}
			>
				<ClassicyAssistant
					page={page}
					onPageChange={setPage}
					pages={[
						{
							title: "License",
							content: (
								<ClassicyCheckbox
									id="assistant-agree"
									label="I agree to the license"
									checked={agreed}
									onClickFunc={setAgreed}
								/>
							),
							canAdvance: () => agreed,
						},
						{
							title: "Install",
							content: <p>Ready to install.</p>,
						},
					]}
				/>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * Controlled paging with a gate: the parent owns `page` through
 * `onPageChange` (here echoed in the window title), and the first page's
 * `canAdvance` refuses to move on — playing the error sound — until the
 * checkbox is ticked.
 */
export const ControlledWithGate: Story = {
	render: () => <GatedAssistant />,
};

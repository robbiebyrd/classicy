import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyWindow } from "./ClassicyWindow";

const meta = {
	title: "Desktop/Window",
	component: ClassicyWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="default"
				appId="storybook.app"
				title="Untitled Document"
				initialSize={[440, 300]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					A resizable, movable, collapsable Platinum window.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const Modal: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="modal"
				appId="storybook.app"
				title="Alert"
				modal={true}
				closable={true}
				resizable={false}
				initialSize={[320, 140]}
				initialPosition={["center", "center"]}
			>
				<p style={{ padding: "1em" }}>This is a modal dialog window.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const FixedSize: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="fixed"
				appId="storybook.app"
				title="Fixed Palette"
				resizable={false}
				zoomable={false}
				initialSize={[260, 180]}
				initialPosition={[120, 90]}
			>
				<p style={{ padding: "1em" }}>Not resizable, not zoomable.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

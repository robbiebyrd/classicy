import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyApp } from "./ClassicyApp";

const meta = {
	title: "Desktop/App",
	component: ClassicyApp,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoWindows: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="doc1"
				appId="storybook.app"
				title="Document 1"
				initialSize={[360, 240]}
				initialPosition={[60, 60]}
			>
				<p style={{ padding: "1em" }}>First document window.</p>
			</ClassicyWindow>
			<ClassicyWindow
				id="doc2"
				appId="storybook.app"
				title="Document 2"
				initialSize={[360, 240]}
				initialPosition={[160, 140]}
			>
				<p style={{ padding: "1em" }}>
					Second document window — click to focus.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

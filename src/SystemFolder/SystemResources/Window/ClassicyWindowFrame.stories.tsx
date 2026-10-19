import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

const meta: Meta<typeof ClassicyWindowFrame> = {
	title: "Desktop/WindowFrame",
	component: ClassicyWindowFrame,
};
export default meta;

type Story = StoryObj<typeof ClassicyWindowFrame>;

/**
 * The frame as a `preBootScreen` uses it: a titled, store-free window holding a
 * power-on prompt. `width` caps the frame's width; narrower content stays
 * narrower.
 */
export const PowerOn: Story = {
	render: () => (
		<ClassicyWindowFrame title="9/11 in Realtime" width={560}>
			<h1>About 9/11 in Realtime</h1>
			<p>
				A multimedia experiment for teachers. Press the button below to power
				on.
			</p>
			<ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
		</ClassicyWindowFrame>
	),
};

/**
 * Without a `title` the title bar is pinstripes only, with no title chip.
 */
export const Untitled: Story = {
	render: () => (
		<ClassicyWindowFrame width={360}>
			<p>A frame with no title.</p>
		</ClassicyWindowFrame>
	),
};

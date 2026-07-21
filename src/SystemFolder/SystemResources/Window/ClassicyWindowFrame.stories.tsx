import type { Meta, StoryObj } from "@storybook/react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

const meta: Meta<typeof ClassicyWindowFrame> = {
	title: "SystemResources/WindowFrame",
	component: ClassicyWindowFrame,
};
export default meta;

type Story = StoryObj<typeof ClassicyWindowFrame>;

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

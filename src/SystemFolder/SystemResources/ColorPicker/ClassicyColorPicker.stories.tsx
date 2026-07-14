import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyColorPicker } from "./ClassicyColorPicker";

const meta = {
	title: "Controls/ColorPicker",
	component: ClassicyColorPicker,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const InWindow = ({ children }: { children: ReactNode }) => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="colors"
			appId="storybook.app"
			title="Colors"
			initialSize={[420, 220]}
			initialPosition={[80, 60]}
		>
			<div style={{ padding: "1em" }}>{children}</div>
		</ClassicyWindow>
	</StoryApp>
);

export const Default: Story = {
	render: () => (
		<InWindow>
			<ClassicyColorPicker
				id="cp-default"
				defaultValue={0xba572c}
				labelTitle="Highlight color:"
			/>
		</InWindow>
	),
};

export const Disabled: Story = {
	render: () => (
		<InWindow>
			<ClassicyColorPicker
				id="cp-disabled"
				defaultValue={0x888888}
				labelTitle="Locked color:"
				disabled={true}
			/>
		</InWindow>
	),
};

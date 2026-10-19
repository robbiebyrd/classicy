import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyOutput } from "@/SystemFolder/SystemResources/Output/ClassicyOutput";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyColorPicker } from "./ClassicyColorPicker";

const meta = {
	title: "Controls/ColorPicker",
	component: ClassicyColorPicker,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hosts the picker in a window of a running app — the dialog it opens is a
 * modal window of that app.
 */
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

/**
 * An uncontrolled swatch seeded with `defaultValue`. Click it to open the Color
 * Picker dialog; OK applies the new colour, Cancel discards it.
 */
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

/**
 * Controlled use: the story owns `value` and shows the confirmed colour as hex
 * beside the swatch, updated from `onChangeFunc` after OK.
 */
export const Controlled: Story = {
	render: () => {
		const [color, setColor] = useState(0x3366cc);
		return (
			<InWindow>
				<ClassicyColorPicker
					id="cp-controlled"
					labelTitle="Accent color:"
					value={color}
					onChangeFunc={setColor}
				/>
				<ClassicyOutput id="cp-controlled-hex" label="Value:" mono>
					{intToHex(color)}
				</ClassicyOutput>
			</InWindow>
		);
	},
};

/** `crayons` replaces the Crayons panel's palette with your own named colours. */
export const CustomCrayons: Story = {
	render: () => (
		<InWindow>
			<ClassicyColorPicker
				id="cp-crayons"
				defaultValue={0x6699ff}
				labelTitle="Label color:"
				crayons={[
					{ name: "Essential", color: 0xff6600 },
					{ name: "Hot", color: 0xdd0000 },
					{ name: "In Progress", color: 0xcc00cc },
					{ name: "Cool", color: 0x6699ff },
					{ name: "Personal", color: 0x0000cc },
					{ name: "Project 1", color: 0x009900 },
					{ name: "Project 2", color: 0x663300 },
				]}
			/>
		</InWindow>
	),
};

/** A disabled swatch: dimmed, and it does not open the dialog. */
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

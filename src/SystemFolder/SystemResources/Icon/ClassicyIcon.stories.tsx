import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useRef } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyIcon } from "./ClassicyIcon";

const meta = {
	title: "Controls/Icon",
	component: ClassicyIcon,
	decorators: [
		(Story) => (
			<div style={{ position: "relative", width: 320, height: 200 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A captioned icon at a fixed position. Click to select it; double-click (or
 * press Enter while focused) to fire `onClickFunc`.
 */
export const Default: Story = {
	args: {
		appId: "storybook.app",
		name: "Macintosh HD",
		icon: ClassicyIcons.system.macClassic as string,
		label: "Macintosh HD",
		initialPosition: [24, 24],
		onClickFunc: fn(),
	},
};

/**
 * With a `holder` the icon can be dragged around its container; `snapTo`
 * rounds each drop onto a 64 px grid, as the file browser's "grid" arrangement
 * does.
 */
export const DraggableWithSnap: Story = {
	args: {
		appId: "storybook.app",
		name: "Read Me",
		icon: ClassicyIcons.system.macClassic as string,
		initialPosition: [24, 24],
		snapTo: [64, 64],
		onClickFunc: fn(),
	},
	render: function Render(args) {
		const holder = useRef<HTMLDivElement>(null);
		return (
			<div ref={holder} style={{ position: "absolute", inset: 0 }}>
				<ClassicyIcon {...args} holder={holder} />
			</div>
		);
	},
};

/**
 * `invisible` fades the icon and caption, as the file browser does for an
 * entry marked `_invisible` when invisible files are shown.
 */
export const Invisible: Story = {
	args: {
		appId: "storybook.app",
		name: "Desktop DB",
		icon: ClassicyIcons.system.macClassic as string,
		initialPosition: [24, 24],
		invisible: true,
	},
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Default.args,
	render: (args: ComponentProps<typeof ClassicyIcon>) => (
		<ClassicyAppearanceProbe>
			<ClassicyIcon {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};

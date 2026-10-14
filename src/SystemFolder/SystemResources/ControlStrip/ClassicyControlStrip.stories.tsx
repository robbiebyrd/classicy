import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import {
	ClassicyControlStrip,
	type ClassicyControlStripModule,
} from "./ClassicyControlStrip";
import { useClassicyDefaultControlStripModules } from "./ClassicyControlStripModules";

const meta = {
	title: "Desktop/ControlStrip",
	component: ClassicyControlStrip,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyControlStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The built-in Sound and Screen Saver modules. */
export const Default: Story = {};

/**
 * HIGOS8 Figure 6-15: a File Sharing module whose menu leads with an italic
 * status line and offers a command that opens its control panel, beside a
 * volume module that pops up a slider instead of a menu (Figure 2-16).
 */
export const CustomModules: Story = {
	render: () => {
		const [sharing, setSharing] = useState(false);
		const [volume, setVolume] = useState(70);
		const builtIns = useClassicyDefaultControlStripModules();
		const modules: ClassicyControlStripModule[] = [
			{
				id: "file-sharing",
				label: "File Sharing",
				icon: ClassicyIcons.system.extensions.appleShare,
				menuItems: [
					{
						id: "file-sharing-status",
						title: sharing ? "1 User Connected" : "No Users Connected",
						disabled: true,
						className: "classicyControlStripStatus",
					},
					{ id: "spacer" },
					{
						id: "file-sharing-open",
						title: "Open File Sharing Control Panel",
						onClickFunc: fn(),
					},
					{ id: "spacer" },
					{
						id: "file-sharing-toggle",
						title: sharing ? "Turn File Sharing Off" : "Turn File Sharing On",
						onClickFunc: () => setSharing((s) => !s),
					},
				],
			},
			{
				id: "volume",
				label: "Volume",
				icon: ClassicyIcons.controlPanels.soundManager.sound66,
				content: (
					// A vertical slider fills its container's height; the padding
					// holds the value readout under the track.
					<div style={{ height: 110, paddingBottom: 20 }}>
						<ClassicySlider
							id="control-strip-volume"
							ariaLabel="Volume"
							orientation="vertical"
							value={volume}
							onChangeFunc={(e) => setVolume(Number(e.target.value))}
						/>
					</div>
				),
			},
			...builtIns,
		];
		return <ClassicyControlStrip modules={modules} />;
	},
};

/** Too narrow for its modules: the scroll arrows step through them. */
export const Scrolling: Story = {
	render: () => {
		const builtIns = useClassicyDefaultControlStripModules();
		const extra = Array.from({ length: 6 }, (_, i) => ({
			...builtIns[i % builtIns.length],
			id: `module-${i}`,
		}));
		return <ClassicyControlStrip modules={extra} defaultWidth={90} />;
	},
};

export const Collapsed: Story = {
	args: { defaultCollapsed: true },
};

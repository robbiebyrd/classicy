import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	ClassicyControlStrip,
	type ClassicyControlStripModule,
} from "./ClassicyControlStrip";
import { useClassicyDefaultControlStripModules } from "./ClassicyControlStripModules";

const meta = {
	title: "Desktop/ControlStrip",
	component: ClassicyControlStrip,
	parameters: {
		...desktopParameters,
		// Each story mounts its own strip in place of the desktop's.
		classicy: { desktop: true, controlStrip: false },
	},
} satisfies Meta<typeof ClassicyControlStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
 * Saver is a menu.
 */
export const Default: Story = {};

/**
 * HIGOS8 Figure 6-15: a File Sharing module whose menu leads with an italic
 * status line and offers a command that opens its control panel, and a CD
 * module, ahead of the built-ins.
 */
export const CustomModules: Story = {
	render: () => {
		const [sharing, setSharing] = useState(false);
		const builtIns = useClassicyDefaultControlStripModules();
		const modules: ClassicyControlStripModule[] = [
			{
				id: "file-sharing",
				label: "File Sharing",
				icon: ClassicyIcons.system.controlStrip.fileSharing,
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
				id: "cd",
				label: "CD",
				icon: ClassicyIcons.system.controlStrip.cd,
				menuItems: [
					{
						id: "cd-status",
						title: "No Audio CD",
						disabled: true,
						className: "classicyControlStripStatus",
					},
				],
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

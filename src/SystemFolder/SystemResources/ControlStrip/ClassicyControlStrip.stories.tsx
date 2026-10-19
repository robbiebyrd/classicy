import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyControlStrip } from "./ClassicyControlStrip";
import {
	type ClassicyControlStripModuleDefinition,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "./ClassicyControlStripRegistry";

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
 * Register modules for as long as a story is showing. Apps call
 * `registerClassicyControlStripModule` once at module scope instead.
 */
const useStoryModules = (modules: ClassicyControlStripModuleDefinition[]) => {
	useEffect(() => {
		for (const module of modules) registerClassicyControlStripModule(module);
		return () => {
			for (const module of modules)
				unregisterClassicyControlStripModule(module.id);
		};
	}, [modules]);
};

/**
 * HIGOS8 Figure 6-15's File Sharing module: an italic status line, a command
 * that opens its control panel, and a toggle. The menu is a hook, so it keeps
 * its own state.
 */
const fileSharingModule: ClassicyControlStripModuleDefinition = {
	id: "story-file-sharing",
	label: "File Sharing",
	icon: ClassicyIcons.system.controlStrip.fileSharing,
	order: 1,
	menuItems: () => {
		const [sharing, setSharing] = useState(false);
		return [
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
		];
	},
};

const cdModule: ClassicyControlStripModuleDefinition = {
	id: "story-cd",
	label: "CD",
	icon: ClassicyIcons.system.controlStrip.cd,
	order: 2,
	menuItems: [
		{
			id: "cd-status",
			title: "No Audio CD",
			disabled: true,
			className: "classicyControlStripStatus",
		},
	],
};

/**
 * The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
 * Saver (contributed by the desktop's Screen Saver extension) is a menu.
 */
export const Default: Story = {};

/** Registered modules join the built-ins; `order` puts these two first. */
const customModules = [fileSharingModule, cdModule];
export const CustomModules: Story = {
	render: (args) => {
		useStoryModules(customModules);
		return <ClassicyControlStrip {...args} />;
	},
};

/**
 * An extension's module: registered with the extension's `appId`, so it shows
 * only while the extension is mounted — the button mounts and unmounts it.
 */
const weatherModule: ClassicyControlStripModuleDefinition = {
	id: "story-weather",
	appId: "StoryWeather.app",
	label: "Weather",
	icon: ClassicyIcons.system.controlStrip.sleep,
	menuItems: [
		{
			id: "weather-status",
			title: "Clear, 72°",
			disabled: true,
			className: "classicyControlStripStatus",
		},
	],
};
const extensionModules = [weatherModule];
export const ExtensionModule: Story = {
	render: (args) => {
		useStoryModules(extensionModules);
		const [installed, setInstalled] = useState(true);
		return (
			<>
				{installed && (
					<ClassicyApp
						id="StoryWeather.app"
						name="Weather"
						icon={ClassicyIcons.system.extension}
						extension
					/>
				)}
				<button type="button" onClick={() => setInstalled((i) => !i)}>
					{installed ? "Remove" : "Install"} the Weather extension
				</button>
				<ClassicyControlStrip {...args} />
			</>
		);
	},
};

/** Built-ins turned off by the host: only the registered modules show. */
export const DisabledBuiltIns: Story = {
	args: { disabledModules: ["classicy-sound", "classicy-screen-saver"] },
	render: (args) => {
		useStoryModules(customModules);
		return <ClassicyControlStrip {...args} />;
	},
};

/** Too narrow for its modules: the scroll arrows step through them. */
const manyModules = Array.from({ length: 6 }, (_, i) => ({
	...(i % 2 ? cdModule : fileSharingModule),
	id: `story-module-${i}`,
}));
export const Scrolling: Story = {
	args: { defaultWidth: 90 },
	render: (args) => {
		useStoryModules(manyModules);
		return <ClassicyControlStrip {...args} />;
	},
};

export const Collapsed: Story = {
	args: { defaultCollapsed: true },
};

/**
 * Control-drag the collapse box to move the strip: it follows the pointer up
 * and down and docks to the edge on the pointer's half of the desktop. Docked
 * right it is mirrored — the tab leads and points left. This story starts it
 * there, part-way up, and puts it back at the lower left when it closes.
 */
export const DockedRight: Story = {
	render: (args) => {
		const dispatch = useAppManagerDispatch();
		useEffect(() => {
			dispatch({
				type: "ClassicyDesktopControlStripSetPosition",
				edge: "right",
				bottom: 160,
			});
			return () =>
				dispatch({
					type: "ClassicyDesktopControlStripSetPosition",
					edge: "left",
					bottom: 0,
				});
		}, [dispatch]);
		return <ClassicyControlStrip {...args} />;
	},
};

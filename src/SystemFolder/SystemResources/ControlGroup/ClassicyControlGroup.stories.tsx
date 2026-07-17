import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyControlGroup } from "./ClassicyControlGroup";

const meta = {
	title: "Controls/ControlGroup",
	component: ClassicyControlGroup,
} satisfies Meta<typeof ClassicyControlGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Connection",
		children: (
			<>
				<ClassicyInput id="cg-host" labelTitle="Host" />
				<ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
			</>
		),
	},
};

// Primary = 2px etched frame (the default look).
export const Primary: Story = {
	args: {
		label: "File Sharing",
		variant: "primary",
		children: (
			<ClassicyCheckbox
				id="cg-primary"
				checked={true}
				label="Share this item"
			/>
		),
	},
};

// Secondary = single 1px line, for lighter nested grouping.
export const Secondary: Story = {
	args: {
		label: "Access Privileges",
		variant: "secondary",
		children: (
			<ClassicyCheckbox id="cg-secondary" checked={true} label="Allow guests" />
		),
	},
};

// Untitled group box (no legend).
export const Untitled: Story = {
	args: {
		children: (
			<ClassicyCheckbox id="cg-untitled" checked={true} label="Enabled" />
		),
	},
};

// Checkbox title: the legend itself is a checkbox that enables the group.
export const CheckboxTitle: Story = {
	args: {
		checkboxTitle: {
			id: "cg-cb-title",
			checked: true,
			label: "Use custom settings",
		},
		children: (
			<>
				<ClassicyInput id="cg-cb-detail" labelTitle="Server" />
				<ClassicyCheckbox id="cg-cb-secure" checked={true} label="Use SSL" />
			</>
		),
	},
};

// Pop-up-menu title: the legend is a pop-up menu that scopes the group.
export const PopUpMenuTitle: Story = {
	args: {
		popUpMenuTitle: {
			id: "cg-popup-title",
			options: [
				{ value: "startup", label: "Startup Disk" },
				{ value: "network", label: "Network" },
			],
			selected: "startup",
		},
		children: (
			<ClassicyCheckbox
				id="cg-popup-detail"
				checked={true}
				label="Show in Finder"
			/>
		),
	},
};

export const Columns: Story = {
	args: {
		label: "Options",
		columns: true,
		children: (
			<>
				<ClassicyCheckbox id="cg-a" checked={true} label="Sound" />
				<ClassicyCheckbox id="cg-b" label="Speech" />
				<ClassicyCheckbox id="cg-c" label="Alerts" />
			</>
		),
	},
};

export const CustomBackground: Story = {
	args: {
		label: "On a White Surface",
		backgroundColor: "#ffffff",
		children: (
			<ClassicyCheckbox id="cg-custom" checked={true} label="Enabled" />
		),
	},
	decorators: [
		(Story) => (
			<div style={{ background: "#ffffff", padding: "16px" }}>
				<Story />
			</div>
		),
	],
};

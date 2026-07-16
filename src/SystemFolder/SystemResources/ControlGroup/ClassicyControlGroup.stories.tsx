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

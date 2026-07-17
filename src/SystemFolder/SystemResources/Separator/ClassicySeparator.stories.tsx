import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicySeparator } from "./ClassicySeparator";

const meta = {
	title: "Controls/Separator",
	component: ClassicySeparator,
} satisfies Meta<typeof ClassicySeparator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	args: {
		orientation: "horizontal",
	},
	decorators: [
		(Story) => (
			<div style={{ width: 260, padding: 16 }}>
				<p style={{ margin: 0 }}>Section above the divider.</p>
				<Story />
				<p style={{ margin: 0 }}>Section below the divider.</p>
			</div>
		),
	],
};

export const Vertical: Story = {
	args: {
		orientation: "vertical",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					alignItems: "stretch",
					height: 80,
					padding: 16,
					gap: 8,
				}}
			>
				<ClassicyButton>Left</ClassicyButton>
				<Story />
				<ClassicyButton>Right</ClassicyButton>
			</div>
		),
	],
};

// Separating groups of controls inside a dialog content region.
export const BetweenControlRows: Story = {
	render: () => (
		<div style={{ width: 260, padding: 16 }}>
			<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
				<ClassicyButton>Cut</ClassicyButton>
				<ClassicyButton>Copy</ClassicyButton>
				<ClassicyButton>Paste</ClassicyButton>
			</div>
			<ClassicySeparator />
			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<ClassicyButton>Undo</ClassicyButton>
				<ClassicyButton>Redo</ClassicyButton>
			</div>
		</div>
	),
};

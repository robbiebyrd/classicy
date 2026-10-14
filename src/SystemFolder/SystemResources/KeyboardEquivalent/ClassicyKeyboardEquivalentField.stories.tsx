import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyKeyboardEquivalentField } from "./ClassicyKeyboardEquivalentField";
import { keyboardEquivalentsInUse } from "./ClassicyKeyboardEquivalentRules";

const APP_ID = "storybook.app";

const meta = {
	title: "Controls/KeyboardEquivalentField",
	component: ClassicyKeyboardEquivalentField,
	parameters: desktopParameters,
	args: { id: "kbd-equivalent", appId: APP_ID, onChange: fn() },
} satisfies Meta<typeof ClassicyKeyboardEquivalentField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The field in a control-panel window. Pass the owning app's id as `appId` so
 * the dialog opens as one of that app's windows.
 */
const InControlPanel = ({
	initial,
	...props
}: ComponentProps<typeof ClassicyKeyboardEquivalentField> & {
	initial: string;
}) => {
	const [shortcut, setShortcut] = useState(initial);
	return (
		<StoryApp id={APP_ID} name="Storybook">
			<ClassicyWindow
				id="kbd-equivalent-panel"
				appId={APP_ID}
				title="Custom Settings"
				initialSize={[380, 0]}
				initialPosition={[40, 60]}
				resizable={false}
				scrollable={false}
			>
				<div style={{ padding: 12 }}>
					<ClassicyKeyboardEquivalentField
						{...props}
						value={shortcut}
						onChange={(next) => {
							props.onChange(next);
							setShortcut(next);
						}}
					/>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
};

// HIGOS8 Figures 6-8 to 6-10: click the button, type a combination with the
// command key, then OK. A combination without one is refused with an alert.
export const Default: Story = {
	render: (args) => (
		<InControlPanel
			{...args}
			initial="⌃⌘S"
			description="This key combination will show and hide the custom settings."
		/>
	),
};

// The second HIG alert case: the combination is already in use. These menu
// commands are passed as `inUse`, so typing ⌘N or ⌘O names its owner.
export const WithMenuConflicts: Story = {
	render: (args) => (
		<InControlPanel
			{...args}
			initial="⌘K"
			inUse={keyboardEquivalentsInUse([
				{ id: "new", title: "New Folder", keyboardShortcut: "⌘N" },
				{ id: "open", title: "Open…", keyboardShortcut: "⌘O" },
			])}
			onHelp={fn()}
		/>
	),
};

export const Disabled: Story = {
	render: (args) => <InControlPanel {...args} initial="⌘K" disabled />,
};

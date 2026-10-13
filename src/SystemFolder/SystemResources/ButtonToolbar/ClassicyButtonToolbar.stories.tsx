import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "./ClassicyButtonToolbar";

const meta = {
	title: "Controls/ButtonToolbar",
	component: ClassicyButtonToolbar,
} satisfies Meta<typeof ClassicyButtonToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Use a bundled icon (Vite rewrites the URL against the build base) rather than
// an absolute "/assets/..." path, so the story renders correctly when Storybook
// is served from a sub-path (e.g. a PR preview at /<repo>/pr-preview/pr-N/).
const icon = ClassicyIcons.system.info;

export const SingleGroup: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Back" />
				<ClassicyBevelButton icon={icon} iconAlt="Forward" />
				<ClassicyBevelButton icon={icon} iconAlt="Stop" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

export const MultipleGroups: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Back" />
				<ClassicyBevelButton icon={icon} iconAlt="Forward" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Zoom in" />
				<ClassicyBevelButton icon={icon} iconAlt="Zoom out" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Settings" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

export const MixedIconAndText: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="New" />
				<ClassicyBevelButton icon={icon} iconAlt="Open" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton>Subscribe</ClassicyBevelButton>
				<ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

// `ClassicyBevelButton` mode="radio" only ever turns itself ON — it has no
// notion of the sibling buttons in its group, so nothing makes them mutually
// exclusive automatically. A real radio *group* has to be driven by a shared
// selection, wiring each button's `on`/`onChangeFunc` to one state value —
// exactly like a plain HTML radio group needs a shared `name`. This story
// does that wiring so "Center" actually turns "Left" off, instead of the
// naive per-button `on` default that would leave both lit.
const alignments = ["Left", "Center", "Right"] as const;

export const ToggleAndRadioGroups: Story = {
	render: function Render() {
		const [alignment, setAlignment] =
			useState<(typeof alignments)[number]>("Left");
		return (
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Bold" />
					<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Italic" />
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					{alignments.map((label) => (
						<ClassicyBevelButton
							key={label}
							mode="radio"
							icon={icon}
							iconAlt={label}
							on={alignment === label}
							onChangeFunc={() => setAlignment(label)}
						/>
					))}
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>
		);
	},
};

// All three sizes stacked for comparison. `large` is the default; `medium`
// and `small` scale every control in the toolbar as a unit.
export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{(["large", "medium", "small"] as const).map((size) => (
				<ClassicyButtonToolbar key={size} size={size}>
					<ClassicyButtonToolbarGroup>
						<ClassicyBevelButton icon={icon} iconAlt="Back" />
						<ClassicyBevelButton icon={icon} iconAlt="Forward" />
					</ClassicyButtonToolbarGroup>
					<ClassicyButtonToolbarGroup>
						<ClassicyBevelButton>Subscribe</ClassicyBevelButton>
					</ClassicyButtonToolbarGroup>
				</ClassicyButtonToolbar>
			))}
		</div>
	),
};

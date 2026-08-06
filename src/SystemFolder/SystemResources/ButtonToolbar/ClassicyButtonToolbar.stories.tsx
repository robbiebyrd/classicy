import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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

// Storybook serves the repo's assets/ at /assets
// (storybook/.storybook/main.ts:17 → staticDirs).
const icon = "/assets/img/icons/system/info.png";

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

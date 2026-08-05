import type { Meta, StoryObj } from "@storybook/react-vite";
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

export const ToggleAndRadioGroups: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Bold" />
				<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Italic" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton mode="radio" on icon={icon} iconAlt="Left" />
				<ClassicyBevelButton mode="radio" icon={icon} iconAlt="Center" />
				<ClassicyBevelButton mode="radio" icon={icon} iconAlt="Right" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

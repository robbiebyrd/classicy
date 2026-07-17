import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyPlacard } from "./ClassicyPlacard";

const meta = {
	title: "Controls/Placard",
	component: ClassicyPlacard,
	args: {
		children: "24 items",
		onSelect: fn(),
	},
} satisfies Meta<typeof ClassicyPlacard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Disabled: Story = {
	args: { disabled: true, children: "0 items" },
};

export const WithPopUpMenu: Story = {
	args: {
		children: "100%",
		menuItems: [
			{ id: "50", title: "50%" },
			{ id: "100", title: "100%" },
			{ id: "200", title: "200%" },
			{ id: "fit", title: "Fit to Window" },
		],
	},
};

export const Clickable: Story = {
	args: { children: "Click me", onClick: fn() },
};

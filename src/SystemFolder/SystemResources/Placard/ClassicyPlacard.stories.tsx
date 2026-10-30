import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
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

/**
 * An information placard: static status text with no `onClick` or
 * `menuItems`, so it renders as a plain panel rather than a button. To see
 * one in its usual spot, see the Desktop/Window "With Placard" story.
 */
export const Info: Story = {};

/** The disabled state: dimmed text that ignores clicks. */
export const Disabled: Story = {
	args: { disabled: true, children: "0 items" },
};

/**
 * A pop-up placard, the magnification control of a Mac OS 8 document
 * window: `menuItems` adds a down-arrow and a menu; the chosen item's id is
 * reported through `onSelect`, and an outside click closes the menu.
 */
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

/**
 * A placard with `onClick` is a button: it shows the pressed state while
 * held and plays the button click sounds.
 */
export const Clickable: Story = {
	args: { children: "Click me", onClick: fn() },
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 *
 * Uses the pop-up placard (`WithPopUpMenu`): the static `Info` placard
 * emits nothing but `mount`.
 */
export const AppearanceHooks: Story = {
	args: WithPopUpMenu.args,
	render: (args: ComponentProps<typeof ClassicyPlacard>) => (
		<ClassicyAppearanceProbe>
			<ClassicyPlacard {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};

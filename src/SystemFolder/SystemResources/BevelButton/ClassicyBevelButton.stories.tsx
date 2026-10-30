import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";
import { ClassicyBevelButton } from "./ClassicyBevelButton";

const meta = {
	title: "Controls/BevelButton",
	component: ClassicyBevelButton,
	args: {
		children: "Tool",
		onClickFunc: fn(),
		onChangeFunc: fn(),
	},
} satisfies Meta<typeof ClassicyBevelButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default `push` mode: a momentary button that pops back up after a click. */
export const Push: Story = {};

/** `bevelWidth="small"` — the 2px bevel (HIGOS8 p.29). */
export const BevelSmall: Story = {
	args: { bevelWidth: "small", children: "Small bevel" },
};

/** `bevelWidth="medium"` — the 3px bevel, and the default. */
export const BevelMedium: Story = {
	args: { bevelWidth: "medium", children: "Medium bevel" },
};

/** `bevelWidth="large"` — the 4px bevel, for larger picture buttons. */
export const BevelLarge: Story = {
	args: { bevelWidth: "large", children: "Large bevel" },
};

/**
 * `square` is for icon-only controls in a palette: a fixed box that lines up
 * with `ClassicyButton`'s square shape, so a mixed toolbar stays on one grid.
 * Inside a `ClassicyButtonToolbar` an icon-only button gets it by default.
 */
export const Square: Story = {
	args: { square: true, children: "⌘" },
};

/** A square `toggle` button held on — the typical style-palette (Bold) control. */
export const SquareToggleOn: Story = {
	args: { square: true, mode: "toggle", on: true, children: "B" },
};

/** `mode="toggle"` in its on state: it behaves like a checkbox, each click flipping `on`. */
export const ToggleOn: Story = {
	args: { mode: "toggle", on: true, children: "Bold" },
};

/** `mode="toggle"` in its off state; click it to latch it on (`onChangeFunc` fires). */
export const ToggleOff: Story = {
	args: { mode: "toggle", on: false, children: "Bold" },
};

/**
 * `mode="radio"` turns on and stays on; clicking it again does nothing. A real
 * group shares one state value — see the ButtonToolbar `ToggleAndRadioGroups`
 * story.
 */
export const Radio: Story = {
	args: { mode: "radio", on: true, children: "Left" },
};

/** The mixed state, for a setting that is on for part of a selection (`aria-pressed="mixed"`). */
export const Mixed: Story = {
	args: { mode: "toggle", mixed: true, children: "Mixed" },
};

/** The `disabled-off` state: dimmed, presses ignored. */
export const DisabledOff: Story = {
	args: { disabled: true, children: "Disabled" },
};

/** The `disabled-on` state: a latched toggle that can no longer be changed. */
export const DisabledOn: Story = {
	args: { disabled: true, on: true, mode: "toggle", children: "Disabled on" },
};

/**
 * `icon` draws a picture before the label; with no label, give the button an
 * `iconAlt` (its accessible name). Bevel buttons can carry text, a picture or
 * both.
 */
export const WithIcon: Story = {
	render: (args) => (
		<div style={{ display: "flex", gap: 8 }}>
			<ClassicyBevelButton {...args} icon={ClassicyIcons.system.info}>
				Get Info
			</ClassicyBevelButton>
			<ClassicyBevelButton
				icon={ClassicyIcons.system.info}
				iconAlt="Get Info"
				square
				onClickFunc={args.onClickFunc}
			/>
		</div>
	),
};

/** A checkable menu whose checkmark follows the current choice. */
const useChoiceMenu = (choices: string[], initial: string) => {
	const [current, setCurrent] = useState(initial);
	const menuItems: ClassicyMenuItem[] = choices.map((choice) => ({
		id: choice,
		title: choice,
		checked: choice === current,
		onClickFunc: () => setCurrent(choice),
	}));
	return { current, menuItems };
};

/**
 * HIGOS8 p.32: clicking shows the menu directly below a down-arrow button. A
 * quick click leaves it open (sticky); press and drag to choose in one motion.
 * The checkmark follows the current choice via each item's `checked`.
 */
export const PopupVertical: Story = {
	args: { mode: "popup", popupArrow: "large", popupDirection: "vertical" },
	render: (args) => {
		const { current, menuItems } = useChoiceMenu(
			["50%", "75%", "100%", "150%", "200%"],
			"100%",
		);
		return (
			<ClassicyBevelButton {...args} menuItems={menuItems}>
				{current}
			</ClassicyBevelButton>
		);
	},
};

/**
 * A right-arrow button (`popupDirection="horizontal"`) opens its menu to the
 * right, flipping left when there is no room.
 */
export const PopupHorizontal: Story = {
	args: { mode: "popup", popupArrow: "small", popupDirection: "horizontal" },
	render: (args) => {
		const { menuItems } = useChoiceMenu(
			["Ascending", "Descending"],
			"Ascending",
		);
		return (
			<ClassicyBevelButton {...args} menuItems={menuItems}>
				Sort
			</ClassicyBevelButton>
		);
	},
};

/**
 * HIGOS8 Figure 2-16: a pop-up bevel button can show a control other than a
 * menu — here a `ClassicyPopUpSlider` passed as `popupContent`, centred on the
 * button with `popupAlign="center"`.
 */
export const PopupSlider: Story = {
	args: { mode: "popup", popupArrow: "large", popupDirection: "horizontal" },
	render: (args) => {
		const [level, setLevel] = useState(60);
		return (
			<ClassicyBevelButton
				{...args}
				aria-label="Volume"
				popupAlign="center"
				popupContent={
					<ClassicyPopUpSlider
						ariaLabel="Volume level"
						value={level}
						onChange={setLevel}
					/>
				}
			>
				Volume {level}
			</ClassicyBevelButton>
		);
	},
};

/**
 * HIGOS8 Figure 2-15 and p.33: in a tool palette, a click picks the tool and
 * holding it past the double-click interval offers that tool's options — the
 * `hold` trigger, the default outside `popup` mode.
 */
export const ToolPaletteHoldForOptions: Story = {
	args: { onClickFunc: fn(), onChangeFunc: fn() },
	render: () => {
		const [tool, setTool] = useState("Marquee");
		const marquee = useChoiceMenu(["Shrink", "No Shrink"], "Shrink");
		const lasso = useChoiceMenu(["Lasso", "See Thru Lasso"], "Lasso");
		const tools = [
			{ name: "Marquee", menu: marquee },
			{ name: "Lasso", menu: lasso },
		];
		return (
			<div role="radiogroup" aria-label="Tools" style={{ display: "flex" }}>
				{tools.map(({ name, menu }) => (
					<ClassicyBevelButton
						key={name}
						mode="radio"
						on={tool === name}
						popupArrow="small"
						menuItems={menu.menuItems}
						onChangeFunc={() => setTool(name)}
					>
						{`${name}: ${menu.current}`}
					</ClassicyBevelButton>
				))}
			</div>
		);
	},
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Push.args,
	render: (args: ComponentProps<typeof ClassicyBevelButton>) => (
		<ClassicyAppearanceProbe>
			<ClassicyBevelButton {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};

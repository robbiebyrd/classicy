import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
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

export const Push: Story = {};

export const BevelSmall: Story = {
	args: { bevelWidth: "small", children: "Small bevel" },
};

export const BevelMedium: Story = {
	args: { bevelWidth: "medium", children: "Medium bevel" },
};

export const BevelLarge: Story = {
	args: { bevelWidth: "large", children: "Large bevel" },
};

// Square is for icon-only controls in a palette: a fixed box that lines up with
// ClassicyButton's square shape, so a mixed toolbar stays on one grid.
export const Square: Story = {
	args: { square: true, children: "⌘" },
};

export const SquareToggleOn: Story = {
	args: { square: true, mode: "toggle", on: true, children: "B" },
};

export const ToggleOn: Story = {
	args: { mode: "toggle", on: true, children: "Bold" },
};

export const ToggleOff: Story = {
	args: { mode: "toggle", on: false, children: "Bold" },
};

export const Radio: Story = {
	args: { mode: "radio", on: true, children: "Left" },
};

export const Mixed: Story = {
	args: { mode: "toggle", mixed: true, children: "Mixed" },
};

export const DisabledOff: Story = {
	args: { disabled: true, children: "Disabled" },
};

export const DisabledOn: Story = {
	args: { disabled: true, on: true, mode: "toggle", children: "Disabled on" },
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

// HIGOS8 p.32: clicking shows the menu directly below a down-arrow button. A
// quick click leaves it open (sticky); press and drag to choose in one motion.
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

// A right-arrow button opens its menu to the right.
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

// HIGOS8 Figure 2-16: a pop-up bevel button can show a control other than a
// menu — here a volume slider.
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

// HIGOS8 Figure 2-15 and p.33: in a tool palette, a click picks the tool and
// holding it past the double-click interval offers that tool's options.
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

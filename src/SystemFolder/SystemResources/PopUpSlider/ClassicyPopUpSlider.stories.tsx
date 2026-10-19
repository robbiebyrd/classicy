import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useState,
} from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyPopUpSlider } from "./ClassicyPopUpSlider";

/**
 * Keeps the story's `value` in local state, as a real consumer must (the
 * slider is fully controlled). The `value` control still wins whenever it is
 * changed.
 */
const LivePopUpSlider = (args: ComponentProps<typeof ClassicyPopUpSlider>) => {
	const [value, setValue] = useState(args.value);
	useEffect(() => setValue(args.value), [args.value]);
	return (
		<ClassicyPopUpSlider
			{...args}
			value={value}
			onChange={(next) => {
				args.onChange(next);
				setValue(next);
			}}
		/>
	);
};

/**
 * A stand-in for the pop-up frame: the slider paints no background, so on its
 * own it sits on the face colour and white top/left highlight that a pop-up
 * bevel button's frame provides.
 */
const PopUpFrame = ({ children }: { children: ReactNode }) => (
	<div
		style={{
			display: "inline-block",
			border: "1px solid var(--color-black)",
			background: "var(--color-system-03)",
			boxShadow: "inset 1px 1px 0 0 var(--color-white)",
		}}
	>
		{children}
	</div>
);

const meta = {
	title: "Controls/PopUpSlider",
	component: ClassicyPopUpSlider,
	args: { ariaLabel: "Volume", value: 60, onChange: fn() },
	render: (args) => (
		<PopUpFrame>
			<LivePopUpSlider {...args} />
		</PopUpFrame>
	),
} satisfies Meta<typeof ClassicyPopUpSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The bare slider in a stand-in pop-up frame. Drag the thumb or click the
 * track; once focused, Up/Down step by one, Page Up/Down by ten and Home/End
 * jump to the ends.
 */
export const Standalone: Story = {};

/** A coarser 0–10 scale: `step` snaps dragging and the arrow keys to whole steps. */
export const CustomRange: Story = {
	args: { ariaLabel: "Level", value: 4, min: 0, max: 10, step: 1 },
};

/** A disabled slider is dimmed, out of the tab order, and ignores the mouse. */
export const Disabled: Story = {
	args: { disabled: true },
};

/**
 * HIGOS8 Figure 2-16: the slider as a pop-up bevel button's `popupContent` —
 * how the Control Strip's Sound module sets the system volume. Click the
 * speaker to open it; the speaker loses its waves at zero.
 */
export const InBevelButton: Story = {
	render: (args) => {
		const [level, setLevel] = useState(args.value);
		return (
			<ClassicyBevelButton
				mode="popup"
				popupArrow="small"
				popupDirection="vertical"
				popupAlign="center"
				aria-label="Volume"
				icon={
					level === 0
						? ClassicyIcons.system.controlStrip.soundOff
						: ClassicyIcons.system.controlStrip.sound
				}
				popupContent={
					<ClassicyPopUpSlider
						{...args}
						value={level}
						onChange={(next) => {
							args.onChange(next);
							setLevel(next);
						}}
					/>
				}
			/>
		);
	},
};

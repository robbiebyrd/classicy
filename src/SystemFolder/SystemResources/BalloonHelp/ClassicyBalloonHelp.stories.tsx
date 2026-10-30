import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyBalloonHelp } from "./ClassicyBalloonHelp";
import { useClassicyBalloonHelp } from "./useClassicyBalloonHelp";

const meta = {
	title: "Controls/BalloonHelp",
	component: ClassicyBalloonHelp,
} satisfies Meta<typeof ClassicyBalloonHelp>;

export default meta;
type Story = StoryObj<typeof meta>;
// For the stories that draw the component themselves in `render` and ignore
// the args: typed against the component (every arg optional), not
// `typeof meta`, which would demand its required props as story args.
type RenderStory = StoryObj<typeof ClassicyBalloonHelp>;

/**
 * A titled balloon at the default `top-left` position and 600 ms delay: rest
 * the pointer on the button until it appears, move away to dismiss it.
 */
export const Default: Story = {
	args: {
		title: "Do Nothing",
		content: "Hover for 600ms to see this Mac OS 8-style help balloon.",
		position: "top-left",
		children: <ClassicyButton isDefault={true}>Hover Me</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ paddingTop: "8em", paddingLeft: "2em" }}>
				<Story />
			</div>
		),
	],
};

/**
 * An untitled balloon pointing up from below (`bottom-center`) with a short
 * 200 ms `delay`. Balloons can open in six positions, and flip on either
 * axis when the preferred one has no room on screen.
 */
export const BottomCenter: Story = {
	args: {
		content: "Balloons can point in six directions.",
		position: "bottom-center",
		delay: 200,
		children: <ClassicyButton>Quick Balloon</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ padding: "2em 6em 10em" }}>
				<Story />
			</div>
		),
	],
};

const HookTarget = () => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(ref, {
		title: "Pinned Badge",
		content: "This element is absolutely positioned; the hook adds no wrapper.",
		position: "top-right",
		delay: 300,
	});
	return (
		<div style={{ position: "relative", width: 320, height: 160 }}>
			<div
				ref={ref}
				{...handlers}
				style={{
					position: "absolute",
					right: 16,
					bottom: 16,
					padding: "4px 8px",
					border: "1px solid var(--color-black)",
					background: "var(--color-white)",
				}}
			>
				Hover me
				{balloon}
			</div>
		</div>
	);
};

/**
 * `useClassicyBalloonHelp(ref, config)` attaches the same behaviour to an
 * element you already own — here an absolutely positioned badge that the
 * component's inline-block wrapper would disturb. Spread `handlers` onto the
 * element and render `balloon` inside it.
 */
export const WithHook: RenderStory = {
	render: () => <HookTarget />,
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyContextualMenuProvider } from "./ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "./ClassicyContextualMenuTarget";

const MENU_ITEMS = [
	{ id: "cut", title: "Cut", keyboardShortcut: "⌘X", onClickFunc: fn() },
	{ id: "copy", title: "Copy", keyboardShortcut: "⌘C", onClickFunc: fn() },
	{ id: "paste", title: "Paste", keyboardShortcut: "⌘V", onClickFunc: fn() },
];

const meta = {
	title: "Controls/ContextualMenuTarget",
	component: ClassicyContextualMenuTarget,
	decorators: [
		(Story) => (
			<ClassicyContextualMenuProvider>
				<div style={{ position: "relative", height: 260, padding: 24 }}>
					<Story />
				</div>
			</ClassicyContextualMenuProvider>
		),
	],
} satisfies Meta<typeof ClassicyContextualMenuTarget>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Right-click the button to open its menu. The provider puts a disabled Help
 * item first (the HIG's required leading item) because the menu has none.
 */
export const ControlWithMenu: Story = {
	args: {
		menuItems: MENU_ITEMS,
		children: <ClassicyButton>Right-click me</ClassicyButton>,
	},
};

/**
 * Targets nest, and the innermost wins: right-click the button for its own
 * menu, or the surrounding panel for the panel's.
 */
export const NestedTargets: Story = {
	args: {
		menuItems: [
			{ id: "panel-refresh", title: "Refresh Panel", onClickFunc: fn() },
		],
		children: (
			<div
				style={{
					padding: 24,
					border: "1px solid var(--color-system-05)",
				}}
			>
				<ClassicyContextualMenuTarget menuItems={MENU_ITEMS}>
					<ClassicyButton>Right-click me</ClassicyButton>
				</ClassicyContextualMenuTarget>
			</div>
		),
	},
};

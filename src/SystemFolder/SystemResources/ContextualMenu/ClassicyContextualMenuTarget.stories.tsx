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

export const ControlWithMenu: Story = {
	args: {
		menuItems: MENU_ITEMS,
		children: <ClassicyButton>Right-click me</ClassicyButton>,
	},
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyKbd } from "./ClassicyKbd";

const meta = {
	title: "Controls/Kbd",
	component: ClassicyKbd,
} satisfies Meta<typeof ClassicyKbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
	args: {
		shortcut: "Cmd+Shift+S",
	},
	decorators: [
		(Story) => (
			<p style={{ margin: 0 }}>
				Save a copy with <Story />.
			</p>
		),
	],
};

export const Keycaps: Story = {
	args: {
		shortcut: "Ctrl+Opt+Cmd+P",
		variant: "keycaps",
	},
};

export const BareKey: Story = {
	args: {
		variant: "keycaps",
		children: "Esc",
	},
};

// The menu-item form: the same component ClassicyMenu renders for
// `keyboardShortcut` entries.
export const InAMenuRow: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				width: 180,
			}}
		>
			<span>Save As…</span>
			<ClassicyKbd shortcut="Cmd+Shift+S" />
		</div>
	),
};

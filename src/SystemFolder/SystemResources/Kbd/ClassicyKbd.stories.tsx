import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyKbd } from "./ClassicyKbd";

const meta = {
	title: "Controls/Kbd",
	component: ClassicyKbd,
} satisfies Meta<typeof ClassicyKbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default `inline` variant inside running text: "Cmd+Shift+S" is
 * normalised to the glyph run ⇧⌘S.
 */
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

/** `variant="keycaps"` draws one raised key cap per key, in canonical ⌃⌥⇧⌘ order. */
export const Keycaps: Story = {
	args: {
		shortcut: "Ctrl+Opt+Cmd+P",
		variant: "keycaps",
	},
};

/** A key with no chord passed as `children` (no `shortcut`), rendered verbatim. */
export const BareKey: Story = {
	args: {
		variant: "keycaps",
		children: "Esc",
	},
};

/**
 * The menu-item form: the same component `ClassicyMenu` renders for
 * `keyboardShortcut` entries, right-aligned beside the command name.
 */
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

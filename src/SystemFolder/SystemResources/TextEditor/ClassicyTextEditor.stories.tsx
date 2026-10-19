import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTextEditor } from "./ClassicyTextEditor";

const meta = {
	title: "Controls/TextEditor",
	component: ClassicyTextEditor,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The frameless default, as used for a full-window document editor: the
 * field fills its parent and shows an inset focus ring when focused.
 */
export const Default: Story = {
	args: {
		id: "te-default",
		prefillValue: "It was a dark and stormy night…",
	},
};

/**
 * The form-field look: `border` draws the HIG 2px recessed edit-text frame,
 * `autoHeight` grows the field with its text, and `labelTitle` adds a
 * linked label above it.
 */
export const Bordered: Story = {
	args: {
		id: "te-bordered",
		labelTitle: "Notes",
		border: true,
		autoHeight: true,
		prefillValue: "SimpleText uses this editor for plain text files.",
	},
};

/** A disabled field: the text cannot be edited and the label (if any) dims. */
export const Disabled: Story = {
	args: {
		id: "te-disabled",
		disabled: true,
		prefillValue: "Read-only content.",
	},
};

/**
 * The three `fontSize` steps, each relative to the theme's UI font size, with
 * the label placed to the left via `labelPosition`.
 */
export const FontSizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{(["small", "medium", "large"] as const).map((size) => (
				<ClassicyTextEditor
					key={size}
					id={`te-size-${size}`}
					labelTitle={size}
					labelPosition="left"
					fontSize={size}
					border
					autoHeight
					prefillValue={`The ${size} text size.`}
				/>
			))}
		</div>
	),
};

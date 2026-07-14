import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyRichTextEditor } from "./ClassicyRichTextEditor";

const meta = {
	title: "Controls/RichTextEditor",
	component: ClassicyRichTextEditor,
} satisfies Meta<typeof ClassicyRichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		content: [
			"# Welcome to Classicy",
			"",
			"A **Markdown** editor styled for Mac OS 8.",
			"",
			"> Blockquotes, headings, and shortcuts all work.",
		].join("\n"),
	},
};

import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { fn } from "storybook/test";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyRichTextEditor } from "./ClassicyRichTextEditor";

const meta = {
	title: "Controls/RichTextEditor",
	component: ClassicyRichTextEditor,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyRichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A Markdown document with a heading, bold text and a block quote. Use the
 * toolbar or type Markdown shortcuts (`# `, `> `, `**bold**`); each edit
 * reports the new Markdown through `onChangeFunc` (see the Actions panel).
 */
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

const ImperativeEditor = () => {
	const editorRef = useRef<MDXEditorMethods>(null);
	const [saved, setSaved] = useState("");
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<div style={{ display: "flex", gap: 8 }}>
				<ClassicyButton
					onClickFunc={() =>
						editorRef.current?.setMarkdown("## Replaced\n\nNew document text.")
					}
				>
					Replace Text
				</ClassicyButton>
				<ClassicyButton
					onClickFunc={() => setSaved(editorRef.current?.getMarkdown() ?? "")}
				>
					Read Markdown
				</ClassicyButton>
			</div>
			<ClassicyRichTextEditor
				editorRef={editorRef}
				content={"Edit me, then click **Read Markdown**."}
			/>
			{saved && <pre>{saved}</pre>}
		</div>
	);
};

/**
 * `content` is only read on mount, so a document that changes later is
 * replaced through `editorRef` (`setMarkdown`), and read back with
 * `getMarkdown`.
 */
export const ImperativeAccess: Story = {
	render: () => <ImperativeEditor />,
};

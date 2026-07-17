import "./ClassicyRichTextEditor.scss";
import {
	BoldItalicUnderlineToggles,
	CodeToggle,
	headingsPlugin,
	InsertThematicBreak,
	MDXEditor,
	type MDXEditorMethods,
	markdownShortcutPlugin,
	quotePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	UndoRedo,
} from "@mdxeditor/editor";
import type { FC as FunctionalComponent, RefObject } from "react";

interface ClassicyRichTextEditorProps {
	content: string;
	editorRef?: RefObject<MDXEditorMethods | null>;
	/** Fired with the current markdown whenever the document is edited. */
	onChangeFunc?: (markdown: string) => void;
}

const editorPlugins = [
	headingsPlugin(),
	quotePlugin(),
	thematicBreakPlugin(),
	markdownShortcutPlugin(),
	toolbarPlugin({
		toolbarContents: () => (
			<>
				<UndoRedo />
				<BoldItalicUnderlineToggles options={["Bold"]} />
				<BoldItalicUnderlineToggles options={["Italic"]} />
				<BoldItalicUnderlineToggles options={["Underline"]} />
				<CodeToggle></CodeToggle>
				<InsertThematicBreak></InsertThematicBreak>
			</>
		),
	}),
];

export const ClassicyRichTextEditor: FunctionalComponent<
	ClassicyRichTextEditorProps
> = ({ content, editorRef, onChangeFunc }) => {
	return (
		<div className={"classicyRichTextEditor"}>
			<MDXEditor
				ref={editorRef}
				markdown={content}
				contentEditableClassName="prose"
				plugins={editorPlugins}
				onChange={onChangeFunc}
			/>
		</div>
	);
};

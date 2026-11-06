import "./ClassicyRichTextEditor.scss";
import {
	BoldItalicUnderlineToggles,
	CodeToggle,
	headingsPlugin,
	InsertThematicBreak,
	MDXEditor,
	markdownShortcutPlugin,
	quotePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	UndoRedo,
} from "@mdxeditor/editor";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	RefObject,
} from "react";

// MDXEditor's `MDXEditorMethods`, restated so the published declarations name
// no `@mdxeditor/editor` type: the bundle carries MDXEditor inside it
// (vite.config.ts keeps it bundled), so a host never installs that package
// and could not resolve its types (story 0153-k0e).
// ClassicyRichTextEditor.test.ts fails to type-check if MDXEditor's methods
// change, and `ref={editorRef}` below if they gain a member.
/**
 * The editor's imperative methods, reached through `editorRef`. They are
 * MDXEditor's `MDXEditorMethods`, so a `useRef<MDXEditorMethods>` fits too.
 */
export interface ClassicyRichTextEditorMethods {
	/** The current document, as Markdown. */
	getMarkdown: () => string;
	/** Replaces the document with `value`, as Markdown. */
	setMarkdown: (value: string) => void;
	/** Inserts Markdown at the cursor (focus the editor first if need be). */
	insertMarkdown: (value: string) => void;
	/** Focuses the editor, then calls `callbackFn`. */
	focus: (
		callbackFn?: () => void,
		opts?: {
			defaultSelection?: "rootStart" | "rootEnd";
			preventScroll?: boolean;
		},
	) => void;
	/** The editable area's HTML. */
	getContentEditableHTML: () => string;
	/** The selection as Markdown; empty when nothing is selected. */
	getSelectionMarkdown: () => string;
}

interface ClassicyRichTextEditorProps {
	/**
	 * The initial document, as Markdown. MDXEditor reads it when it mounts;
	 * to replace the text afterwards call `setMarkdown` through `editorRef`.
	 */
	content: string;
	/**
	 * Receives the MDXEditor instance methods (`getMarkdown`, `setMarkdown`,
	 * `insertMarkdown`, `focus`, …) for imperative access.
	 */
	editorRef?: RefObject<ClassicyRichTextEditorMethods | null>;
	/** Fired with the current markdown whenever the document is edited. */
	onChangeFunc?: (markdown: string) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
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

/**
 * A Markdown rich-text editor built on MDXEditor, framed as a Platinum edit
 * field (HIGOS8 Ch.2 "Edit Text Fields", p.41, 2px recessed frame). Use it
 * where `ClassicyTextEditor`'s plain `<textarea>` is not enough — SimpleText
 * uses it for Markdown files.
 *
 * It ships a fixed toolbar (Undo/Redo, Bold, Italic, Underline, inline code,
 * horizontal rule) plus headings, block quotes, thematic breaks and the
 * Markdown typing shortcuts (`# `, `> `, `**bold**`, …). The editor is
 * uncontrolled: `content` is read only on mount, `onChangeFunc` reports the
 * Markdown after each edit, and `editorRef` exposes MDXEditor's methods
 * (e.g. `setMarkdown`) for replacing the document later.
 *
 * ```tsx
 * <ClassicyRichTextEditor content={"# Notes"} onChangeFunc={setMarkdown} />
 * ```
 */
export const ClassicyRichTextEditor: FunctionalComponent<
	ClassicyRichTextEditorProps
> = ({ content, editorRef, onChangeFunc, className, style }) => {
	return (
		<div
			className={classNames("classicyRichTextEditor", className)}
			style={style}
		>
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

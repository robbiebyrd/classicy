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
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyTextFieldContextMenu } from "@/SystemFolder/SystemResources/App/ClassicyTextFieldMenu.internal";

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
	/**
	 * Fired with the current markdown whenever the document is edited, and
	 * once when MDXEditor rewrites the initial `content` into its own form,
	 * the second argument `true` then (MDXEditor's
	 * `initialMarkdownNormalize`), so a caller comparing the text with what
	 * it loaded can tell that rewrite from an edit.
	 */
	onChangeFunc?: (markdown: string, initialMarkdownNormalize?: boolean) => void;
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
 * The editor's text, the content editable a right-click lands in (never its
 * toolbar), for its own contextual menu.
 */
const editableOf = (target: EventTarget, root: HTMLElement): Element | null => {
	if (!(target instanceof Element)) return null;
	const editable = target.closest('[contenteditable="true"]');
	return editable && root.contains(editable) ? editable : null;
};

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
 * Under a package whose layout says `textField.contextMenu: "edit"`
 * (Windows) a right-click on the text shows its own Edit menu (Undo, Cut,
 * Copy, Paste, Delete, Select All) instead of the window's; the toolbar
 * keeps the window's.
 *
 * The toolbar buttons' tooltips (MDXEditor's, Radix tooltips) open in the
 * desktop the editor is in: in a `classicyRichTextEditorPopups` element the
 * editor appends to its root's `.classicyDesktop` (`document.body` outside
 * one) and passes as MDXEditor's `overlayContainer`, so the active
 * Appearance Package draws them (`.classicyRichTextEditorPopups
 * [data-radix-popper-content-wrapper] > *`): Platinum's and System 7's help
 * balloon, Windows 98's ToolTip (WIG Ch.12 "Tooltips", p.276, Figure 12.6).
 *
 * ```tsx
 * <ClassicyRichTextEditor content={"# Notes"} onChangeFunc={setMarkdown} />
 * ```
 */
export const ClassicyRichTextEditor: FunctionalComponent<
	ClassicyRichTextEditorProps
> = ({ content, editorRef, onChangeFunc, className, style }) => {
	const textMenu = useClassicyTextFieldContextMenu(editableOf);
	// Where MDXEditor puts its pop-ups (the toolbar's tooltips): one element
	// for the editor's life, so MDXEditor appends its popup container to it
	// once, from its first effect, and its tooltips never portal into a
	// container it has dropped. Made before the first render, it joins the
	// desktop the editor is in once the editor's root is in the document.
	const rootRef = useRef<HTMLDivElement>(null);
	const [popups] = useState(() => {
		if (typeof document === "undefined") return undefined;
		const element = document.createElement("div");
		element.className = "classicyRichTextEditorPopups";
		return element;
	});
	useLayoutEffect(() => {
		if (!popups) return;
		const desktop = rootRef.current?.closest(".classicyDesktop");
		(desktop ?? document.body).appendChild(popups);
		return () => popups.remove();
	}, [popups]);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: the right-click belongs to the content editable inside, which the handler finds
		<div
			ref={rootRef}
			className={classNames("classicyRichTextEditor", className)}
			style={style}
			onMouseDown={textMenu?.onMouseDown}
			onContextMenu={textMenu?.onContextMenu}
		>
			<MDXEditor
				ref={editorRef}
				markdown={content}
				contentEditableClassName="prose"
				plugins={editorPlugins}
				onChange={onChangeFunc}
				overlayContainer={popups}
			/>
		</div>
	);
};

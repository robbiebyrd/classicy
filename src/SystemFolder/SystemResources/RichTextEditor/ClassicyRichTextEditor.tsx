import "./ClassicyRichTextEditor.scss";
import {
  BoldItalicUnderlineToggles,
  CodeToggle,
  headingsPlugin,
  InsertThematicBreak,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import React, { RefObject } from "react";

interface ClassicyRichTextEditorProps {
  content: string;
  editorRef?: RefObject<MDXEditorMethods | null>;
}

export const ClassicyRichTextEditor: React.FC<ClassicyRichTextEditorProps> = ({
  content,
  editorRef,
}) => {
  return (
    <div className={"classicyRichTextEditor"}>
      <MDXEditor
        ref={editorRef}
        markdown={content}
        contentEditableClassName="prose"
        plugins={[
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
        ]}
      />
    </div>
  );
};

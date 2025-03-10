import classicyRichTextEditorStyles from '@/app/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.module.scss'
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
} from '@mdxeditor/editor'
import { FC } from 'react'

interface ClassicyRichTextEditorProps {
    content: string
    editorRef?: React.MutableRefObject<MDXEditorMethods | null>
}

const ClassicyRichTextEditor: FC<ClassicyRichTextEditorProps> = ({ content, editorRef }) => {
    return (
        <div className={classicyRichTextEditorStyles.classicyRichTextEditor}>
            <MDXEditor
                ref={editorRef}
                markdown={content}
                contentEditableClassName="prose"
                plugins={[
                    headingsPlugin(),
                    headingsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    markdownShortcutPlugin(),
                    toolbarPlugin({
                        toolbarContents: () => (
                            <>
                                <UndoRedo />
                                <BoldItalicUnderlineToggles />
                                <CodeToggle></CodeToggle>
                                <InsertThematicBreak></InsertThematicBreak>
                            </>
                        ),
                    }),
                ]}
            />
        </div>
    )
}

export default ClassicyRichTextEditor

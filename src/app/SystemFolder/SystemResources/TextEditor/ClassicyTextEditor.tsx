import classicyTextEditorStyles from '@/app/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.module.scss'
import React from 'react'

interface EditorProps {
    content: string
}

const ClassicyTextEditor: React.FC<EditorProps> = ({ content }) => {
    return (
        <div>
            <textarea className={classicyTextEditorStyles.classicyTextEditor}>{content}</textarea>
        </div>
    )
}

export default ClassicyTextEditor

import './ClassicyTextEditor.scss'
import React from 'react'

interface EditorProps {
    content: string
}

const ClassicyTextEditor: React.FC<EditorProps> = ({ content }) => {
    return (
        <div>
            <textarea className={"classicyTextEditor"}>{content}</textarea>
        </div>
    )
}

import "./ClassicyTextEditor.scss";
import React from "react";

export interface EditorProps {
  content: string;
}

export const ClassicyTextEditor: React.FC<EditorProps> = ({ content }) => {
  return (
    <div>
      <textarea className={"classicyTextEditor"}>{content}</textarea>
    </div>
  );
};

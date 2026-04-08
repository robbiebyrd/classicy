import "./ClassicyTextEditor.scss";
import type { FC as FunctionalComponent } from "react";

export interface EditorProps {
	content: string;
}

export const ClassicyTextEditor: FunctionalComponent<EditorProps> = ({
	content,
}) => {
	return (
			<textarea className={"classicyTextEditor"}>{content}</textarea>
	);
};

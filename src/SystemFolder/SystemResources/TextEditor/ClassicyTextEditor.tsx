import "./ClassicyTextEditor.scss";
import type { FC as FunctionalComponent } from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import classNames from "classnames";

export interface EditorProps {
	id?: string;
	content?: string;
	prefillValue?: string;
	disabled?: boolean;
	labelDisabled?: boolean;
	autoHeight?: boolean;
	border?: boolean;
	fontSize?: ClassicyControlLabelSize;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
}

const fontSizeClass: Record<ClassicyControlLabelSize, string> = {
	small: "classicyTextEditorSizeSmall",
	medium: "classicyTextEditorSizeMedium",
	large: "classicyTextEditorSizeLarge",
};

export const ClassicyTextEditor: FunctionalComponent<EditorProps> = ({
	id,
	content = "",
	prefillValue,
	disabled = false,
	labelDisabled,
	autoHeight = false,
	border = false,
	fontSize = "medium",
	labelTitle,
	labelSize = "medium",
	labelPosition = "above",
}) => {
	return (
		<div className={classNames("classicyTextEditorHolder", labelPositionClass(labelPosition))}>
			{labelTitle && (
				<ClassicyControlLabel label={labelTitle} labelFor={id} labelSize={labelSize} disabled={labelDisabled ?? disabled} />
			)}
			<textarea
				id={id}
				disabled={disabled}
				className={classNames(
					"classicyTextEditor",
					fontSizeClass[fontSize],
					autoHeight && "classicyTextEditorAutoHeight",
					border && "classicyTextEditorBorder",
				)}
				defaultValue={prefillValue ?? content}
			/>
		</div>
	);
};

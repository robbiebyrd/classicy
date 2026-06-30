import "./ClassicyTextEditor.scss";
import classNames from "classnames";
import { type ChangeEventHandler, type FC as FunctionalComponent, useEffect, useState } from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

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
	onChangeFunc?: ChangeEventHandler<HTMLTextAreaElement>;
}

const fontSizeClass: Record<ClassicyControlLabelSize, string> = {
	small: "classicyTextEditorSizeSmall",
	medium: "classicyTextEditorSizeMedium",
	large: "classicyTextEditorSizeLarge",
};

export const ClassicyTextEditor: FunctionalComponent<EditorProps> = ({
	id,
	content,
	prefillValue,
	disabled = false,
	labelDisabled,
	autoHeight = false,
	border = false,
	fontSize = "medium",
	labelTitle,
	labelSize = "medium",
	labelPosition = "above",
	onChangeFunc,
}) => {
	// Controlled with internal state so the editor reflects later prefillValue/
	// content changes. A bare <textarea defaultValue> is uncontrolled and snapshots
	// its text once at mount, ignoring prop updates — which breaks any consumer that
	// fills the value asynchronously (e.g. text fetched after the editor renders).
	const [value, setValue] = useState(prefillValue ?? content ?? "");
	useEffect(() => {
		setValue(prefillValue ?? content ?? "");
	}, [prefillValue, content]);

	return (
		<div
			className={classNames(
				"classicyTextEditorHolder",
				labelPositionClass(labelPosition),
			)}
		>
			{labelTitle && (
				<ClassicyControlLabel
					label={labelTitle}
					labelFor={id}
					labelSize={labelSize}
					disabled={labelDisabled ?? disabled}
				/>
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
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
					onChangeFunc?.(e);
				}}
			/>
		</div>
	);
};

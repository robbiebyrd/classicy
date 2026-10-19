import "./ClassicyTextEditor.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type ChangeEventHandler,
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export interface EditorProps {
	/** Id of the `<textarea>`; also links the label to it. */
	id?: string;
	/**
	 * Initial text. Equivalent to `prefillValue`, which wins when both are set.
	 * A later change to either prop replaces the current text.
	 */
	content?: string;
	/**
	 * Initial text (takes precedence over `content`). A later change replaces
	 * the current text, so text loaded asynchronously still appears.
	 */
	prefillValue?: string;
	/** Disables the field (and dims its label). Defaults to `false`. */
	disabled?: boolean;
	/** Dims the label independently of the field. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/**
	 * Grow with the text (CSS `field-sizing: content`, at least three control
	 * heights) instead of filling the parent's height. Defaults to `false`.
	 */
	autoHeight?: boolean;
	/**
	 * Draw the HIG 2px recessed edit-text frame. Off by default, for editors
	 * that fill a window. Defaults to `false`.
	 */
	border?: boolean;
	/** Text size, relative to the theme UI font. Defaults to `"medium"`. */
	fontSize?: ClassicyControlLabelSize;
	/** Label text; no label is drawn when omitted. */
	labelTitle?: string;
	/** Label size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the field. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Fired with the native change event on every edit. */
	onChangeFunc?: ChangeEventHandler<HTMLTextAreaElement>;
}

const fontSizeClass: Record<ClassicyControlLabelSize, string> = {
	small: "classicyTextEditorSizeSmall",
	medium: "classicyTextEditorSizeMedium",
	large: "classicyTextEditorSizeLarge",
};

/**
 * A multi-line plain-text edit field (HIGOS8 Ch.2 "Edit Text Fields", p.41) —
 * the Classicy replacement for a raw `<textarea>`, which it renders. It fills
 * its parent by default, which suits a full-window editor such as
 * SimpleText's; inside a form, turn on `border` (the HIG 2px recessed frame)
 * and usually `autoHeight`. A focused field shows an inset focus ring.
 *
 * The text is held internally, seeded from `prefillValue` (or `content`) and
 * reset whenever either prop changes; `onChangeFunc` reports each edit. For
 * Markdown or styled text use `ClassicyRichTextEditor`. A window whose only
 * content is a full-size editor should pass `scrollable={false}`, since the
 * textarea scrolls itself.
 *
 * ```tsx
 * <ClassicyTextEditor
 *     id="notes"
 *     labelTitle="Notes"
 *     border
 *     autoHeight
 *     onChangeFunc={(e) => setNotes(e.target.value)}
 * />
 * ```
 */
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

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			setValue(e.target.value);
			onChangeFunc?.(e);
		},
		[onChangeFunc],
	);

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
				onChange={handleChange}
			/>
		</div>
	);
};

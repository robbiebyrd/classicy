import "./ClassicyOutput.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, PropsWithChildren } from "react";
import {
	ClassicyControlLabel,
	type ClassicyLabelAlign,
	type ClassicyLabelPosition,
	labelAlignClass,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

type ClassicyOutputProps = PropsWithChildren<{
	/** Id of the `<output>` element; links the label to it. */
	id: string;
	/** Convenience alternative to `children` for simple scalar results. */
	value?: string | number;
	/** ids of the controls that produced this result (the `for` attribute). */
	htmlFor?: string[];
	/** Visible label text. Omit for no label. */
	label?: string;
	/** Where the label sits relative to the field. Defaults to `"left"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Horizontal alignment of the label. Defaults to `"left"`. */
	labelAlign?: ClassicyLabelAlign;
	/**
	 * `plain` is HIG static text; `inset` is the white beveled read-only
	 * result well (the classic calculator-style display). Defaults to `plain`.
	 */
	variant?: "plain" | "inset";
	/** Render in the mono font — for tabular or numeric results. */
	mono?: boolean;
	/**
	 * Dim the field. HIGOS8 Ch.2 "Static Text Fields" (p.42): a static text
	 * field may be active or disabled, the disabled state shown dimmed.
	 */
	disabled?: boolean;
}>;

/**
 * The `<output>` equivalent — and it renders a real `<output>`: a read-only
 * result computed from other controls, such as a total or a converted value.
 * `plain` is a HIG static text field (HIGOS8 Ch.2 "Static Text Fields", p.42);
 * `inset` is the white beveled result well. `disabled` dims it.
 *
 * Pass the result as `value` (wins when set) or as `children`, and list the
 * ids of the controls that produced it in `htmlFor`. The label defaults to the
 * left, the usual "Total: 42" row. For a value the user edits, use
 * `ClassicyInput`; for a plain caption, `ClassicyControlLabel`.
 */
export const ClassicyOutput: FunctionalComponent<ClassicyOutputProps> = ({
	id,
	value,
	htmlFor,
	label,
	labelPosition = "left",
	labelAlign = "left",
	variant = "plain",
	mono,
	disabled,
	children,
}) => {
	const content = (
		<output
			id={id}
			htmlFor={htmlFor?.join(" ")}
			className={classNames(
				"classicyOutput",
				variant === "inset" ? "classicyOutputInset" : "classicyOutputPlain",
				mono ? "classicyOutputMono" : "",
				disabled ? "classicyOutputDisabled" : "",
			)}
		>
			{value ?? children}
		</output>
	);

	if (!label) return content;

	return (
		<div
			className={classNames(
				labelPositionClass(labelPosition),
				labelAlignClass(labelAlign),
			)}
		>
			<ClassicyControlLabel label={label} labelFor={id} disabled={disabled} />
			{content}
		</div>
	);
};

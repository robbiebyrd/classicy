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
	id: string;
	/** Convenience alternative to `children` for simple scalar results. */
	value?: string | number;
	/** ids of the controls that produced this result (the `for` attribute). */
	htmlFor?: string[];
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelAlign?: ClassicyLabelAlign;
	/**
	 * `plain` is HIG static text; `inset` is the white beveled read-only
	 * result well (the classic calculator-style display).
	 */
	variant?: "plain" | "inset";
	/** Render in the mono font — for tabular or numeric results. */
	mono?: boolean;
}>;

export const ClassicyOutput: FunctionalComponent<ClassicyOutputProps> = ({
	id,
	value,
	htmlFor,
	label,
	labelPosition = "left",
	labelAlign = "left",
	variant = "plain",
	mono,
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
			<ClassicyControlLabel label={label} labelFor={id} />
			{content}
		</div>
	);
};

import "./ClassicyProgressBar.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent } from "react";
import {
	ClassicyControlLabel,
	type ClassicyLabelAlign,
	type ClassicyLabelPosition,
	labelAlignClass,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ClassicyProgressProps {
	value?: number;
	max?: number;
	indeterminate?: boolean;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelAlign?: ClassicyLabelAlign;
}

export const ClassicyProgressBar: FunctionalComponent<
	ClassicyProgressProps
> = ({
	max = 100,
	value = 0,
	indeterminate,
	label,
	labelPosition = "above",
	labelAlign = "left",
}) => {
	const effectiveMax = indeterminate ? 100 : max;
	const effectiveValue = indeterminate ? 100 : value;

	const bar = (
		<div
			className={classNames(
				"classicyProgress",
				indeterminate
					? "classicyProgressIndeterminate"
					: "classicyProgressDeterminate",
			)}
		>
			<progress max={effectiveMax} value={effectiveValue} />
		</div>
	);

	if (!label) return bar;

	return (
		<div
			className={classNames(
				labelPositionClass(labelPosition),
				labelAlignClass(labelAlign),
			)}
		>
			<ClassicyControlLabel label={label} />
			{bar}
		</div>
	);
};

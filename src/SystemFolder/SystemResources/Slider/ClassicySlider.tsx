import "./ClassicySlider.scss";
import classNames from "classnames";
import type {
	ChangeEventHandler,
	FC as FunctionalComponent,
} from "react";
import { useEffect, useRef } from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ClassicySliderProps {
	id: string;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	highlighted?: boolean;
	valueLabel?: string;
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
}

export const ClassicySlider: FunctionalComponent<ClassicySliderProps> = ({
	id,
	labelTitle,
	labelSize = "medium",
	labelPosition = "above",
	value,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	highlighted = false,
	valueLabel,
	onChangeFunc,
}) => {
	// Uncontrolled input with ref-sync: avoids Safari freeze bug where React's
	// controlled value reconciliation conflicts with native slider capture on mouseup.
	const inputRef = useRef<HTMLInputElement>(null);
	// Only write to the DOM when value changes externally (i.e. the DOM doesn't
	// already reflect it). During a drag, the DOM value already equals the prop
	// value so this is a no-op — avoiding the write that causes Safari to lose
	// native slider capture and freeze the page.
	useEffect(() => {
		if (inputRef.current && inputRef.current.value !== String(value)) {
			inputRef.current.value = String(value);
		}
	}, [value]);

	const sizeClassMap: Record<ClassicyControlLabelSize, string> = {
		small: "classicyControlLabelSizeSmall",
		medium: "classicyControlLabelSizeMedium",
		large: "classicyControlLabelSizeLarge",
	};

	const slider = (
		<div className="classicySliderTrackGroup">
			<input
				ref={inputRef}
				id={id}
				type="range"
				className={classNames(
					"classicySlider",
					highlighted && "classicySliderHighlighted",
					disabled && "classicySliderDisabled",
				)}
				defaultValue={value}
				min={min}
				max={max}
				step={step}
				disabled={disabled}
				onChange={onChangeFunc}
			/>
			<span className={classNames("classicySliderValue", sizeClassMap[labelSize])}>
				{valueLabel !== undefined ? valueLabel : value}
			</span>
		</div>
	);

	if (!labelTitle) return slider;

	return (
		<div className={labelPositionClass(labelPosition)}>
			<ClassicyControlLabel
				label={labelTitle}
				labelFor={id}
				labelSize={labelSize}
				disabled={disabled}
			/>
			{slider}
		</div>
	);
};

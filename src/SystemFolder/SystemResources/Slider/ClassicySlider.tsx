import "./ClassicySlider.scss";
import classNames from "classnames";
import type {
	ChangeEventHandler,
	FC as FunctionalComponent,
	SyntheticEvent,
} from "react";
import { useEffect, useRef } from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export interface ClassicySliderTicks {
	/** Tick positions as percentages (0–100) along the thumb-travel axis. */
	positions: number[];
	/** Density-clamped interval in value units; only set for numeric tickInterval. */
	snapStep?: number;
}

// At most one tick per 2% of the value range (≤ 51 marks, endpoints included).
const MAX_TICKS_PER_RANGE = 50;

export const computeSliderTicks = (
	tickInterval: number | "center" | undefined,
	min: number,
	max: number,
): ClassicySliderTicks => {
	const range = max - min;
	if (tickInterval === undefined || range <= 0) return { positions: [] };
	if (tickInterval === "center") return { positions: [50] };
	if (!Number.isFinite(tickInterval) || tickInterval <= 0) {
		return { positions: [] };
	}

	const interval = Math.max(tickInterval, range / MAX_TICKS_PER_RANGE);
	// Index-based loop avoids float drift from repeated addition; the epsilon
	// admits endpoints that land on the grid within rounding error.
	const count = Math.floor(range / interval + 1e-6) + 1;
	const positions = Array.from({ length: count }, (_, k) =>
		Math.min(100, (k * interval * 100) / range),
	);
	return { positions, snapStep: interval };
};

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
	/**
	 * Accessible name for the slider's input. Use when the slider has no visible
	 * `labelTitle` (e.g. a compact slider in a toolbar or media overlay) so
	 * assistive technology still announces what it controls.
	 */
	ariaLabel?: string;
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	/**
	 * Fired once when the user finishes adjusting the slider — on pointer release
	 * or key release — rather than on every intermediate value like `onChangeFunc`.
	 * Receives the committed numeric value. Use this to defer expensive work
	 * (persistence, network writes, store dispatches) to the end of a drag while
	 * keeping `onChangeFunc` for live, per-tick updates.
	 */
	onCommitFunc?: (value: number) => void;
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
	ariaLabel,
	onChangeFunc,
	onCommitFunc,
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

	// Commit the current value once the user releases the slider — on pointer up
	// (mouse, touch, and pen all surface as pointer events) or key up. onChangeFunc
	// fires continuously during a drag; onCommitFunc fires only at the end, so
	// consumers can keep live UI responsive while deferring expensive side effects.
	const handleCommit = (e: SyntheticEvent<HTMLInputElement>) => {
		if (onCommitFunc) onCommitFunc(Number(e.currentTarget.value));
	};

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
				aria-label={ariaLabel}
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
				onPointerUp={onCommitFunc ? handleCommit : undefined}
				onKeyUp={onCommitFunc ? handleCommit : undefined}
			/>
			<span
				className={classNames("classicySliderValue", sizeClassMap[labelSize])}
			>
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

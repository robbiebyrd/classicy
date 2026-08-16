import "./ClassicyMeter.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactElement } from "react";
import {
	ClassicyControlLabel,
	type ClassicyLabelAlign,
	type ClassicyLabelPosition,
	labelAlignClass,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export type ClassicyMeterZone = "optimal" | "suboptimal" | "bad";

export interface ClassicyMeterBounds {
	min?: number;
	max?: number;
	low?: number;
	high?: number;
	optimum?: number;
}

// `low`/`high` split the range into up to three regions; the region holding
// `optimum` is optimal, an adjacent region is suboptimal, and a region two
// away is bad. This mirrors the native <meter> gauge semantics, so consumers
// can port markup without relearning the thresholds.
const regionOf = (value: number, low?: number, high?: number): number => {
	if (low !== undefined && value < low) return 0;
	if (high !== undefined && value > high) return 2;
	return 1;
};

export const meterZone = (
	value: number,
	{ low, high, optimum }: ClassicyMeterBounds = {},
): ClassicyMeterZone => {
	const valueRegion = regionOf(value, low, high);
	const optimumRegion =
		optimum !== undefined ? regionOf(optimum, low, high) : 1;
	const distance = Math.abs(valueRegion - optimumRegion);
	if (distance === 0) return "optimal";
	if (distance === 1) return "suboptimal";
	return "bad";
};

const zoneClass: Record<ClassicyMeterZone, string> = {
	optimal: "classicyMeterOptimal",
	suboptimal: "classicyMeterSuboptimal",
	bad: "classicyMeterBad",
};

interface ClassicyMeterProps extends ClassicyMeterBounds {
	value: number;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelAlign?: ClassicyLabelAlign;
	/** Print the numeric value beside the gauge. */
	showValue?: boolean;
	/**
	 * Render as this many discrete LED-style segments (AV level-meter look)
	 * instead of a continuous bar.
	 */
	segments?: number;
}

export const ClassicyMeter: FunctionalComponent<ClassicyMeterProps> = ({
	value,
	min = 0,
	max = 100,
	low,
	high,
	optimum,
	label,
	labelPosition = "above",
	labelAlign = "left",
	showValue,
	segments,
}) => {
	const span = max - min;
	const fraction =
		span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
	const zone = meterZone(value, { min, max, low, high, optimum });

	const gauge = (
		// biome-ignore lint/a11y/useSemanticElements: native <meter> cannot be Platinum-styled cross-browser (UA zone colors, no segment rendering)
		<div
			className={classNames(
				"classicyMeter",
				zoneClass[zone],
				segments ? "classicyMeterSegmented" : "",
			)}
			role="meter"
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-label={label}
		>
			{segments ? (
				Array.from({ length: segments }, (_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by definition
						key={index}
						className={classNames(
							"classicyMeterSegment",
							index < Math.round(fraction * segments)
								? "classicyMeterSegmentOn"
								: "",
						)}
					/>
				))
			) : (
				<div
					className="classicyMeterFill"
					style={{ width: `${fraction * 100}%` }}
				/>
			)}
		</div>
	);

	let indicator: ReactElement = gauge;
	if (showValue) {
		indicator = (
			<div className="classicyMeterRow">
				{gauge}
				<span className="classicyMeterValue">{value}</span>
			</div>
		);
	}

	if (!label) return indicator;

	return (
		<div
			className={classNames(
				labelPositionClass(labelPosition),
				labelAlignClass(labelAlign),
			)}
		>
			<ClassicyControlLabel label={label} />
			{indicator}
		</div>
	);
};

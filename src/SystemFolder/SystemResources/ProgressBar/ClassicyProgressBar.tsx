import "./ClassicyProgressBar.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactElement } from "react";
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
	/**
	 * Renders the asynchronous "chasing arrows" indicator — the small spinning
	 * pair of arrows the HIG prescribes for background processes whose extent is
	 * unknown and whose progress needn't occupy a full bar. Overrides the bar.
	 */
	chasingArrows?: boolean;
	/**
	 * When true, an `indeterminate` bar flips to determinate display as soon as a
	 * concrete `value` is supplied — i.e. once the scope of the task becomes
	 * known. Lets a single component start "barber-pole" and finish as a filling
	 * bar without the consumer swapping the `indeterminate` flag.
	 */
	autoSwitch?: boolean;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelAlign?: ClassicyLabelAlign;
}

// Two comma-shaped "chasing" arrows arranged around a ring, drawn with
// currentColor so the theme accent tints them. Spun by CSS.
const ChasingArrows: FunctionalComponent = () => (
	<svg
		className="classicyProgressChasingArrowsSpinner"
		viewBox="0 0 32 32"
		width="16"
		height="16"
		role="img"
		aria-hidden="true"
		focusable="false"
	>
		<g fill="currentColor">
			<path d="M16 3a13 13 0 0 1 12.5 9.4l-3.8 1.1A9 9 0 0 0 16 7z" />
			<path d="M24.7 9.5 30 12l-2 5.6z" />
			<path d="M16 29A13 13 0 0 1 3.5 19.6l3.8-1.1A9 9 0 0 0 16 25z" />
			<path d="M7.3 22.5 2 20l2-5.6z" />
		</g>
	</svg>
);

export const ClassicyProgressBar: FunctionalComponent<
	ClassicyProgressProps
> = ({
	max = 100,
	value,
	indeterminate,
	chasingArrows,
	autoSwitch,
	label,
	labelPosition = "above",
	labelAlign = "left",
}) => {
	// autoSwitch: once a value is known, a task that started indeterminate should
	// present as a determinate bar.
	const hasValue = value !== undefined;
	const resolvedIndeterminate = indeterminate && !(autoSwitch && hasValue);

	const effectiveMax = resolvedIndeterminate ? 100 : max;
	const effectiveValue = resolvedIndeterminate ? 100 : (value ?? 0);

	let indicator: ReactElement;
	if (chasingArrows) {
		indicator = (
			<div
				className="classicyProgress classicyProgressChasingArrows"
				role="progressbar"
				aria-busy="true"
				aria-label={label}
			>
				<ChasingArrows />
			</div>
		);
	} else {
		indicator = (
			<div
				className={classNames(
					"classicyProgress",
					resolvedIndeterminate
						? "classicyProgressIndeterminate"
						: "classicyProgressDeterminate",
				)}
			>
				<progress max={effectiveMax} value={effectiveValue} />
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

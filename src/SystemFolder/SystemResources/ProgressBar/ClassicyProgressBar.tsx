import "./ClassicyProgressBar.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	ReactElement,
} from "react";
import {
	ClassicyControlLabel,
	type ClassicyLabelAlign,
	type ClassicyLabelPosition,
	labelAlignClass,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ClassicyProgressProps {
	/** Amount done, out of `max`. Ignored while indeterminate. Defaults to `0`. */
	value?: number;
	/** The value that means "complete". Defaults to `100`. */
	max?: number;
	/**
	 * Draws the barber-pole (striped, moving) bar for a task whose length is
	 * not yet known. See `autoSwitch`.
	 */
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
	/** Visible label text (e.g. "Copying files…"); names the chasing arrows for assistive tech. */
	label?: string;
	/** Where the label sits relative to the bar. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Horizontal alignment of the label. Defaults to `"left"`. */
	labelAlign?: ClassicyLabelAlign;
	/** Extra class names, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	className?: string;
	/** Inline style, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	style?: CSSProperties;
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

/**
 * The `<progress>` equivalent: a Platinum progress indicator (HIGOS8 Ch.2
 * "Progress Indicators", p.52). A determinate bar fills left to right as
 * `value` approaches `max`; an `indeterminate` bar shows the striped
 * barber-pole for work of unknown length; `chasingArrows` swaps the bar for
 * the small spinning arrows the HIG prescribes for background work.
 *
 * The HIG says to switch from indeterminate to determinate once the scope of
 * a task is known — `autoSwitch` does that as soon as a `value` arrives, so
 * the same element can carry a task from start to finish. The bar has a
 * fixed height and takes its colour from the theme accent. For a measurement
 * within a range (disk use, battery) use `ClassicyMeter` instead.
 */
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
	className,
	style,
}) => {
	// autoSwitch: once a value is known, a task that started indeterminate should
	// present as a determinate bar.
	const hasValue = value !== undefined;
	const resolvedIndeterminate = indeterminate && !(autoSwitch && hasValue);

	const effectiveMax = resolvedIndeterminate ? 100 : max;
	const effectiveValue = resolvedIndeterminate ? 100 : (value ?? 0);

	// The passthrough lands on the label wrapper when there is one, else on the bar.
	const indicatorClassName = label ? undefined : className;
	const indicatorStyle = label ? undefined : style;

	let indicator: ReactElement;
	if (chasingArrows) {
		indicator = (
			<div
				className={classNames(
					"classicyProgress classicyProgressChasingArrows",
					indicatorClassName,
				)}
				style={indicatorStyle}
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
					indicatorClassName,
				)}
				style={indicatorStyle}
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
				className,
			)}
			style={style}
		>
			<ClassicyControlLabel label={label} />
			{indicator}
		</div>
	);
};

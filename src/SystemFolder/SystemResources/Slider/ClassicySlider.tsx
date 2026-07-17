import "./ClassicySlider.scss";
import classNames from "classnames";
import type {
	ChangeEventHandler,
	CSSProperties,
	FC as FunctionalComponent,
	ReactNode,
	PointerEvent as ReactPointerEvent,
	SyntheticEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
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

/** Orientation of the slider's travel axis. */
export type ClassicySliderOrientation = "horizontal" | "vertical";

/**
 * Direction the thumb's indicator (its pointed edge) faces. The Mac OS 8 HIG
 * lets a slider's indicator point toward the track it annotates, or be
 * "nondirectional" (a plain, unpointed knob) when direction carries no meaning.
 */
export type ClassicySliderIndicatorDirection =
	| "up"
	| "down"
	| "left"
	| "right"
	| "nondirectional";

const indicatorClassMap: Record<ClassicySliderIndicatorDirection, string> = {
	up: "classicySliderIndicatorUp",
	down: "classicySliderIndicatorDown",
	left: "classicySliderIndicatorLeft",
	right: "classicySliderIndicatorRight",
	nondirectional: "classicySliderIndicatorNondirectional",
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
	/**
	 * Travel axis. `"horizontal"` (default) tracks left→right; `"vertical"`
	 * tracks bottom→top. Ticks, labels and the ghost indicator follow the axis.
	 */
	orientation?: ClassicySliderOrientation;
	/**
	 * Which way the thumb's pointed indicator faces. Defaults to `"down"` for
	 * horizontal sliders and `"left"` for vertical sliders (the HIG's convention
	 * of pointing at the track). `"nondirectional"` renders an unpointed knob.
	 */
	indicatorDirection?: ClassicySliderIndicatorDirection;
	/**
	 * When true, a translucent "ghost" copy of the thumb trails the pointer while
	 * the user drags, echoing the Mac OS 8 shadow indicator. Off by default.
	 */
	ghost?: boolean;
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	/**
	 * Fired once when the user finishes adjusting the slider — on pointer release
	 * or key release — rather than on every intermediate value like `onChangeFunc`.
	 * Receives the committed numeric value. Use this to defer expensive work
	 * (persistence, network writes, store dispatches) to the end of a drag while
	 * keeping `onChangeFunc` for live, per-tick updates.
	 */
	onCommitFunc?: (value: number) => void;
	/**
	 * Draws tick marks under the track. `"center"` renders a single tick at the
	 * midpoint. A number renders a tick every `tickInterval` value-units
	 * starting at `min`, capped at one tick per 2% of the range. Omit for no
	 * ticks (default).
	 */
	tickInterval?: number | "center";
	/**
	 * Optional labels aligned by index to the computed tick positions. Each entry
	 * is rendered (text or graphic) beneath/beside its tick to convey the
	 * direction of increase (e.g. `["Slow", null, null, null, "Fast"]`). Entries
	 * that are `null`/`undefined` render nothing.
	 */
	tickLabels?: (ReactNode | null)[];
	/**
	 * When true and `tickInterval` is a number, the thumb snaps to tick
	 * positions: the input's `step` becomes the effective tick interval,
	 * overriding `step`. Ignored when `tickInterval` is absent or `"center"`.
	 */
	snapToTicks?: boolean;
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
	orientation = "horizontal",
	indicatorDirection,
	ghost = false,
	onChangeFunc,
	onCommitFunc,
	tickInterval,
	tickLabels,
	snapToTicks = false,
}) => {
	const isVertical = orientation === "vertical";
	const resolvedIndicator: ClassicySliderIndicatorDirection =
		indicatorDirection ?? (isVertical ? "left" : "down");

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

	// Live value + drag state drive the ghost indicator. Tracked separately from
	// the (uncontrolled) input so the ghost can shadow the pointer without
	// interfering with native slider capture.
	const [dragging, setDragging] = useState(false);
	const [liveValue, setLiveValue] = useState(value);
	useEffect(() => {
		if (!dragging) setLiveValue(value);
	}, [value, dragging]);

	// Commit the current value once the user releases the slider — on pointer up
	// (mouse, touch, and pen all surface as pointer events) or key up. onChangeFunc
	// fires continuously during a drag; onCommitFunc fires only at the end, so
	// consumers can keep live UI responsive while deferring expensive side effects.
	const handleCommit = (e: SyntheticEvent<HTMLInputElement>) => {
		if (onCommitFunc) onCommitFunc(Number(e.currentTarget.value));
	};

	const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		if (ghost) setLiveValue(Number(e.currentTarget.value));
		onChangeFunc?.(e);
	};

	const handlePointerDown = (e: ReactPointerEvent<HTMLInputElement>) => {
		if (ghost && !disabled) {
			setLiveValue(Number(e.currentTarget.value));
			setDragging(true);
		}
	};

	const endDrag = (e: SyntheticEvent<HTMLInputElement>) => {
		if (dragging) setDragging(false);
		if (onCommitFunc) handleCommit(e);
	};

	const sizeClassMap: Record<ClassicyControlLabelSize, string> = {
		small: "classicyControlLabelSizeSmall",
		medium: "classicyControlLabelSizeMedium",
		large: "classicyControlLabelSizeLarge",
	};

	const ticks = computeSliderTicks(tickInterval, min, max);

	const effectiveStep =
		snapToTicks && ticks.snapStep !== undefined ? ticks.snapStep : step;

	// Fraction (0–1) of travel for the ghost's position along the axis.
	const range = max - min;
	const ghostFraction =
		range > 0 ? Math.min(1, Math.max(0, (liveValue - min) / range)) : 0;

	const hasTicks = ticks.positions.length > 0;
	const hasLabels =
		Array.isArray(tickLabels) && tickLabels.some((l) => l != null);
	const needsStack = hasTicks || ghost;

	const rangeInput = (
		<input
			ref={inputRef}
			id={id}
			type="range"
			aria-label={ariaLabel}
			aria-orientation={orientation}
			className={classNames(
				"classicySlider",
				highlighted && "classicySliderHighlighted",
				disabled && "classicySliderDisabled",
				indicatorClassMap[resolvedIndicator],
				isVertical && "classicySliderInputVertical",
			)}
			defaultValue={value}
			min={min}
			max={max}
			step={effectiveStep}
			disabled={disabled}
			onChange={handleChange}
			onPointerDown={ghost ? handlePointerDown : undefined}
			onPointerUp={ghost || onCommitFunc ? endDrag : undefined}
			onPointerCancel={ghost ? () => setDragging(false) : undefined}
			onKeyUp={onCommitFunc ? handleCommit : undefined}
		/>
	);

	// Ghost is positioned along the travel axis; the axis inset matches the tick
	// rail so the ghost's center lands under the thumb's point.
	const ghostEl = ghost ? (
		<span
			aria-hidden="true"
			className={classNames(
				"classicySliderGhost",
				indicatorClassMap[resolvedIndicator],
				!dragging && "classicySliderGhostHidden",
			)}
			style={{ "--classicy-ghost-pos": String(ghostFraction) } as CSSProperties}
		/>
	) : null;

	const tickRail = hasTicks ? (
		<div
			aria-hidden="true"
			className={classNames(
				"classicySliderTicks",
				disabled && "classicySliderTicksDisabled",
			)}
		>
			<div className="classicySliderTicksTrack">
				{ticks.positions.map((pos) => (
					<span
						key={pos}
						className="classicySliderTick"
						style={{ "--classicy-tick-left": `${pos}%` } as CSSProperties}
					/>
				))}
			</div>
		</div>
	) : null;

	const labelRail = hasLabels ? (
		<div aria-hidden="true" className="classicySliderTickLabels">
			<div className="classicySliderTicksTrack">
				{ticks.positions.map((pos, i) => {
					const label = tickLabels?.[i];
					if (label == null) return null;
					return (
						<span
							key={pos}
							className="classicySliderTickLabel"
							style={{ "--classicy-tick-left": `${pos}%` } as CSSProperties}
						>
							{label}
						</span>
					);
				})}
			</div>
		</div>
	) : null;

	const slider = (
		<div
			className={classNames(
				"classicySliderTrackGroup",
				isVertical && "classicySliderTrackGroupVertical",
			)}
		>
			{needsStack ? (
				<div
					className={classNames(
						"classicySliderStack",
						isVertical && "classicySliderStackVertical",
					)}
				>
					<div className="classicySliderTrackLayer">
						{rangeInput}
						{ghostEl}
					</div>
					{tickRail}
					{labelRail}
				</div>
			) : (
				rangeInput
			)}
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

import "./ClassicyLittleArrows.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useRef } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

// Continuous single-unit repeat while held — the HIG's little-arrows behavior
// (no ×10 acceleration; that is a spinner-only affordance).
const REPEAT_INTERVAL_MS = 120;

interface ClassicyLittleArrowsProps {
	/** Called once immediately on press and then repeatedly while held. */
	onStep: (direction: 1 | -1) => void;
	disabled?: boolean;
	upLabel?: string;
	downLabel?: string;
	className?: string;
}

/**
 * The Mac OS 8 "little arrows" widget — a stacked up/down arrow pair that
 * increments an adjacent content area on click, and repeats while held. Split
 * out from `ClassicySpinner` (which fuses arrows with its own number field) so
 * it can attach to a separate content area such as a clock control.
 */
export const ClassicyLittleArrows: FunctionalComponent<
	ClassicyLittleArrowsProps
> = ({
	onStep,
	disabled = false,
	upLabel = "Increment",
	downLabel = "Decrement",
	className,
}) => {
	// Keep the callback in a ref so the interval always calls the latest closure.
	const onStepRef = useRef(onStep);
	onStepRef.current = onStep;
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stop = () => {
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	// Cleanup on unmount.
	useEffect(() => {
		return () => {
			if (intervalRef.current !== null) clearInterval(intervalRef.current);
		};
	}, []);

	const start = (direction: 1 | -1) => {
		if (disabled) return;
		onStepRef.current(direction);
		stop();
		intervalRef.current = setInterval(() => {
			onStepRef.current(direction);
		}, REPEAT_INTERVAL_MS);
	};

	return (
		<div className={classNames("classicyLittleArrows", className)}>
			<button
				type="button"
				className="classicyLittleArrowsButton"
				aria-label={upLabel}
				disabled={disabled}
				onMouseDown={() => start(1)}
				onMouseUp={stop}
				onMouseLeave={stop}
			>
				<img src={ClassicyIcons.ui.menuDropdownArrowUp} alt="" />
			</button>
			<button
				type="button"
				className="classicyLittleArrowsButton classicyLittleArrowsButtonDown"
				aria-label={downLabel}
				disabled={disabled}
				onMouseDown={() => start(-1)}
				onMouseUp={stop}
				onMouseLeave={stop}
			>
				<img src={ClassicyIcons.ui.menuDropdownArrowUp} alt="" />
			</button>
		</div>
	);
};

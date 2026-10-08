import "./ClassicyLittleArrows.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useRef } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

// Continuous repeat while held — the HIG's little-arrows behavior. Callers that
// want acceleration (ClassicySpinner's ×10 escalation) derive it from `heldMs`.
const REPEAT_INTERVAL_MS = 120;

interface ClassicyLittleArrowsProps {
	/**
	 * Called once immediately on press (`heldMs` 0) and then repeatedly while
	 * held, with the time elapsed since the press.
	 */
	onStep: (direction: 1 | -1, heldMs: number) => void;
	disabled?: boolean;
	upLabel?: string;
	downLabel?: string;
	className?: string;
	/** Delay between repeats while held, in ms. */
	repeatIntervalMs?: number;
}

/**
 * The Mac OS 8 "little arrows" widget — a stacked up/down arrow pair that
 * increments an adjacent content area on click, and repeats while held. It is
 * shared by `ClassicySpinner` and the date and time pickers, so every stepper
 * control draws the same arrows. Pair it with its field inside a
 * `classicyLittleArrowsGroup` element for the standard spacing and focus ring.
 */
export const ClassicyLittleArrows: FunctionalComponent<
	ClassicyLittleArrowsProps
> = ({
	onStep,
	disabled = false,
	upLabel = "Increment",
	downLabel = "Decrement",
	className,
	repeatIntervalMs = REPEAT_INTERVAL_MS,
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
		onStepRef.current(direction, 0);
		stop();
		const pressedAt = Date.now();
		intervalRef.current = setInterval(() => {
			onStepRef.current(direction, Date.now() - pressedAt);
		}, repeatIntervalMs);
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

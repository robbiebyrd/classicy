import "./ClassicyLittleArrows.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

// Continuous repeat while held — the HIG's little-arrows behavior. Callers that
// want acceleration (ClassicySpinner's ×10 escalation) derive it from `heldMs`.
const REPEAT_INTERVAL_MS = 120;

interface ClassicyLittleArrowsProps {
	/**
	 * Called once immediately on press (`heldMs` 0) and then repeatedly while
	 * held, with the time elapsed since the press.
	 */
	onStep: (direction: 1 | -1, heldMs: number) => void;
	/** Disables both arrows. Defaults to `false`. */
	disabled?: boolean;
	/** Accessible name of the up arrow. Defaults to `"Increment"`. */
	upLabel?: string;
	/** Accessible name of the down arrow. Defaults to `"Decrement"`. */
	downLabel?: string;
	/** Extra class names merged onto the arrow pair's wrapper. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
	/** Delay between repeats while held, in ms. Defaults to `120`. */
	repeatIntervalMs?: number;
	/**
	 * The content area the arrows adjust. A mouse press on an arrow moves
	 * focus there (if it is not there already) instead of to the arrow, so the
	 * field keeps its insertion point and the group keeps its focus ring.
	 * Without it, a press leaves focus wherever it is inside the group, and
	 * only takes it for the arrow when nothing in the group is focused.
	 */
	focusTarget?: RefObject<HTMLElement | null>;
}

/**
 * The Mac OS 8 "little arrows" widget (HIGOS8 Ch.2 "Little Arrows", p.35) — a
 * stacked up/down arrow pair that increments an adjacent content area on
 * click, and repeats while held. It is shared by `ClassicySpinner` and the
 * date and time pickers, so every stepper control draws the same arrows. Pair
 * it with its field inside a `classicyLittleArrowsGroup` element for the
 * standard spacing and focus ring.
 *
 * It holds no value: `onStep(direction, heldMs)` fires once on press
 * (`heldMs` 0) and every `repeatIntervalMs` while held, and the caller
 * applies, clamps and (if it wants acceleration) scales the step. Each arrow
 * is a real `<button>`; Enter/Space step once, with the OS key repeat giving
 * the held behaviour. For a number field with arrows — the
 * `<input type="number">` replacement — use `ClassicySpinner`.
 *
 * ```tsx
 * <div className="classicyLittleArrowsGroup">
 *     <span>{value}</span>
 *     <ClassicyLittleArrows onStep={(dir) => setValue((v) => v + dir)} />
 * </div>
 * ```
 */
export const ClassicyLittleArrows: FunctionalComponent<
	ClassicyLittleArrowsProps
> = ({
	onStep,
	disabled = false,
	upLabel = "Increment",
	downLabel = "Decrement",
	className,
	style,
	repeatIntervalMs = REPEAT_INTERVAL_MS,
	focusTarget,
}) => {
	const arrowUp = useClassicyAsset("icons", "ui.menuDropdownArrowUp") ?? "";
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

	// The group's focus ring and the arrows' own black bevel are :focus-within
	// styles (ClassicyLittleArrows.scss), so a press must not move focus out of
	// the field: a focused arrow would still count, but Safari and Firefox on
	// macOS give a clicked <button> no focus at all, and the whole control went
	// flat and gray on every click. Preventing the mousedown default keeps
	// focus where it is; `focusTarget` goes further and puts it in the field.
	const keepFocus = (e: ReactMouseEvent<HTMLButtonElement>) => {
		const target = focusTarget?.current;
		if (target) {
			e.preventDefault();
			if (document.activeElement !== target) target.focus();
			return;
		}
		const group = e.currentTarget.closest(".classicyLittleArrowsGroup");
		const active = document.activeElement;
		if (
			group &&
			active &&
			active !== e.currentTarget &&
			group.contains(active)
		) {
			e.preventDefault();
		}
	};

	const start = (e: ReactMouseEvent<HTMLButtonElement>, direction: 1 | -1) => {
		keepFocus(e);
		if (disabled) return;
		onStepRef.current(direction, 0);
		stop();
		const pressedAt = Date.now();
		intervalRef.current = setInterval(() => {
			onStepRef.current(direction, Date.now() - pressedAt);
		}, repeatIntervalMs);
	};

	// Keyboard operability (HIGOS8 Ch.2 "Little Arrows"/"Clock Controls", p.35-36):
	// Enter/Space on a focused arrow steps the value once; the OS key-repeat of
	// held keydowns gives the press-and-hold repeat without a second interval.
	const stepKey = (e: ReactKeyboardEvent, direction: 1 | -1) => {
		if (disabled) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onStepRef.current(direction, 0);
		}
	};

	return (
		<div
			className={classNames("classicyLittleArrows", className)}
			style={style}
		>
			<button
				type="button"
				className="classicyLittleArrowsButton"
				aria-label={upLabel}
				disabled={disabled}
				onMouseDown={(e) => start(e, 1)}
				onMouseUp={stop}
				onMouseLeave={stop}
				onKeyDown={(e) => stepKey(e, 1)}
			>
				<img src={arrowUp} alt="" />
			</button>
			<button
				type="button"
				className="classicyLittleArrowsButton classicyLittleArrowsButtonDown"
				aria-label={downLabel}
				disabled={disabled}
				onMouseDown={(e) => start(e, -1)}
				onMouseUp={stop}
				onMouseLeave={stop}
				onKeyDown={(e) => stepKey(e, -1)}
			>
				<img src={arrowUp} alt="" />
			</button>
		</div>
	);
};

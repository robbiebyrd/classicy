import "./ClassicySlider.scss";
import classNames from "classnames";
import type {
	ChangeEventHandler,
	CSSProperties,
	FC as FunctionalComponent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
	PointerEvent as ReactPointerEvent,
	SyntheticEvent,
} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ClassicyGestureEnd } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { onClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import { useClassicyPatternOrigin } from "@/SystemFolder/SystemResources/PatternOrigin/ClassicyPatternOrigin.internal";
import { nudgeClassicyOntoPixelGrid } from "@/SystemFolder/SystemResources/Utils/pixelGridNudge.internal";
import {
	classicySliderPosition,
	classicySliderThumbSide,
	classicySliderTrack,
	classicySliderValueAt,
} from "./ClassicySliderDrag.internal";

export interface ClassicySliderTicks {
	/** Tick positions as percentages (0–100) along the thumb-travel axis. */
	positions: number[];
	/** Density-clamped interval in value units; only set for numeric tickInterval. */
	snapStep?: number;
}

// At most one tick per 2% of the value range (≤ 51 marks, endpoints included).
const MAX_TICKS_PER_RANGE = 50;

/**
 * Tick positions for a `tickInterval` over `[min, max]` (exported for tests):
 * `"center"` is a single midpoint tick, a number is a tick every that many
 * value units from `min`, density-capped at one tick per 2% of the range.
 */
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

/**
 * Sets a range input's value as a user's drag does, so React's `onChange`
 * and a host's own `input` listener both see it: through the prototype's
 * setter (React tracks the instance's, and would take the value for its
 * own) and an `input` event.
 */
const setClassicySliderValue = (input: HTMLInputElement, value: number) => {
	Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set?.call(input, String(value));
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** A pointer drag the slider runs itself (see `handlePointerDown`). */
type ClassicySliderDrag = {
	pointerId: number;
	/** The thumb's side along the track, read once at the press. */
	thumb: number;
	/** The pointer's offset from the thumb's center when it pressed. */
	grab: number;
	/** The value when the press began. */
	start: number;
	/** The value under the pointer. */
	value: number;
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

// The same direction on the stack, so a package can place the ticks and
// their labels on the side the indicator points to (Windows 98's trackbar)
// without `:has()`, which the browser floor lacks.
const stackIndicatorClassMap: Record<ClassicySliderIndicatorDirection, string> =
	{
		up: "classicySliderStackIndicatorUp",
		down: "classicySliderStackIndicatorDown",
		left: "classicySliderStackIndicatorLeft",
		right: "classicySliderStackIndicatorRight",
		nondirectional: "classicySliderStackIndicatorNondirectional",
	};

interface ClassicySliderProps {
	/** Id of the native `<input type="range">`; links the label to it. */
	id: string;
	/** Visible label text. Omit for no label (then pass `ariaLabel`). */
	labelTitle?: string;
	/**
	 * Size of the label. Defaults to `"medium"`. The value readout stays the
	 * small size whatever this says.
	 */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the slider. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/**
	 * The slider's value. The thumb follows changes to this prop, and the
	 * readout beside the track shows it, so feed `onChangeFunc` back into it.
	 */
	value: number;
	/** Lowest value. Defaults to `0`. */
	min?: number;
	/** Highest value. Defaults to `100`. */
	max?: number;
	/** Value increment; overridden by `snapToTicks`. Defaults to `1`. */
	step?: number;
	/** Disables the slider and dims its label and ticks. Defaults to `false`. */
	disabled?: boolean;
	/** Draws the thumb in the theme accent color. Defaults to `false`. */
	highlighted?: boolean;
	/** Text for the readout beside the track (e.g. `"40 %"`). Defaults to `value`. */
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
	 * When true, a translucent "ghost" copy of the thumb follows the pointer
	 * while the user drags, the Mac OS 8 ghost indicator. Under a package whose
	 * layout says `slider.thumbDrag: "onRelease"` (Platinum) the indicator
	 * stays where it was meanwhile, and the value changes when the button comes
	 * up; otherwise both follow the pointer. Off by default.
	 */
	ghost?: boolean;
	/** Called with the native change event on every intermediate value. */
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	/**
	 * Fired once when the user finishes adjusting the slider — on pointer release
	 * or key release — rather than on every intermediate value like `onChangeFunc`.
	 * Receives the committed numeric value, then `{ lost }`: true when a press
	 * ended by its pointer stream being lost (the window blurred, a
	 * pointercancel, the page hidden), false for a pointer or key release.
	 * Use this to defer expensive work (persistence, network writes, store
	 * dispatches) to the end of a drag while keeping `onChangeFunc` for live,
	 * per-tick updates.
	 */
	onCommitFunc?: (value: number, info: ClassicyGestureEnd) => void;
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
	/** Extra class names, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	className?: string;
	/** Inline style, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	style?: CSSProperties;
}

/**
 * The Platinum slider (HIGOS8 Ch.2 "Sliders and Tick Marks", p.34) — the
 * `<input type="range">` equivalent, and it renders a real one. Horizontal
 * or vertical, with a directional or nondirectional indicator, optional
 * labeled tick marks, an optional ghost indicator that trails the pointer
 * while dragging, and a value readout beside the track. Use it to set a
 * value; never as a stand-in for a scroll bar.
 *
 * The native input is uncontrolled and only re-synced when `value` changes
 * from outside (this avoids a Safari freeze while dragging), so treat the
 * component as controlled: `onChangeFunc` fires live on every step and the
 * readout shows the `value` you pass back. `onCommitFunc` fires once when the
 * pointer or key is released — the place for persistence or store
 * dispatches. Without a visible `labelTitle`, give it an `ariaLabel`. Under
 * a package whose layout says `input.escapeCancels` (Windows 98), Escape
 * during a mouse or pen drag puts the value back where the press found it
 * (`onChangeFunc` hears it) and commits nothing.
 *
 * ```tsx
 * <ClassicySlider id="vol" labelTitle="Volume" value={volume}
 *     onChangeFunc={(e) => setVolume(Number(e.target.value))}
 *     onCommitFunc={saveVolume} />
 * ```
 */
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
	className,
	style,
}) => {
	const isVertical = orientation === "vertical";
	const resolvedIndicator: ClassicySliderIndicatorDirection =
		indicatorDirection ?? (isVertical ? "left" : "down");

	// Uncontrolled input with ref-sync: avoids Safari freeze bug where React's
	// controlled value reconciliation conflicts with native slider capture on mouseup.
	const inputRef = useRef<HTMLInputElement>(null);
	const appearance = useClassicyAppearance("Slider", { disabled }, inputRef);
	// The slider's and its ticks' patterns laid from a fixed origin, where
	// the package declares one (`layout.patternOrigin.Slider`, System 7).
	const ticksRef = useRef<HTMLDivElement>(null);
	useClassicyPatternOrigin("Slider", inputRef, ticksRef);
	// A ghost drag on release (HIGOS8 p.34): the package's declaration, for a
	// slider that draws a ghost; and Escape's cancel (`input.escapeCancels`).
	const layout = useClassicyAppearanceLayout();
	const thumbDrag = layout.slider?.thumbDrag;
	const onRelease = ghost && thumbDrag === "onRelease";
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
		if (onCommitFunc)
			onCommitFunc(Number(e.currentTarget.value), { lost: false });
	};

	const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		const next = Number(e.currentTarget.value);
		if (ghost) setLiveValue(next);
		appearance.emit("change", withClassicyAppearanceInput({ value: next }));
		onChangeFunc?.(e);
	};

	// Every pointer press on the slider, a plain track click included, is
	// reported to the appearance package as a drag (ruling I-R15b), whether
	// or not a ghost is drawn; `dragging` state only exists for the ghost.
	// Keyboard stepping is not a drag: it reports `change` alone.
	const pointerDragRef = useRef(false);
	// While a press lasts, the document is watched for its release, so one
	// that lands outside the input still ends the drag, and for the pointer
	// stream being lost (see loseDrag). This stops watching both. `lost`:
	// ended by the pointer stream being lost, not by a release.
	const stopWatchingRef = useRef<(() => void) | null>(null);
	// `canceled`: Escape took the drag back (`cancelDrag`).
	const finishPointerDrag = (lost: boolean, canceled = false) => {
		const stopWatching = stopWatchingRef.current;
		stopWatchingRef.current = null;
		stopWatching?.();
		if (!pointerDragRef.current) return;
		pointerDragRef.current = false;
		appearance.emit("dragEnd", {
			value: Number(inputRef.current?.value),
			lost,
			...(canceled ? { canceled: true } : {}),
		});
	};
	// Unmounted mid-press: stop watching (no dragEnd; the slider is gone).
	useEffect(() => () => stopWatchingRef.current?.(), []);

	// Set when a loss committed the press, so that press's own release, if
	// it still reaches the input, does not commit a second time. The next
	// press clears it.
	const committedByLossRef = useRef(false);
	// The pointer stream lost mid-press (the window blurs, a pointercancel,
	// the page is hidden): the browser ends its own thumb drag where the
	// thumb is, so the press ends there too, committing the value on screen
	// as a release would, the way a window's move or a split view's divider
	// ends where it is. Read through a ref by the document listener, so the
	// latest onCommitFunc is the one called.
	// A drag of the slider's own also ends this way when the input loses the
	// pointer (`lostpointercapture`) or a move arrives with the button up:
	// either way its release will never reach the input.
	const loseDrag = () => {
		// The ghost's value is dropped: the indicator never left the value.
		dragRef.current = null;
		const pressed = pointerDragRef.current;
		setDragging(false);
		finishPointerDrag(true);
		if (pressed && onCommitFunc) {
			committedByLossRef.current = true;
			onCommitFunc(Number(inputRef.current?.value), { lost: true });
		}
	};
	const loseDragRef = useRef(loseDrag);
	loseDragRef.current = loseDrag;

	// Escape mid-drag, under a package whose layout says
	// `input.escapeCancels` (Windows 98; WIG Ch.4 "Shortcut Keys", p.27): the
	// value goes back to where the press found it (an `input` event, so
	// `onChangeFunc` hears it), the ghost goes, and the drag ends there; the
	// release that follows commits nothing (`onCommitFunc` is not called:
	// the value is the one the press found).
	const cancelDrag = () => {
		const drag = dragRef.current;
		dragRef.current = null;
		const input = inputRef.current;
		if (drag && input && Number(input.value) !== drag.start)
			setClassicySliderValue(input, drag.start);
		setDragging(false);
		committedByLossRef.current = true;
		finishPointerDrag(false, true);
	};
	const cancelDragRef = useRef(cancelDrag);
	cancelDragRef.current = cancelDrag;

	// A press of the first button of a mouse or pen is the slider's own: the
	// browser's range drag is stopped (Firefox would move the thumb to the
	// pointer even on a press on the thumb) by preventing the press's
	// mousedown, whose default action starts it (handleMouseDown), and the
	// value follows the pointer's travel from where it pressed, read from the
	// track's geometry (ClassicySliderDrag.internal.ts). The pointerdown
	// itself is left alone, so the press's mousedown and mouseup still reach
	// the page (the pop-up, combo box and contextual menu closers listen for
	// them). A press on the thumb grabs it where it is, so a press that never
	// moves changes nothing; a press on the track puts the thumb's center
	// under the pointer, as Chromium does. The input takes the pointer, so
	// the release reaches it wherever it lands. A touch stays the browser's,
	// as does a slider not laid out yet.
	const dragRef = useRef<ClassicySliderDrag | null>(null);
	const along = (e: { clientX: number; clientY: number }) =>
		isVertical ? e.clientY : e.clientX;
	const startDrag = (
		e: ReactPointerEvent<HTMLInputElement>,
	): ClassicySliderDrag | null => {
		if (e.button !== 0 || e.pointerType === "touch") return null;
		const input = e.currentTarget;
		const track = classicySliderTrack(
			input,
			isVertical,
			classicySliderThumbSide(input, isVertical),
		);
		if (track.travel <= 0) return null;
		// The prevented mousedown no longer focuses the input.
		input.focus({ preventScroll: true });
		try {
			input.setPointerCapture(e.pointerId);
		} catch {
			// The pointer is already gone: its release ends the drag on the
			// document, as before.
		}
		const start = Number(input.value);
		const center = classicySliderPosition(track, start, min, max);
		const onThumb = Math.abs(along(e) - center) <= track.thumb / 2;
		return {
			pointerId: e.pointerId,
			thumb: track.thumb,
			grab: onThumb ? along(e) - center : 0,
			start,
			value: onThumb
				? start
				: classicySliderValueAt(track, along(e), min, max, effectiveStep),
		};
	};

	const handlePointerDown = (e: ReactPointerEvent<HTMLInputElement>) => {
		if (disabled) return;
		committedByLossRef.current = false;
		const drag = startDrag(e);
		dragRef.current = drag;
		if (ghost) {
			setLiveValue(drag?.value ?? Number(e.currentTarget.value));
			setDragging(true);
		}
		if (!pointerDragRef.current) {
			pointerDragRef.current = true;
			// The guard in finishPointerDrag keeps it to one dragEnd when the
			// input saw the release too. A release only the document saw also
			// ends the slider's own drag, so no later hover moves the value.
			const listener = () => {
				if (dragRef.current) {
					dragRef.current = null;
					setDragging(false);
				}
				finishPointerDrag(false);
			};
			document.addEventListener("pointerup", listener);
			const stopWatchingPointerStream = onClassicyPointerStreamLost(() =>
				loseDragRef.current(),
			);
			// Only a drag of the slider's own goes back on Escape: a touch's
			// is the browser's, which would carry on under the finger.
			const stopWatchingEscape = drag
				? onClassicyEscapeCancel(() => cancelDragRef.current(), layout)
				: () => {};
			stopWatchingRef.current = () => {
				document.removeEventListener("pointerup", listener);
				stopWatchingPointerStream();
				stopWatchingEscape();
			};
			appearance.emit("dragStart", { value: Number(e.currentTarget.value) });
		}
		// A press on the track, live: the thumb jumps under the pointer.
		if (drag && !onRelease && drag.value !== drag.start)
			setClassicySliderValue(e.currentTarget, drag.value);
	};

	// The value under the pointer, less where it grabbed the thumb: the
	// value, live, or, on release, the ghost's.
	const handlePointerMove = (e: ReactPointerEvent<HTMLInputElement>) => {
		const drag = dragRef.current;
		if (!drag || e.pointerId !== drag.pointerId) return;
		// The button came up where the input never heard it.
		if ((e.buttons & 1) === 0) {
			loseDragRef.current();
			return;
		}
		// The input's box is read again (a readout beside it may resize it as
		// the value changes); the thumb's side is the press's.
		const track = classicySliderTrack(e.currentTarget, isVertical, drag.thumb);
		const value = classicySliderValueAt(
			track,
			along(e) - drag.grab,
			min,
			max,
			effectiveStep,
		);
		if (value === drag.value) return;
		drag.value = value;
		if (onRelease) setLiveValue(value);
		else setClassicySliderValue(e.currentTarget, value);
	};

	// The press's mousedown starts the browser's own range drag: a press the
	// slider drags itself prevents it (see startDrag).
	const handleMouseDown = (e: ReactMouseEvent<HTMLInputElement>) => {
		if (dragRef.current) e.preventDefault();
	};

	// The input lost the pointer mid-drag: it ends where it is.
	const handleLostPointerCapture = (e: ReactPointerEvent<HTMLInputElement>) => {
		if (dragRef.current?.pointerId === e.pointerId) loseDragRef.current();
	};

	const endDrag = (e: SyntheticEvent<HTMLInputElement>) => {
		const drag = dragRef.current;
		dragRef.current = null;
		if (drag) {
			const input = e.currentTarget;
			if (onRelease && drag.value !== Number(input.value))
				setClassicySliderValue(input, drag.value);
			// The browser's own drag ends with a change event when it moved the
			// value; so does this one.
			if (Number(input.value) !== drag.start)
				input.dispatchEvent(new Event("change", { bubbles: true }));
		}
		if (dragging) setDragging(false);
		finishPointerDrag(false);
		if (onCommitFunc && !committedByLossRef.current) handleCommit(e);
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

	// A vertical slider is centered in its column, which may leave its track
	// (the input, or the stack with its ticks) on a fraction of a pixel and
	// blur its one-pixel art: after every render, nudge the track onto the
	// grid, as a submenu's wrapper is.
	const stackRef = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		if (!isVertical) return;
		const track = stackRef.current ?? inputRef.current;
		if (track) nudgeClassicyOntoPixelGrid(track);
	});

	const hasTicks = ticks.positions.length > 0;
	const hasLabels =
		Array.isArray(tickLabels) && tickLabels.some((l) => l != null);
	const needsStack = hasTicks || ghost;

	const rangeInput = (
		<input
			{...appearance.attrs}
			ref={inputRef}
			id={id}
			type="range"
			aria-label={ariaLabel}
			aria-orientation={orientation}
			className={classNames(
				"classicySlider",
				highlighted && "classicySliderHighlighted",
				appearance.className,
				indicatorClassMap[resolvedIndicator],
				isVertical && "classicySliderInputVertical",
			)}
			style={appearance.style}
			defaultValue={value}
			min={min}
			max={max}
			step={effectiveStep}
			disabled={disabled}
			onChange={handleChange}
			onPointerDown={handlePointerDown}
			onMouseDown={handleMouseDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onLostPointerCapture={handleLostPointerCapture}
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
			ref={ticksRef}
			aria-hidden="true"
			className={classNames(
				"classicySliderTicks",
				classicyStateClasses({ disabled }),
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
				labelTitle ? "" : className,
			)}
			style={labelTitle ? undefined : style}
		>
			{needsStack ? (
				<div
					ref={stackRef}
					className={classNames(
						"classicySliderStack",
						isVertical && "classicySliderStackVertical",
						stackIndicatorClassMap[resolvedIndicator],
					)}
				>
					<div
						className={classNames(
							"classicySliderTrackLayer",
							// A package that draws the channel on the layer (under
							// the ghost, Platinum) keys it on these, not `:has()`.
							ghost && "classicySliderHasGhost",
							classicyStateClasses({ disabled }),
						)}
					>
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
		<div
			className={classNames(labelPositionClass(labelPosition), className)}
			style={style}
		>
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

import "./ClassicyPopUpSlider.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useEffect,
	useRef,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import { ClassicyPixelArt } from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";
import {
	popUpSliderThumb,
	popUpSliderTrack,
} from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt";

// Geometry from HIGOS8 Figure 2-16, fixed by the track and thumb drawings
// (ClassicyPopUpSliderArt.ts). The thumb travels between the track's end caps:
// its top sits on the track's top (the popUpSlider.trackTop knob, which the
// stylesheet places it at) at the maximum and TRAVEL below it at the minimum,
// where its bottom rests on the lower cap. Travel is measured from the track,
// so a package that moves the track moves the thumb with it (H-R23).
const THUMB_HEIGHT = 10;
const TRAVEL = 57;

type ClassicyPopUpSliderProps = {
	/** Current value (clamped to `min`…`max`); the slider is fully controlled. */
	value: number;
	/** Called with each new value (snapped to `step`) while dragging, clicking or keying. */
	onChange: (value: number) => void;
	/** Accessible name ("Volume"). */
	ariaLabel: string;
	/** Value at the bottom of the track. Defaults to `0`. */
	min?: number;
	/** Value at the top of the track. Defaults to `100`. */
	max?: number;
	/** Value increment; Page Up/Down move ten steps. Defaults to `1`. */
	step?: number;
	/** Dims the slider and removes it from the tab order. Defaults to `false`. */
	disabled?: boolean;
	/** Id of the `role="slider"` element. */
	id?: string;
	/** Extra class on the slider. */
	className?: string;
	/** Inline style on the slider. */
	style?: CSSProperties;
};

const clamp = (value: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, value));

/**
 * The compact vertical slider a pop-up bevel button shows instead of a menu
 * (HIGOS8 Figure 2-16 — the Control Strip's volume control). Pixel-exact to the
 * figure: a 9 px track with rounded caps and a 15 × 10 thumb, drawn as themed
 * pixel art. It fills the inside of a `popupContent` frame (17 × 73) and paints
 * no background, so the frame's face and highlight show through.
 *
 * Drag the thumb or click the track to set the value; Up/Down (or Right/Left)
 * step it, Page Up/Down step by ten, Home/End jump to the ends.
 *
 * Fully controlled: it draws `value` and reports changes through `onChange`,
 * so keep the value in state. Host it as a `ClassicyBevelButton`'s
 * `popupContent` (or a Control Strip module's `content`, as the built-in
 * Sound module does); for a slider in a window, use `ClassicySlider`.
 *
 * ```tsx
 * <ClassicyBevelButton mode="popup" aria-label="Volume" popupAlign="center"
 *     popupContent={
 *         <ClassicyPopUpSlider ariaLabel="Volume" value={level} onChange={setLevel} />
 *     }
 * />
 * ```
 */
export const ClassicyPopUpSlider: FunctionalComponent<
	ClassicyPopUpSliderProps
> = ({
	value,
	onChange,
	ariaLabel,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	id,
	className,
	style,
}) => {
	const sliderRef = useRef<HTMLDivElement>(null);
	const dragCleanupRef = useRef<(() => void) | null>(null);
	const range = max - min || 1;
	const current = clamp(value, min, max);
	// How far below the upper cap the thumb's top sits.
	const thumbDrop = TRAVEL - Math.round(((current - min) / range) * TRAVEL);

	const snap = (raw: number) =>
		clamp(min + Math.round((raw - min) / step) * step, min, max);

	// `trackTop` is read once per gesture (the press), never per mousemove.
	const setFromPointer = (clientY: number, trackTop: number) => {
		const el = sliderRef.current;
		if (!el) return;
		const drop =
			clientY - el.getBoundingClientRect().top - THUMB_HEIGHT / 2 - trackTop;
		const travelled = TRAVEL - clamp(drop, 0, TRAVEL);
		const next = snap(min + (travelled / TRAVEL) * range);
		if (next !== current) onChange(next);
	};

	useEffect(() => () => dragCleanupRef.current?.(), []);

	const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		if (disabled || e.button !== 0) return;
		e.preventDefault();
		sliderRef.current?.focus();
		const trackTop = readClassicyThemeVar(
			"--pop-up-slider-track-top",
			undefined,
			sliderRef.current,
		);
		setFromPointer(e.clientY, trackTop);
		const onMove = (ev: globalThis.MouseEvent) =>
			setFromPointer(ev.clientY, trackTop);
		const onUp = () => dragCleanupRef.current?.();
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		dragCleanupRef.current = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			dragCleanupRef.current = null;
		};
	};

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		const by: Record<string, number> = {
			ArrowUp: step,
			ArrowRight: step,
			ArrowDown: -step,
			ArrowLeft: -step,
			PageUp: step * 10,
			PageDown: -step * 10,
		};
		let next: number | undefined;
		if (e.key in by) next = snap(current + by[e.key]);
		else if (e.key === "Home") next = min;
		else if (e.key === "End") next = max;
		if (next === undefined) return;
		e.preventDefault();
		if (next !== current) onChange(next);
	};

	return (
		<div
			ref={sliderRef}
			id={id}
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label={ariaLabel}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={current}
			aria-orientation="vertical"
			aria-disabled={disabled || undefined}
			className={classNames(
				"classicyPopUpSlider",
				classicyStateClasses({ disabled }),
				className,
			)}
			style={style}
			onMouseDown={onMouseDown}
			onKeyDown={onKeyDown}
		>
			<ClassicyPixelArt
				rows={popUpSliderTrack}
				className="classicyPopUpSliderTrack"
			/>
			{/* Thumb position is the slider's value, so its drop below the
			    track's top is set inline; the stylesheet sets the top. */}
			<span
				className="classicyPopUpSliderThumb"
				style={{ marginTop: thumbDrop }}
			>
				<ClassicyPixelArt rows={popUpSliderThumb} />
			</span>
		</div>
	);
};

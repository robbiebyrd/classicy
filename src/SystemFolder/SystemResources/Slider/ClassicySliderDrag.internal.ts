// The geometry ClassicySlider drags its thumb by. A pointer press on the
// native range input is the slider's own (the browser's default is
// prevented): Firefox moves the thumb to the pointer on every press, even
// one on the thumb, so a press that never moved still changed the value
// there; and a package that draws a ghost (`layout.slider.thumbDrag`
// `"onRelease"`) needs the value under the pointer without the thumb moving.
// The track is read the way both engines lay the thumb out: its box is
// `--slider-thumb-width` wide and `--slider-thumb-height` tall (the base
// sheet's), and its center travels the input's length less the box's side
// along it, from the start (left; a vertical slider's bottom, its minimum).

/** Where a slider's thumb center travels, in client pixels. */
export type ClassicySliderTrack = {
	/** The thumb center's position at the minimum. */
	origin: number;
	/** How far it travels to the maximum (never negative). */
	travel: number;
	/** `1` when the value grows with the coordinate (horizontal), else `-1`. */
	direction: 1 | -1;
	/** The thumb's box along the track. */
	thumb: number;
};

/**
 * The length `name` (a thumb box side) holds where `input` is, in px. A
 * plain length is read as is; anything else (a package's `calc()`, which an
 * unregistered custom property keeps unresolved) is resolved by the layout
 * of a hidden probe beside the input. Unset or unresolvable: 0.
 */
const thumbSide = (input: HTMLElement, name: string): number => {
	const value = getComputedStyle(input).getPropertyValue(name).trim();
	if (/^\d+(\.\d+)?px$/.test(value)) return Number.parseFloat(value);
	if (!value || !input.parentElement) return 0;
	const probe = document.createElement("span");
	probe.style.cssText = `position: absolute; visibility: hidden; pointer-events: none; width: var(${name}); height: 0`;
	input.parentElement.append(probe);
	const side = probe.getBoundingClientRect().width;
	probe.remove();
	return side;
};

/** The track of `input`, a horizontal or vertical range input. */
export const classicySliderTrack = (
	input: HTMLElement,
	vertical: boolean,
): ClassicySliderTrack => {
	const rect = input.getBoundingClientRect();
	const thumb = thumbSide(
		input,
		vertical ? "--slider-thumb-height" : "--slider-thumb-width",
	);
	return vertical
		? {
				origin: rect.bottom - thumb / 2,
				travel: Math.max(0, rect.height - thumb),
				direction: -1,
				thumb,
			}
		: {
				origin: rect.left + thumb / 2,
				travel: Math.max(0, rect.width - thumb),
				direction: 1,
				thumb,
			};
};

/** The thumb center's position for `value`. */
export const classicySliderPosition = (
	track: ClassicySliderTrack,
	value: number,
	min: number,
	max: number,
): number => {
	const range = max - min;
	const fraction =
		range > 0 ? Math.min(1, Math.max(0, (value - min) / range)) : 0;
	return track.origin + track.direction * track.travel * fraction;
};

// Decimal places of a number as written, so a stepped value comes out as
// `0.3`, not `0.30000000000000004`.
const decimals = (n: number) => {
	const [, fraction = ""] = String(n).split(".");
	return fraction.length;
};

/**
 * `value` on the input's step grid, as the browser sanitizes a range
 * input's value: the nearest `min + k × step` (the larger on a tie) that
 * lies within `[min, max]`.
 */
export const classicySliderSnap = (
	value: number,
	min: number,
	max: number,
	step: number,
): number => {
	if (max < min) return min;
	const clamped = Math.min(max, Math.max(min, value));
	if (!(step > 0)) return clamped;
	let steps = Math.floor((clamped - min) / step + 0.5);
	while (steps > 0 && min + steps * step > max + 1e-9) steps--;
	const places = Math.max(decimals(step), decimals(min));
	return Number((min + steps * step).toFixed(places));
};

/** The value whose thumb center lies at `position`, on the step grid. */
export const classicySliderValueAt = (
	track: ClassicySliderTrack,
	position: number,
	min: number,
	max: number,
	step: number,
): number => {
	if (track.travel <= 0) return min;
	const fraction = Math.min(
		1,
		Math.max(0, ((position - track.origin) * track.direction) / track.travel),
	);
	return classicySliderSnap(min + fraction * (max - min), min, max, step);
};

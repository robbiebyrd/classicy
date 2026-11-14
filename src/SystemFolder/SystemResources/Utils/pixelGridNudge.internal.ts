// Puts an element on the pixel grid across (its left edge), moving it by
// under half a pixel. Shared by ClassicyMenu (a submenu's wrapper, placed by
// its list) and ClassicySlider (a vertical slider's track, centered in a
// column of any width).

type ClassicyGridNudgeProperty = "left" | "marginLeft" | "marginRight";

const GRID_NUDGE_PROPERTIES: ClassicyGridNudgeProperty[] = [
	"left",
	"marginLeft",
	"marginRight",
];

// What the nudge last set on each element, per property, over the value it
// found there (the host's, or a fixed wrapper's place beside its item).
const gridNudges = new WeakMap<
	HTMLElement,
	Partial<Record<ClassicyGridNudgeProperty, { set: string; base: string }>>
>();

/**
 * Moves `element` so `measured` (the element itself, or a part of it that
 * follows it, such as a menu wrapper's list) starts on a whole pixel across.
 * The element is moved by under half a pixel: a `position: relative` one by
 * `left`; any other, absolute or fixed, by its two margins, equal and
 * opposite, so the box moves whole rather than shrinking from the edge a
 * child may hang from. No transform: it would make the element the
 * containing block of a fixed descendant.
 *
 * A value the element already carries (a host's `style`, a fixed wrapper's
 * `left` beside its item) is kept and the nudge added to it in a `calc()`,
 * so consumer `style` keys still win; the natural place is read with each
 * nudge put back to the value it was added to, since a part that does not
 * follow the nudge one for one would otherwise read as nudged twice, then
 * not at all, on alternate renders. Run it after every render that can move
 * the element.
 */
export const nudgeClassicyOntoPixelGrid = (
	element: HTMLElement,
	measured: HTMLElement = element,
) => {
	const applied = gridNudges.get(element) ?? {};
	// Back to the base: the value the nudge was added to, unless the host or
	// React has set another since, which is then the base.
	const bases = {} as Record<ClassicyGridNudgeProperty, string>;
	for (const property of GRID_NUDGE_PROPERTIES) {
		const current = element.style[property];
		const last = applied[property];
		bases[property] = last && current === last.set ? last.base : current;
		if (element.style[property] !== bases[property])
			element.style[property] = bases[property];
	}
	const natural = measured.getBoundingClientRect().left;
	const nudge = Math.round((Math.round(natural) - natural) * 64) / 64;
	const relative = getComputedStyle(element).position === "relative";
	const next: typeof applied = {};
	const nudgeBy = (property: ClassicyGridNudgeProperty, by: number) => {
		const base = bases[property];
		element.style[property] =
			base === "" ? `${by}px` : `calc(${base} + ${by}px)`;
		// As the engine stores it (a `calc()` is simplified), so the next pass
		// knows the value for the nudge's and goes back to the base.
		next[property] = { set: element.style[property], base };
	};
	if (nudge !== 0) {
		if (relative) {
			nudgeBy("left", nudge);
		} else {
			nudgeBy("marginLeft", nudge);
			nudgeBy("marginRight", -nudge);
		}
	}
	gridNudges.set(element, next);
};

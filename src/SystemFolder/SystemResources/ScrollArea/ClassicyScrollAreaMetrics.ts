/**
 * The arithmetic behind `ClassicyScrollArea`'s bars, kept free of the DOM so
 * it can be tested on its own. The thumb follows the rules Chromium's native
 * scroll bars follow (ScrollbarTheme::ThumbLength and ThumbPosition), so a
 * package that draws the bars as the browser drew them gets the same pixels:
 * a whole-pixel length rounded from the visible share of the track, never
 * shorter than the thumb's minimum, and a position truncated to a whole pixel
 * (but never 0 once the content has scrolled at all).
 */

/** One axis of a scroll container, in CSS pixels. */
export type ClassicyScrollAxisMetrics = {
	/** The content's extent (`scrollHeight`/`scrollWidth`). */
	total: number;
	/** The visible extent (`clientHeight`/`clientWidth`). */
	visible: number;
	/** The scroll offset (`scrollTop`/`scrollLeft`). */
	position: number;
};

/** Where the thumb sits in its track. */
export type ClassicyScrollThumb = {
	/** Its length along the track; 0 when the content fits (no thumb). */
	length: number;
	/** Its offset from the track's start. */
	offset: number;
};

/** Whether this axis has anything to scroll. */
export const classicyScrollAxisFits = (axis: ClassicyScrollAxisMetrics) =>
	!(axis.total > axis.visible);

/**
 * The thumb's length and offset in a track `trackLength` long, for a thumb
 * no shorter than `minLength` and no longer than `maxLength` (the minimum
 * winning, as in CSS; a maximum as long as the minimum is a fixed box, such
 * as System 7's scroll box). No thumb (length 0) when the content fits.
 */
export const computeClassicyScrollThumb = (
	axis: ClassicyScrollAxisMetrics,
	trackLength: number,
	minLength: number,
	maxLength = Number.POSITIVE_INFINITY,
): ClassicyScrollThumb => {
	if (classicyScrollAxisFits(axis) || trackLength <= 0) {
		return { length: 0, offset: 0 };
	}
	const proportion = axis.total > 0 ? axis.visible / axis.total : 0;
	const length = Math.min(
		Math.max(
			Math.min(Math.round(proportion * trackLength), maxLength),
			minLength,
		),
		trackLength,
	);
	const range = axis.total - axis.visible;
	const raw = (Math.max(0, axis.position) * (trackLength - length)) / range;
	const offset = raw > 0 && raw < 1 ? 1 : Math.trunc(raw);
	return { length, offset: Math.min(offset, trackLength - length) };
};

/**
 * The scroll offset that puts the thumb's start `thumbOffset` pixels into its
 * track: the inverse of `computeClassicyScrollThumb`, used while the thumb is
 * dragged. Clamped to the scrollable range.
 */
export const classicyScrollPositionForThumb = (
	axis: Pick<ClassicyScrollAxisMetrics, "total" | "visible">,
	trackLength: number,
	thumbLength: number,
	thumbOffset: number,
): number => {
	const range = axis.total - axis.visible;
	const travel = trackLength - thumbLength;
	if (range <= 0 || travel <= 0) return 0;
	return Math.min(Math.max((thumbOffset * range) / travel, 0), range);
};

/** Which bars a scroll area draws. */
export type ClassicyScrollBarsShown = {
	vertical: boolean;
	horizontal: boolean;
};

/**
 * When a bar is drawn: `"auto"` while its axis overflows (as `overflow: auto`
 * draws a native bar), `"always"` (as `overflow: scroll`; an axis that fits
 * shows an empty track), `"never"` (the content still scrolls by wheel,
 * keyboard and touch, with no bar).
 */
export type ClassicyScrollBarPolicy = "auto" | "always" | "never";

/** What `computeClassicyScrollBars` decides from. */
export type ClassicyScrollBarsInput = {
	vertical: ClassicyScrollBarPolicy;
	horizontal: ClassicyScrollBarPolicy;
	/** When either bar is drawn, draw both (Mac OS 8's document window). */
	paired: boolean;
	/** The bars drawn now, which the measured client sizes leave room for. */
	shown: ClassicyScrollBarsShown;
	/** The bars' thickness: the vertical bar's width, the horizontal's height. */
	size: { vertical: number; horizontal: number };
	scrollWidth: number;
	scrollHeight: number;
	clientWidth: number;
	clientHeight: number;
};

/**
 * The bars to draw for content measured with `shown` drawn. As a browser
 * lays out `overflow: auto`: an axis that overflows the whole box gets a bar,
 * and a bar on one axis narrows the other, which may then overflow too.
 */
export const computeClassicyScrollBars = ({
	vertical,
	horizontal,
	paired,
	shown,
	size,
	scrollWidth,
	scrollHeight,
	clientWidth,
	clientHeight,
}: ClassicyScrollBarsInput): ClassicyScrollBarsShown => {
	const fullWidth = clientWidth + (shown.vertical ? size.vertical : 0);
	const fullHeight = clientHeight + (shown.horizontal ? size.horizontal : 0);
	let needV = vertical === "always";
	let needH = horizontal === "always";
	if (vertical === "auto") needV = scrollHeight > fullHeight;
	if (horizontal === "auto") needH = scrollWidth > fullWidth;
	if (vertical === "auto" && !needV && needH) {
		needV = scrollHeight > fullHeight - size.horizontal;
	}
	if (horizontal === "auto" && !needH && needV) {
		needH = scrollWidth > fullWidth - size.vertical;
	}
	if (paired && (needV || needH)) {
		needV = vertical !== "never";
		needH = horizontal !== "never";
	}
	return {
		vertical: vertical !== "never" && needV,
		horizontal: horizontal !== "never" && needH,
	};
};

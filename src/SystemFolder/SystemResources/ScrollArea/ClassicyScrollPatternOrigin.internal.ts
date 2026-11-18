import { type RefObject, useLayoutEffect } from "react";
import {
	classicyOriginPx,
	classicyWindowContentOrigin,
	isClassicyRendered,
	onClassicyDevicePixels,
	watchClassicyPatternOriginPart,
} from "@/SystemFolder/SystemResources/PatternOrigin/ClassicyPatternOrigin.internal";

export { classicyWindowContentOrigin };

// A package whose layout declares `scrollBar.patternOrigin: "window"`
// (System 7) aligns the pattern it fills a scroll track with to the window's
// content origin, as QuickDraw aligned a pattern to its window port's origin:
// the same phase in every bar of a window, wherever the window is. The core
// publishes where that origin lies, from the padding-box corner of each bar
// and of its track, as `--classicy-scroll-origin-x` / `-y` (whole pixels), on
// those two elements; the package positions its pattern by them (a part
// placed inside the bar, as the drag outline, offsets the bar's). The origin
// math and the signals that republish it are the window-anchored patterns'
// (ClassicyPatternOrigin.internal.ts), which every package may declare for
// other parts (`patternOrigin.window`).

/** The two custom properties published on a bar and on its track. */
export const CLASSICY_SCROLL_ORIGIN_X = "--classicy-scroll-origin-x";
export const CLASSICY_SCROLL_ORIGIN_Y = "--classicy-scroll-origin-y";

/** A length custom property's value in px, 0 when unset. */
const pxOf = (el: HTMLElement, name: string) =>
	Number.parseFloat(el.style.getPropertyValue(name)) || 0;

/** Sets `el`'s two properties to `x`, `y`, leaving equal values alone. */
const publishOn = (el: HTMLElement, x: string, y: string) => {
	if (el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X) !== x)
		el.style.setProperty("--classicy-scroll-origin-x", x);
	if (el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y) !== y)
		el.style.setProperty("--classicy-scroll-origin-y", y);
};

/**
 * Measures the window's content origin `origin` from `bar`'s and `track`'s
 * padding-box corners, in whole pixels, and returns the writes that publish
 * it. The bar is measured where it lands on the device-pixel grid, whether
 * or not the scroll area's snap nudge (`--classicy-scroll-snap-x` / `-y`,
 * under half a pixel) is applied yet, so the result is the same before and
 * after it; the track rides in the bar.
 */
const measureScrollPatternOrigin = (
	bar: HTMLElement,
	track: HTMLElement | null,
	origin: { x: number; y: number },
): (() => void) => {
	// A bar that is not rendered (a hidden pane's) gets no origin.
	if (!isClassicyRendered(bar))
		return () => {
			for (const el of [bar, track])
				for (const name of [CLASSICY_SCROLL_ORIGIN_X, CLASSICY_SCROLL_ORIGIN_Y])
					if (el?.style.getPropertyValue(name)) el.style.removeProperty(name);
		};
	const ox = onClassicyDevicePixels(origin.x);
	const oy = onClassicyDevicePixels(origin.y);
	const barRect = bar.getBoundingClientRect();
	const barX = onClassicyDevicePixels(
		barRect.left - pxOf(bar, "--classicy-scroll-snap-x"),
	);
	const barY = onClassicyDevicePixels(
		barRect.top - pxOf(bar, "--classicy-scroll-snap-y"),
	);
	const onBar = [
		classicyOriginPx(ox - barX - bar.clientLeft),
		classicyOriginPx(oy - barY - bar.clientTop),
	] as const;
	let onTrack: readonly [string, string] | null = null;
	if (track) {
		const trackRect = track.getBoundingClientRect();
		onTrack = [
			classicyOriginPx(
				ox - (barX + trackRect.left - barRect.left) - track.clientLeft,
			),
			classicyOriginPx(
				oy - (barY + trackRect.top - barRect.top) - track.clientTop,
			),
		];
	}
	return () => {
		publishOn(bar, ...onBar);
		if (track && onTrack) publishOn(track, ...onTrack);
	};
};

/**
 * Publishes the window's content origin on `bar` and on `track`: from each
 * one's padding-box corner, in whole pixels (`measureScrollPatternOrigin`).
 */
export const publishClassicyScrollPatternOrigin = (
	bar: HTMLElement,
	track: HTMLElement | null,
): void =>
	measureScrollPatternOrigin(bar, track, classicyWindowContentOrigin(bar))();

/**
 * While `enabled`, keeps a bar's and its track's published origin current:
 * before the first paint, and again on every signal of its window's
 * pattern-origin watcher (`watchClassicyPatternOriginPart`: a resize
 * between the bar and the window, a DOM, desktop-attribute or stylesheet
 * change, a scroll, a transition, an animation or a font load ending, a
 * viewport resize, and a frame after the pointer or the focus moves).
 * Disabled or unmounted, the properties are removed.
 */
export const useClassicyScrollPatternOrigin = (
	bar: RefObject<HTMLElement | null>,
	track: RefObject<HTMLElement | null>,
	enabled: boolean,
): void => {
	useLayoutEffect(() => {
		const barEl = bar.current;
		if (!enabled || !barEl) return;
		const trackEl = track.current;
		const stop = watchClassicyPatternOriginPart({
			anchors: trackEl ? [barEl, trackEl] : [barEl],
			measure: (origin) => measureScrollPatternOrigin(barEl, trackEl, origin),
		});
		return () => {
			stop();
			for (const el of [barEl, trackEl]) {
				el?.style.removeProperty(CLASSICY_SCROLL_ORIGIN_X);
				el?.style.removeProperty(CLASSICY_SCROLL_ORIGIN_Y);
			}
		};
	}, [bar, track, enabled]);
};

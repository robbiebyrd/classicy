import { type RefObject, useLayoutEffect } from "react";

// A package whose layout declares `scrollBar.patternOrigin: "window"`
// (System 7) aligns the pattern it fills a scroll track with to the window's
// content origin, as QuickDraw aligned a pattern to its window port's origin:
// the same phase in every bar of a window, wherever the window is. The core
// publishes where that origin lies, from the padding-box corner of each bar
// and of its track, as `--classicy-scroll-origin-x` / `-y` (whole pixels), on
// those two elements; the package positions its pattern by them (a part
// placed inside the bar, as the drag outline, offsets the bar's).

/** The two custom properties published on a bar and on its track. */
export const CLASSICY_SCROLL_ORIGIN_X = "--classicy-scroll-origin-x";
export const CLASSICY_SCROLL_ORIGIN_Y = "--classicy-scroll-origin-y";

/**
 * The content origin, in viewport coordinates, of the window holding `el`:
 * inside the window's frame, under its title bar (a title bar not drawn, as
 * a fixed modal's, counts for nothing). Outside a window, the desktop's
 * corner, else the viewport's.
 */
export const classicyWindowContentOrigin = (
	el: Element,
): { x: number; y: number } => {
	const win = el.closest<HTMLElement>(".classicyWindow");
	if (!win) {
		const desktop = el.closest(".classicyDesktop");
		if (!desktop) return { x: 0, y: 0 };
		const r = desktop.getBoundingClientRect();
		return { x: r.left, y: r.top };
	}
	const r = win.getBoundingClientRect();
	const titleBar = win.querySelector(":scope > .classicyWindowTitleBar");
	const drawnBar =
		titleBar !== null && titleBar.getClientRects().length > 0
			? titleBar.getBoundingClientRect()
			: null;
	return {
		x: r.left + win.clientLeft,
		y: drawnBar ? drawnBar.bottom : r.top + win.clientTop,
	};
};

/** `value` on the device-pixel grid. */
const onDevicePixels = (value: number) => {
	const ratio =
		typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	return Math.round(value * ratio) / ratio;
};

/** A length custom property's value in px, 0 when unset. */
const pxOf = (el: HTMLElement, name: string) =>
	Number.parseFloat(el.style.getPropertyValue(name)) || 0;

/** Sets `el`'s two properties to `x`, `y` px, leaving equal values alone. */
const publishOn = (el: HTMLElement, x: number, y: number) => {
	const px = (value: number) => `${Math.round(value)}px`;
	if (el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X) !== px(x))
		el.style.setProperty("--classicy-scroll-origin-x", px(x));
	if (el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y) !== px(y))
		el.style.setProperty("--classicy-scroll-origin-y", px(y));
};

/**
 * Publishes the window's content origin on `bar` and on `track`: from each
 * one's padding-box corner, in whole pixels. The bar is measured where it
 * lands on the device-pixel grid, whether or not the scroll area's snap
 * nudge (`--classicy-scroll-snap-x` / `-y`, under half a pixel) is applied
 * yet, so the result is the same before and after it; the track rides in
 * the bar.
 */
export const publishClassicyScrollPatternOrigin = (
	bar: HTMLElement,
	track: HTMLElement | null,
): void => {
	const origin = classicyWindowContentOrigin(bar);
	const ox = onDevicePixels(origin.x);
	const oy = onDevicePixels(origin.y);
	const barRect = bar.getBoundingClientRect();
	const barX = onDevicePixels(
		barRect.left - pxOf(bar, "--classicy-scroll-snap-x"),
	);
	const barY = onDevicePixels(
		barRect.top - pxOf(bar, "--classicy-scroll-snap-y"),
	);
	publishOn(bar, ox - barX - bar.clientLeft, oy - barY - bar.clientTop);
	if (!track) return;
	const trackRect = track.getBoundingClientRect();
	publishOn(
		track,
		ox - (barX + trackRect.left - barRect.left) - track.clientLeft,
		oy - (barY + trackRect.top - barRect.top) - track.clientTop,
	);
};

/**
 * While `enabled`, keeps a bar's and its track's published origin current:
 * before the first paint, and again whenever the bar, the window or any
 * element between them changes size (a resize moves the far bars against
 * the origin; a part above a bar growing moves it down), a font finishes
 * loading (text reflowing above a bar), or anything in the window scrolls
 * (a bar inside scrolled content moves with it). Disabled or unmounted, the
 * properties are removed.
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
		const publish = () => publishClassicyScrollPatternOrigin(barEl, trackEl);
		publish();
		const win = barEl.closest<HTMLElement>(".classicyWindow");
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(publish);
		for (
			let el: HTMLElement | null = barEl;
			el && observer;
			el = el === win ? null : el.parentElement
		)
			observer.observe(el);
		win?.addEventListener("scroll", publish, true);
		const fonts = barEl.ownerDocument.fonts;
		fonts?.addEventListener?.("loadingdone", publish);
		return () => {
			observer?.disconnect();
			win?.removeEventListener("scroll", publish, true);
			fonts?.removeEventListener?.("loadingdone", publish);
			for (const el of [barEl, trackEl]) {
				el?.style.removeProperty(CLASSICY_SCROLL_ORIGIN_X);
				el?.style.removeProperty(CLASSICY_SCROLL_ORIGIN_Y);
			}
		};
	}, [bar, track, enabled]);
};

import {
	type ClassicyTaskbarBandArg,
	classicyTaskbarInsetsOf,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

/**
 * A window's chrome on each side: its frame padding plus its border, which
 * sit outside the content box its inline width and height apply
 * (`.classicyWindow` is content-box). `classicyWindowChromeEdges` measures
 * them; `classicyMaximizedWindowRect` places the frame outside the work area
 * with them.
 */
export type ClassicyWindowChromeEdges = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

/** What `classicyMaximizedWindowRect` is given: the desktop and its bands. */
export type ClassicyMaximizedWindowRectInput = {
	/** The desktop's width, in px (its `clientWidth`). */
	width: number;
	/** The desktop's height, in px (its `clientHeight`). */
	height: number;
	/**
	 * The menu bar's band along the desktop's top (`--menu-bar-height`; 0
	 * under window placement, the Windows shell's).
	 */
	top: number;
	/**
	 * The taskbar's band: a number is its band along the desktop's bottom
	 * (`useClassicyTaskbarBand`; 0 with no taskbar), else the bands on every
	 * edge (`useClassicyTaskbarInsets`, a taskbar docked to any edge, plan
	 * 0020-w98 E4).
	 */
	bottomBand: ClassicyTaskbarBandArg;
	/** The window's chrome on each side (`classicyWindowChromeEdges`). */
	chrome: ClassicyWindowChromeEdges;
};

/** A window rect as the window applies it: its outer left/top and content size. */
export type ClassicyMaximizedWindowRect = {
	/** The outer left/top, the window's inline `left`/`top`. */
	position: [number, number];
	/** The content-box size, the window's inline `width`/`height`. */
	size: [number, number];
};

/**
 * The rect a maximized window takes under `layout.window.zoom: "maximize"`
 * (the Windows shell, plan 0020-w98 §5): its content box is the work area,
 * the desktop less the menu bar's band and the taskbar's ("as large as the
 * display, excluding the space used by the taskbar", WIG Ch.6 "Maximizing
 * Windows", p.84), so its frame lies just outside it. Windows 95/98 as
 * shipped grows a maximized window's rect by its frame on every side (Wine
 * places it at `(-SM_CXFRAME, -SM_CYFRAME)`, `SM_CXMAXIMIZED` being the screen
 * plus twice the frame), so the caption meets the screen's top and sides and
 * the frame is off the screen: here the desktop's `overflow: hidden` clips it
 * on three sides and the taskbar covers it at the bottom.
 *
 * `position` is `[−chrome.left, top − chrome.top]` and `size` is
 * `[width, height − top − bottomBand]` (never below 0). With a taskbar docked
 * to another edge the work area starts past a left or top band and ends at a
 * right one, so `position` is `[left − chrome.left, top + bandTop −
 * chrome.top]` and the size loses every band; the frame on that side lies
 * under the taskbar, drawn above it, as at the bottom. Pure and exported, as
 * `computeClassicyWindowResize` is, so it is unit-testable without a layout.
 */
export const classicyMaximizedWindowRect = ({
	width,
	height,
	top,
	bottomBand,
	chrome,
}: ClassicyMaximizedWindowRectInput): ClassicyMaximizedWindowRect => {
	const band = classicyTaskbarInsetsOf(bottomBand);
	return {
		// `0 - left`, not `-left`: no chrome gives 0, not -0.
		position: [band.left - chrome.left, top + band.top - chrome.top],
		size: [
			Math.max(0, width - band.left - band.right),
			Math.max(0, height - top - band.top - band.bottom),
		],
	};
};

/**
 * The window's chrome on each side, measured off `el`'s computed style: the
 * padding plus the border of each side (a missing or unparsable value counts
 * as 0). `classicyWindowChromeSize` is the sum of each axis's two sides.
 */
export function classicyWindowChromeEdges(
	el: HTMLElement,
): ClassicyWindowChromeEdges {
	const style = getComputedStyle(el);
	const px = (value: string) => Number.parseFloat(value) || 0;
	return {
		left: px(style.paddingLeft) + px(style.borderLeftWidth),
		top: px(style.paddingTop) + px(style.borderTopWidth),
		right: px(style.paddingRight) + px(style.borderRightWidth),
		bottom: px(style.paddingBottom) + px(style.borderBottomWidth),
	};
}

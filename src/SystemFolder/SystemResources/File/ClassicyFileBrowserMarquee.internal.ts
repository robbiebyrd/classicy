import { classicyRectsIntersect } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";
import { CLASSICY_FILE_PATH_ATTRIBUTE } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { onClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import {
	type ClassicyScrollAxisMetrics,
	classicyScrollAxisEnds,
} from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";
import { classicyScrollViewportOf } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/**
 * The file browser's selection rectangle (the icon view's, every package;
 * the list view's under `layout.fileBrowser.regionSelect`): a press on a
 * view's empty space, dragged, draws a dotted rectangle in the view's
 * coordinates, and the items it touches are reported each time the pointer
 * moves (and each time the window scrolls under it), the release or a lost
 * pointer stream removing it and keeping the selection (WIG Ch.5 "Region
 * Selection", p.42; HIG7 "Selection by Dragging", p.289). One
 * implementation for both views; the caller turns the items touched into a
 * selection (`classicyIconMarqueeSelection`).
 */

/** The rectangle, in px from the holder's top-left corner. */
export type ClassicyFileBrowserMarqueeBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * Pixels the pointer travels from the press, on either axis, before the
 * rectangle is drawn: a press with no travel only clears the selection.
 */
export const CLASSICY_FILE_BROWSER_MARQUEE_THRESHOLD = 2;

/**
 * The scroll a selection rectangle asks of the viewport it is drawn in
 * while its pointer is at `x`, `y` (client px): on each axis, a line step
 * (`step`) toward an edge the pointer is within a line step of, or past,
 * when the viewport can still scroll that way (`classicyScrollAxisEnds`),
 * else 0. As a file drag's automatic scrolling (`findClassicyFileDragAutoScroll`)
 * measures its band, but past the edge too: the rectangle follows the
 * pointer out of the window, as comctl32's marquee scrolls while the
 * pointer is outside the list (`LISTVIEW_ScrollTimer`).
 */
export const classicyFileBrowserMarqueeScroll = (
	x: number,
	y: number,
	rect: { left: number; top: number; right: number; bottom: number },
	axes: { x: ClassicyScrollAxisMetrics; y: ClassicyScrollAxisMetrics },
	step: number,
): { dx: number; dy: number } => {
	const toward = (
		at: number,
		start: number,
		end: number,
		axis: ClassicyScrollAxisMetrics,
	) => {
		const ends = classicyScrollAxisEnds(axis);
		if (at < start + step && !ends.start) return -step;
		if (at >= end - step && !ends.end) return step;
		return 0;
	};
	return {
		dx: toward(x, rect.left, rect.right, axes.x),
		dy: toward(y, rect.top, rect.bottom, axes.y),
	};
};

export type ClassicyFileBrowserMarqueeOptions = {
	/** The element the rectangle is measured in and drawn in (positioned). */
	holder: HTMLElement;
	/** The press. */
	start: { clientX: number; clientY: number };
	/** The items the rectangle may touch, each carrying `data-classicy-file-path`. */
	items: () => Iterable<Element>;
	/** Draws the rectangle (`null`: removes it). */
	onBox: (box: ClassicyFileBrowserMarqueeBox | null) => void;
	/** The paths of the items the rectangle touches now, in `items`' order. */
	onTouched: (paths: string[]) => void;
	/**
	 * Scroll the holder's scroll area toward an edge the pointer is near or
	 * past (`classicyFileBrowserMarqueeScroll`), a line per press-repeat
	 * interval, the first after one interval.
	 */
	autoScroll?: boolean;
	/**
	 * Escape, under a package whose layout says `input.escapeCancels`: the
	 * rectangle is removed and the caller puts back the selection the press
	 * found.
	 */
	onCancel?: () => void;
	/** However it ended (released, lost, canceled), after the rectangle went. */
	onEnd?: () => void;
};

/**
 * Track a press on a view's empty space as a selection rectangle. Returns
 * the function that stops it (on unmount), removing the rectangle and
 * reporting nothing more.
 */
export function startClassicyFileBrowserMarquee(
	options: ClassicyFileBrowserMarqueeOptions,
): () => void {
	const { holder } = options;
	const pressRect = holder.getBoundingClientRect();
	const origin: [number, number] = [
		options.start.clientX - pressRect.left,
		options.start.clientY - pressRect.top,
	];
	let pointer: [number, number] = [
		options.start.clientX,
		options.start.clientY,
	];
	let drawn = false;
	let done = false;

	const measure = () => {
		const rect = holder.getBoundingClientRect();
		const now: [number, number] = [
			pointer[0] - rect.left,
			pointer[1] - rect.top,
		];
		if (
			!drawn &&
			Math.abs(now[0] - origin[0]) < CLASSICY_FILE_BROWSER_MARQUEE_THRESHOLD &&
			Math.abs(now[1] - origin[1]) < CLASSICY_FILE_BROWSER_MARQUEE_THRESHOLD
		) {
			return;
		}
		drawn = true;
		const box = {
			left: Math.min(origin[0], now[0]),
			top: Math.min(origin[1], now[1]),
			width: Math.abs(now[0] - origin[0]),
			height: Math.abs(now[1] - origin[1]),
		};
		options.onBox(box);
		const client = {
			left: box.left + rect.left,
			top: box.top + rect.top,
			right: box.left + box.width + rect.left,
			bottom: box.top + box.height + rect.top,
		};
		const touched: string[] = [];
		for (const el of options.items()) {
			const path = el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE);
			if (path && classicyRectsIntersect(client, el.getBoundingClientRect()))
				touched.push(path);
		}
		options.onTouched(touched);
	};

	// Automatic scrolling, while the rectangle is drawn.
	let autoScroll: ReturnType<typeof setInterval> | null = null;
	const stopAutoScroll = () => {
		if (autoScroll !== null) clearInterval(autoScroll);
		autoScroll = null;
	};
	const scrollNow = () => {
		const found = classicyScrollViewportOf(holder);
		if (!found) return null;
		const { element: viewport, entry } = found;
		const scroll = classicyFileBrowserMarqueeScroll(
			pointer[0],
			pointer[1],
			viewport.getBoundingClientRect(),
			{
				x: {
					total: viewport.scrollWidth,
					visible: viewport.clientWidth,
					position: viewport.scrollLeft,
				},
				y: {
					total: viewport.scrollHeight,
					visible: viewport.clientHeight,
					position: viewport.scrollTop,
				},
			},
			entry.lineStep(),
		);
		return scroll.dx || scroll.dy ? { entry, ...scroll } : null;
	};
	const followAutoScroll = () => {
		if (!options.autoScroll || !drawn) return;
		if (!scrollNow()) {
			stopAutoScroll();
			return;
		}
		if (autoScroll !== null) return;
		autoScroll = setInterval(() => {
			const scroll = scrollNow();
			if (!scroll) {
				stopAutoScroll();
				return;
			}
			scroll.entry.scrollBy(scroll.dx, scroll.dy);
			// The content moved under a still pointer: the rectangle grows.
			measure();
		}, CLASSICY_PRESS_REPEAT_INTERVAL_MS);
	};

	const onMove = (e: MouseEvent) => {
		pointer = [e.clientX, e.clientY];
		measure();
		followAutoScroll();
	};

	let stopWatchingPointerStream = () => {};
	let stopWatchingEscape = () => {};
	const cleanup = () => {
		if (done) return false;
		done = true;
		stopAutoScroll();
		stopWatchingPointerStream();
		stopWatchingEscape();
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
		options.onBox(null);
		return true;
	};
	const onUp = () => {
		if (cleanup()) options.onEnd?.();
	};

	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
	stopWatchingPointerStream = onClassicyPointerStreamLost(onUp);
	stopWatchingEscape = onClassicyEscapeCancel(() => {
		if (!cleanup()) return;
		options.onCancel?.();
		options.onEnd?.();
	});
	return () => {
		cleanup();
	};
}

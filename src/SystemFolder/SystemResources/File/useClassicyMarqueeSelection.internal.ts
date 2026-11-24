/**
 * The Finder's selection rectangle (Mac OS 8.1, observed in Infinite Mac;
 * HIG7 pp.288-290 "Selection by Dragging"): a press on empty space and a drag
 * draw a rectangle from the press to the pointer, and every icon it touches
 * is selected as it grows and deselected as it shrinks away.
 *
 * - A press without Shift deselects everything at once; the rectangle starts
 *   once the pointer has traveled `CLASSICY_MARQUEE_THRESHOLD` px (a 1 px
 *   move draws none, 2 px does).
 * - An icon is touched where the rectangle meets its opaque pixels or its
 *   label's box: the drag outline's geometry (`ClassicyFileDragOutline.ts`).
 *   A corner of the icon's box the image leaves transparent does not count.
 * - With Shift held at the press the selection is kept, and the icons the
 *   rectangle touches toggle against it (HIG7 p.290: Shift-selecting
 *   highlighted objects deselects them). Command does nothing more than a
 *   plain press, as in the 8.1 Finder.
 * - Release ends it, keeping the selection. Escape cancels it and restores
 *   the selection from before the press (the 8.1 Finder did not; story
 *   0228-e9l asks for it, as every other Classicy gesture cancels on Escape).
 *   Losing the pointer stream ends it where it is, as a release would.
 * - Past the edge of the surface's scroller (a window's contents) the
 *   contents scroll a line at a time at the scroll arrows' rate (HIG7
 *   p.167), the press point scrolling with them.
 *
 * The rectangle is drawn by the `ClassicySelectionMarqueeLayer` element the
 * hook returns, a `data-classicy-part="selection-marquee"` element the
 * active Appearance Package draws.
 */

import "./ClassicySelectionMarquee.scss";
import classNames from "classnames";
import {
	createElement,
	type ReactElement,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import { readClassicyIconOpaqueMask } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import { CLASSICY_SCROLL_LINE_STEP } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";

/**
 * Pixels the pointer must travel from the press, on either axis, before the
 * rectangle starts (Mac OS 8.1: a 1 px move drew none, 2 px did).
 */
export const CLASSICY_MARQUEE_THRESHOLD = 2;

/** A box in the surface's content coordinates (px). */
export type ClassicyMarqueeBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * The rectangle, half-open as QuickDraw's: it covers the pixels from
 * `left` up to (not including) `right`, and `top` to `bottom`.
 */
export type ClassicyMarqueeRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

/** One selectable item, measured when the rectangle starts. */
export type ClassicyMarqueeShape = {
	id: string;
	/** The icon image's box, or null when it has none. */
	image: ClassicyMarqueeBox | null;
	/**
	 * The image's opaque pixels at its box's whole-pixel size, row-major
	 * (1 = opaque), or null: the whole box counts.
	 */
	mask: Uint8Array | null;
	/** The label's box, or null when it has none. */
	label: ClassicyMarqueeBox | null;
};

/** What a surface hands the hook for each item: its elements, as drawn. */
export type ClassicyMarqueeItem = {
	id: string;
	image?: HTMLImageElement | null;
	label?: Element | null;
};

/** Whether a press at `start` has become a rectangle at `point`. */
export const classicyMarqueeStarted = (
	start: readonly [number, number],
	point: readonly [number, number],
): boolean =>
	Math.max(Math.abs(point[0] - start[0]), Math.abs(point[1] - start[1])) >=
	CLASSICY_MARQUEE_THRESHOLD;

/** The rectangle from the press point to the pointer, either way round. */
export const classicyMarqueeRect = (
	anchor: readonly [number, number],
	point: readonly [number, number],
): ClassicyMarqueeRect => ({
	left: Math.min(anchor[0], point[0]),
	top: Math.min(anchor[1], point[1]),
	right: Math.max(anchor[0], point[0]),
	bottom: Math.max(anchor[1], point[1]),
});

const meets = (rect: ClassicyMarqueeRect, box: ClassicyMarqueeBox) =>
	rect.left < box.left + box.width &&
	rect.right > box.left &&
	rect.top < box.top + box.height &&
	rect.bottom > box.top;

// Whether any opaque pixel of the mask lies under the rectangle.
const meetsMask = (
	rect: ClassicyMarqueeRect,
	box: ClassicyMarqueeBox,
	mask: Uint8Array,
): boolean => {
	const width = Math.round(box.width);
	const height = Math.round(box.height);
	if (width * height !== mask.length) return true;
	const x0 = Math.max(0, Math.floor(rect.left - box.left));
	const x1 = Math.min(width, Math.ceil(rect.right - box.left));
	const y0 = Math.max(0, Math.floor(rect.top - box.top));
	const y1 = Math.min(height, Math.ceil(rect.bottom - box.top));
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			if (mask[y * width + x] === 1) return true;
		}
	}
	return false;
};

/** Whether the rectangle touches the item: its opaque pixels or its label. */
export const classicyMarqueeTouches = (
	rect: ClassicyMarqueeRect,
	shape: ClassicyMarqueeShape,
): boolean => {
	if (shape.label && meets(rect, shape.label)) return true;
	if (!shape.image || !meets(rect, shape.image)) return false;
	return shape.mask === null || meetsMask(rect, shape.image, shape.mask);
};

/** The ids of the items the rectangle touches, in the items' order. */
export const classicyMarqueeHits = (
	rect: ClassicyMarqueeRect,
	shapes: readonly ClassicyMarqueeShape[],
): string[] =>
	shapes
		.filter((shape) => classicyMarqueeTouches(rect, shape))
		.map((s) => s.id);

/**
 * The selection the rectangle makes: the touched items, or with Shift
 * (`toggle`) the selection at the press with the touched items toggled.
 */
export const classicyMarqueeSelection = (
	base: readonly string[],
	hits: readonly string[],
	toggle: boolean,
): string[] => {
	if (!toggle) return [...hits];
	const touched = new Set(hits);
	const kept = base.filter((id) => !touched.has(id));
	const had = new Set(base);
	return [...kept, ...hits.filter((id) => !had.has(id))];
};

/**
 * Which way the contents scroll with the pointer at `point` (client px)
 * against the scroller's visible box: -1 past the top or left edge, 1 past
 * the bottom or right, 0 within, on each axis.
 */
export const classicyMarqueeScrollDirection = (
	point: readonly [number, number],
	bounds: { left: number; top: number; right: number; bottom: number },
): [number, number] => [
	point[0] < bounds.left ? -1 : point[0] >= bounds.right ? 1 : 0,
	point[1] < bounds.top ? -1 : point[1] >= bounds.bottom ? 1 : 0,
];

const sameIds = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((id, i) => id === b[i]);

// A box in the surface's content coordinates from a client rectangle.
const contentBox = (
	el: Element,
	origin: { left: number; top: number },
): ClassicyMarqueeBox | null => {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0
		? {
				left: r.left - origin.left,
				top: r.top - origin.top,
				width: r.width,
				height: r.height,
			}
		: null;
};

/** Measure the items as they are drawn, in the surface's coordinates. */
export const measureClassicyMarqueeItems = (
	items: readonly ClassicyMarqueeItem[],
	origin: { left: number; top: number },
): ClassicyMarqueeShape[] =>
	items.map(({ id, image, label }) => {
		const imageBox = image ? contentBox(image, origin) : null;
		return {
			id,
			image: imageBox,
			mask:
				image && imageBox
					? readClassicyIconOpaqueMask(
							image,
							Math.round(imageBox.width),
							Math.round(imageBox.height),
						)
					: null,
			label: label ? contentBox(label, origin) : null,
		};
	});

export type ClassicyMarqueeOptions = {
	/**
	 * The positioned element the rectangle is drawn in, whose top left is
	 * the origin of its coordinates (the desktop, a file browser's icons).
	 */
	surfaceRef: RefObject<HTMLElement | null>;
	/** The items the rectangle can select, read when it starts. */
	getItems: () => ClassicyMarqueeItem[];
	/** The ids selected now. */
	getSelection: () => string[];
	/** Select exactly these ids (called only when the selection changes). */
	onSelect: (ids: string[]) => void;
	/**
	 * The element that scrolls the surface (a window's contents), for
	 * scrolling past its edges; none, and the rectangle stays in the
	 * surface.
	 */
	getScroller?: () => HTMLElement | null;
	/** Extra class names for the rectangle's element. */
	className?: string;
};

type MarqueeStore = {
	box: ClassicyMarqueeBox | null;
	listeners: Set<() => void>;
	set: (box: ClassicyMarqueeBox | null) => void;
};

const createMarqueeStore = (): MarqueeStore => {
	const store: MarqueeStore = {
		box: null,
		listeners: new Set(),
		set: (box) => {
			const old = store.box;
			if (
				old === box ||
				(old &&
					box &&
					old.left === box.left &&
					old.top === box.top &&
					old.width === box.width &&
					old.height === box.height)
			)
				return;
			store.box = box;
			for (const listener of store.listeners) listener();
		},
	};
	return store;
};

/**
 * The rectangle's element, re-rendered on its own as the rectangle changes
 * (not its surface). Draws nothing until a rectangle has started.
 */
const ClassicySelectionMarqueeLayer = ({
	store,
	className,
}: {
	store: MarqueeStore;
	className?: string;
}): ReactElement | null => {
	const subscribe = useCallback(
		(listener: () => void) => {
			store.listeners.add(listener);
			return () => {
				store.listeners.delete(listener);
			};
		},
		[store],
	);
	const box = useSyncExternalStore(
		subscribe,
		() => store.box,
		() => null,
	);
	if (!box) return null;
	return createElement("div", {
		"aria-hidden": "true",
		"data-classicy-part": "selection-marquee",
		className: classNames("classicySelectionMarquee", className),
		style: {
			left: box.left,
			top: box.top,
			width: box.width,
			height: box.height,
		},
	});
};

/** What a press hands `start`. */
export type ClassicyMarqueePress = {
	clientX: number;
	clientY: number;
	shiftKey: boolean;
};

/**
 * Selection by dragging a rectangle over a surface's icons. Call `start`
 * from the surface's mousedown on empty space (the primary button), and
 * render `marquee` inside the surface.
 */
export function useClassicyMarqueeSelection(options: ClassicyMarqueeOptions): {
	start: (press: ClassicyMarqueePress) => void;
	marquee: ReactElement;
} {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const store = useMemo(createMarqueeStore, []);
	const endRef = useRef<(() => void) | null>(null);

	useEffect(
		() => () => {
			endRef.current?.();
		},
		[],
	);

	const start = useCallback(
		(press: ClassicyMarqueePress) => {
			endRef.current?.();
			const surface = optionsRef.current.surfaceRef.current;
			if (!surface) return;
			const toggle = press.shiftKey;
			const before = optionsRef.current.getSelection();
			const base = toggle ? before : [];
			let current = before;
			const select = (ids: string[]) => {
				if (sameIds(ids, current)) return;
				current = ids;
				optionsRef.current.onSelect(ids);
			};
			// A plain press deselects everything at once.
			select(base);

			const origin = () => {
				const r = surface.getBoundingClientRect();
				return { left: r.left, top: r.top };
			};
			// The press point, in content coordinates: it scrolls with them.
			const pressOrigin = origin();
			const anchor: [number, number] = [
				press.clientX - pressOrigin.left,
				press.clientY - pressOrigin.top,
			];
			let pointer: [number, number] = [press.clientX, press.clientY];
			let shapes: ClassicyMarqueeShape[] | null = null;
			let scrollTimer: ReturnType<typeof setInterval> | null = null;

			const scroller = () => optionsRef.current.getScroller?.() ?? null;

			// The part of the surface the rectangle may be drawn in: what its
			// scroller shows of it, else the surface's own box; none when it
			// has no size (not laid out), and then the rectangle is not cut.
			const visible = (o: { left: number; top: number }) => {
				const r = (scroller() ?? surface).getBoundingClientRect();
				if (r.width <= 0 || r.height <= 0) return null;
				return {
					left: r.left - o.left,
					top: r.top - o.top,
					right: r.right - o.left,
					bottom: r.bottom - o.top,
				};
			};

			const update = () => {
				const o = origin();
				const point: [number, number] = [
					pointer[0] - o.left,
					pointer[1] - o.top,
				];
				if (!shapes) {
					if (!classicyMarqueeStarted(anchor, point)) return;
					shapes = measureClassicyMarqueeItems(
						optionsRef.current.getItems(),
						o,
					);
				}
				const rect = classicyMarqueeRect(anchor, point);
				select(
					classicyMarqueeSelection(
						base,
						classicyMarqueeHits(rect, shapes),
						toggle,
					),
				);
				// Drawn only where the surface shows, so the rectangle
				// never widens what its scroller can scroll to.
				const v = visible(o) ?? rect;
				const left = Math.max(rect.left, v.left);
				const top = Math.max(rect.top, v.top);
				const right = Math.min(rect.right, v.right);
				const bottom = Math.min(rect.bottom, v.bottom);
				store.set(
					right > left && bottom > top
						? { left, top, width: right - left, height: bottom - top }
						: null,
				);
			};

			const stopScrolling = () => {
				if (scrollTimer !== null) clearInterval(scrollTimer);
				scrollTimer = null;
			};
			// Which way the scroller scrolls toward the pointer; not at all
			// when there is none, or it has no size (not laid out).
			const scrollDirection = (el: HTMLElement | null): [number, number] => {
				const r = el?.getBoundingClientRect();
				return r && r.width > 0 && r.height > 0
					? classicyMarqueeScrollDirection(pointer, r)
					: [0, 0];
			};
			// One line toward the pointer, as a scroll arrow steps.
			const scrollStep = () => {
				const el = scroller();
				const [dx, dy] = scrollDirection(el);
				if (!el || !shapes || (dx === 0 && dy === 0)) return stopScrolling();
				el.scrollLeft += dx * CLASSICY_SCROLL_LINE_STEP;
				el.scrollTop += dy * CLASSICY_SCROLL_LINE_STEP;
				update();
			};
			const followScroll = () => {
				const [dx, dy] = scrollDirection(scroller());
				if (dx === 0 && dy === 0) return stopScrolling();
				if (scrollTimer !== null) return;
				scrollStep();
				scrollTimer = setInterval(
					scrollStep,
					CLASSICY_PRESS_REPEAT_INTERVAL_MS,
				);
			};

			let stopWatchingPointerStream = () => {};
			const end = () => {
				stopScrolling();
				stopWatchingPointerStream();
				document.removeEventListener("mousemove", onMove, true);
				document.removeEventListener("mouseup", onUp, true);
				document.removeEventListener("keydown", onKey, true);
				store.set(null);
				if (endRef.current === end) endRef.current = null;
			};
			function onMove(e: MouseEvent) {
				pointer = [e.clientX, e.clientY];
				update();
				if (shapes) {
					// No text selection while the rectangle follows the pointer.
					e.preventDefault();
					followScroll();
				}
			}
			function onUp(e: MouseEvent) {
				pointer = [e.clientX, e.clientY];
				if (shapes) update();
				end();
			}
			function onKey(e: KeyboardEvent) {
				if (e.key !== "Escape") return;
				e.preventDefault();
				e.stopPropagation();
				end();
				select(before);
			}
			document.addEventListener("mousemove", onMove, true);
			document.addEventListener("mouseup", onUp, true);
			document.addEventListener("keydown", onKey, true);
			stopWatchingPointerStream = onClassicyPointerStreamLost(end);
			endRef.current = end;
		},
		[store],
	);

	const className = options.className;
	const marquee = useMemo(
		() => createElement(ClassicySelectionMarqueeLayer, { store, className }),
		[store, className],
	);
	return { start, marquee };
}

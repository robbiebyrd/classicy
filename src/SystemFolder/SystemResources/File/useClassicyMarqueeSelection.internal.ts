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
 *   plain press, as in the 8.1 Finder. A Control-press (or a right-press)
 *   is not a rectangle at all: it is the contextual-menu click (the
 *   surfaces never call `start` for one;
 *   `ClassicyContextualPress.internal.ts`).
 * - Release ends it, keeping the selection. Escape cancels it and restores
 *   the selection from before the press (the 8.1 Finder did not; story
 *   0228-e9l asks for it, as every other Classicy gesture cancels on Escape).
 *   Losing the pointer stream ends it where it is, as a release would.
 *   Every other key is held off while it lasts (8.1 tracked the mouse alone
 *   and took the keys after the release), so no arrow key or type-ahead can
 *   change the selection under it.
 * - Past the edge of the surface's scroller (a window's contents) the
 *   contents scroll a line at a time at the scroll arrows' rate (HIG7
 *   p.167), the press point scrolling with them. Past that edge the
 *   rectangle is clipped, not re-framed: its sides run to the edge, as
 *   QuickDraw clipped its frame to the window's contents.
 *
 * The rectangle is drawn by the `ClassicySelectionMarqueeLayer` element the
 * hook returns: a clip box (`classicySelectionMarqueeClip`, the part of the
 * surface that shows) holding the `data-classicy-part="selection-marquee"`
 * element at the whole rectangle's geometry, which the active Appearance
 * Package draws. The part carries the desktop's corner as
 * `--classicy-pattern-origin-x` / `-y`, so a package lays its checker from
 * the desktop, as QuickDraw laid the pattern from the screen.
 */

import "./ClassicySelectionMarquee.scss";
import classNames from "classnames";
import {
	type CSSProperties,
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

// Opaque masks already read, by image source and drawn size: icons share a
// handful of images, so a folder of hundreds of items reads each once, not
// once per item per gesture. Bounded, as image sources are host data.
const MASK_CACHE_LIMIT = 256;
const maskCache = new Map<string, Uint8Array | null>();

/** Forget every cached icon mask (tests). @internal */
export const resetClassicyMarqueeMaskCacheForTests = (): void => {
	maskCache.clear();
};

const opaqueMaskOf = (
	image: HTMLImageElement,
	width: number,
	height: number,
): Uint8Array | null => {
	const src = image.currentSrc || image.src;
	// Not loaded yet: read it now and keep nothing.
	if (!src || !image.complete)
		return readClassicyIconOpaqueMask(image, width, height);
	const key = `${width}x${height} ${src}`;
	const cached = maskCache.get(key);
	if (cached !== undefined) return cached;
	const mask = readClassicyIconOpaqueMask(image, width, height);
	if (maskCache.size >= MASK_CACHE_LIMIT) maskCache.clear();
	maskCache.set(key, mask);
	return mask;
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
					? opaqueMaskOf(
							image,
							Math.round(imageBox.width),
							Math.round(imageBox.height),
						)
					: null,
			label: label ? contentBox(label, origin) : null,
		};
	});

/** A box in client coordinates, edges as `getBoundingClientRect` gives them. */
export type ClassicyMarqueeBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

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
	/**
	 * The part of the scroller the items show in, in client coordinates,
	 * where it is less than the scroller's box (a list's column titles
	 * inside it): the rectangle is clipped to it and scrolls past its edges.
	 * Left out or null, the scroller's box.
	 */
	getVisibleBounds?: () => ClassicyMarqueeBounds | null;
	/** Extra class names for the rectangle's element. */
	className?: string;
};

/** What the layer draws: the rectangle, the box it is clipped to, and the desktop's corner from the rectangle's. */
type MarqueeFrame = {
	rect: ClassicyMarqueeBox;
	clip: ClassicyMarqueeBox;
	origin: [number, number];
};

type MarqueeStore = {
	frame: MarqueeFrame | null;
	listeners: Set<() => void>;
	set: (frame: MarqueeFrame | null) => void;
};

const sameBox = (a: ClassicyMarqueeBox, b: ClassicyMarqueeBox) =>
	a.left === b.left &&
	a.top === b.top &&
	a.width === b.width &&
	a.height === b.height;

const createMarqueeStore = (): MarqueeStore => {
	const store: MarqueeStore = {
		frame: null,
		listeners: new Set(),
		set: (frame) => {
			const old = store.frame;
			if (
				old === frame ||
				(old &&
					frame &&
					sameBox(old.rect, frame.rect) &&
					sameBox(old.clip, frame.clip) &&
					old.origin[0] === frame.origin[0] &&
					old.origin[1] === frame.origin[1])
			)
				return;
			store.frame = frame;
			for (const listener of store.listeners) listener();
		},
	};
	return store;
};

/**
 * The rectangle's elements, re-rendered on their own as the rectangle
 * changes (not its surface). Nothing until a rectangle has started. The clip
 * box sets no `z-index`, `opacity`, `transform` or `isolation`, so it makes
 * no stacking context: the part blends with what lies under it, and its
 * `z-index` places it among the icons.
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
	const frame = useSyncExternalStore(
		subscribe,
		() => store.frame,
		() => null,
	);
	if (!frame) return null;
	const { rect, clip, origin } = frame;
	return createElement(
		"div",
		{
			"aria-hidden": "true",
			className: "classicySelectionMarqueeClip",
			style: {
				left: clip.left,
				top: clip.top,
				width: clip.width,
				height: clip.height,
			},
		},
		createElement("div", {
			"data-classicy-part": "selection-marquee",
			className: classNames("classicySelectionMarquee", className),
			style: {
				left: rect.left - clip.left,
				top: rect.top - clip.top,
				width: rect.width,
				height: rect.height,
				"--classicy-pattern-origin-x": `${origin[0]}px`,
				"--classicy-pattern-origin-y": `${origin[1]}px`,
			} as CSSProperties,
		}),
	);
};

/** What a press hands `start`. */
export type ClassicyMarqueePress = {
	clientX: number;
	clientY: number;
	shiftKey: boolean;
};

// Modifier keys alone never act, so they pass while the rectangle is held.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);

/**
 * Selection by dragging a rectangle over a surface's icons. Call `start`
 * from the surface's mousedown on empty space (the primary button, no
 * Control), and render `marquee` inside the surface.
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
			// Against the selection as it is, so a change made by anything
			// else is never mistaken for the one this rectangle last made.
			const select = (ids: string[]) => {
				if (sameIds(ids, optionsRef.current.getSelection())) return;
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
			// The desktop, whose corner the pattern is laid from.
			const desktop = surface.closest<HTMLElement>(".classicyDesktop") ?? null;

			// Where the items show, in client coordinates: the visible bounds
			// given, else the scroller's box, else the surface's; none when it
			// has no size (not laid out).
			const shown = (): ClassicyMarqueeBounds | null => {
				const given = optionsRef.current.getVisibleBounds?.() ?? null;
				const r = given ?? (scroller() ?? surface).getBoundingClientRect();
				return r.right - r.left > 0 && r.bottom - r.top > 0 ? r : null;
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
				if (rect.right <= rect.left || rect.bottom <= rect.top) {
					store.set(null);
					return;
				}
				// Clipped to where the surface shows, so the rectangle never
				// widens what its scroller can scroll to; whole where it is
				// not laid out.
				const v = shown();
				const clip = v
					? {
							left: Math.max(rect.left, v.left - o.left),
							top: Math.max(rect.top, v.top - o.top),
							right: Math.min(rect.right, v.right - o.left),
							bottom: Math.min(rect.bottom, v.bottom - o.top),
						}
					: rect;
				if (clip.right <= clip.left || clip.bottom <= clip.top) {
					store.set(null);
					return;
				}
				// The desktop's padding-box corner from the rectangle's.
				const d = desktop?.getBoundingClientRect();
				const corner: [number, number] = d
					? [
							d.left + (desktop?.clientLeft ?? 0),
							d.top + (desktop?.clientTop ?? 0),
						]
					: [0, 0];
				store.set({
					rect: {
						left: rect.left,
						top: rect.top,
						width: rect.right - rect.left,
						height: rect.bottom - rect.top,
					},
					clip: {
						left: clip.left,
						top: clip.top,
						width: clip.right - clip.left,
						height: clip.bottom - clip.top,
					},
					origin: [
						Math.round(corner[0] - (o.left + rect.left)),
						Math.round(corner[1] - (o.top + rect.top)),
					],
				});
			};

			const stopScrolling = () => {
				if (scrollTimer !== null) clearInterval(scrollTimer);
				scrollTimer = null;
			};
			// Which way the scroller scrolls toward the pointer; not at all
			// when there is none, or it shows nothing (not laid out).
			const scrollDirection = (): [number, number] => {
				if (!scroller()) return [0, 0];
				const v = shown();
				return v ? classicyMarqueeScrollDirection(pointer, v) : [0, 0];
			};
			// One line toward the pointer, as a scroll arrow steps.
			const scrollStep = () => {
				const el = scroller();
				const [dx, dy] = scrollDirection();
				if (!el || !shapes || (dx === 0 && dy === 0)) return stopScrolling();
				el.scrollLeft += dx * CLASSICY_SCROLL_LINE_STEP;
				el.scrollTop += dy * CLASSICY_SCROLL_LINE_STEP;
				update();
			};
			const followScroll = () => {
				const [dx, dy] = scrollDirection();
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
				if (MODIFIER_KEYS.has(e.key)) return;
				e.preventDefault();
				e.stopPropagation();
				if (e.key !== "Escape") return;
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

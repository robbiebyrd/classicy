import "./ClassicyScrollArea.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	forwardRef,
	type HTMLAttributes,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type Ref,
	type RefObject,
	type UIEvent,
	type UIEventHandler,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicyPressRepeat } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import {
	type ClassicyScrollAxisMetrics,
	type ClassicyScrollBarPolicy,
	type ClassicyScrollBarsShown,
	type ClassicyScrollThumb,
	classicyScrollAxisFits,
	classicyScrollPositionForThumb,
	computeClassicyScrollBars,
	computeClassicyScrollThumb,
} from "./ClassicyScrollAreaMetrics";

/** The distance one press of a scroll arrow scrolls, when not given. */
const DEFAULT_LINE_STEP = 16;

export type ClassicyScrollBarOrientation = "vertical" | "horizontal";

export interface ClassicyScrollAreaProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> {
	children?: ReactNode;
	/** When the vertical bar is drawn. Defaults to `"auto"`. */
	vertical?: ClassicyScrollBarPolicy;
	/** When the horizontal bar is drawn. Defaults to `"auto"`. */
	horizontal?: ClassicyScrollBarPolicy;
	/**
	 * Draw both bars whenever either is drawn, the axis that fits showing an
	 * empty track (Mac OS 8's document window). Defaults to `false`.
	 */
	pairBars?: boolean;
	/**
	 * `false` clips the content instead of scrolling it, with no bars.
	 * Defaults to `true`.
	 */
	scrollable?: boolean;
	/**
	 * Draw the bars inactive. Defaults to the state of the `ClassicyWindow`
	 * the area is drawn in (inactive when that window is), else `false`.
	 */
	inactive?: boolean;
	/** Pixels one press of an arrow scrolls. Defaults to 16. */
	lineStep?: number;
	/** The scrolling element (the viewport), for the caller's own reads. */
	viewportRef?: Ref<HTMLDivElement>;
	/** Extra class names on the viewport. */
	viewportClassName?: string;
	/** Attributes and handlers for the viewport (role, tabIndex, aria-*). */
	viewportProps?: HTMLAttributes<HTMLDivElement>;
	/** The viewport's scroll events. */
	onScroll?: HTMLAttributes<HTMLDivElement>["onScroll"];
	/**
	 * A scroller of the caller's own as the viewport, in place of the area's
	 * `<div>` (a `<textarea>`, which scrolls its own text). It is handed the
	 * viewport's ref, class name and scroll handler to put on that element;
	 * `children`, `viewportClassName` and `viewportProps` are not used.
	 */
	renderViewport?: (viewport: ClassicyScrollAreaViewportProps) => ReactNode;
}

/** What `renderViewport` puts on its scroller. */
export type ClassicyScrollAreaViewportProps = {
	ref: (el: HTMLElement | null) => void;
	className: string;
	onScroll: UIEventHandler<HTMLElement>;
};

type Thumbs = Record<ClassicyScrollBarOrientation, ClassicyScrollThumb>;
type BarRefs = {
	bar: RefObject<HTMLDivElement | null>;
	track: RefObject<HTMLDivElement | null>;
	thumb: RefObject<HTMLDivElement | null>;
};

const NO_THUMB: ClassicyScrollThumb = { length: 0, offset: 0 };

const setRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
	if (typeof ref === "function") ref(value);
	else if (ref) (ref as { current: T | null }).current = value;
};

const axisOf = (
	el: HTMLElement,
	orientation: ClassicyScrollBarOrientation,
): ClassicyScrollAxisMetrics =>
	orientation === "vertical"
		? {
				total: el.scrollHeight,
				visible: el.clientHeight,
				position: el.scrollTop,
			}
		: {
				total: el.scrollWidth,
				visible: el.clientWidth,
				position: el.scrollLeft,
			};

// The track's start and length along the bar. The thumb is the bar's child,
// not the track's, so it covers the track's whole box (as a browser's
// thumb covers its track's border); its offset is from the bar's start.
const trackOf = (
	refs: BarRefs,
	orientation: ClassicyScrollBarOrientation,
): { start: number; length: number } => {
	const track = refs.track.current;
	if (!track) return { start: 0, length: 0 };
	return orientation === "vertical"
		? { start: track.offsetTop, length: track.offsetHeight }
		: { start: track.offsetLeft, length: track.offsetWidth };
};

// A computed length in CSS pixels, or undefined for anything else (`none`,
// `auto`, a percentage of a box the bar does not measure).
const pxLength = (value: string): number | undefined => {
	const match = /^(-?\d*\.?\d+(?:e[-+]?\d+)?)px$/i.exec(value.trim());
	return match ? Number(match[1]) : undefined;
};

// The thumb's minimum and maximum lengths, from the package's stylesheet
// (min-height and max-height, or min-width and max-width, on the thumb
// part), so a package sets them as a browser's thumb takes its minimum. A
// maximum as long as the minimum fixes the thumb's length (System 7's
// scroll box). Only a pixel length counts: any other value leaves the
// limit unset (no minimum, no maximum).
const thumbLimitsOf = (
	refs: BarRefs,
	orientation: ClassicyScrollBarOrientation,
): { min: number; max: number } => {
	const thumb = refs.thumb.current;
	if (!thumb || typeof getComputedStyle === "undefined") {
		return { min: 0, max: Number.POSITIVE_INFINITY };
	}
	const style = getComputedStyle(thumb);
	const vertical = orientation === "vertical";
	const min = pxLength(vertical ? style.minHeight : style.minWidth);
	const max = pxLength(vertical ? style.maxHeight : style.maxWidth);
	return { min: min ?? 0, max: max ?? Number.POSITIVE_INFINITY };
};

/** The thumb for `axis` in its bar, within the package's limits. */
const thumbOf = (
	axis: ClassicyScrollAxisMetrics,
	trackLength: number,
	refs: BarRefs,
	orientation: ClassicyScrollBarOrientation,
) => {
	const { min, max } = thumbLimitsOf(refs, orientation);
	return computeClassicyScrollThumb(axis, trackLength, min, max);
};

const sameThumb = (a: ClassicyScrollThumb, b: ClassicyScrollThumb) =>
	a.length === b.length && a.offset === b.offset;

/**
 * Moves a bar (or the corner) onto the device-pixel grid. A browser draws
 * its scroll bars at whole device pixels however its box is placed; laid
 * out in the page, a bar can start at a fraction of one (a window's frame
 * ring is 4.8 px), and its gradients (the arrow glyphs, the thumb's grip)
 * would then rasterize a row off. The nudge (under half a pixel) is a
 * custom property the base stylesheet offsets the part by; it is measured
 * from where the part sits without it, so applying it never changes it.
 */
const snapClassicyScrollPart = (el: HTMLElement | null) => {
	if (!el || typeof window === "undefined") return;
	const ratio = window.devicePixelRatio || 1;
	const rect = el.getBoundingClientRect();
	const nudge = (natural: number) =>
		Math.round(natural * ratio) / ratio - natural;
	const natural = {
		"--classicy-scroll-snap-x": rect.left,
		"--classicy-scroll-snap-y": rect.top,
	};
	for (const [name, at] of Object.entries(natural)) {
		const current = Number.parseFloat(el.style.getPropertyValue(name)) || 0;
		const next = nudge(at - current);
		// Rounded to a 64th, the layout unit, so float noise never rewrites it.
		const value = `${Math.round(next * 64) / 64}px`;
		if (el.style.getPropertyValue(name) !== value) {
			el.style.setProperty(name, value);
		}
	}
};

/**
 * A scrolling area with Classicy's own scroll bars. The content scrolls in a
 * native scroll container (the viewport: wheel, keyboard, touch, text
 * selection and accessibility behave as the browser's do) whose own bars are
 * hidden; beside it Classicy draws each bar as parts an Appearance Package
 * styles, `data-classicy-part` `scrollbar` holding `scroll-arrow-start` (it
 * scrolls toward the start), `scroll-track`, `scroll-arrow-end` and
 * `scroll-thumb`, and `scroll-corner` where two bars meet. Arrangement is
 * CSS `order` on the arrows and track. States: `inactive` on the root and
 * bars (the owning window is inactive), `fits` on a bar whose axis has
 * nothing to scroll (no thumb), `pressed` on a held arrow or track and
 * `dragging` on a dragged thumb.
 *
 * An arrow press scrolls a line and repeats while held; a track press pages
 * toward the pointer and repeats until the thumb reaches it; dragging the
 * thumb scrolls in proportion. A lost pointer stream ends any of them. The
 * bars are `aria-hidden` and never take focus: the viewport is the
 * scrollable region assistive technology and the keyboard use, as with a
 * native scroll bar.
 */
export const ClassicyScrollArea = forwardRef<
	HTMLDivElement,
	ClassicyScrollAreaProps
>(function ClassicyScrollArea(
	{
		children,
		vertical = "auto",
		horizontal = "auto",
		pairBars = false,
		scrollable = true,
		inactive,
		lineStep = DEFAULT_LINE_STEP,
		viewportRef,
		viewportClassName,
		viewportProps,
		onScroll,
		renderViewport,
		className,
		style,
		...rootProps
	},
	ref,
) {
	const windowActive = useContext(ClassicyWindowActiveContext);
	const isInactive = inactive ?? windowActive === false;
	const verticalPolicy = scrollable ? vertical : "never";
	const horizontalPolicy = scrollable ? horizontal : "never";

	const viewportElRef = useRef<HTMLElement | null>(null);
	const barRefs: Record<ClassicyScrollBarOrientation, BarRefs> = {
		vertical: {
			bar: useRef<HTMLDivElement | null>(null),
			track: useRef<HTMLDivElement | null>(null),
			thumb: useRef<HTMLDivElement | null>(null),
		},
		horizontal: {
			bar: useRef<HTMLDivElement | null>(null),
			track: useRef<HTMLDivElement | null>(null),
			thumb: useRef<HTMLDivElement | null>(null),
		},
	};
	const cornerRef = useRef<HTMLDivElement | null>(null);
	const barRefsRef = useRef(barRefs);
	barRefsRef.current = barRefs;

	const [shown, setShown] = useState<ClassicyScrollBarsShown>({
		vertical: verticalPolicy === "always",
		horizontal: horizontalPolicy === "always",
	});
	const shownRef = useRef(shown);
	shownRef.current = shown;
	const [thumbs, setThumbs] = useState<Thumbs>({
		vertical: NO_THUMB,
		horizontal: NO_THUMB,
	});
	const [fits, setFits] = useState({ vertical: true, horizontal: true });
	const policyRef = useRef({
		vertical: verticalPolicy,
		horizontal: horizontalPolicy,
		paired: pairBars,
	});
	policyRef.current = {
		vertical: verticalPolicy,
		horizontal: horizontalPolicy,
		paired: pairBars,
	};

	// Measure the viewport: which bars it needs, and where each thumb sits.
	// Runs on every layout change and scroll; sets state only on a change.
	const update = useCallback(() => {
		const el = viewportElRef.current;
		if (!el) return;
		const refs = barRefsRef.current;
		const current = shownRef.current;
		const vBar = refs.vertical.bar.current;
		const hBar = refs.horizontal.bar.current;
		// A bar not drawn is taken to be as thick as the one that is.
		const vSize = vBar?.offsetWidth ?? hBar?.offsetHeight ?? 0;
		const hSize = hBar?.offsetHeight ?? vBar?.offsetWidth ?? 0;
		const next = computeClassicyScrollBars({
			...policyRef.current,
			shown: current,
			size: { vertical: vSize, horizontal: hSize },
			scrollWidth: el.scrollWidth,
			scrollHeight: el.scrollHeight,
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
		});
		if (
			next.vertical !== current.vertical ||
			next.horizontal !== current.horizontal
		) {
			// Drawn on the next render; the layout effect measures again.
			shownRef.current = next;
			setShown(next);
			return;
		}
		const nextThumbs: Thumbs = { vertical: NO_THUMB, horizontal: NO_THUMB };
		const nextFits = { vertical: true, horizontal: true };
		for (const orientation of ["vertical", "horizontal"] as const) {
			const axis = axisOf(el, orientation);
			nextFits[orientation] = classicyScrollAxisFits(axis);
			if (!current[orientation]) continue;
			const track = trackOf(refs[orientation], orientation);
			const thumb = thumbOf(axis, track.length, refs[orientation], orientation);
			nextThumbs[orientation] =
				thumb.length > 0
					? { length: thumb.length, offset: track.start + thumb.offset }
					: NO_THUMB;
		}
		setThumbs((prev) =>
			sameThumb(prev.vertical, nextThumbs.vertical) &&
			sameThumb(prev.horizontal, nextThumbs.horizontal)
				? prev
				: nextThumbs,
		);
		setFits((prev) =>
			prev.vertical === nextFits.vertical &&
			prev.horizontal === nextFits.horizontal
				? prev
				: nextFits,
		);
		snapClassicyScrollPart(refs.vertical.bar.current);
		snapClassicyScrollPart(refs.horizontal.bar.current);
		snapClassicyScrollPart(cornerRef.current);
	}, []);

	// Every render may have moved something (bars drawn or removed, a policy
	// changed): measure before paint.
	useLayoutEffect(() => {
		update();
	});

	// Layout changes that are not renders of this component: the viewport or
	// its content resizing, the content changing, an image loading.
	useLayoutEffect(() => {
		const el = viewportElRef.current;
		if (!el) return;
		const resizeObserver =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(() => update());
		const observeChildren = () => {
			if (!resizeObserver) return;
			resizeObserver.disconnect();
			resizeObserver.observe(el);
			for (const child of Array.from(el.children)) {
				resizeObserver.observe(child);
			}
		};
		observeChildren();
		const mutationObserver =
			typeof MutationObserver === "undefined"
				? undefined
				: new MutationObserver(() => {
						observeChildren();
						update();
					});
		mutationObserver?.observe(el, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		});
		el.addEventListener("load", update, true);
		// A text area's own text changes no element.
		el.addEventListener("input", update);
		return () => {
			resizeObserver?.disconnect();
			mutationObserver?.disconnect();
			el.removeEventListener("load", update, true);
			el.removeEventListener("input", update);
		};
	}, [update]);

	const viewportRefCallback = useCallback(
		(el: HTMLElement | null) => {
			viewportElRef.current = el;
			setRef(viewportRef, el as HTMLDivElement | null);
		},
		[viewportRef],
	);

	const scrollBy = useCallback(
		(orientation: ClassicyScrollBarOrientation, delta: number) => {
			const el = viewportElRef.current;
			if (!el) return;
			if (orientation === "vertical") el.scrollTop += delta;
			else el.scrollLeft += delta;
			update();
		},
		[update],
	);

	// A focused root (a list box that takes the keyboard itself) scrolls its
	// viewport for the keys a focused scroller takes, unless its own handler
	// used the key: the browser would scroll an ancestor instead.
	const onRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		rootProps.onKeyDown?.(e);
		const el = viewportElRef.current;
		if (!el || !scrollable || e.defaultPrevented) return;
		if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) {
			return;
		}
		const page = Math.max(el.clientHeight - lineStep, lineStep);
		const steps: Record<string, [ClassicyScrollBarOrientation, number]> = {
			ArrowUp: ["vertical", -lineStep],
			ArrowDown: ["vertical", lineStep],
			ArrowLeft: ["horizontal", -lineStep],
			ArrowRight: ["horizontal", lineStep],
			PageUp: ["vertical", -page],
			PageDown: ["vertical", page],
			" ": ["vertical", e.shiftKey ? -page : page],
			Home: ["vertical", -el.scrollHeight],
			End: ["vertical", el.scrollHeight],
		};
		const step = steps[e.key];
		if (!step) return;
		e.preventDefault();
		scrollBy(step[0], step[1]);
	};

	const bar = (orientation: ClassicyScrollBarOrientation) => (
		<ClassicyScrollBar
			orientation={orientation}
			refs={barRefs[orientation]}
			viewportRef={viewportElRef}
			thumb={thumbs[orientation]}
			fits={fits[orientation]}
			inactive={isInactive}
			lineStep={lineStep}
			scrollBy={scrollBy}
			update={update}
		/>
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: the keys only reach a root its caller made focusable (with its role); the area adds none
		<div
			{...rootProps}
			ref={ref}
			onKeyDown={onRootKeyDown}
			className={classNames(
				"classicyScrollArea",
				classicyStateClasses({ inactive: isInactive }),
				className,
			)}
			style={style}
		>
			<div className="classicyScrollAreaBody">
				{renderViewport ? (
					renderViewport({
						ref: viewportRefCallback,
						className: classNames(
							"classicyScrollAreaViewport",
							scrollable ? "" : "classicyScrollAreaViewportClipped",
						),
						onScroll: (e) => {
							update();
							onScroll?.(e as UIEvent<HTMLDivElement>);
						},
					})
				) : (
					<div
						{...viewportProps}
						ref={viewportRefCallback}
						className={classNames(
							"classicyScrollAreaViewport",
							scrollable ? "" : "classicyScrollAreaViewportClipped",
							viewportClassName,
							viewportProps?.className,
						)}
						onScroll={(e) => {
							update();
							onScroll?.(e);
							viewportProps?.onScroll?.(e);
						}}
					>
						{children}
					</div>
				)}
				{shown.vertical && bar("vertical")}
			</div>
			{shown.horizontal && (
				<div className="classicyScrollAreaFoot">
					{bar("horizontal")}
					{shown.vertical && (
						<div
							ref={cornerRef}
							className={classNames(
								"classicyScrollAreaCorner",
								classicyStateClasses({ inactive: isInactive }),
							)}
							data-classicy-part="scroll-corner"
							aria-hidden="true"
						/>
					)}
				</div>
			)}
		</div>
	);
});

type ClassicyScrollBarProps = {
	orientation: ClassicyScrollBarOrientation;
	refs: BarRefs;
	viewportRef: RefObject<HTMLElement | null>;
	thumb: ClassicyScrollThumb;
	fits: boolean;
	inactive: boolean;
	lineStep: number;
	scrollBy: (orientation: ClassicyScrollBarOrientation, delta: number) => void;
	update: () => void;
};

type PressedPart = "start" | "end" | "track" | null;

// One bar: the arrows and track in a row (their order is the package's),
// and the thumb over the track.
const ClassicyScrollBar = ({
	orientation,
	refs,
	viewportRef,
	thumb,
	fits,
	inactive,
	lineStep,
	scrollBy,
	update,
}: ClassicyScrollBarProps) => {
	const vertical = orientation === "vertical";
	const repeat = useClassicyPressRepeat();
	const [pressed, setPressed] = useState<PressedPart>(null);
	const [dragging, setDragging] = useState(false);
	const stopDragRef = useRef<(() => void) | null>(null);
	// The arrow or track held now, and how to end that hold.
	const heldRef = useRef<PressedPart>(null);
	const endHoldRef = useRef<(() => void) | null>(null);
	useEffect(
		() => () => {
			stopDragRef.current?.();
			endHoldRef.current?.();
		},
		[],
	);

	const along = (e: { clientX: number; clientY: number }) =>
		vertical ? e.clientY : e.clientX;

	// A press anywhere on the bar keeps focus where it is (a native scroll
	// bar takes none) and starts no text selection.
	const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

	/**
	 * Holds an arrow or the track until the button comes up anywhere or the
	 * pointer stream is lost. While held, `begin()` (the part's repeat) runs
	 * whenever the pointer is over the part: leaving it stops the repeat and
	 * the pressed look, coming back over it starts them again, as Mac OS and
	 * a browser's own scroll bar do.
	 */
	const hold = (
		part: Exclude<PressedPart, null>,
		el: HTMLElement,
		begin: (run: (step: () => boolean | undefined) => void) => void,
		cleanup?: () => void,
	) => {
		endHoldRef.current?.();
		heldRef.current = part;
		const run = (step: () => boolean | undefined) => {
			setPressed(part);
			repeat.start(step, () => setPressed(null));
		};
		const onLeave = () => repeat.stop();
		const onEnter = () => {
			if (heldRef.current === part) begin(run);
		};
		const end = () => {
			if (endHoldRef.current !== end) return;
			endHoldRef.current = null;
			heldRef.current = null;
			el.removeEventListener("mouseleave", onLeave);
			el.removeEventListener("mouseenter", onEnter);
			document.removeEventListener("mouseup", end, true);
			stopWatchingPointerStream();
			cleanup?.();
			repeat.stop();
		};
		el.addEventListener("mouseleave", onLeave);
		el.addEventListener("mouseenter", onEnter);
		document.addEventListener("mouseup", end, true);
		const stopWatchingPointerStream = onClassicyPointerStreamLost(end);
		endHoldRef.current = end;
		begin(run);
	};

	const pressArrow = (
		e: ReactMouseEvent<HTMLDivElement>,
		direction: 1 | -1,
	) => {
		if (e.button !== 0) return;
		keepFocus(e);
		hold(direction < 0 ? "start" : "end", e.currentTarget, (run) =>
			run(() => {
				scrollBy(orientation, direction * lineStep);
				return undefined;
			}),
		);
	};

	const pressTrack = (e: ReactMouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		keepFocus(e);
		const barEl = refs.bar.current;
		const el = viewportRef.current;
		if (!barEl || !el || fits) return;
		const barStart = (r: DOMRect) => (vertical ? r.top : r.left);
		// The pointer, in the bar's coordinates (the thumb's offset is too);
		// it may move while the track is held.
		let pointer = along(e) - barStart(barEl.getBoundingClientRect());
		const onMove = (ev: MouseEvent) => {
			pointer = along(ev) - barStart(barEl.getBoundingClientRect());
		};
		document.addEventListener("mousemove", onMove, true);
		const page = () =>
			Math.max(
				(vertical ? el.clientHeight : el.clientWidth) - lineStep,
				lineStep,
			);
		// Where the thumb is now, from the content rather than the last
		// render, so the repeat sees each page it has just scrolled.
		const thumbNow = () => {
			const track = trackOf(refs, orientation);
			const t = thumbOf(
				axisOf(el, orientation),
				track.length,
				refs,
				orientation,
			);
			return {
				start: track.start + t.offset,
				end: track.start + t.offset + t.length,
			};
		};
		hold(
			"track",
			e.currentTarget,
			(run) => {
				// Toward the pointer where it is now (a return over the track
				// may be on the thumb's other side).
				const direction = pointer < thumbNow().start ? -1 : 1;
				run(() => {
					// Stop once the thumb reaches the pointer (HIG7 p.165).
					const t = thumbNow();
					if (direction < 0 ? pointer >= t.start : pointer < t.end) {
						return false;
					}
					scrollBy(orientation, direction * page());
					return undefined;
				});
			},
			() => document.removeEventListener("mousemove", onMove, true),
		);
	};

	const pressThumb = (e: ReactMouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		keepFocus(e);
		const el = viewportRef.current;
		if (!el) return;
		stopDragRef.current?.();
		const from = along(e);
		const startPosition = vertical ? el.scrollTop : el.scrollLeft;
		const onMove = (ev: MouseEvent) => {
			const axis = axisOf(el, orientation);
			const track = trackOf(refs, orientation);
			const thumbLength = thumbOf(axis, track.length, refs, orientation).length;
			const travel = track.length - thumbLength;
			const range = axis.total - axis.visible;
			if (travel <= 0 || range <= 0) return;
			const startOffset = (startPosition * travel) / range;
			const position = classicyScrollPositionForThumb(
				axis,
				track.length,
				thumbLength,
				startOffset + along(ev) - from,
			);
			if (vertical) el.scrollTop = position;
			else el.scrollLeft = position;
			update();
		};
		const end = () => {
			document.removeEventListener("mousemove", onMove, true);
			document.removeEventListener("mouseup", end, true);
			stopWatchingPointerStream();
			if (stopDragRef.current === end) stopDragRef.current = null;
			setDragging(false);
		};
		document.addEventListener("mousemove", onMove, true);
		document.addEventListener("mouseup", end, true);
		// A lost stream ends the drag where it is, as a release there would.
		const stopWatchingPointerStream = onClassicyPointerStreamLost(end);
		stopDragRef.current = end;
		setDragging(true);
	};

	return (
		<div
			ref={refs.bar}
			className={classNames(
				"classicyScrollBar",
				vertical ? "classicyScrollBarVertical" : "classicyScrollBarHorizontal",
				classicyStateClasses({ inactive, fits }),
			)}
			data-classicy-part="scrollbar"
			aria-hidden="true"
			onMouseDown={keepFocus}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a scroll bar is a pointer affordance; the viewport is the keyboard- and AT-scrollable region */}
			<div
				className={classNames(
					"classicyScrollBarArrow",
					"classicyScrollBarArrowStart",
					classicyStateClasses({ pressed: pressed === "start" }),
				)}
				data-classicy-part="scroll-arrow-start"
				onMouseDown={(e) => pressArrow(e, -1)}
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a scroll bar is a pointer affordance; the viewport is the keyboard- and AT-scrollable region */}
			<div
				ref={refs.track}
				className={classNames(
					"classicyScrollBarTrack",
					classicyStateClasses({ pressed: pressed === "track" }),
				)}
				data-classicy-part="scroll-track"
				onMouseDown={pressTrack}
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a scroll bar is a pointer affordance; the viewport is the keyboard- and AT-scrollable region */}
			<div
				className={classNames(
					"classicyScrollBarArrow",
					"classicyScrollBarArrowEnd",
					classicyStateClasses({ pressed: pressed === "end" }),
				)}
				data-classicy-part="scroll-arrow-end"
				onMouseDown={(e) => pressArrow(e, 1)}
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a scroll bar is a pointer affordance; the viewport is the keyboard- and AT-scrollable region */}
			<div
				ref={refs.thumb}
				className={classNames(
					"classicyScrollBarThumb",
					classicyStateClasses({ dragging }),
				)}
				data-classicy-part="scroll-thumb"
				hidden={thumb.length === 0}
				style={
					{
						"--classicy-scroll-thumb-offset": `${thumb.offset}px`,
						"--classicy-scroll-thumb-length": `${thumb.length}px`,
					} as CSSProperties
				}
				onMouseDown={pressThumb}
			/>
		</div>
	);
};

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
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
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

/** How dragging the thumb scrolls: the package's `layout.scrollBar.thumbDrag`. */
type ClassicyScrollThumbDrag = "live" | "onRelease";

// The theme variable an on-release package sets for how far the pointer may
// stray from the bar before the drag outline snaps back (System 7's
// `scrollBar.snapBack` knob). Unset, it never snaps back.
const SNAP_BACK_VAR = "--scroll-bar-snap-back";

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
	/**
	 * The scrolling element (the viewport), for the caller's own reads: the
	 * area's `<div>`, or the element `renderViewport` puts its `ref` on (a
	 * `<textarea>`).
	 */
	viewportRef?: Ref<HTMLElement>;
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
 * thumb scrolls in proportion, as it goes (Mac OS 8) or, when the package's
 * `layout.scrollBar.thumbDrag` is `"onRelease"` (System 7), on release: the
 * thumb stays put while a `scroll-drag-outline` part follows the pointer,
 * snapping back over the thumb (a release there scrolls nothing) while the
 * pointer is more than the theme's `--scroll-bar-snap-back` from the bar. A
 * lost pointer stream ends any of them (an on-release drag scrolling
 * nothing). The
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
	const thumbDrag: ClassicyScrollThumbDrag =
		useClassicyAppearanceLayout().scrollBar?.thumbDrag ?? "live";
	const isInactive = inactive ?? windowActive === false;
	const verticalPolicy = scrollable ? vertical : "never";
	const horizontalPolicy = scrollable ? horizontal : "never";

	const viewportElRef = useRef<HTMLElement | null>(null);
	// The viewport element as state too, so the observers below move to a
	// new one (a `renderViewport` scroller that remounts).
	const [viewportEl, setViewportEl] = useState<HTMLElement | null>(null);
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
	// The thumbs and fits states as last set, for `update` to compare with
	// without waiting for the render.
	const thumbsRef = useRef(thumbs);
	const fitsRef = useRef(fits);
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

	// Set by `update` when it changes only the thumbs or the fits states: the
	// render that follows moves nothing it measured, so the layout effect
	// below need not measure again (one measurement per scroll frame).
	const ownRenderRef = useRef(false);

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
		const thumbsNow = thumbsRef.current;
		if (
			!sameThumb(thumbsNow.vertical, nextThumbs.vertical) ||
			!sameThumb(thumbsNow.horizontal, nextThumbs.horizontal)
		) {
			thumbsRef.current = nextThumbs;
			ownRenderRef.current = true;
			setThumbs(nextThumbs);
		}
		const fitsNow = fitsRef.current;
		if (
			fitsNow.vertical !== nextFits.vertical ||
			fitsNow.horizontal !== nextFits.horizontal
		) {
			fitsRef.current = nextFits;
			ownRenderRef.current = true;
			setFits(nextFits);
		}
		snapClassicyScrollPart(refs.vertical.bar.current);
		snapClassicyScrollPart(refs.horizontal.bar.current);
		snapClassicyScrollPart(cornerRef.current);
	}, []);

	// Every render may have moved something (bars drawn or removed, a policy
	// changed): measure before paint. Not the render `update` itself caused
	// by moving a thumb or marking a bar `fits`, which moves nothing it
	// reads, unless the bars or their policies changed in the same render (a
	// parent's update batched with it).
	const layoutInputs = [
		verticalPolicy,
		horizontalPolicy,
		pairBars,
		shown.vertical,
		shown.horizontal,
	].join();
	const measuredInputsRef = useRef<string | null>(null);
	useLayoutEffect(() => {
		const own = ownRenderRef.current;
		ownRenderRef.current = false;
		if (own && measuredInputsRef.current === layoutInputs) return;
		measuredInputsRef.current = layoutInputs;
		update();
	});

	// Layout changes that are not renders of this component: the viewport or
	// its content resizing, the content changing, an image loading.
	useLayoutEffect(() => {
		const el = viewportEl;
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
		// Elements added or removed anywhere (the resize observer then
		// watches the new children), and the attributes that can move the
		// content without resizing a child the resize observer watches (an
		// absolutely placed icon's `style`, a `class` or `hidden` toggled),
		// not the ones a list changes on every focus or selection (`aria-*`,
		// `tabindex`, `data-*`). A text change resizes the element holding
		// it, which the resize observer sees (text directly in the viewport
		// is the area's own children: a render, measured above); without
		// one, the text is watched here instead.
		mutationObserver?.observe(el, {
			childList: true,
			subtree: true,
			attributeFilter: ["class", "style", "hidden"],
			characterData: !resizeObserver,
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
	}, [viewportEl, update]);

	const viewportRefCallback = useCallback(
		(el: HTMLElement | null) => {
			viewportElRef.current = el;
			setRef(viewportRef, el);
			if (el) setViewportEl(el);
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
			thumbDrag={thumbDrag}
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
	thumbDrag: ClassicyScrollThumbDrag;
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
	thumbDrag,
	scrollBy,
	update,
}: ClassicyScrollBarProps) => {
	const vertical = orientation === "vertical";
	const repeat = useClassicyPressRepeat();
	const [pressed, setPressed] = useState<PressedPart>(null);
	const [dragging, setDragging] = useState(false);
	// An on-release drag's outline: where it is drawn (from the bar's start)
	// and how long it is (the thumb's length).
	const [outline, setOutline] = useState<ClassicyScrollThumb | null>(null);
	// The thumb as last drawn, for an outline snapping back over it.
	const thumbRef = useRef(thumb);
	thumbRef.current = thumb;
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
		begin: (
			run: (step: () => boolean | undefined) => void,
			pointer?: MouseEvent,
		) => void,
		cleanup?: () => void,
	) => {
		endHoldRef.current?.();
		heldRef.current = part;
		const run = (step: () => boolean | undefined) => {
			setPressed(part);
			repeat.start(step, () => setPressed(null));
		};
		const onLeave = () => repeat.stop();
		// Coming back over the part: where it came back is the pointer now.
		const onEnter = (e: MouseEvent) => {
			if (heldRef.current === part) begin(run, e);
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
			(run, entered) => {
				// Toward the pointer where it is now (a return over the track
				// may be on the thumb's other side): where it came back over
				// the track, else where it last moved.
				if (entered) {
					pointer = along(entered) - barStart(barEl.getBoundingClientRect());
				}
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
		// The track, the thumb's length and its travel now, and the thumb
		// offset (from the track's start, unrounded) the pointer asks for.
		const measure = (ev: { clientX: number; clientY: number }) => {
			const axis = axisOf(el, orientation);
			const track = trackOf(refs, orientation);
			const thumbLength = thumbOf(axis, track.length, refs, orientation).length;
			const travel = track.length - thumbLength;
			const range = axis.total - axis.visible;
			if (travel <= 0 || range <= 0) return null;
			const startOffset = (startPosition * travel) / range;
			return {
				axis,
				track,
				thumbLength,
				offset: Math.min(Math.max(startOffset + along(ev) - from, 0), travel),
				moved: along(ev) !== from,
			};
		};
		const scrollTo = (m: NonNullable<ReturnType<typeof measure>>) => {
			const position = classicyScrollPositionForThumb(
				m.axis,
				m.track.length,
				m.thumbLength,
				m.offset,
			);
			if (vertical) el.scrollTop = position;
			else el.scrollLeft = position;
			update();
		};

		const onRelease = thumbDrag === "onRelease";
		const barEl = refs.bar.current;
		// Read once per drag (a style read): how far the pointer may stray.
		const snapBack = onRelease
			? readClassicyThemeVar(SNAP_BACK_VAR, Number.POSITIVE_INFINITY, barEl)
			: Number.POSITIVE_INFINITY;
		const nearBar = (ev: MouseEvent) => {
			if (!barEl || snapBack === Number.POSITIVE_INFINITY) return true;
			const r = barEl.getBoundingClientRect();
			return (
				ev.clientX >= r.left - snapBack &&
				ev.clientX <= r.right + snapBack &&
				ev.clientY >= r.top - snapBack &&
				ev.clientY <= r.bottom + snapBack
			);
		};
		// Where an on-release drag would scroll to if released now; null
		// while the outline is snapped back (or nothing has moved).
		let target: ReturnType<typeof measure> = null;

		const onMove = (ev: MouseEvent) => {
			if (!onRelease) {
				const m = measure(ev);
				if (m) scrollTo(m);
				return;
			}
			const m = nearBar(ev) ? measure(ev) : null;
			target = m?.moved ? m : null;
			const at = thumbRef.current;
			setOutline(
				m
					? {
							length: m.thumbLength,
							offset: m.track.start + Math.round(m.offset),
						}
					: { length: at.length, offset: at.offset },
			);
		};
		const end = (commit: boolean) => {
			document.removeEventListener("mousemove", onMove, true);
			document.removeEventListener("mouseup", release, true);
			stopWatchingPointerStream();
			if (stopDragRef.current === cancel) stopDragRef.current = null;
			setDragging(false);
			setOutline(null);
			if (commit && target) scrollTo(target);
		};
		// A release scrolls an on-release drag to where it was let go (where
		// the outline is, unless snapped back).
		const release = (ev: MouseEvent) => {
			if (onRelease) onMove(ev);
			end(true);
		};
		// A lost stream ends a live drag where it is, as a release there
		// would; an on-release drag is canceled, scrolling nothing.
		const cancel = () => end(false);
		document.addEventListener("mousemove", onMove, true);
		document.addEventListener("mouseup", release, true);
		const stopWatchingPointerStream = onClassicyPointerStreamLost(cancel);
		stopDragRef.current = cancel;
		setDragging(true);
		if (onRelease) setOutline({ length: thumb.length, offset: thumb.offset });
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
			{outline && (
				<div
					className="classicyScrollBarDragOutline"
					data-classicy-part="scroll-drag-outline"
					aria-hidden="true"
					style={
						{
							"--classicy-scroll-outline-offset": `${outline.offset}px`,
							"--classicy-scroll-outline-length": `${outline.length}px`,
						} as CSSProperties
					}
				/>
			)}
		</div>
	);
};

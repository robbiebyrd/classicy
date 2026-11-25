import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import "./ClassicySplitView.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
	RefObject,
} from "react";
import {
	Children,
	Fragment,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import type { ClassicyGestureEnd } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyCursorRole } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { onClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { isClassicyGestureButton } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

/**
 * Axis along which the panes are arranged. `"horizontal"` (default) lays the
 * panes side-by-side with a vertical divider line between them; `"vertical"`
 * stacks them with a horizontal divider line.
 */
export type ClassicySplitViewDirection = "horizontal" | "vertical";

// One axis only, no grids: nesting a split view inside a pane is the intended
// way to combine directions, so three panes is the ceiling per component.
const MAX_PANES = 3;

// Percentage points a focused divider moves per arrow-key press.
const KEYBOARD_STEP_PCT = 1;

// Direction of travel during a divider drag, stamped on the root as
// `data-drag-direction` so the stylesheet can swap in the matching Mac OS 8
// directional resize cursor (bar-and-arrow, e.g. cursor-resize-u.png).
type ClassicySplitViewDragDirection = "u" | "d" | "l" | "r";

const dragCursorName: Record<
	ClassicySplitViewDragDirection,
	ClassicyCursorRole
> = {
	u: "resizeU",
	d: "resizeD",
	l: "resizeL",
	r: "resizeR",
};

/**
 * Redistribute pane sizes (percentages) after a divider drag. Only the two
 * panes adjacent to the dragged divider change: a positive `deltaPct` (toward
 * the trailing side) grows the leading pane at the trailing pane's expense,
 * and vice versa. The delta is clamped so neither pane shrinks below
 * `minPct`; a pane that already sits below the minimum can only grow.
 */
export const computeSplitViewSizes = (
	sizes: number[],
	dividerIndex: number,
	deltaPct: number,
	minPct: number,
): number[] => {
	const leading = sizes[dividerIndex];
	const trailing = sizes[dividerIndex + 1];
	const clamped = Math.min(
		Math.max(deltaPct, -Math.max(0, leading - minPct)),
		Math.max(0, trailing - minPct),
	);
	const next = [...sizes];
	next[dividerIndex] = leading + clamped;
	next[dividerIndex + 1] = trailing - clamped;
	return next;
};

const equalSplit = (paneCount: number) =>
	Array.from({ length: paneCount }, () => 100 / paneCount);

/**
 * One of a two-pane split view's panes: `"leading"` (left, or top) or
 * `"trailing"` (right, or bottom). A `splittable` view names the pane its
 * split has closed by it.
 */
export type ClassicySplitViewPane = "leading" | "trailing";

/**
 * Which pane a divider dragged to `offset` px along a split view `total` px
 * long closes: the leading one within `zone` px of the start (or before
 * it), the trailing one within `zone` px of the end (or past it), else
 * neither. The zone is the dragged handle's own thickness, so the split
 * closes once the divider is dragged to the end of the pane's scroll bar
 * (WIG Ch.6 "Splitting Windows", p.95; HIG7 p.171: "within three pixels of
 * the top").
 */
export const classicySplitViewClosingPane = (
	offset: number,
	total: number,
	zone: number,
): ClassicySplitViewPane | null => {
	if (offset < zone) return "leading";
	if (offset >= total - zone) return "trailing";
	return null;
};

// Two panes neither of which is below `minPct`: a split opened from its
// split box starts from a closed pane (0%), which leaves the minimum at
// once.
const withMinimumPanes = (sizes: number[], minPct: number): number[] => {
	const [leading, trailing] = sizes;
	const min = Math.min(minPct, (leading + trailing) / 2);
	if (leading < min) return [min, leading + trailing - min];
	if (trailing < min) return [leading + trailing - min, min];
	return sizes;
};

/** Commands a host (a window's View menu) can run on a split view. */
export type ClassicySplitViewCommands = {
	/**
	 * The Split command (WIG Ch.6 "Splitting Windows", p.95): splits a
	 * closed `splittable` view in the middle, or takes the split where it
	 * is, and moves it from the keyboard: the focused divider's arrow keys
	 * move it, Enter sets it there (`onResizeCommit`, and `onSplitChange`
	 * when it opened), and Escape puts it back as it was, closed again if
	 * it was. Focus leaving the divider sets it too. Focus returns to where
	 * it was on Enter or Escape.
	 */
	split(): void;
	/**
	 * Closes a `splittable` view's split, the smaller pane closing (the
	 * leading one on a tie), as a double-click on its divider does.
	 */
	removeSplit(): void;
	/** Whether the view is split: always, unless `splittable` and closed. */
	isSplit(): boolean;
};

// Percentages that don't sum to 100 still act as flex-grow ratios, but
// normalizing keeps the stored sizes meaningful for onResize consumers.
const initialSizes = (
	defaultSizes: number[] | undefined,
	paneCount: number,
): number[] => {
	if (!defaultSizes || defaultSizes.length !== paneCount) {
		return equalSplit(paneCount);
	}
	const total = defaultSizes.reduce((sum, size) => sum + size, 0);
	if (total <= 0) return equalSplit(paneCount);
	return defaultSizes.map((size) => (size / total) * 100);
};

interface ClassicySplitViewProps {
	/**
	 * Pane arrangement axis: `"horizontal"` is side-by-side, `"vertical"` is
	 * stacked. Defaults to `"horizontal"`.
	 */
	direction?: ClassicySplitViewDirection;
	/**
	 * Initial pane sizes as percentages, one per child (normalized to 100).
	 * Ignored, with an equal split used instead, when the length doesn't
	 * match the pane count. Sizes are uncontrolled after mount; watch
	 * `onResize` to observe changes.
	 */
	defaultSizes?: number[];
	/**
	 * Smallest a pane may get, in pixels, while dragging or nudging a divider
	 * (also applied as each pane's CSS minimum). Defaults to `48`.
	 */
	minPaneSize?: number;
	/** Fired with the new percentage sizes on every divider drag step. */
	onResize?: (sizes: number[]) => void;
	/**
	 * Fired once per resize gesture — on mouse release after a drag (or when
	 * the drag's pointer stream is lost: the window blurs, a pointercancel,
	 * the page is hidden; the divider stays where it was dragged), or on
	 * arrow-key release — with the final percentage sizes, then
	 * `{ lost }`: true when the drag ended by its pointer stream being lost,
	 * false for a release or a key release. Use this to persist the user's
	 * chosen split (e.g. dispatching into app state from a wrapping
	 * ClassicyWindow/ClassicyApp) without a store write per intermediate
	 * step; pass the saved sizes back as `defaultSizes` on the next mount to
	 * restore them.
	 */
	onResizeCommit?: (sizes: number[], info: ClassicyGestureEnd) => void;
	/**
	 * Lets the user close and reopen the split of a two-pane view (WIG Ch.6
	 * "Splitting Windows", pp.92-95; HIG7 pp.170-172): dragging the divider
	 * to either end of the view (past `minPaneSize`, to within the divider's
	 * own thickness of the edge) closes the pane it is dragged over, as does
	 * a double-click on the divider (the smaller pane). While closed, the
	 * other pane fills the view and keeps its scroll bar along the split
	 * drawn, with a split box (`classicySplitViewSplitBox`) at its end on the
	 * closed pane's side: dragging it out reopens the split there, and a
	 * double-click reopens it where it last was. A closed pane stays mounted
	 * (`collapsed`, not drawn). Ignored, with a dev warning, for three
	 * panes. Defaults to `false`.
	 */
	splittable?: boolean;
	/** With `splittable`: start with this pane closed (the view unsplit). */
	defaultClosed?: ClassicySplitViewPane;
	/**
	 * With `splittable`: called with the closed pane, or `null` when the
	 * split reopens, each time the user closes or reopens it (on release, a
	 * double-click, or the Split command's Enter). Persist it and pass it
	 * back as `defaultClosed`; a window's menu can name its command from it
	 * (Split or Remove Split).
	 */
	onSplitChange?: (closed: ClassicySplitViewPane | null) => void;
	/** Receives `{ split(), removeSplit(), isSplit() }`, for a Split command. */
	commandsRef?: RefObject<ClassicySplitViewCommands | null>;
	/** Extra class names to merge onto the root element. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
	/** Two or three content areas; extras are dropped with a dev warning. */
	children: ReactNode;
}

/**
 * A resizable container splitting two or three content areas along a single
 * axis. The bordered divider between panes carries the Platinum window-frame
 * treatment (`--color-window-frame` fill with the `platinum-window-border` bevel
 * from Platinum's `_mixins.scss`) and is dragged to trade space between the two
 * panes it separates — dragging toward the leading side grows the trailing pane
 * and shrinks the leading one, exactly like a window frame edge being pushed.
 *
 * There is no HTML equivalent (the nearest ancestor is the obsolete
 * `<frameset>`). The root fills its parent, so give the parent a size; each
 * pane scrolls its own overflow. At most three panes per component — nest a split view
 * inside a pane to combine directions. Each divider follows the ARIA
 * window-splitter pattern (`role="separator"`, focusable, arrow keys along
 * the split axis nudge it by 1%), and a drag swaps the body cursor for the
 * Mac OS 8 directional resize cursor; the moving divider carries the
 * `dragging` state, from the press to the release (and through the Split
 * command's keyboard mode). Sizes are uncontrolled after mount:
 * persist them from `onResizeCommit` and feed them back as `defaultSizes`.
 * Under a package whose layout says `mouse: "windows"` (Windows 98) only
 * button 1 drags a divider or a split box, and under `input.escapeCancels`
 * Escape mid-drag puts the split back as the press found it (closed again
 * if it was), committing nothing.
 * A window whose content is a split view should pass `scrollable={false}`,
 * since the panes scroll themselves. A `splittable` view can be closed to
 * one pane and reopened from its split box, and `commandsRef` gives a
 * window's menu the Split command (WIG Ch.6 "Splitting Windows").
 *
 * ```tsx
 * <ClassicySplitView direction="horizontal" defaultSizes={[30, 70]} onResizeCommit={saveSizes}>
 *     <Sidebar />
 *     <Content />
 * </ClassicySplitView>
 * ```
 */
export const ClassicySplitView: FunctionalComponent<ClassicySplitViewProps> = ({
	direction = "horizontal",
	defaultSizes,
	minPaneSize = 48,
	onResize,
	onResizeCommit,
	splittable: splittableProp = false,
	defaultClosed,
	onSplitChange,
	commandsRef,
	className,
	style,
	children,
}) => {
	const allChildren = Children.toArray(children);
	const warnedRef = useRef(false);
	if (allChildren.length > MAX_PANES && !warnedRef.current) {
		warnedRef.current = true;
		classicyLog(
			"warn",
			"ClassicySplitView",
			`supports at most ${MAX_PANES} content areas; ` +
				`ignoring ${allChildren.length - MAX_PANES} extra child(ren). ` +
				"Nest another ClassicySplitView inside a pane for more regions.",
		);
	}
	const panes = allChildren.slice(0, MAX_PANES);
	const paneCount = panes.length;
	// A split the user closes and reopens has two panes: one closes, one
	// stays.
	const splittable = splittableProp && paneCount === 2;
	const warnedSplittableRef = useRef(false);
	if (splittableProp && !splittable && !warnedSplittableRef.current) {
		warnedSplittableRef.current = true;
		classicyLog(
			"warn",
			"ClassicySplitView",
			`splittable needs exactly two content areas, not ${paneCount}; ` +
				"the split stays open.",
		);
	}

	const rootRef = useRef<HTMLDivElement>(null);
	const firstDividerRef = useRef<HTMLDivElement>(null);
	const setCursor = useClassicyCursor();
	// The buttons that drag a divider, and Escape's cancel.
	const layout = useClassicyAppearanceLayout();
	// The live drag's direction of travel, or null when no drag is running.
	// Drives both the body-wide cursor (via useClassicyCursor, for wherever a
	// fast drag takes the pointer) and the root's data-drag-direction stamp
	// (for the dividers themselves, whose own hover cursor beats body's).
	const [dragDirection, setDragDirection] =
		useState<ClassicySplitViewDragDirection | null>(null);
	// The divider a press is moving (its `dragging`; the Split command's
	// keyboard mode moves the first).
	const [movingDivider, setMovingDivider] = useState<number | null>(null);
	const [sizes, setSizes] = useState<number[]>(() =>
		initialSizes(defaultSizes, paneCount),
	);
	// A splittable view's closed pane. Its sizes are kept meanwhile: the
	// split's last location, where a double-click on the split box reopens.
	const [closed, setClosed] = useState<ClassicySplitViewPane | null>(
		() => defaultClosed ?? null,
	);
	const closedPane = splittable ? closed : null;
	// If the child count changes after mount the stored sizes no longer map
	// onto the panes; fall back to an equal split rather than misrender.
	const effectiveSizes =
		sizes.length === paneCount ? sizes : equalSplit(paneCount);

	const horizontal = direction === "horizontal";

	// The container's extent along the split axis, or 0 when unmeasurable.
	const axisTotal = () => {
		const root = rootRef.current;
		if (!root) return 0;
		const rect = root.getBoundingClientRect();
		return horizontal ? rect.width : rect.height;
	};

	// Ends a live divider drag's listeners when the split view unmounts.
	const dragCleanupRef = useRef<(() => void) | null>(null);
	useEffect(() => () => dragCleanupRef.current?.(), []);

	const applySizes = (next: number[]) => {
		setSizes(next);
		onResize?.(next);
	};

	const closeSplit = (pane: ClassicySplitViewPane) => {
		setClosed(pane);
		onSplitChange?.(pane);
	};

	// The Split command's keyboard mode, while it runs: the split as it was
	// before (Escape puts it back) and where focus was (Enter and Escape
	// return it there).
	const splitModeRef = useRef<{
		sizes: number[];
		closed: ClassicySplitViewPane | null;
		returnFocus: HTMLElement | null;
	} | null>(null);
	const [splitMode, setSplitMode] = useState(false);
	// The divider takes focus once the command has drawn it.
	useEffect(() => {
		if (splitMode) firstDividerRef.current?.focus();
	}, [splitMode]);

	const startSplitMode = () => {
		if (paneCount < 2 || splitModeRef.current) return;
		const active =
			typeof document === "undefined" ? null : document.activeElement;
		splitModeRef.current = {
			sizes: effectiveSizes,
			closed: closedPane,
			returnFocus: active instanceof HTMLElement ? active : null,
		};
		// A closed split opens in the middle (WIG p.95).
		if (closedPane) {
			setClosed(null);
			applySizes(equalSplit(paneCount));
		}
		setSplitMode(true);
	};

	// `commit`: Enter (or focus leaving the divider) sets the split where it
	// is; else Escape puts it back. `returnFocus`: Enter and Escape give
	// focus back to where it was before the command.
	const endSplitMode = (commit: boolean, returnFocus: boolean) => {
		const mode = splitModeRef.current;
		if (!mode) return;
		splitModeRef.current = null;
		setSplitMode(false);
		if (commit) {
			onResizeCommit?.(effectiveSizes, { lost: false });
			if (mode.closed !== null) onSplitChange?.(null);
		} else {
			applySizes(mode.sizes);
			setClosed(mode.closed);
		}
		if (returnFocus && mode.returnFocus?.isConnected) {
			mode.returnFocus.focus({ preventScroll: true });
		}
	};

	const removeSplit = () => {
		if (!splittable || closedPane) return;
		closeSplit(effectiveSizes[0] <= effectiveSizes[1] ? "leading" : "trailing");
	};

	useImperativeHandle(commandsRef, () => ({
		split: startSplitMode,
		removeSplit,
		isSplit: () => closedPane === null,
	}));

	// Same drag idiom as ClassicyWindow's move/resize: mousedown on the
	// handle, then document-level listeners so a fast drag can't escape it.
	// `from`: the split box of a closed split, which the drag opens from
	// that pane's end (its size starting at 0).
	const startDrag =
		(dividerIndex: number, from: ClassicySplitViewPane | null = null) =>
		(e: ReactMouseEvent<HTMLDivElement>) => {
			// Under `layout.mouse` "windows" only button 1 drags (WIG Ch.4
			// "Mouse Actions", pp.24-25).
			if (!isClassicyGestureButton(e, layout)) return;
			const root = rootRef.current;
			const total = axisTotal();
			if (!root || total <= 0) return;
			e.preventDefault();
			const startPos = horizontal ? e.clientX : e.clientY;
			const rootRect = root.getBoundingClientRect();
			const rootStart = horizontal ? rootRect.left : rootRect.top;
			// The handle's thickness: how near an end the pointer closes the
			// split.
			const handle = e.currentTarget.getBoundingClientRect();
			const zone = horizontal ? handle.width : handle.height;
			// The split's location before the gesture: where a drag that
			// ends closed leaves it for the next reopening.
			const openSizes = effectiveSizes;
			const startSizes =
				from === "leading"
					? [0, 100]
					: from === "trailing"
						? [100, 0]
						: openSizes;
			const startClosed = closedPane;
			const minPct = (minPaneSize / total) * 100;
			const closingAt = (pos: number): ClassicySplitViewPane | null => {
				if (!splittable) return null;
				const atEnd = classicySplitViewClosingPane(
					pos - rootStart,
					total,
					zone,
				);
				if (atEnd || !from) return atEnd;
				// Still over the split box it was pressed on (which may sit
				// short of the view's end, above a pane's horizontal bar).
				const travel = from === "leading" ? pos - startPos : startPos - pos;
				return travel < zone ? from : null;
			};
			// The gesture's running result, committed once on release. A press
			// with no movement commits nothing.
			let latestSizes: number[] | null = null;
			let latestClosed = startClosed;
			setMovingDivider(dividerIndex);
			// Until the pointer actually travels, the divider's hover cursor
			// (double-headed lr/ud) stays; after that the cursor follows the
			// *instantaneous* direction of travel, so reversing mid-drag flips
			// it even while the panes sit clamped at a minimum.
			let lastPos = startPos;
			let lastDirection: ClassicySplitViewDragDirection | null = null;
			const moveHandler = (ev: MouseEvent) => {
				const pos = horizontal ? ev.clientX : ev.clientY;
				if (pos !== lastPos) {
					const direction: ClassicySplitViewDragDirection = horizontal
						? pos > lastPos
							? "r"
							: "l"
						: pos > lastPos
							? "d"
							: "u";
					lastPos = pos;
					if (direction !== lastDirection) {
						lastDirection = direction;
						setDragDirection(direction);
						setCursor(dragCursorName[direction]);
					}
				}
				// At an end of a splittable view: that pane closes, and opens
				// again if the pointer leaves the end before the release.
				const closing = closingAt(pos);
				if (closing !== latestClosed) {
					latestClosed = closing;
					setClosed(closing);
				}
				if (closing) return;
				const deltaPct = ((pos - startPos) / total) * 100;
				const next = computeSplitViewSizes(
					startSizes,
					dividerIndex,
					deltaPct,
					minPct,
				);
				latestSizes = from ? withMinimumPanes(next, minPct) : next;
				applySizes(latestSizes);
			};
			// A release, or the pointer stream lost (the window blurs, a
			// pointercancel, the page is hidden): either way the divider stays
			// where it was dragged and the sizes on screen are committed, as a
			// window's move or resize ends where it is.
			const detach = () => {
				stopWatchingPointerStream();
				stopWatchingEscape();
				document.removeEventListener("mousemove", moveHandler);
				document.removeEventListener("mouseup", upHandler);
				dragCleanupRef.current = null;
			};
			const endDrag = (lost: boolean) => {
				detach();
				setDragDirection(null);
				setMovingDivider(null);
				setCursor();
				if (latestClosed !== null) {
					// Closed: the split keeps the location it had before.
					if (latestSizes) applySizes(openSizes);
					if (latestClosed !== startClosed) onSplitChange?.(latestClosed);
					return;
				}
				if (startClosed !== null) onSplitChange?.(null);
				if (latestSizes) onResizeCommit?.(latestSizes, { lost });
			};
			const upHandler = () => endDrag(false);
			// Escape (under `input.escapeCancels`, Windows 98; WIG Ch.4
			// "Shortcut Keys", p.27): the split goes back as the press found
			// it, closed again if it was, and nothing is committed.
			const cancelDrag = () => {
				detach();
				setDragDirection(null);
				setMovingDivider(null);
				setCursor();
				if (latestSizes) applySizes(openSizes);
				if (latestClosed !== startClosed) setClosed(startClosed);
			};
			document.addEventListener("mousemove", moveHandler);
			document.addEventListener("mouseup", upHandler);
			const stopWatchingPointerStream = onClassicyPointerStreamLost(() =>
				endDrag(true),
			);
			const stopWatchingEscape = onClassicyEscapeCancel(cancelDrag, layout);
			// Unmounted mid-drag: the listeners go, and the body cursor is
			// put back; nothing is committed (the split view is gone).
			dragCleanupRef.current = () => {
				detach();
				setCursor();
			};
		};

	// ARIA window-splitter keyboard support: the arrow keys along the split
	// axis nudge the divider by a fixed step; cross-axis keys pass through.
	// In the Split command's mode, Enter sets the split and Escape cancels.
	const handleDividerKeyDown =
		(dividerIndex: number) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
			if (splitModeRef.current && (e.key === "Enter" || e.key === "Escape")) {
				e.preventDefault();
				e.stopPropagation();
				endSplitMode(e.key === "Enter", true);
				return;
			}
			const decreaseKey = horizontal ? "ArrowLeft" : "ArrowUp";
			const increaseKey = horizontal ? "ArrowRight" : "ArrowDown";
			if (e.key !== decreaseKey && e.key !== increaseKey) return;
			const total = axisTotal();
			if (total <= 0) return;
			e.preventDefault();
			const deltaPct =
				e.key === increaseKey ? KEYBOARD_STEP_PCT : -KEYBOARD_STEP_PCT;
			const minPct = (minPaneSize / total) * 100;
			applySizes(
				computeSplitViewSizes(effectiveSizes, dividerIndex, deltaPct, minPct),
			);
		};

	// Auto-repeat delivers many keydowns per hold; the single keyup closes the
	// gesture, mirroring mouseup for a drag. The Split command's mode commits
	// on Enter instead.
	const handleDividerKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (splitModeRef.current) return;
		const axisKeys = horizontal
			? ["ArrowLeft", "ArrowRight"]
			: ["ArrowUp", "ArrowDown"];
		if (!axisKeys.includes(e.key)) return;
		onResizeCommit?.(effectiveSizes, { lost: false });
	};

	// The split box of a closed split: in the other pane's scroll bar along
	// the split, at the closed pane's end.
	const splitBox = closedPane && (
		// biome-ignore lint/a11y/noStaticElementInteractions: a pointer affordance inside an aria-hidden scroll bar; the keyboard splits through the Split command (commandsRef)
		<div
			className="classicySplitViewSplitBox"
			onMouseDown={startDrag(0, closedPane)}
			onDoubleClick={() => {
				setClosed(null);
				onSplitChange?.(null);
			}}
		/>
	);
	const splitAxis = horizontal ? "horizontal" : "vertical";

	return (
		<div
			ref={rootRef}
			data-drag-direction={dragDirection ?? undefined}
			className={classNames(
				"classicySplitView",
				horizontal
					? "classicySplitViewHorizontal"
					: "classicySplitViewVertical",
				className,
			)}
			style={style}
		>
			{panes.map((child, index) => {
				const pane: ClassicySplitViewPane =
					index === 0 ? "leading" : "trailing";
				const isClosed = closedPane === pane;
				// The pane left showing while the other is closed.
				const remaining = closedPane !== null && !isClosed;
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: panes are positional; order is their identity
					<Fragment key={index}>
						{index > 0 && closedPane === null && (
							// biome-ignore lint/a11y/useSemanticElements: a focusable, draggable window splitter is the ARIA separator-widget pattern; <hr> is the static separator (ClassicySeparator)
							<div
								ref={index === 1 ? firstDividerRef : undefined}
								role="separator"
								tabIndex={0}
								aria-orientation={horizontal ? "vertical" : "horizontal"}
								aria-valuenow={Math.round(effectiveSizes[index - 1])}
								aria-valuemin={0}
								aria-valuemax={100}
								className={classNames(
									"classicySplitViewDivider",
									classicyStateClasses({
										dragging:
											movingDivider === index - 1 || (splitMode && index === 1),
									}),
								)}
								onMouseDown={startDrag(index - 1)}
								onDoubleClick={splittable ? removeSplit : undefined}
								onKeyDown={handleDividerKeyDown(index - 1)}
								onKeyUp={onResizeCommit ? handleDividerKeyUp : undefined}
								onBlur={
									splitMode && index === 1
										? () => endSplitMode(true, false)
										: undefined
								}
							/>
						)}
						{/* Each pane scrolls on its own, with Classicy's scroll bars. */}
						<ClassicyScrollArea
							className={classNames(
								"classicySplitViewPane",
								classicyStateClasses({ collapsed: isClosed }),
							)}
							style={
								{
									flexGrow: effectiveSizes[index],
									...(horizontal
										? { minWidth: minPaneSize }
										: { minHeight: minPaneSize }),
								} as CSSProperties
							}
							// The remaining pane keeps its bar along the split
							// drawn, for the split box at its end.
							vertical={remaining && !horizontal ? "always" : undefined}
							horizontal={remaining && horizontal ? "always" : undefined}
							barAccessories={
								remaining
									? {
											[splitAxis]:
												closedPane === "leading"
													? { start: splitBox }
													: { end: splitBox },
										}
									: undefined
							}
						>
							{child}
						</ClassicyScrollArea>
					</Fragment>
				);
			})}
		</div>
	);
};

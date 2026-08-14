import "./ClassicySplitView.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
} from "react";
import { Children, Fragment, useRef, useState } from "react";

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
	/** Pane arrangement axis; `"horizontal"` (default) is side-by-side. */
	direction?: ClassicySplitViewDirection;
	/**
	 * Initial pane sizes as percentages, one per child (normalized to 100).
	 * Ignored, with an equal split used instead, when the length doesn't
	 * match the pane count. Sizes are uncontrolled after mount; watch
	 * `onResize` to observe changes.
	 */
	defaultSizes?: number[];
	/** Smallest a pane may get, in pixels, while dragging a divider. */
	minPaneSize?: number;
	/** Fired with the new percentage sizes on every divider drag step. */
	onResize?: (sizes: number[]) => void;
	/**
	 * Fired once per resize gesture — on mouse release after a drag, or on
	 * arrow-key release — with the final percentage sizes. Use this to
	 * persist the user's chosen split (e.g. dispatching into app state from
	 * a wrapping ClassicyWindow/ClassicyApp) without a store write per
	 * intermediate step; pass the saved sizes back as `defaultSizes` on the
	 * next mount to restore them.
	 */
	onResizeCommit?: (sizes: number[]) => void;
	/** Extra class names to merge onto the root element. */
	className?: string;
	/** Two or three content areas; extras are dropped with a dev warning. */
	children: ReactNode;
}

/**
 * A resizable container splitting two or three content areas along a single
 * axis. The bordered divider between panes carries the Platinum window-frame
 * treatment (`--color-window-frame` fill with the `platinumWindowBorder`
 * bevel) and is dragged to trade space between the two panes it separates —
 * dragging toward the leading side grows the trailing pane and shrinks the
 * leading one, exactly like a window frame edge being pushed.
 */
export const ClassicySplitView: FunctionalComponent<ClassicySplitViewProps> = ({
	direction = "horizontal",
	defaultSizes,
	minPaneSize = 48,
	onResize,
	onResizeCommit,
	className,
	children,
}) => {
	const allChildren = Children.toArray(children);
	const warnedRef = useRef(false);
	if (allChildren.length > MAX_PANES && !warnedRef.current) {
		warnedRef.current = true;
		console.warn(
			`ClassicySplitView supports at most ${MAX_PANES} content areas; ` +
				`ignoring ${allChildren.length - MAX_PANES} extra child(ren). ` +
				"Nest another ClassicySplitView inside a pane for more regions.",
		);
	}
	const panes = allChildren.slice(0, MAX_PANES);
	const paneCount = panes.length;

	const rootRef = useRef<HTMLDivElement>(null);
	const [sizes, setSizes] = useState<number[]>(() =>
		initialSizes(defaultSizes, paneCount),
	);
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

	const applySizes = (next: number[]) => {
		setSizes(next);
		onResize?.(next);
	};

	// Same drag idiom as ClassicyWindow's move/resize: mousedown on the
	// handle, then document-level listeners so a fast drag can't escape it.
	const startDrag =
		(dividerIndex: number) => (e: ReactMouseEvent<HTMLDivElement>) => {
			const total = axisTotal();
			if (total <= 0) return;
			e.preventDefault();
			const startPos = horizontal ? e.clientX : e.clientY;
			const startSizes = effectiveSizes;
			const minPct = (minPaneSize / total) * 100;
			// The gesture's running result, committed once on release. A press
			// with no movement commits nothing.
			let latestSizes: number[] | null = null;
			const moveHandler = (ev: MouseEvent) => {
				const pos = horizontal ? ev.clientX : ev.clientY;
				const deltaPct = ((pos - startPos) / total) * 100;
				latestSizes = computeSplitViewSizes(
					startSizes,
					dividerIndex,
					deltaPct,
					minPct,
				);
				applySizes(latestSizes);
			};
			const upHandler = () => {
				document.removeEventListener("mousemove", moveHandler);
				document.removeEventListener("mouseup", upHandler);
				if (latestSizes) onResizeCommit?.(latestSizes);
			};
			document.addEventListener("mousemove", moveHandler);
			document.addEventListener("mouseup", upHandler);
		};

	// ARIA window-splitter keyboard support: the arrow keys along the split
	// axis nudge the divider by a fixed step; cross-axis keys pass through.
	const handleDividerKeyDown =
		(dividerIndex: number) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
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
	// gesture, mirroring mouseup for a drag.
	const handleDividerKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		const axisKeys = horizontal
			? ["ArrowLeft", "ArrowRight"]
			: ["ArrowUp", "ArrowDown"];
		if (!axisKeys.includes(e.key)) return;
		onResizeCommit?.(effectiveSizes);
	};

	return (
		<div
			ref={rootRef}
			className={classNames(
				"classicySplitView",
				horizontal
					? "classicySplitViewHorizontal"
					: "classicySplitViewVertical",
				className,
			)}
		>
			{panes.map((child, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: panes are positional; order is their identity
				<Fragment key={index}>
					{index > 0 && (
						// biome-ignore lint/a11y/useSemanticElements: a focusable, draggable window splitter is the ARIA separator-widget pattern; <hr> is the static separator (ClassicySeparator)
						<div
							role="separator"
							tabIndex={0}
							aria-orientation={horizontal ? "vertical" : "horizontal"}
							aria-valuenow={Math.round(effectiveSizes[index - 1])}
							aria-valuemin={0}
							aria-valuemax={100}
							className="classicySplitViewDivider"
							onMouseDown={startDrag(index - 1)}
							onKeyDown={handleDividerKeyDown(index - 1)}
							onKeyUp={onResizeCommit ? handleDividerKeyUp : undefined}
						/>
					)}
					<div
						className="classicySplitViewPane"
						style={
							{
								flexGrow: effectiveSizes[index],
								...(horizontal
									? { minWidth: minPaneSize }
									: { minHeight: minPaneSize }),
							} as CSSProperties
						}
					>
						{child}
					</div>
				</Fragment>
			))}
		</div>
	);
};

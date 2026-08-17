import "./ClassicyTabs.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

/**
 * Tab sizing. `medium` is the classic control-panel look and the default;
 * `large` scales the type up by half again, `small` is the compact strip used
 * where a window has more tabs than room (its metrics — a 16 px box and ~9 px
 * type against the default theme — match `ClassicyButtonToolbar`'s `small`).
 */
export type ClassicyTabsSize = "small" | "medium" | "large";

export interface TabProps {
	tabs: TabIndividual[];
	/** Tab sizing; see {@link ClassicyTabsSize}. Default `medium`. */
	size?: ClassicyTabsSize;
}

export interface TabIndividual {
	/** Text label for the tab. Optional when an icon is supplied. */
	title?: string;
	/** Icon shown on the tab, alongside the title or on its own. */
	icon?: string;
	children: ReactNode;
}

/** `medium` is the unmodified base style, so it carries no modifier class. */
const SIZE_CLASS: Record<ClassicyTabsSize, string> = {
	small: "classicyTabsSizeSmall",
	medium: "",
	large: "classicyTabsSizeLarge",
};

/**
 * Slack, in px, when comparing scroll offsets against scroll extents.
 * Fractional layout widths routinely leave `scrollWidth` a sub-pixel amount
 * above `clientWidth` with nothing actually clipped, which would otherwise
 * show the scroll arrows on a strip that fits.
 */
const EDGE_TOLERANCE = 1;

/** Stable identity for a tab, used for React keys and DOM ids. */
const tabKey = (tab: TabIndividual, index: number): string =>
	tab.title && tab.title.length > 0 ? tab.title : `tab-${index}`;

/**
 * Scroll the strip, clamped to its scrollable range.
 *
 * jsdom implements neither smooth scrolling nor `scrollTo` on elements, so the
 * assignment fallback is what keeps this callable from tests.
 */
const scrollStripTo = (el: HTMLElement, left: number): void => {
	const clamped = Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
	if (typeof el.scrollTo === "function") {
		el.scrollTo({ left: clamped, behavior: "smooth" });
	} else {
		el.scrollLeft = clamped;
	}
};

type ScrollState = {
	/** Whether the strip is wider than its viewport at all. */
	overflowing: boolean;
	atStart: boolean;
	atEnd: boolean;
};

const NO_OVERFLOW: ScrollState = {
	overflowing: false,
	atStart: true,
	atEnd: true,
};

export const ClassicyTabs: FunctionalComponent<TabProps> = ({
	tabs,
	size = "medium",
}) => {
	const [activeTab, setActiveTab] = useState(0);
	const player = useSoundDispatch();
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { tabs: tabs.map((t) => t.title) };
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const [scroll, setScroll] = useState<ScrollState>(NO_OVERFLOW);

	const selectTab = (tabId: number) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		track("click", { type: "ClassicyTab", tabId, ...analyticsArgs });
		setActiveTab(tabId);
	};

	const pressTab = (tabId: number) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickDown" });
		track("selected", { type: "ClassicyTab", tabId, ...analyticsArgs });
	};

	const focusTab = (tabId: number) => {
		buttonRefs.current[tabId]?.focus();
	};

	// Recomputed on resize and on scroll. Returning the previous object when
	// nothing changed is what stops the ResizeObserver below from looping:
	// a fresh object every measurement would re-render, which the observer
	// would then see as a resize.
	const measureOverflow = useCallback(() => {
		const el = scrollerRef.current;
		if (!el) return;
		const max = el.scrollWidth - el.clientWidth;
		setScroll((prev) => {
			const next: ScrollState = {
				overflowing: max > EDGE_TOLERANCE,
				atStart: el.scrollLeft <= EDGE_TOLERANCE,
				atEnd: el.scrollLeft >= max - EDGE_TOLERANCE,
			};
			return prev.overflowing === next.overflowing &&
				prev.atStart === next.atStart &&
				prev.atEnd === next.atEnd
				? prev
				: next;
		});
	}, []);

	useLayoutEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;
		measureOverflow();
		el.addEventListener("scroll", measureOverflow, { passive: true });
		// jsdom has no ResizeObserver; the strip simply never reports overflow
		// there, which is the correct answer for a zero-width layout anyway.
		if (typeof ResizeObserver === "undefined") {
			return () => el.removeEventListener("scroll", measureOverflow);
		}
		const observer = new ResizeObserver(measureOverflow);
		observer.observe(el);
		// The tablist is the thing that actually changes width when tabs are
		// added, removed, or relabelled; the viewport alone would miss that.
		const list = el.firstElementChild;
		if (list) observer.observe(list);
		return () => {
			observer.disconnect();
			el.removeEventListener("scroll", measureOverflow);
		};
	}, [measureOverflow]);

	// Keyboard traversal can land on a tab that is scrolled out of sight.
	useEffect(() => {
		const el = scrollerRef.current;
		const wrapper = buttonRefs.current[activeTab]?.parentElement;
		if (!el || !wrapper) return;
		const start = wrapper.offsetLeft;
		const end = start + wrapper.offsetWidth;
		if (start < el.scrollLeft) {
			scrollStripTo(el, start);
		} else if (end > el.scrollLeft + el.clientWidth) {
			scrollStripTo(el, end - el.clientWidth);
		}
	}, [activeTab]);

	/**
	 * Advance the strip by whole tabs rather than by a fixed distance, so a
	 * click always lands on a tab boundary and never leaves one half-clipped.
	 */
	const stepScroll = (direction: -1 | 1) => {
		const el = scrollerRef.current;
		if (!el) return;
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		const wrappers = Array.from(
			el.querySelectorAll<HTMLElement>(".classicyTabButtonWrapper"),
		);
		const viewStart = el.scrollLeft;
		const viewEnd = viewStart + el.clientWidth;
		if (direction === 1) {
			const next = wrappers.find(
				(w) => w.offsetLeft + w.offsetWidth > viewEnd + EDGE_TOLERANCE,
			);
			scrollStripTo(
				el,
				next ? next.offsetLeft + next.offsetWidth - el.clientWidth : viewEnd,
			);
			return;
		}
		const prev = wrappers
			.slice()
			.reverse()
			.find((w) => w.offsetLeft < viewStart - EDGE_TOLERANCE);
		scrollStripTo(el, prev ? prev.offsetLeft : 0);
	};

	// Roving tablist keyboard traversal (Left/Right/Up/Down/Home/End) per
	// WAI-ARIA and Mac OS 8 HIG tab keyboard behavior. Activation follows focus.
	const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		const count = tabs.length;
		if (count === 0) return;
		let next: number;
		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				next = (activeTab + 1) % count;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				next = (activeTab - 1 + count) % count;
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = count - 1;
				break;
			default:
				return;
		}
		e.preventDefault();
		selectTab(next);
		focusTab(next);
	};

	// Scroll arrows are chrome, not tabs: they stay outside `role="tablist"` so
	// they do not inflate the tab count a screen reader announces, and out of
	// the tab order because arrow keys already move between tabs (and scroll
	// the strip to follow). They keep accessible names for pointer users.
	const scrollArrow = (direction: -1 | 1) => {
		const disabled = direction === -1 ? scroll.atStart : scroll.atEnd;
		return (
			<div
				className={classNames(
					"classicyTabButtonWrapper",
					"classicyTabScrollWrapper",
				)}
			>
				<button
					type="button"
					tabIndex={-1}
					disabled={disabled}
					aria-label={
						direction === -1 ? "Scroll tabs left" : "Scroll tabs right"
					}
					className={classNames(
						"classicyTabButton",
						"classicyTabScrollButton",
						direction === -1
							? "classicyTabScrollButtonLeft"
							: "classicyTabScrollButtonRight",
					)}
					onClick={() => stepScroll(direction)}
				>
					<span className={"classicyTabScrollGlyph"} aria-hidden={true} />
				</button>
			</div>
		);
	};

	return (
		<div className={classNames("classicyTabContainer", SIZE_CLASS[size])}>
			<div className={"classicyTabButtonsRow"}>
				{scroll.overflowing && scrollArrow(-1)}
				<div className={"classicyTabScroller"} ref={scrollerRef}>
					<div className={"classicyButtonsHolder"} role="tablist">
						{tabs.map((tab, index) => {
							const key = tabKey(tab, index);
							const isActive = index === activeTab;
							return (
								<div
									key={`button_${key}`}
									className={"classicyTabButtonWrapper"}
								>
									<button
										type="button"
										role="tab"
										id={`${key}-tab`}
										aria-selected={isActive}
										aria-controls={`${key}-panel`}
										tabIndex={isActive ? 0 : -1}
										ref={(el) => {
											buttonRefs.current[index] = el;
										}}
										className={
											"classicyTabButton" +
											" " +
											(isActive ? "classicyTabButtonActive" : "")
										}
										onMouseDown={() => pressTab(index)}
										onMouseUp={() => selectTab(index)}
										onKeyDown={handleTabKeyDown}
									>
										{tab.icon && (
											<img
												className={"classicyTabButtonIcon"}
												src={tab.icon}
												alt={""}
												aria-hidden={true}
											/>
										)}
										{tab.title && (
											<span className={"classicyTabButtonLabel"}>
												{tab.title}
											</span>
										)}
									</button>
								</div>
							);
						})}
					</div>
				</div>
				{scroll.overflowing && scrollArrow(1)}
			</div>
			<div className={"classicyTabsHolder"}>
				{tabs.map((tab, index) => {
					const key = tabKey(tab, index);
					const isActive = index === activeTab;
					return (
						<div
							id={`${key}-panel`}
							key={key}
							role="tabpanel"
							aria-labelledby={`${key}-tab`}
							hidden={!isActive}
							className={
								isActive
									? "classicyTabActiveContent"
									: "classicyTabHiddenContent"
							}
						>
							{tab.children}
						</div>
					);
				})}
			</div>
		</div>
	);
};

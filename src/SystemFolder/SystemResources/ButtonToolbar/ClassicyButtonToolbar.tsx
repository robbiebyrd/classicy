import "./ClassicyButtonToolbar.scss";
import classNames from "classnames";
import {
	Children,
	type FocusEvent,
	Fragment,
	type FC as FunctionalComponent,
	isValidElement,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { ClassicyButtonToolbarContext } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

/**
 * What counts as "a control" for roving-tabindex purposes: any non-disabled
 * `<button>` inside the toolbar. Queried live off the DOM (not React
 * children) because the toolbar's children are arbitrary (R7) — it must not
 * assume every descendant is a `ClassicyBevelButton` it rendered itself. A
 * native `disabled` button is already unfocusable and absent from the tab
 * order, so filtering it out here is enough to make arrow navigation skip it
 * too; there's no separate disabled-check needed downstream.
 */
const TOOLBAR_CONTROL_SELECTOR = "button:not(:disabled)";

/**
 * Control sizing for every button in the toolbar. `large` is the classic
 * toolbar look and the default; `medium` and `small` shrink the controls'
 * box, padding, and type. Small matches `ClassicyButton`'s small metrics so
 * a small toolbar lines up with small buttons in the same window.
 */
export type ClassicyButtonToolbarSize = "large" | "medium" | "small";

export type ClassicyButtonToolbarProps = {
	/** Extra class names merged onto the toolbar element. */
	className?: string;
	/** Button sizing; see {@link ClassicyButtonToolbarSize}. Default `large`. */
	size?: ClassicyButtonToolbarSize;
	children: ReactNode;
};

export type ClassicyButtonToolbarGroupProps = {
	/** Extra class names merged onto the group element. */
	className?: string;
	children: ReactNode;
};

/**
 * A run of controls packed flush against each other, with no gaps.
 *
 * Groups are the unit the toolbar counts when placing dividers; a group has no
 * behavior of its own.
 */
export const ClassicyButtonToolbarGroup: FunctionalComponent<
	ClassicyButtonToolbarGroupProps
> = ({ className, children }) => (
	<div className={classNames("classicyButtonToolbarGroup", className)}>
		{children}
	</div>
);

/**
 * A Mac OS 8 control bar: buttons flush together, arranged into groups
 * separated by a vertical engraved divider.
 *
 * Dividers are drawn automatically **between** children — never leading,
 * never trailing, and not at all for a single group — so consumers never place
 * a `ClassicySeparator` by hand.
 *
 * Children are normally `ClassicyButtonToolbarGroup`s, but any element works.
 * A control placed directly in the toolbar is treated as its own group, so it
 * gets dividers on both sides.
 *
 * `size` scales every control in the toolbar as a unit (`large` default,
 * `medium`, `small`) — sizing is per-toolbar, not per-button, so a toolbar's
 * controls always match. It's applied in CSS off theme tokens, so arbitrary
 * children are scaled without the toolbar touching them.
 *
 * Inside a toolbar, an icon-only `ClassicyBevelButton` defaults to a square
 * box; a button with text keeps its rectangular shape. Passing `square`
 * explicitly always wins — see {@link ClassicyButtonToolbarContext} for how
 * that default is delivered and where it can leak.
 *
 * The root element carries `role="toolbar"`. The `<hr role="separator">`
 * dividers between groups stay in the accessibility tree on purpose: inside
 * a `toolbar`, a `separator` is a meaningful child (it tells assistive tech
 * where one control group ends and the next begins), unlike a decorative
 * `<hr>` in a document.
 *
 * **Keyboard: roving tabindex**, per the ARIA APG toolbar pattern. Exactly one
 * control is in the page's Tab sequence (`tabIndex=0`) at a time; every other
 * control is `tabIndex=-1`. Tab therefore moves focus into and out of the
 * toolbar as a single stop, not through every button. Once focus is inside:
 *   - **ArrowRight/ArrowLeft** move focus between controls and **wrap** at the
 *     ends (Right from the last control goes to the first, and vice versa).
 *     Wrapping matches {@link ClassicyTabs} — the other horizontal
 *     roving-tabindex widget in this codebase — for consistency; the APG
 *     permits either choice and this toolbar picks the one already
 *     established here.
 *   - **Home/End** jump to the first/last control.
 *   - The control that last had focus becomes (and remains) the tab stop, so
 *     tabbing back into the toolbar later returns to where the user left off.
 *   - A disabled control is never a stop and is skipped by arrow navigation —
 *     see {@link TOOLBAR_CONTROL_SELECTOR}.
 *
 * Controls are discovered by querying the rendered DOM (`button:not(:disabled)`
 * under the toolbar root) rather than by inspecting or cloning React children,
 * so arbitrary children (R7) keep working unchanged and `tabIndex` is set
 * directly on the DOM nodes the toolbar doesn't own.
 *
 * @example
 * <ClassicyButtonToolbar>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={back} iconAlt="Back" />
 *         <ClassicyBevelButton icon={fwd} iconAlt="Forward" />
 *     </ClassicyButtonToolbarGroup>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={zoom} iconAlt="Zoom" />
 *     </ClassicyButtonToolbarGroup>
 * </ClassicyButtonToolbar>
 */
// `large` is the unmodified base style, so only the non-default sizes carry a
// modifier class — same shape as ClassicyButton's buttonSize handling.
const toolbarSizeClass: Record<ClassicyButtonToolbarSize, string | undefined> =
	{
		large: undefined,
		medium: "classicyButtonToolbarSizeMedium",
		small: "classicyButtonToolbarSizeSmall",
	};

export const ClassicyButtonToolbar: FunctionalComponent<
	ClassicyButtonToolbarProps
> = ({ className, size = "large", children }) => {
	// toArray drops null/undefined/booleans and assigns stable keys, so a
	// conditionally-rendered group never leaves a stray divider behind.
	const items = Children.toArray(children);

	const toolbarRef = useRef<HTMLDivElement>(null);
	// Index into the live DOM query (not the React children array) of the
	// control currently in the tab sequence. Persisted across renders so
	// tabbing back into the toolbar returns to the control the user last had
	// focus on, per the roving-tabindex requirement.
	const [activeIndex, setActiveIndex] = useState(0);

	const getControls = useCallback((): HTMLButtonElement[] => {
		const root = toolbarRef.current;
		if (!root) return [];
		return Array.from(
			root.querySelectorAll<HTMLButtonElement>(TOOLBAR_CONTROL_SELECTOR),
		);
	}, []);

	// Read inside a ref so the MutationObserver callback below (created once,
	// long-lived) always sees the current activeIndex instead of the value
	// captured when the observer was set up.
	const activeIndexRef = useRef(activeIndex);
	activeIndexRef.current = activeIndex;

	// Applies the roving tabindex imperatively: the control at activeIndex
	// (clamped, in case controls were added/removed) gets tabIndex=0, every
	// other control gets -1. Runs against the live DOM rather than through
	// props, since the toolbar doesn't own its children.
	const applyRovingTabIndex = useCallback(() => {
		const controls = getControls();
		if (controls.length === 0) return;
		const clamped = Math.min(activeIndexRef.current, controls.length - 1);
		controls.forEach((el, i) => {
			el.tabIndex = i === clamped ? 0 : -1;
		});
	}, [getControls]);

	// Runs on every render so controls added/removed by React stay in sync.
	useLayoutEffect(() => {
		applyRovingTabIndex();
	});

	// A child can toggle its own `disabled` attribute directly on the DOM
	// (e.g. imperatively, or via a library that bypasses React's render for
	// that one attribute) without causing the toolbar to re-render. The
	// layout effect above only reruns on the toolbar's own renders, so that
	// case would leave a newly-enabled control with no tabIndex assigned
	// (implicit 0) sitting alongside the real tab stop — two stops in the
	// page's Tab sequence. A MutationObserver watching `disabled` across the
	// toolbar subtree catches exactly that case, proactively, the moment the
	// attribute actually changes — cheaper and more correct than recomputing
	// on every focus-in, which would only paper over a control the user
	// happens to tab onto and would still leave two stops visible to a
	// screen reader's virtual cursor until then. Set up once (not on every
	// activeIndex change) since the callback reads the latest value via
	// activeIndexRef.
	useEffect(() => {
		const root = toolbarRef.current;
		if (!root) return;
		const observer = new MutationObserver(applyRovingTabIndex);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["disabled"],
			subtree: true,
		});
		return () => observer.disconnect();
	}, [applyRovingTabIndex]);

	const focusIndex = useCallback(
		(index: number) => {
			const controls = getControls();
			if (controls.length === 0) return;
			const clamped = Math.min(Math.max(index, 0), controls.length - 1);
			setActiveIndex(clamped);
			controls[clamped]?.focus();
		},
		[getControls],
	);

	// Left/Right/Home/End roving-tabindex navigation. Only fires when the
	// event bubbles from inside the toolbar (a focused descendant control),
	// so arrow keys pressed while focus is elsewhere are never intercepted.
	//
	// Children are arbitrary (R7), so this must not claim every arrow/Home/End
	// press that bubbles up — only ones that genuinely belong to a roving
	// control:
	//   - a control that already handled the key (e.g. ClassicyPopUpMenu
	//     calling preventDefault() for Home/End while its listbox is open)
	//     is left alone, or the toolbar would move focus to a sibling button
	//     while that menu is still expanded, orphaning it;
	//   - a modifier combo (Alt/Ctrl/Cmd+Arrow) is reserved for the browser/
	//     OS (e.g. history navigation) and must fall through;
	//   - the event's target has to actually be one of the toolbar's own
	//     controls — an `<input>` child relies on ArrowLeft/Home for caret
	//     movement, not focus roving.
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (e.defaultPrevented) return;
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			const controls = getControls();
			if (controls.length === 0) return;
			if (!controls.includes(e.target as HTMLButtonElement)) return;
			const current = controls.indexOf(
				document.activeElement as HTMLButtonElement,
			);
			const from = current >= 0 ? current : activeIndex;
			let next: number;
			switch (e.key) {
				case "ArrowRight":
					next = (from + 1) % controls.length;
					break;
				case "ArrowLeft":
					next = (from - 1 + controls.length) % controls.length;
					break;
				case "Home":
					next = 0;
					break;
				case "End":
					next = controls.length - 1;
					break;
				default:
					return;
			}
			e.preventDefault();
			focusIndex(next);
		},
		[getControls, focusIndex, activeIndex],
	);

	// A control focused by any other means (click, programmatic focus())
	// becomes the new tab stop too, so the roving tabindex always tracks
	// wherever focus actually is.
	const handleFocus = useCallback(
		(e: FocusEvent<HTMLDivElement>) => {
			const controls = getControls();
			const index = controls.indexOf(e.target as unknown as HTMLButtonElement);
			if (index >= 0) setActiveIndex(index);
		},
		[getControls],
	);

	return (
		<ClassicyButtonToolbarContext.Provider value={true}>
			<div
				ref={toolbarRef}
				role="toolbar"
				aria-orientation="horizontal"
				className={classNames(
					"classicyButtonToolbar",
					toolbarSizeClass[size],
					className,
				)}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
			>
				{items.map((child, index) => {
					// Children.toArray already assigned every element a stable key;
					// reuse it so the Fragment carries the child's own identity instead
					// of its position. Only a keyless child (not a valid element — e.g.
					// a bare string/number) falls back to the index, which is safe
					// because toArray's output order is structurally static per render
					// and never reordered.
					const key =
						isValidElement(child) && child.key != null ? child.key : `${index}`;
					return (
						// Interleaving BETWEEN rendered children is what makes the
						// leading/trailing/single-group cases correct without
						// special-casing any of them.
						<Fragment key={key}>
							{index > 0 && <ClassicySeparator orientation="vertical" />}
							{child}
						</Fragment>
					);
				})}
			</div>
		</ClassicyButtonToolbarContext.Provider>
	);
};

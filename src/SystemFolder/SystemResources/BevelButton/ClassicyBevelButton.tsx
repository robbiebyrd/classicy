import "./ClassicyBevelButton.scss";
import classNames from "classnames";
import {
	type ButtonHTMLAttributes,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import type { ClassicyState } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyBevelButtonPopup } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup";
import type {
	ClassicyBevelPopupAlign,
	ClassicyBevelPopupRect,
	ClassicyBevelPopupSide,
} from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import { ClassicyButtonToolbarContext } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** HIG bevel widths: small = 2px, medium = 3px, large = 4px. */
export type ClassicyBevelWidth = "small" | "medium" | "large";

/**
 * Behavior mode. A bevel button can act like several other controls:
 * - `push`   — pops back up after a click (momentary).
 * - `toggle` — checkbox-like; click flips and holds the `on` state.
 * - `radio`  — turns on and holds; clicking an already-on button does nothing.
 * - `popup`  — reveals a menu; shows a pop-up arrow affordance.
 */
export type ClassicyBevelButtonMode = "push" | "toggle" | "radio" | "popup";

/**
 * How a bevel button's pop-up surface opens (HIGOS8 p.32–33):
 * - `click` — pressing the button shows it. A quick click leaves it open (a
 *   sticky menu); pressing past the double-click interval makes it a standard
 *   menu, where releasing over an item chooses it and releasing anywhere else
 *   closes it.
 * - `hold`  — a click does the button's own job (turns on a tool, say); only
 *   holding it past the double-click interval shows the surface, which then
 *   behaves as a standard menu. The HIG's option sets in tool palettes.
 */
export type ClassicyBevelPopupTrigger = "click" | "hold";

/**
 * Stand-in for the user's double-click time, which separates a sticky click
 * from a held press. Mac OS 8's middle Double-Click Speed was 32 ticks
 * (~0.53 s).
 */
const DEFAULT_HOLD_DELAY_MS = 500;

const MENU_ITEM_SELECTOR = 'li[role="menuitem"]:not(.disabled)';

type ClassicyBevelButtonProps = PropsWithChildren<{
	/**
	 * Bevel width (HIGOS8 p.29): `small` 2px, `medium` 3px, `large` 4px; sets
	 * the apparent 3-D height. Defaults to `medium`.
	 */
	bevelWidth?: ClassicyBevelWidth;
	/**
	 * Interaction mode: `push` (momentary), `toggle` (checkbox-like, flips and
	 * holds `on`), `radio` (turns on and holds; clicking an on button does
	 * nothing) or `popup` (pop-up menu button; click-triggered surface).
	 * Defaults to `push`.
	 */
	mode?: ClassicyBevelButtonMode;
	/** Optional icon/picture source rendered before the label. */
	icon?: string;
	/**
	 * Force a fixed square box for icon-only controls, sized to match
	 * `ClassicyButton`'s square shape. Drops the button's padding, so a label
	 * longer than a glyph or two will overflow. Unset, it is on for an
	 * icon-only button inside a `ClassicyButtonToolbar` and off elsewhere; an
	 * explicit value (including `false`) always wins.
	 */
	square?: boolean;
	/**
	 * Alt text for the icon image. Defaults to `""` (decorative). For an
	 * icon-only button set this (or `aria-label`): it is the accessible name,
	 * and the pop-up surface's label.
	 */
	iconAlt?: string;
	/**
	 * On-state for `toggle`/`radio` modes. Seeds the button's own state and
	 * re-syncs it whenever the prop changes; the button still flips itself on
	 * click, so drive it from state via `onChangeFunc` to keep the two in step.
	 */
	on?: boolean;
	/**
	 * Mixed state — a selection containing both on and off values. Drawn over
	 * the on/off look and, in `push`/`toggle` modes, announced as
	 * `aria-pressed="mixed"`. Defaults to `false`.
	 */
	mixed?: boolean;
	/** Dims the button and ignores presses. Defaults to `false`. */
	disabled?: boolean;
	/**
	 * Fired on click (all modes), after `onChangeFunc`. Skipped for the click
	 * that ends a long press which opened the pop-up surface.
	 */
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	/**
	 * Fired with the new on-state when a `toggle`/`radio` click changes it (so
	 * never for a click on an already-on radio button).
	 */
	onChangeFunc?: (on: boolean) => void;
	/**
	 * Show a pop-up arrow, at this size. Drawn only in `popup` mode or when
	 * the button has a surface (`menuItems`/`popupContent`); unset, no arrow.
	 */
	popupArrow?: "small" | "large";
	/**
	 * Arrow orientation: horizontal points right, vertical points down.
	 * Defaults to `vertical`. Unless `popupPlacement` says otherwise, the surface
	 * opens where the arrow points.
	 */
	popupDirection?: "horizontal" | "vertical";
	/**
	 * Where the surface opens: directly below the button or to its right
	 * (HIGOS8 p.32), flipping to the opposite side when there is no room.
	 * Defaults to the side the arrow points to. A Control Strip module keeps a
	 * right-pointing arrow but opens below — which, at the bottom of the
	 * screen, flips it above the strip.
	 */
	popupPlacement?: ClassicyBevelPopupSide;
	/**
	 * Line the surface up with the button's edge (`start`) or centre it on the
	 * button (`center`, as Figure 2-16's slider sits on its module). Defaults
	 * to `start`.
	 */
	popupAlign?: ClassicyBevelPopupAlign;
	/**
	 * Pixels to move each edge of the rect the surface is placed against, inward
	 * positive. The Control Strip uses it so a module's surface overlaps the
	 * strip and meets the module's separator, as in Figure 6-15.
	 */
	popupAnchorInset?: Partial<ClassicyBevelPopupRect>;
	/**
	 * The menu this button reveals (HIGOS8 Figure 2-15). Items take the full
	 * `ClassicyMenuItem` shape, so `checked` marks the current choice.
	 */
	menuItems?: ClassicyMenuItem[];
	/**
	 * Any other surface to reveal instead of a menu — HIGOS8 Figure 2-16 shows a
	 * slider. Ignored when `menuItems` is set.
	 */
	popupContent?: ReactNode;
	/**
	 * When the surface opens; see {@link ClassicyBevelPopupTrigger}. Defaults to
	 * `click` in `popup` mode and `hold` in every other mode, so a toggle or
	 * radio tool keeps its click and offers its options on a long press.
	 */
	popupTrigger?: ClassicyBevelPopupTrigger;
	/**
	 * The double-click interval, in ms, that separates a click from a hold.
	 * Defaults to `500` (Mac OS 8's middle Double-Click Speed, 32 ticks).
	 */
	popupHoldDelayMs?: number;
}> &
	Omit<
		ButtonHTMLAttributes<HTMLButtonElement>,
		"onClick" | "type" | "disabled" | "onChange"
	>;

const bevelWidthClass = {
	small: "classicyBevelButtonBevelSmall",
	medium: "classicyBevelButtonBevelMedium",
	large: "classicyBevelButtonBevelLarge",
} as const;

// `!children`/`children &&` both treat numeric `0` as absent, which is wrong:
// `<ClassicyBevelButton icon={x}>{0}</ClassicyBevelButton>` has real content.
// Shared by the `isSquare` derivation and the render guard so they can never
// drift apart.
const hasRenderableContent = (children: unknown): boolean =>
	children != null && children !== "" && children !== false;

// The HIG's seven visual states as the shared bare state classes. Disabled
// outranks mixed, and mixed outranks pressed, so a rule keyed on one class
// never has to unpick another; `checked` (on) combines with any of them.
// `open` marks a showing pop-up surface; the button also reads as `pressed`
// while it is down, so the caller passes `pressed || popupOpen` for `pressed`.
const bevelButtonStates = (
	disabled: boolean,
	mixed: boolean,
	pressed: boolean,
	on: boolean,
	popupOpen: boolean,
): Partial<Record<ClassicyState, boolean>> => ({
	disabled,
	mixed: mixed && !disabled,
	pressed: pressed && !disabled && !mixed,
	checked: on,
	open: popupOpen,
});

/**
 * The Platinum bevel button (HIGOS8 Ch.2 "Bevel Buttons", p.29): a
 * square-cornered button with a 2/3/4px bevel that can hold a label, an icon or
 * both, and can act as a push button, a checkbox (`toggle`), a radio button
 * (`radio`) or a pop-up button (`popup`). Reach for it for tool palettes,
 * toolbars, latching or icon buttons, and as the button-shaped alternative
 * to `ClassicyCheckbox`; for an ordinary dialog push button use
 * `ClassicyButton`. It renders a real `<button>` and passes other `<button>`
 * attributes through.
 *
 * The seven HIG states are exposed as the shared bare state classes beside
 * the root (`pressed`, `checked`, `mixed`, `disabled`, and `open` while its
 * pop-up shows). Presses play the theme's click sounds and are reported to
 * analytics. A radio button only ever turns itself on: mutual exclusion is the
 * caller's job, by wiring a group's `on`/`onChangeFunc` to one shared value.
 *
 * Given `menuItems` (a Platinum menu, HIGOS8 Figure 2-15) or `popupContent`
 * (any other surface, e.g. `ClassicyPopUpSlider`, Figure 2-16), it opens that
 * surface in a fixed-position portal below or to the right of itself
 * (pp.32–33), flipping when there is no room, and plays the menu-open sound.
 * With the `click` trigger (default in `popup` mode) a quick click leaves the
 * menu open and a press held past `popupHoldDelayMs` is a press-drag-release
 * menu; with `hold` (default in other modes) a click keeps the button's own
 * behaviour and only a long press shows the surface. Enter/Space toggles a
 * click-trigger surface and Down Arrow opens either kind with the first item
 * focused; Escape, an outside press, scrolling or resizing closes it.
 *
 * ```tsx
 * <ClassicyBevelButton mode="popup" popupArrow="large" menuItems={zoomItems}>
 *     100%
 * </ClassicyBevelButton>
 * ```
 */
export const ClassicyBevelButton: FunctionalComponent<
	ClassicyBevelButtonProps
> = ({
	bevelWidth = "medium",
	mode = "push",
	icon,
	iconAlt = "",
	on,
	square,
	mixed = false,
	disabled = false,
	onClickFunc,
	onChangeFunc,
	popupArrow,
	popupDirection = "vertical",
	popupPlacement,
	popupAlign = "start",
	popupAnchorInset,
	menuItems,
	popupContent,
	popupTrigger,
	popupHoldDelayMs = DEFAULT_HOLD_DELAY_MS,
	children,
	className,
	// The disclosure ARIA is Classicy's to describe only while the button owns
	// a pop-up surface; otherwise it is the caller's (e.g. a collapsible
	// section's ▸/▾ toggle), so pull it out of `rest` and fall back to it below.
	"aria-haspopup": callerAriaHasPopup,
	"aria-expanded": callerAriaExpanded,
	"aria-controls": callerAriaControls,
	style,
	...rest
}) => {
	const { track } = useClassicyAnalytics();
	const inToolbar = useContext(ClassicyButtonToolbarContext);
	// Inside a toolbar an icon-only control takes the square box by default;
	// a control with text keeps its rectangular shape. `square` is destructured
	// with no default, so an explicitly passed value — including false — always
	// wins over the toolbar's preference.
	const isSquare =
		square ?? (inToolbar && !!icon && !hasRenderableContent(children));

	const [pressed, setPressed] = useState(false);
	// Uncontrolled on-state for toggle/radio; synced when the `on` prop changes.
	const [onState, setOnState] = useState<boolean>(on ?? false);
	useEffect(() => {
		if (on !== undefined) setOnState(on);
	}, [on]);

	// --- Pop-up surface -------------------------------------------------------
	const hasSurface = menuItems !== undefined || popupContent !== undefined;
	const trigger: ClassicyBevelPopupTrigger =
		popupTrigger ?? (mode === "popup" ? "click" : "hold");
	const popupId = `${useId()}-popup`;
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [popupAnchor, setPopupAnchor] = useState<ClassicyBevelPopupRect | null>(
		null,
	);
	const [focusFirstItem, setFocusFirstItem] = useState(false);
	const popupOpen = popupAnchor !== null;
	const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Set when a long press opened the surface, so the click that follows the
	// release does not also run the button's own action.
	const suppressClickRef = useRef(false);
	const releaseListenerRef = useRef<
		((e: globalThis.MouseEvent) => void) | null
	>(null);
	const appearance = useClassicyAppearance(
		"BevelButton",
		bevelButtonStates(
			disabled,
			mixed,
			pressed || popupOpen,
			onState,
			popupOpen,
		),
		buttonRef,
	);
	// `close` follows the surface going away, whichever path dismissed it.
	const wasPopupOpenRef = useRef(popupOpen);
	const emitAppearance = appearance.emit;
	useEffect(() => {
		if (wasPopupOpenRef.current === popupOpen) return;
		wasPopupOpenRef.current = popupOpen;
		if (!popupOpen) emitAppearance("close", withClassicyAppearanceInput());
	}, [popupOpen, emitAppearance]);

	const clearHoldTimer = useCallback(() => {
		if (holdTimerRef.current !== null) {
			clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
	}, []);

	const detachReleaseListener = useCallback(() => {
		if (releaseListenerRef.current) {
			document.removeEventListener("mouseup", releaseListenerRef.current);
			releaseListenerRef.current = null;
		}
	}, []);

	const openPopup = (byKeyboard: boolean) => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setFocusFirstItem(byKeyboard);
		setPopupAnchor({
			top: rect.top + (popupAnchorInset?.top ?? 0),
			bottom: rect.bottom - (popupAnchorInset?.bottom ?? 0),
			left: rect.left + (popupAnchorInset?.left ?? 0),
			right: rect.right - (popupAnchorInset?.right ?? 0),
		});
		appearance.emit("open", withClassicyAppearanceInput({ trigger }));
		track("open", { type: "ClassicyBevelButton", mode, trigger });
	};

	const closePopup = useCallback(() => {
		detachReleaseListener();
		setPopupAnchor(null);
		setFocusFirstItem(false);
		// Hand focus back if it was inside the surface (keyboard use, Escape).
		const surface = document.getElementById(popupId);
		if (surface?.contains(document.activeElement)) buttonRef.current?.focus();
	}, [detachReleaseListener, popupId]);

	// Standard (non-sticky) menu semantics for a press that was held: releasing
	// over an item chooses it, releasing anywhere else closes the menu.
	const listenForRelease = (pressedAt: number) => {
		detachReleaseListener();
		const onRelease = (e: globalThis.MouseEvent) => {
			detachReleaseListener();
			const target = e.target instanceof Element ? e.target : null;
			// mouseup reaches the document before the click it produces. Only a
			// release on the button itself is followed by a click there, so only
			// then does a long press still owe a suppressed click.
			if (!target || !buttonRef.current?.contains(target)) {
				suppressClickRef.current = false;
			}
			if (Date.now() - pressedAt < popupHoldDelayMs) return; // sticky
			const item = target?.closest<HTMLElement>(MENU_ITEM_SELECTOR);
			if (item && document.getElementById(popupId)?.contains(item)) {
				item.click();
			} else {
				closePopup();
			}
		};
		releaseListenerRef.current = onRelease;
		document.addEventListener("mouseup", onRelease);
	};

	useEffect(
		() => () => {
			clearHoldTimer();
			detachReleaseListener();
		},
		[clearHoldTimer, detachReleaseListener],
	);

	const showArrow =
		(mode === "popup" || hasSurface) && popupArrow !== undefined;

	const onHandleFunc = (e: MouseEvent<HTMLButtonElement>) => {
		if (disabled) return;
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}
		appearance.emit("click", withClassicyAppearanceInput());
		// A click with no pointer behind it (detail 0) is Enter or Space: with a
		// click trigger that is how the keyboard opens and closes the surface.
		if (hasSurface && trigger === "click" && e.detail === 0) {
			if (popupOpen) closePopup();
			else openPopup(true);
		}
		let next = onState;
		if (mode === "toggle") next = !onState;
		else if (mode === "radio") next = true;
		if (next !== onState) {
			setOnState(next);
			if (onChangeFunc) onChangeFunc(next);
		}
		track("click", { type: "ClassicyBevelButton", mode, on: next, disabled });
		if (onClickFunc) onClickFunc(e);
	};

	const onPopupMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (!hasSurface || e.button !== 0) return;
		suppressClickRef.current = false;
		clearHoldTimer();
		const pressedAt = Date.now();
		if (trigger === "click") {
			// Pressing the button again dismisses a menu left open by a click.
			if (popupOpen) {
				closePopup();
				return;
			}
			openPopup(false);
			listenForRelease(pressedAt);
			return;
		}
		holdTimerRef.current = setTimeout(() => {
			holdTimerRef.current = null;
			suppressClickRef.current = true;
			openPopup(false);
			listenForRelease(pressedAt);
		}, popupHoldDelayMs);
	};

	// Down Arrow opens the surface from the keyboard under either trigger —
	// the only keyboard route to a hold-triggered menu.
	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (!hasSurface || disabled || popupOpen || e.key !== "ArrowDown") return;
		e.preventDefault();
		openPopup(true);
	};

	return (
		<>
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is only set when role="radio" (mode="radio"); the role is dynamic so static analysis can't prove it */}
			<button
				{...appearance.attrs}
				{...rest}
				ref={buttonRef}
				type="button"
				tabIndex={0}
				disabled={disabled}
				data-mode={mode}
				aria-pressed={
					mode === "toggle" || mode === "push"
						? mixed
							? "mixed"
							: onState
						: undefined
				}
				aria-checked={mode === "radio" ? onState : undefined}
				role={mode === "radio" ? "radio" : "button"}
				aria-haspopup={
					hasSurface
						? menuItems
							? "menu"
							: "dialog"
						: mode === "popup"
							? "menu"
							: callerAriaHasPopup
				}
				aria-expanded={hasSurface ? popupOpen : callerAriaExpanded}
				aria-controls={
					hasSurface ? (popupOpen ? popupId : undefined) : callerAriaControls
				}
				className={classNames(
					"classicyBevelButton",
					appearance.className,
					isSquare && "classicyBevelButtonSquare",
					bevelWidthClass[bevelWidth],
					`classicyBevelButtonMode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`,
					// Merged last rather than spread with `rest`, which the computed
					// className above would otherwise silently overwrite.
					className,
				)}
				style={appearance.style ? { ...appearance.style, ...style } : style}
				onClick={onHandleFunc}
				onKeyDown={onKeyDown}
				onMouseDown={(e) => {
					if (disabled) return;
					setPressed(true);
					appearance.emit("press");
					onPopupMouseDown(e);
				}}
				onMouseUp={() => {
					if (disabled) return;
					clearHoldTimer();
					setPressed(false);
					appearance.emit("release");
				}}
				// If the pointer leaves while held, a push button reverts to off. A
				// pending hold keeps running: dragging off toward the menu is part of
				// the gesture.
				onMouseLeave={() => setPressed(false)}
			>
				{icon && (
					<img
						className="classicyBevelButtonIcon"
						src={icon}
						alt={iconAlt}
						draggable={false}
					/>
				)}
				{hasRenderableContent(children) && (
					<span className="classicyBevelButtonLabel">{children}</span>
				)}
				{showArrow && (
					<span
						className={classNames(
							"classicyBevelButtonArrow",
							`classicyBevelButtonArrow${popupArrow === "large" ? "Large" : "Small"}`,
							popupDirection === "horizontal"
								? "classicyBevelButtonArrowHorizontal"
								: "classicyBevelButtonArrowVertical",
						)}
						aria-hidden={true}
					>
						{popupDirection === "horizontal" ? "▸" : "▾"}
					</span>
				)}
			</button>
			{popupAnchor && (
				<ClassicyBevelButtonPopup
					id={popupId}
					anchor={popupAnchor}
					side={
						popupPlacement ??
						(popupDirection === "horizontal" ? "right" : "below")
					}
					align={popupAlign}
					menuItems={menuItems}
					content={popupContent}
					label={
						rest["aria-label"] ||
						iconAlt ||
						(typeof children === "string" ? children : undefined)
					}
					focusFirstItem={focusFirstItem}
					buttonRef={buttonRef}
					onClose={closePopup}
				/>
			)}
		</>
	);
};

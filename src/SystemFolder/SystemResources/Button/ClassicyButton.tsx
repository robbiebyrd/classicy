import "./ClassicyButton.scss";
import classNames from "classnames";
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyButtonProps = PropsWithChildren<{
	/**
	 * Draws the default-button ring (HIGOS8 "Default Buttons", p.23) — the
	 * dialog's most likely action. Visual only: Return/Enter triggering it is
	 * the dialog's job (`ClassicyForm` with `buttonType="submit"`,
	 * `ClassicyAlert`). Defaults to `false`.
	 */
	isDefault?: boolean;
	/** Dims the button and blocks clicks, sounds and the key flash. Defaults to `false`. */
	disabled?: boolean;
	/** Click handler (mouse, or Return/Space on the focused button). */
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	/**
	 * `rectangle` is the standard rounded push button; `square` is a fixed
	 * square box for a glyph or icon (padding variants are ignored). Defaults
	 * to `rectangle`.
	 */
	buttonShape?: "rectangle" | "square";
	/** `small` shrinks the box and type; unset is the standard (medium) size. */
	buttonSize?: "medium" | "small";
	/**
	 * Native `type` of the underlying `<button>`. Use `submit` for the
	 * confirming button inside a `ClassicyForm`. Defaults to `button`.
	 */
	buttonType?: "button" | "submit" | "reset";
	/** When true, holds the button in its pressed/active visual state. Defaults to `false`. */
	depressed?: boolean;
	/** Inner spacing variant; scales off --window-padding-size. Ignored for square buttons. Defaults to `md`. */
	padding?: "sm" | "md" | "lg" | "xl";
	/** Outer spacing variant; scales off --window-padding-size. Defaults to `md`. */
	margin?: "sm" | "md" | "lg" | "xl";
}> &
	Omit<
		ButtonHTMLAttributes<HTMLButtonElement>,
		"onClick" | "type" | "disabled" | "onMouseDown" | "onMouseUp"
	>;

const paddingVariantClass = {
	sm: "classicyButtonPaddingSm",
	md: "classicyButtonPaddingMd",
	lg: "classicyButtonPaddingLg",
	xl: "classicyButtonPaddingXl",
} as const;

const marginVariantClass = {
	sm: "classicyButtonMarginSm",
	md: "classicyButtonMarginMd",
	lg: "classicyButtonMarginLg",
	xl: "classicyButtonMarginXl",
} as const;

// Mac OS 8 HIG keyboard-activation flash: when a button is activated from the
// keyboard (Return/Enter or Space on the focused button) it briefly highlights
// so the action reads as a real "press". The HIG describes an ~8-tick blink
// (a tick is 1/60 s ≈ 16.7 ms → ~133 ms); 125 ms is the conventional value.
const KEY_ACTIVE_MS = 125;

const isActivationKey = (key: string): boolean =>
	key === "Enter" || key === " " || key === "Spacebar";

/**
 * The Platinum push button (HIGOS8 Ch.2 "Push Buttons", p.21) — use it
 * wherever you would reach for a raw `<button>`; it renders a real `<button>`
 * and forwards its ref. Short labels still get the HIG minimum width, so an
 * OK/Cancel pair lines up.
 *
 * Pressing plays the theme's click-down/click-up sounds, and activating the
 * focused button with Return/Enter or Space flashes the pressed state for
 * about 8 ticks, as the HIG describes. Every click is reported to analytics
 * as `click`. Any other `<button>` attribute (`aria-*`, `id`, `title`, …)
 * passes through; `onClick`, `type`, `onMouseDown` and `onMouseUp` are owned
 * by the component — use `onClickFunc` and `buttonType` instead.
 *
 * For latching, toggle, radio, icon or pop-up buttons use
 * `ClassicyBevelButton`; for the "?" help button use `ClassicyHelpButton`.
 *
 * ```tsx
 * <ClassicyButton onClickFunc={cancel}>Cancel</ClassicyButton>
 * <ClassicyButton isDefault buttonType="submit">OK</ClassicyButton>
 * ```
 */
export const ClassicyButton = forwardRef<
	HTMLButtonElement,
	ClassicyButtonProps
>(
	(
		{
			isDefault = false,
			buttonType = "button",
			buttonShape = "rectangle",
			buttonSize,
			disabled = false,
			depressed = false,
			padding = "md",
			margin = "md",
			onClickFunc,
			children,
			onKeyDown,
			onKeyUp,
			className,
			style,
			...rest
		},
		ref,
	) => {
		const player = useSoundDispatch();

		const { track } = useClassicyAnalytics();
		const analyticsArgs = { type: "ClassicyButton", isDefault, disabled };

		// ~8-tick keyboard-activation highlight. Purely visual — the browser still
		// performs the real activation (click) for Enter/Space on a focused button,
		// so this does NOT hijack Enter globally; it only reacts to THIS button's
		// own keydown.
		const [keyActive, setKeyActive] = useState(false);
		const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
			undefined,
		);

		useEffect(
			() => () => {
				if (keyTimer.current) clearTimeout(keyTimer.current);
			},
			[],
		);

		// The root element for the appearance hook, merged with the forwarded
		// ref so callers keep receiving the <button>.
		const buttonRef = useRef<HTMLButtonElement | null>(null);
		const setButtonRef = useCallback(
			(el: HTMLButtonElement | null) => {
				buttonRef.current = el;
				if (typeof ref === "function") ref(el);
				else if (ref) ref.current = el;
			},
			[ref],
		);
		const appearance = useClassicyAppearance(
			"Button",
			{ default: isDefault, pressed: depressed || keyActive },
			buttonRef,
		);

		const onHandleFunc = (e: MouseEvent<HTMLButtonElement>) => {
			appearance.emit("click");
			track("click", { ...analyticsArgs });
			if (onClickFunc) {
				onClickFunc(e);
			}
		};

		const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
			if (!disabled && !e.repeat && isActivationKey(e.key)) {
				setKeyActive(true);
				appearance.emit("press");
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" });
				if (keyTimer.current) clearTimeout(keyTimer.current);
				keyTimer.current = setTimeout(() => setKeyActive(false), KEY_ACTIVE_MS);
			}
			onKeyDown?.(e);
		};

		const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
			if (!disabled && isActivationKey(e.key)) {
				appearance.emit("release");
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" });
			}
			onKeyUp?.(e);
		};

		return (
			<button
				{...appearance.attrs}
				{...rest}
				ref={setButtonRef}
				type={buttonType}
				tabIndex={0}
				className={classNames(
					"classicyButton",
					appearance.className,
					buttonShape === "square" ? "classicyButtonShapeSquare" : "",
					buttonSize === "small" ? "classicyButtonSmall" : "",
					keyActive ? "classicyButtonKeyActive" : "",
					buttonShape !== "square" ? paddingVariantClass[padding] : "",
					marginVariantClass[margin],
					className,
				)}
				style={appearance.style ? { ...appearance.style, ...style } : style}
				aria-pressed={depressed || keyActive || undefined}
				onClick={onHandleFunc}
				onMouseDown={() => {
					appearance.emit("press");
					player({
						type: "ClassicySoundPlay",
						sound: "ClassicyButtonClickDown",
					});
				}}
				onMouseUp={() => {
					appearance.emit("release");
					player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" });
				}}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				disabled={disabled}
			>
				{children}
			</button>
		);
	},
);

ClassicyButton.displayName = "ClassicyButton";

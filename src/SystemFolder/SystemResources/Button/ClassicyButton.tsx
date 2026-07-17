import "./ClassicyButton.scss";
import classNames from "classnames";
import {
	type ButtonHTMLAttributes,
	forwardRef,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	useEffect,
	useRef,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyButtonProps = PropsWithChildren<{
	isDefault?: boolean;
	disabled?: boolean;
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	buttonShape?: "rectangle" | "square";
	buttonSize?: "medium" | "small";
	buttonType?: "button" | "submit" | "reset";
	/** When true, holds the button in its pressed/active visual state. */
	depressed?: boolean;
	/** Inner spacing variant; scales off --window-padding-size. Ignored for square buttons. */
	padding?: "sm" | "md" | "lg" | "xl";
	/** Outer spacing variant; scales off --window-padding-size. */
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

		const onHandleFunc = (e: MouseEvent<HTMLButtonElement>) => {
			track("click", { ...analyticsArgs });
			if (onClickFunc) {
				onClickFunc(e);
			}
		};

		const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
			if (!disabled && !e.repeat && isActivationKey(e.key)) {
				setKeyActive(true);
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" });
				if (keyTimer.current) clearTimeout(keyTimer.current);
				keyTimer.current = setTimeout(() => setKeyActive(false), KEY_ACTIVE_MS);
			}
			onKeyDown?.(e);
		};

		const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
			if (!disabled && isActivationKey(e.key)) {
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" });
			}
			onKeyUp?.(e);
		};

		return (
			<button
				{...rest}
				ref={ref}
				type={buttonType}
				tabIndex={0}
				role={buttonType}
				className={classNames(
					"classicyButton",
					isDefault ? "classicyButtonDefault" : "",
					buttonShape === "square" ? "classicyButtonShapeSquare" : "",
					buttonSize === "small" ? "classicyButtonSmall" : "",
					depressed ? "classicyButtonDepressed" : "",
					keyActive ? "classicyButtonKeyActive" : "",
					buttonShape !== "square" ? paddingVariantClass[padding] : "",
					marginVariantClass[margin],
				)}
				aria-pressed={depressed || keyActive || undefined}
				onClick={onHandleFunc}
				onMouseDown={() => {
					player({
						type: "ClassicySoundPlay",
						sound: "ClassicyButtonClickDown",
					});
				}}
				onMouseUp={() => {
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

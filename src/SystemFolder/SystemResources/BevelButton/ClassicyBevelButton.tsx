import "./ClassicyBevelButton.scss";
import classNames from "classnames";
import {
	type ButtonHTMLAttributes,
	type FC as FunctionalComponent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	useEffect,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

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

/** The seven HIG visual states, exposed on `data-state` for styling/testing. */
export type ClassicyBevelButtonState =
	| "off"
	| "pressed-off"
	| "on"
	| "pressed-on"
	| "mixed"
	| "disabled-off"
	| "disabled-on";

type ClassicyBevelButtonProps = PropsWithChildren<{
	/** Bevel width; sets the apparent 3-D height. Default `medium` (3px). */
	bevelWidth?: ClassicyBevelWidth;
	/** Interaction mode. Default `push`. */
	mode?: ClassicyBevelButtonMode;
	/** Optional icon/picture source rendered before the label. */
	icon?: string;
	/** Alt text for the icon image. */
	iconAlt?: string;
	/** Controlled on-state for `toggle`/`radio` modes. */
	on?: boolean;
	/** Mixed state (a range containing both on and off values). */
	mixed?: boolean;
	disabled?: boolean;
	/** Fired on click (all modes). */
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	/** Fired with the new on-state for `toggle`/`radio` modes. */
	onChangeFunc?: (on: boolean) => void;
	/** For `popup` mode: show a pop-up arrow. Size of the arrow glyph. */
	popupArrow?: "small" | "large";
	/** For `popup` mode: arrow orientation. Horizontal points right, vertical points down. */
	popupDirection?: "horizontal" | "vertical";
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

const computeState = (
	disabled: boolean,
	mixed: boolean,
	pressed: boolean,
	on: boolean,
): ClassicyBevelButtonState => {
	if (disabled) return on ? "disabled-on" : "disabled-off";
	if (mixed) return "mixed";
	if (pressed) return on ? "pressed-on" : "pressed-off";
	return on ? "on" : "off";
};

export const ClassicyBevelButton: FunctionalComponent<
	ClassicyBevelButtonProps
> = ({
	bevelWidth = "medium",
	mode = "push",
	icon,
	iconAlt = "",
	on,
	mixed = false,
	disabled = false,
	onClickFunc,
	onChangeFunc,
	popupArrow,
	popupDirection = "vertical",
	children,
	...rest
}) => {
	const player = useSoundDispatch();
	const { track } = useClassicyAnalytics();

	const [pressed, setPressed] = useState(false);
	// Uncontrolled on-state for toggle/radio; synced when the `on` prop changes.
	const [onState, setOnState] = useState<boolean>(on ?? false);
	useEffect(() => {
		if (on !== undefined) setOnState(on);
	}, [on]);

	const showArrow = mode === "popup" && popupArrow !== undefined;
	const state = computeState(disabled, mixed, pressed, onState);

	const onHandleFunc = (e: MouseEvent<HTMLButtonElement>) => {
		if (disabled) return;
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

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is only set when role="radio" (mode="radio"); the role is dynamic so static analysis can't prove it
		<button
			{...rest}
			type="button"
			tabIndex={0}
			disabled={disabled}
			data-state={state}
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
			aria-haspopup={mode === "popup" ? "menu" : undefined}
			className={classNames(
				"classicyBevelButton",
				bevelWidthClass[bevelWidth],
				`classicyBevelButtonMode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`,
			)}
			onClick={onHandleFunc}
			onMouseDown={() => {
				if (disabled) return;
				setPressed(true);
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" });
			}}
			onMouseUp={() => {
				if (disabled) return;
				setPressed(false);
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" });
			}}
			// If the pointer leaves while held, a push button reverts to off.
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
			{children && <span className="classicyBevelButtonLabel">{children}</span>}
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
	);
};

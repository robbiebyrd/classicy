import "./ClassicyCheckbox.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export type ClassicyCheckboxProps = {
	/** DOM id of the native `<input>`; the label's `htmlFor` points at it, so it must be unique. */
	id: string;
	/**
	 * On/off state. Seeds the checkbox's own state and re-syncs it whenever the
	 * prop changes; clicks still toggle it locally. Defaults to `false`.
	 */
	checked?: boolean;
	/**
	 * Mixed state (HIGOS8 p.27): a dash shown whatever the on/off value, for a
	 * setting that is on for only part of a selection. Clicking does not clear
	 * it — reset `mixed` yourself in `onClickFunc`.
	 */
	mixed?: boolean;
	/**
	 * Legacy flag kept for API stability: adds the `classicyCheckboxDefault`
	 * class but no longer changes the on-state mark (see `mark`).
	 */
	isDefault?: boolean;
	/** Dims the checkbox and its label and ignores clicks. */
	disabled?: boolean;
	/** Called with the new checked value when the box or its label is clicked. */
	onClickFunc?: (checked: boolean) => void;
	/** Text label; clicking it toggles the checkbox. Omit for a bare box. */
	label?: string;
	/** Label text size. Defaults to `medium`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the box. Defaults to `right`. */
	labelPosition?: ClassicyLabelPosition;
	/**
	 * On-state mark. HIGOS8 Ch.2 "Checkboxes" (p.28): the checkmark is the
	 * standard mark; "x" is the localization opt-in for locales where the
	 * checkmark is not culturally acceptable. Defaults to "check".
	 */
	mark?: "check" | "x";
};

/**
 * The Platinum checkbox (HIGOS8 Ch.2 "Checkboxes", p.27) — use it instead of a
 * raw `<input type="checkbox">`, which it renders under the themed box. It
 * has three states: off, on (a checkmark, or an "x" with `mark="x"`) and
 * mixed (a dash). Clicking the box or its label toggles it and calls
 * `onClickFunc` with the new value; the click is also reported to analytics.
 *
 * `checked` seeds the state and re-syncs when it changes, so the checkbox can
 * be driven from the store or left to manage itself. For a button-shaped
 * checkbox (a toolbar or palette toggle) use `ClassicyBevelButton
 * mode="toggle"`; a checkbox that titles a group box is
 * `ClassicyControlGroup`'s `checkboxTitle`.
 *
 * ```tsx
 * <ClassicyCheckbox
 *     id="show-balloons"
 *     label="Show Balloons"
 *     checked={showBalloons}
 *     onClickFunc={setShowBalloons}
 * />
 * ```
 */
export const ClassicyCheckbox: FunctionalComponent<ClassicyCheckboxProps> = ({
	id,
	checked,
	mixed,
	isDefault,
	disabled,
	onClickFunc,
	label,
	labelSize = "medium",
	labelPosition = "right",
	mark = "check",
}) => {
	const [check, setCheck] = useState<boolean>(checked || false);
	useEffect(() => {
		setCheck(checked || false);
	}, [checked]);
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyCheckbox", label };

	const handleOnClick = () => {
		if (onClickFunc) {
			onClickFunc(!check);
		}
		track("click", { checked: !check, ...analyticsArgs });
		if (!disabled) {
			setCheck(!check);
		}
	};

	return (
		<div
			className={classNames(
				"classicyCheckboxHolder",
				labelPositionClass(labelPosition),
			)}
		>
			<ClassicyControlLabel
				label={label}
				labelFor={id}
				labelSize={labelSize}
				disabled={disabled}
			/>
			<input
				type={"checkbox"}
				onChange={handleOnClick}
				tabIndex={0}
				id={id}
				checked={check}
				disabled={disabled}
				className={classNames(
					"classicyCheckbox",
					isDefault ? "classicyCheckboxDefault" : "",
					mixed ? "classicyCheckboxMixed" : "",
					mark === "x" ? "classicyCheckboxX" : "",
				)}
			/>
		</div>
	);
};

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
	id: string;
	checked?: boolean;
	mixed?: boolean;
	isDefault?: boolean;
	disabled?: boolean;
	onClickFunc?: (checked: boolean) => void;
	label?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	/**
	 * On-state mark. HIGOS8 Ch.2 "Checkboxes" (p.28): the checkmark is the
	 * standard mark; "x" is the localization opt-in for locales where the
	 * checkmark is not culturally acceptable. Defaults to "check".
	 */
	mark?: "check" | "x";
};

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

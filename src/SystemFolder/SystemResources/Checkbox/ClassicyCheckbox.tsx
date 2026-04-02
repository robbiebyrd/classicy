import "./ClassicyCheckbox.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export type ClassicyCheckboxProps = {
	id: string;
	checked?: boolean;
	mixed?: boolean;
	isDefault?: boolean;
	disabled?: boolean;
	onClickFunc?: (checked: boolean) => void;
	label?: string;
};

export const ClassicyCheckbox: FunctionalComponent<ClassicyCheckboxProps> = ({
	id,
	checked,
	mixed,
	isDefault,
	disabled,
	onClickFunc,
	label,
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
		<div className={"classicyCheckboxHolder"}>
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
				)}
			/>
			<ClassicyControlLabel label={label} labelFor={id} disabled={disabled} />
		</div>
	);
};

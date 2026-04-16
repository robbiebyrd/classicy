import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyRadioInput.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyRadioInputProps = {
	name: string;
	label?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	align?: "rows" | "columns";
	disabled?: boolean;
	onClickFunc?: (id: string) => void;
	inputs: ClassicyRadioInputValueProps[];
};

type ClassicyRadioInputValueProps = {
	id: string;
	checked?: boolean;
	mixed?: boolean;
	isDefault?: boolean;
	disabled?: boolean;
	label?: string;
};

export const ClassicyRadioInput: FunctionalComponent<
	ClassicyRadioInputProps
> = ({
	name,
	label,
	labelSize = "medium",
	labelPosition = "above",
	align = "columns",
	disabled = false,
	onClickFunc,
	inputs,
}) => {
	const [check, setCheck] = useState<string>(
		inputs.findLast((input) => input.checked === true)?.id || "",
	);
	useEffect(() => {
		setCheck(inputs.findLast((input) => input.checked === true)?.id || "");
	}, [inputs]);
	const player = useSoundDispatch();

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { name, label, disabled, inputs };

	const handleOnChange = (id: string) => {
		setCheck(id);
		track("selected", {
			type: "ClassicyRadioInput",
			itemId: id,
			...analyticsArgs,
		});
		if (onClickFunc) {
			onClickFunc(id);
		}
	};

	const group = (
		<div
			className={classNames(
				"classicyRadioInputGroup",
				align === "columns" ? "classicyRadioInputGroupColumns" : "",
			)}
		>
			{inputs?.map((item) => (
				<div key={name + item.id} className={"classicyRadioInputMargin"}>
					<div
						className={classNames(
							"classicyRadioInputWrapper",
							check === item.id ? "classicyRadioInputWrapperChecked" : "",
							item.disabled ? "classicyRadioInputWrapperDisabled" : "",
						)}
					>
						<input
							id={item.id}
							name={name}
							disabled={item.disabled}
							className={classNames(
								"classicyRadioInput",
								item.isDefault ? "classicyRadioInputDefault" : "",
								item.mixed ? "classicyRadioInputMixed" : "",
							)}
							type={"radio"}
							value={item.id}
							defaultChecked={item.checked}
							tabIndex={0}
							onChange={() => !item.disabled && handleOnChange(item.id)}
							onMouseDown={() => {
								if (item.disabled) return;
								track("click", {
									type: "ClassicyRadioInput",
									itemId: item.id,
									...analyticsArgs,
								});
								player({
									type: "ClassicySoundPlay",
									sound: "ClassicyInputRadioClickDown",
								});
							}}
							onMouseUp={() => {
								if (item.disabled) return;
								player({
									type: "ClassicySoundPlay",
									sound: "ClassicyInputRadioClickUp",
								});
							}}
						/>
					</div>
					<ClassicyControlLabel
						labelFor={item.id}
						disabled={item.disabled}
						label={item.label}
						onMouseDown={() => {
							if (item.disabled) return;
							track("click", {
								type: "ClassicyRadioInput",
								itemId: item.id,
								...analyticsArgs,
							});
							player({
								type: "ClassicySoundPlay",
								sound: "ClassicyInputRadioClickDown",
							});
						}}
						onMouseUp={() => {
							if (item.disabled) return;
							player({
								type: "ClassicySoundPlay",
								sound: "ClassicyInputRadioClickUp",
							});
						}}
					/>
				</div>
			))}
		</div>
	);

	if (!label) return group;

	return (
		<div className={labelPositionClass(labelPosition)}>
			<ClassicyControlLabel labelFor={name} disabled={disabled} labelSize={labelSize} label={label} />
			{group}
		</div>
	);
};

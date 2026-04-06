import {
	ClassicyControlLabel,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyInput.scss";
import classNames from "classnames";
import {
	type ChangeEventHandler,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEventHandler,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface ClassicyInputProps {
	id: string;
	inputType?: "text";
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	onEnterFunc?: () => void;
	labelTitle?: string;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: string;
	disabled?: boolean;
	isDefault?: boolean;
	backgroundColor?: string;
	ref?: ForwardedRef<HTMLInputElement>;
}

export const ClassicyInput: FunctionalComponent<ClassicyInputProps> =
	forwardRef<HTMLInputElement, ClassicyInputProps>(function ClassicyInput(
		{
			id,
			inputType = "text",
			labelTitle,
			labelPosition = "above",
			placeholder,
			prefillValue,
			disabled = false,
			isDefault,
			backgroundColor,
			onChangeFunc,
			onEnterFunc,
		},
		ref,
	) {
		const { track } = useClassicyAnalytics();
		const analyticsArgs = {
			id,
			inputType,
			labelTitle,
			placeholder,
			prefillValue,
			disabled,
			isDefault,
		};

		const handleOnChangeFunc: ChangeEventHandler<HTMLInputElement> = (e) => {
			track("selected", { ...analyticsArgs, selected: e.target.value });
			if (onChangeFunc) onChangeFunc(e);
		};

		const handleOnKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
			if (e.key === "Enter" && onEnterFunc) {
				onEnterFunc();
			}
		};

		return (
			<div
				className={classNames(
					"classicyInputHolder",
					labelPositionClass(labelPosition),
				)}
			>
				{labelTitle && (
					<ClassicyControlLabel
						label={labelTitle}
						labelFor={id}
						disabled={disabled}
					></ClassicyControlLabel>
				)}
				<input
					id={id}
					tabIndex={0}
					onChange={handleOnChangeFunc}
					onKeyDown={handleOnKeyDown}
					name={id}
					type={inputType}
					ref={ref}
					disabled={disabled}
					value={prefillValue}
					placeholder={placeholder}
					className={classNames(
						"classicyInput",
						isDefault ? "classicyInputDefault" : "",
					)}
					style={backgroundColor ? { backgroundColor } : undefined}
				></input>
			</div>
		);
	});

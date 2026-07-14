import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyInput.scss";
import classNames from "classnames";
import {
	type ChangeEventHandler,
	type CSSProperties,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEventHandler,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface ClassicyInputProps {
	id: string;
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	onEnterFunc?: () => void;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: string;
	disabled?: boolean;
	labelDisabled?: boolean;
	isDefault?: boolean;
	backgroundColor?: string;
	ref?: ForwardedRef<HTMLInputElement>;
}

export const ClassicyInput: FunctionalComponent<ClassicyInputProps> =
	forwardRef<HTMLInputElement, ClassicyInputProps>(function ClassicyInput(
		{
			id,
			labelTitle,
			labelSize = "medium",
			labelPosition = "above",
			placeholder,
			prefillValue,
			disabled = false,
			labelDisabled,
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
						labelSize={labelSize}
						disabled={labelDisabled ?? disabled}
					></ClassicyControlLabel>
				)}
				<input
					id={id}
					tabIndex={0}
					onChange={handleOnChangeFunc}
					onKeyDown={handleOnKeyDown}
					name={id}
					type="text"
					ref={ref}
					disabled={disabled}
					value={prefillValue}
					placeholder={placeholder}
					className={classNames(
						"classicyInput",
						isDefault ? "classicyInputDefault" : "",
					)}
					style={
						backgroundColor
							? ({
									"--classicy-input-background": backgroundColor,
								} as CSSProperties)
							: undefined
					}
				></input>
			</div>
		);
	});

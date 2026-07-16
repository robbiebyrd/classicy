import "./ClassicyTimePicker.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEvent,
	useState,
} from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

interface ClassicyTimePickerProps {
	id: string;
	onChangeFunc?: (updatedDate: Date) => void;
	labelTitle?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: Date;
	disabled?: boolean;
	labelDisabled?: boolean;
	isDefault?: boolean;
	ref?: ForwardedRef<HTMLInputElement>;
	minValue?: Date;
	maxValue?: Date;
}

export const ClassicyTimePicker: FunctionalComponent<ClassicyTimePickerProps> =
	forwardRef<HTMLInputElement, ClassicyTimePickerProps>(
		function ClassicyTimePicker(
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
				onChangeFunc,
				minValue,
				maxValue,
			},
			ref,
		) {
			if (!prefillValue) {
				prefillValue = new Date();
			}

			const [selectedDate, setSelectedDate] = useState<Date>(prefillValue);
			const [hour, setHour] = useState<string>(
				prefillValue.getHours().toString(),
			);
			const [minutes, setMinutes] = useState<string>(
				prefillValue.getMinutes().toString(),
			);
			const [seconds, setSeconds] = useState<string>(
				prefillValue.getSeconds().toString(),
			);
			const [period, setPeriod] = useState<string>(
				prefillValue.getHours() < 12 ? "am" : "pm",
			);

			const clampDateTime = (date: Date): Date => {
				if (minValue !== undefined && date.getTime() < minValue.getTime())
					return new Date(minValue.getTime());
				if (maxValue !== undefined && date.getTime() >= maxValue.getTime())
					return new Date(maxValue.getTime());
				return date;
			};

			const handleDateChange = (date: Date) => {
				const clamped = clampDateTime(date);
				if (clamped !== date) {
					const h = clamped.getHours();
					const isPm = h >= 12;
					setSelectedDate(clamped);
					setHour((isPm ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h).toString());
					setMinutes(clamped.getMinutes().toString());
					setSeconds(clamped.getSeconds().toString());
					setPeriod(isPm ? "pm" : "am");
				}
				onChangeFunc?.(clamped);
			};

			const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
				setPeriod(e.target.value);

				const updatedDate = new Date(selectedDate);
				let hours = parseInt(hour, 10);

				if (e.target.value === "pm") {
					hours += 12;
				}

				if (hours >= 24) {
					hours = 0;
				}

				updatedDate.setHours(hours);
				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const handleTimePartChange = (
				e: ChangeEvent<HTMLInputElement>,
				part: "hour" | "minutes" | "seconds",
			) => {
				let inputValue = parseInt(e.currentTarget.value, 10);
				const updatedDate = new Date(selectedDate);

				if (Number.isNaN(inputValue)) {
					return;
				}

				switch (part) {
					case "hour":
						if (inputValue < 1 || inputValue > 12) {
							return;
						}
						if (period === "pm") {
							inputValue = inputValue < 12 ? inputValue + 12 : inputValue;
						} else {
							inputValue = inputValue === 12 ? 0 : inputValue;
						}
						updatedDate.setHours(inputValue);
						setHour(e.currentTarget.value);
						break;
					case "minutes":
						if (inputValue < 0 || inputValue > 59) {
							return;
						}
						updatedDate.setMinutes(inputValue);
						setMinutes(e.currentTarget.value);
						break;
					case "seconds":
						if (inputValue < 0 || inputValue > 59) {
							return;
						}
						updatedDate.setSeconds(inputValue);
						setSeconds(e.currentTarget.value);
						break;
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const incrementTimePartChange = (
				e: KeyboardEvent<HTMLInputElement>,
				part: "hour" | "minutes" | "seconds",
			) => {
				const updatedDate = new Date(selectedDate);
				let modifier = 0;

				switch (e.key) {
					case "ArrowDown":
						modifier = -1;
						break;
					case "ArrowUp":
						modifier = 1;
						break;
				}

				switch (part) {
					case "hour": {
						const currentHour = parseInt(hour, 10) + modifier;
						if (currentHour > 12 || currentHour <= 0) {
							return;
						}
						updatedDate.setHours(currentHour);
						setHour(currentHour.toString());
						break;
					}
					case "minutes": {
						const currentMinutes = parseInt(minutes, 10) + modifier;
						if (currentMinutes < 0 || currentMinutes > 59) {
							return;
						}
						updatedDate.setMinutes(currentMinutes);
						setMinutes(currentMinutes.toString());
						break;
					}
					case "seconds": {
						const currentSeconds = parseInt(seconds, 10) + modifier;
						if (currentSeconds < 0 || currentSeconds > 59) {
							return;
						}
						updatedDate.setSeconds(currentSeconds);
						setSeconds(currentSeconds.toString());
						break;
					}
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			return (
				<div
					className={classNames(
						"classicyTimePickerHolder",
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
					<div
						className={classNames(
							"classicyTimePicker",
							isDefault ? "classicyTimePickerDefault" : "",
						)}
					>
						<input
							id={`${id}_hour`}
							tabIndex={0}
							name={`${id}_hour`}
							type="text"
							ref={ref}
							disabled={disabled}
							placeholder={placeholder}
							onClick={(e) => e.currentTarget.select()}
							onChange={(e) => handleTimePartChange(e, "hour")}
							onBlur={(e) => handleTimePartChange(e, "hour")}
							onKeyDown={(e) => incrementTimePartChange(e, "hour")}
							value={
								parseInt(hour, 10) % 12 === 0 ? 12 : parseInt(hour, 10) % 12
							}
							maxLength={2}
							className={"classicyTimePickerInput"}
						></input>
						:
						<input
							id={`${id}_minutes`}
							tabIndex={0}
							name={`${id}_minutes`}
							type="text"
							ref={ref}
							disabled={disabled}
							value={String(minutes)}
							onClick={(e) => e.currentTarget.select()}
							onChange={(e) => handleTimePartChange(e, "minutes")}
							onBlur={(e) => handleTimePartChange(e, "minutes")}
							onKeyDown={(e) => incrementTimePartChange(e, "minutes")}
							maxLength={2}
							className={"classicyTimePickerInput"}
						></input>
						:
						<input
							id={`${id}_seconds`}
							tabIndex={0}
							name={`${id}_seconds`}
							type="text"
							ref={ref}
							disabled={disabled}
							value={String(seconds)}
							onClick={(e) => e.currentTarget.select()}
							onChange={(e) => handleTimePartChange(e, "seconds")}
							onBlur={(e) => handleTimePartChange(e, "seconds")}
							onKeyDown={(e) => incrementTimePartChange(e, "seconds")}
							maxLength={2}
							className={"classicyTimePickerInput"}
						></input>
					</div>
					<ClassicyPopUpMenu
						selected={period}
						id={"am-pm"}
						options={[
							{ label: "am", value: "am" },
							{ label: "pm", value: "pm" },
						]}
						className={"classicyTimePickerPeriod"}
						onChangeFunc={handlePeriodChange}
						disabled={disabled}
					></ClassicyPopUpMenu>
				</div>
			);
		},
	);

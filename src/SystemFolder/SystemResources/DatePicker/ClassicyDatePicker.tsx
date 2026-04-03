import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyControlLabel,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyDatePicker.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEvent,
	type MouseEvent,
	useRef,
	useState,
} from "react";
import {
	validateDayOfMonth,
	validateMonth,
} from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePickerUtils";

interface ClassicyDatePickerProps {
	id: string;
	inputType?: "text";
	onChangeFunc?: (date: Date) => void;
	labelTitle?: string;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: string;
	prefillValue?: Date;
	disabled?: boolean;
	isDefault?: boolean;
}

export const ClassicyDatePicker: FunctionalComponent<ClassicyDatePickerProps> =
	forwardRef<HTMLInputElement, ClassicyDatePickerProps>(
		function ClassicyDatePicker(
			{
				id,
				inputType,
				labelTitle,
				labelPosition = "above",
				disabled = false,
				isDefault,
				onChangeFunc,
			},
			_ref,
		) {
			const dateTime = useAppManager(
				(s) => s.System.Manager.DateAndTime.dateTime,
			);

			const yearRef = useRef<HTMLInputElement>(null);
			const monthRef = useRef<HTMLInputElement>(null);
			const dayRef = useRef<HTMLInputElement>(null);

			const [selectedDate, setSelectedDate] = useState<Date>(
				() => new Date(dateTime),
			);
			const [month, setMonth] = useState<string>(() =>
				(new Date(dateTime).getMonth() + 1).toString(),
			);
			const [day, setDay] = useState<string>(() =>
				new Date(dateTime).getDate().toString(),
			);
			const [year, setYear] = useState<string>(() =>
				new Date(dateTime).getFullYear().toString(),
			);

			const selectText = (e: MouseEvent<HTMLInputElement>) => {
				e.currentTarget.focus();
				e.currentTarget.select();
			};

			const handleDateChange = (date: Date) => {
				if (onChangeFunc) {
					onChangeFunc(date);
				}
			};

			const handleDatePartChange = (
				e: ChangeEvent<HTMLInputElement>,
				part: "month" | "day" | "year",
			) => {
				let inputValue = parseInt(e.currentTarget.value, 10);

				if (Number.isNaN(inputValue)) {
					return;
				}

				const updatedDate = new Date(selectedDate);

				switch (part) {
					case "month":
						inputValue--;
						if (inputValue < 0 || inputValue > 11) {
							setMonth("1");
							return;
						}
						updatedDate.setMonth(inputValue);
						setMonth(e.currentTarget.value);
						break;
					case "day":
						inputValue = validateDayOfMonth(
							inputValue,
							parseInt(month, 10),
							parseInt(year, 10),
						);
						updatedDate.setDate(inputValue);
						setDay(e.currentTarget.value);
						break;
					case "year":
						if (inputValue < 0) {
							return;
						}
						updatedDate.setFullYear(inputValue);
						setYear(e.currentTarget.value);
						break;
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const incrementDatePartChange = (
				e: KeyboardEvent<HTMLInputElement>,
				part: "month" | "day" | "year",
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
					case "month": {
						const currentMonth = validateMonth(parseInt(month, 10) + modifier);
						updatedDate.setMonth(currentMonth - 1);
						setMonth(currentMonth.toString());
						break;
					}
					case "day": {
						const currentDay = validateDayOfMonth(
							parseInt(day, 10) + modifier,
							parseInt(month, 10),
							parseInt(year, 10),
						);
						updatedDate.setDate(currentDay);
						setDay(currentDay.toString());
						break;
					}
					case "year": {
						const currentYear = parseInt(year, 10) + modifier;
						updatedDate.setFullYear(currentYear);
						setYear(currentYear.toString());
						break;
					}
					default: {
						break;
					}
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			return (
				<div
					className={classNames(
						"classicyDatePickerHolder",
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
					<div
						className={classNames(
							"classicyDatePicker",
							isDefault ? "classicyDatePickerDefault" : "",
						)}
					>
						<input
							id={`${id}_month`}
							tabIndex={0}
							onChange={(e) => handleDatePartChange(e, "month")}
							onBlur={(e) => handleDatePartChange(e, "month")}
							onKeyDown={(e) => incrementDatePartChange(e, "month")}
							onClick={selectText}
							name={`${id}_month`}
							type={inputType}
							ref={monthRef}
							disabled={disabled}
							value={month}
							maxLength={2}
							className={"classicyDatePickerInputShort"}
						></input>
						/
						<input
							id={`${id}_day`}
							tabIndex={0}
							onChange={(e) => handleDatePartChange(e, "day")}
							onBlur={(e) => handleDatePartChange(e, "day")}
							onKeyDown={(e) => incrementDatePartChange(e, "day")}
							onClick={selectText}
							name={`${id}_day`}
							type={inputType}
							ref={dayRef}
							disabled={disabled}
							value={day}
							maxLength={2}
							className={"classicyDatePickerInputShort"}
						></input>
						/
						<input
							id={`${id}_year`}
							tabIndex={0}
							onClick={selectText}
							onChange={(e) => handleDatePartChange(e, "year")}
							onBlur={(e) => handleDatePartChange(e, "year")}
							onKeyDown={(e) => incrementDatePartChange(e, "year")}
							name={`${id}_year`}
							type={inputType}
							ref={yearRef}
							disabled={disabled}
							value={year}
							maxLength={4}
							className={"classicyDatePickerInputLong"}
						></input>
					</div>
				</div>
			);
		},
	);

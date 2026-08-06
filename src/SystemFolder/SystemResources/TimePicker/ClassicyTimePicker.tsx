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
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/TimePicker/ClassicyLittleArrows";

type ClassicyTimePart = "hour" | "minutes" | "seconds";
type ClassicyPeriod = "am" | "pm";

/**
 * Converts a 12-hour-clock hour (1-12) plus its am/pm period into the
 * 24-hour hour value `Date#setHours` expects. This is the single source of
 * truth for that conversion -- every call site in this file that turns the
 * visible hour field + period into a value for `setHours` must route
 * through here, so the two boundary cases can't drift out of sync between
 * call sites the way they previously did:
 *   - 12 AM -> 0  (midnight, not noon)
 *   - 12 PM -> 12 (noon, not midnight)
 */
function to24h(hour12: number, period: ClassicyPeriod): number {
	const base = hour12 % 12; // 12 -> 0, 1-11 unchanged
	return period === "pm" ? base + 12 : base;
}

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
	// Forwarded to the hours input only (the first field and the natural
	// focus target) -- the minutes and seconds inputs are never bound to
	// this ref, so `ref.current` always resolves to the hours <input>.
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
			// Normalized to the 12-hour range (1-12) up front so `hour` state is
			// always in the same representation `stepTimePart`/`handleTimePartChange`
			// expect -- `getHours()` returns 0-23, and `0 -> 12` is the midnight
			// boundary case (`x % 12 || 12` maps both 0 and 12 to 12).
			const [hour, setHour] = useState<string>(
				(prefillValue.getHours() % 12 || 12).toString(),
			);
			const [minutes, setMinutes] = useState<string>(
				prefillValue.getMinutes().toString(),
			);
			const [seconds, setSeconds] = useState<string>(
				prefillValue.getSeconds().toString(),
			);
			const [period, setPeriod] = useState<ClassicyPeriod>(
				prefillValue.getHours() < 12 ? "am" : "pm",
			);
			// Which field the visible little-arrows (and Up/Down keys) act on.
			const [focusedPart, setFocusedPart] = useState<ClassicyTimePart>("hour");

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
					setHour(
						(isPm ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h).toString(),
					);
					setMinutes(clamped.getMinutes().toString());
					setSeconds(clamped.getSeconds().toString());
					setPeriod(isPm ? "pm" : "am");
				}
				onChangeFunc?.(clamped);
			};

			const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
				const nextPeriod: ClassicyPeriod =
					e.target.value === "pm" ? "pm" : "am";
				setPeriod(nextPeriod);

				const updatedDate = new Date(selectedDate);
				updatedDate.setHours(to24h(parseInt(hour, 10), nextPeriod));
				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const handleTimePartChange = (
				e: ChangeEvent<HTMLInputElement>,
				part: "hour" | "minutes" | "seconds",
			) => {
				const inputValue = parseInt(e.currentTarget.value, 10);
				const updatedDate = new Date(selectedDate);

				if (Number.isNaN(inputValue)) {
					return;
				}

				switch (part) {
					case "hour":
						if (inputValue < 1 || inputValue > 12) {
							return;
						}
						updatedDate.setHours(to24h(inputValue, period));
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

			// Shared increment core: used by both the Up/Down keys and the visible
			// little-arrows widget so mouse-only users can adjust the clock too.
			const stepTimePart = (part: ClassicyTimePart, direction: 1 | -1) => {
				const updatedDate = new Date(selectedDate);

				switch (part) {
					case "hour": {
						const currentHour = parseInt(hour, 10) + direction;
						if (currentHour > 12 || currentHour <= 0) {
							return;
						}
						updatedDate.setHours(to24h(currentHour, period));
						setHour(currentHour.toString());
						break;
					}
					case "minutes": {
						const currentMinutes = parseInt(minutes, 10) + direction;
						if (currentMinutes < 0 || currentMinutes > 59) {
							return;
						}
						updatedDate.setMinutes(currentMinutes);
						setMinutes(currentMinutes.toString());
						break;
					}
					case "seconds": {
						const currentSeconds = parseInt(seconds, 10) + direction;
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

			const incrementTimePartChange = (
				e: KeyboardEvent<HTMLInputElement>,
				part: ClassicyTimePart,
			) => {
				if (e.key === "ArrowDown") stepTimePart(part, -1);
				else if (e.key === "ArrowUp") stepTimePart(part, 1);
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
					<div className="classicyTimePickerField">
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
								// The forwarded ref lands here only -- see the `ref` doc
								// comment on ClassicyTimePickerProps above. Minutes and
								// seconds are deliberately unref'd.
								ref={ref}
								disabled={disabled}
								placeholder={placeholder}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("hour")}
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
								disabled={disabled}
								value={String(minutes)}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("minutes")}
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
								disabled={disabled}
								value={String(seconds)}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("seconds")}
								onChange={(e) => handleTimePartChange(e, "seconds")}
								onBlur={(e) => handleTimePartChange(e, "seconds")}
								onKeyDown={(e) => incrementTimePartChange(e, "seconds")}
								maxLength={2}
								className={"classicyTimePickerInput"}
							></input>
						</div>
						<ClassicyLittleArrows
							className="classicyTimePickerArrows"
							disabled={disabled}
							upLabel="Increment time"
							downLabel="Decrement time"
							onStep={(direction) => stepTimePart(focusedPart, direction)}
						/>
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
